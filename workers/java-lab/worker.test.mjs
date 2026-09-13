import test from 'node:test';
import assert from 'node:assert/strict';
import { handleRequest, classifyResult, parseReceipt } from './worker.mjs';

const env = { JDOODLE_CLIENT_ID: 'test-id', JDOODLE_CLIENT_SECRET: 'test-secret', LAB_ACCESS_CODE: 'test-code',
  RUN_LIMITER: { limit: async () => ({ success: true }) } };
const body = { source: 'public class Cashier {}', subtotal: '20.00', cash: '30.00' };
const request = (data = body, code = 'test-code', origin = 'https://lab.example') => new Request('https://lab.example/api/java/run', {
  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${code}`, Origin: origin }, body: JSON.stringify(data)
});

test('configuration status never exposes credentials', async () => {
  const result = await handleRequest(new Request('https://lab.example/api/java/status'), env);
  assert.deepEqual(await result.json(), { ready: true, provider: 'JDoodle', accessCodeRequired: true });
});
test('main site preflight and error responses have restricted CORS headers', async () => {
  const origin = 'https://www.kevin-apps.com';
  const preflight = await handleRequest(new Request('https://lab.example/api/java/run', {
    method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}
  }),env);
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);
  const denied = await handleRequest(request(body,'wrong',origin),env);
  assert.equal(denied.status,401);
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'),origin);
  const unknown = await handleRequest(new Request('https://lab.example/api/java/run', {method:'OPTIONS',headers:{Origin:'https://other.example'}}),env);
  assert.equal(unknown.status,403);
  assert.equal(unknown.headers.get('Access-Control-Allow-Origin'),null);
});
test('missing configuration, wrong access code, cross-origin and invalid input do not call provider', async () => {
  const never = () => { throw Error('Must not execute'); };
  assert.equal((await handleRequest(request(), {}, never)).status, 503);
  assert.equal((await handleRequest(request(body, 'wrong'), env, never)).status, 401);
  assert.equal((await handleRequest(request(body, 'test-code', 'https://other.example'), env, never)).status, 403);
  for (const invalid of [null, {...body, cash: '-1'}, {...body, subtotal: '2\n3'}, {...body, source: 'a'.repeat(25000)}]) {
    assert.equal((await handleRequest(request(invalid), env, never)).status, 400);
  }
});
test('enforces rate limit before execution', async () => {
  const limited = {...env, RUN_LIMITER: {limit: async () => ({success:false})}};
  assert.equal((await handleRequest(request(), limited, () => { throw Error('Must not execute'); })).status, 429);
});
test('maps source and ordered stdin to provider, returns actual receipt without secrets', async () => {
  const response = await handleRequest(request(), env, async (url, init) => {
    assert.equal(url, 'https://api.jdoodle.com/v1/execute');
    const sent = JSON.parse(init.body);
    assert.equal(sent.stdin, '20.00\n30.00\n');
    assert.equal(sent.script, body.source);
    assert.equal(sent.language, 'java');
    assert.equal(sent.clientSecret, env.JDOODLE_CLIENT_SECRET);
    return Response.json({statusCode:200,isCompiled:true,isExecutionSuccess:true,output:'TAX=0.00\nTOTAL=0.00\nCHANGE=0.00'});
  });
  const result = await response.json();
  assert.equal(result.status, 'completed');
  assert.deepEqual(result.receipt, {tax:0,total:0,change:0});
  assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('provider status failures and malformed payloads stay errors', async () => {
  for (const [upstream, status] of [[new Response('',{status:429}),429], [new Response('',{status:500}),502],
    [Response.json({statusCode:429}),429], [Response.json({}),502]]) {
    assert.equal((await handleRequest(request(),env,async()=>upstream)).status,status);
  }
});
test('compile, runtime and timeout failures cannot produce a receipt', () => {
  for (const [data,status] of [
    [{isCompiled:false,output:"Cashier.java:8: error: ';' expected"},'compile_error'],
    [{isCompiled:true,isExecutionSuccess:false,output:'Exception in thread main java.lang.ArithmeticException'},'runtime_error'],
    [{isCompiled:0,isExecutionSuccess:1,output:'JDoodle - Timeout.'},'timeout'],
    [{isCompiled:true,output:'Hello'},'output_error']]) {
    assert.equal(classifyResult(data).status,status);
    assert.equal(classifyResult(data).receipt,null);
  }
});
test('output contract rejects missing, duplicate and non-finite values', () => {
  assert.equal(parseReceipt('TAX=2\nTOTAL=22'), null);
  assert.equal(parseReceipt('TAX=2\nTAX=3\nTOTAL=22\nCHANGE=8'),null);
  assert.equal(parseReceipt('TAX=NaN\nTOTAL=22\nCHANGE=8'),null);
  assert.deepEqual(parseReceipt('TAX=2.60\r\nTOTAL=22.60\r\nCHANGE=-1.60'),{tax:2.6,total:22.6,change:-1.6});
});
