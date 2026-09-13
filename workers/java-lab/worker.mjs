const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const ready = env => Boolean(env.JDOODLE_CLIENT_ID && env.JDOODLE_CLIENT_SECRET && env.LAB_ACCESS_CODE);
const siteOrigins = new Set(['https://www.kevin-apps.com', 'https://kevin-apps.com']);
const allowedOrigin = request => {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin || siteOrigins.has(origin);
};

export function parseReceipt(output) {
  const values = {};
  for (const line of output.split(/\r?\n/)) {
    const match = /^(TAX|TOTAL|CHANGE)=(-?\d+(?:\.\d+)?)$/.exec(line.trim());
    if (!match) continue;
    if (Object.hasOwn(values, match[1])) return null;
    values[match[1]] = Number(match[2]);
  }
  return ['TAX', 'TOTAL', 'CHANGE'].every(key => Number.isFinite(values[key]) && Math.abs(values[key]) <= 1e9)
    ? { tax: values.TAX, total: values.TOTAL, change: values.CHANGE } : null;
}

export function classifyResult(data) {
  const output = typeof data.output === 'string' ? data.output.slice(0, 20000) : '';
  if (/JDoodle\s*-\s*Timeout/i.test(output)) return { status: 'timeout', output, receipt: null };
  if (data.isCompiled === false || data.isCompiled === 0 || /(?:\.java:\d+: error:|error: compilation failed)/i.test(output)) {
    return { status: 'compile_error', output, receipt: null };
  }
  if (data.isExecutionSuccess === false || data.isExecutionSuccess === 0 || data.error || /Exception in thread|java\.lang\.\w*Exception/.test(output)) {
    return { status: 'runtime_error', output, receipt: null };
  }
  // A receipt requires the student's output contract; HTTP 200 alone is not proof of execution success.
  const receipt = parseReceipt(output);
  return { status: receipt ? 'completed' : 'output_error', output, receipt };
}

async function readBody(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new Error('JSON required');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Empty body');
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 24000) { await reader.cancel(); throw new Error('Request too large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function handleRequest(request, env, executeFetch = fetch) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (!allowedOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
  const response = request.method === 'OPTIONS'
    ? new Response(null, { status: 204 })
    : await handleApi(request, env, executeFetch);
  const headers = new Headers(response.headers);
  const origin = request.headers.get('Origin');
  if (origin) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Vary', 'Origin');
  }
  return new Response(response.body, { status: response.status, headers });
}

async function handleApi(request, env, executeFetch) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
  if (url.pathname === '/api/java/status' && request.method === 'GET') {
    return json({ ready: ready(env), provider: 'JDoodle', accessCodeRequired: true });
  }
  if (url.pathname !== '/api/java/run') return json({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return json({ error: 'POST required.' }, 405);
  if (!ready(env)) return json({ error: 'Java execution is not configured yet.' }, 503);
  if (request.headers.get('Authorization') !== `Bearer ${env.LAB_ACCESS_CODE}`) {
    return json({ error: 'Enter the classroom access code.' }, 401);
  }
  let body;
  try { body = await readBody(request); } catch { return json({ error: 'Send valid JSON under 24 KB.' }, 400); }
  const money = value => typeof value === 'string' && /^\d{1,6}(?:\.\d{1,2})?$/.test(value);
  if (!body || typeof body.source !== 'string' || !body.source.trim() || body.source.length > 16000 || !money(body.subtotal) || !money(body.cash)) {
    return json({ error: 'Provide Java source and nonnegative amounts up to 999999.99 with at most two decimal places.' }, 400);
  }
  if (!env.RUN_LIMITER) return json({ error: 'Execution rate limiter is unavailable.' }, 503);
  const { success } = await env.RUN_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') || 'local' });
  if (!success) return json({ error: 'Too many runs. Wait one minute before trying again.' }, 429);
  try {
    const upstream = await executeFetch('https://api.jdoodle.com/v1/execute', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: env.JDOODLE_CLIENT_ID, clientSecret: env.JDOODLE_CLIENT_SECRET,
        script: body.source, language: 'java', versionIndex: env.JAVA_VERSION_INDEX || '0',
        stdin: `${body.subtotal}\n${body.cash}\n` }),
      signal: AbortSignal.timeout(25000)
    });
    if (upstream.status === 429) return json({ error: 'Execution quota or provider rate limit reached.' }, 429);
    if (!upstream.ok) return json({ error: 'Java execution provider is unavailable. Try again later.' }, 502);
    const data = await upstream.json();
    if (data.statusCode === 429) return json({ error: 'Execution quota reached.' }, 429);
    if (data.statusCode && data.statusCode !== 200) return json({ error: 'Java execution provider rejected the request.' }, 502);
    if (typeof data.output !== 'string') return json({ error: 'Unexpected response from Java execution provider.' }, 502);
    return json({ ...classifyResult(data), provider: 'JDoodle' });
  } catch (error) {
    return json({ error: error.name === 'TimeoutError' || error.name === 'AbortError'
      ? 'Execution response timed out. The provider may still finish this run; it is not retried automatically.'
      : 'Could not reach the Java execution provider.' }, 502);
  }
}

export default { fetch: (request, env) => handleRequest(request, env) };
