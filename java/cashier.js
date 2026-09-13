const $ = id => document.getElementById(id);
const primarySite = ['www.kevin-apps.com', 'kevin-apps.com'].includes(location.hostname);
const api = primarySite
  ? new URL('https://java-cashier-lab.jingkevin0408.workers.dev/api/java/')
  : new URL('./api/java/', location.href);
const draftKey = 'java-cashier-draft-v2';
const starter = `import java.util.Scanner;
import java.util.Locale;

/* Calculate tax, total, and change for a purchase. */
public class Cashier {
    public static void main(String[] args) {
        Scanner input = new Scanner(System.in);
        input.useLocale(Locale.US);
        final double TAX_RATE = 0.13; // Ontario HST

        // Read the subtotal.
        double subtotal = input.nextDouble();

        // TODO: Calculate tax and total.
        double tax = 0;

        // Round tax to cents before calculating the amount owed.
        tax = Math.round(tax * 100) / 100.0;
        double total = 0;

        // Read the cash given.
        double cashGiven = input.nextDouble();

        // TODO: Calculate change.
        double change = 0;

        // Return the receipt to the checkout page.
        System.out.printf(Locale.US, "TAX=%.2f%n", tax);
        System.out.printf(Locale.US, "TOTAL=%.2f%n", total);
        System.out.printf(Locale.US, "CHANGE=%.2f%n", change);
    }
}
`;
const cases = { normal: ['20.00', '30.00'], exact: ['20.00', '22.60'], decimal: ['12.50', '20.00'] };
let busy = false;
let connected = false;
let revision = 0;
$('source').value = starter;
try { $('source').value = localStorage.getItem(draftKey) ?? starter; } catch {}

function clearReceipt(message = 'Awaiting Java output') {
  ['tax', 'total', 'change'].forEach(key => $(`${key}-result`).textContent = '--');
  $('receipt-state').textContent = message;
  $('test-result').textContent = 'No test result.';
}
function invalidate() {
  revision++;
  clearReceipt('Changed since last run');
  $('run-status').textContent = busy ? 'Running an earlier snapshot...' : 'Not run with these inputs.';
}
function save() {
  try { localStorage.setItem(draftKey, $('source').value); $('save-state').textContent = 'Draft saved'; }
  catch { $('save-state').textContent = 'Draft not saved'; }
}
$('source').addEventListener('input', () => { save(); invalidate(); });
['subtotal', 'cash'].forEach(id => $(id).addEventListener('input', () => { $('example').value = 'custom'; invalidate(); }));
$('example').onchange = () => {
  const example = cases[$('example').value];
  if (example) { [$('subtotal').value, $('cash').value] = example; invalidate(); }
};
$('reset').onclick = () => { if (confirm('Replace your draft with the starter code?')) { $('source').value = starter; save(); invalidate(); } };
$('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([$('source').value], { type: 'text/plain' }));
  const a = document.createElement('a'); a.href = url; a.download = 'Cashier.java'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  document.body.dataset.view = button.dataset.view;
  document.querySelectorAll('[data-view]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
});

function showReceipt(receipt, input) {
  const cents = value => Math.round(Number(value) * 100);
  const subtotal = cents(input.subtotal);
  // Expectations only grade the run; displayed receipt values always come from Java.
  const tax = Math.round(subtotal * 13 / 100);
  const expected = { tax, total: subtotal + tax, change: cents(input.cash) - subtotal - tax };
  $('test-result').replaceChildren();
  let passed = 0;
  for (const key of ['tax', 'total', 'change']) {
    $(`${key}-result`).textContent = '$' + receipt[key].toFixed(2);
    const ok = cents(receipt[key]) === expected[key];
    if (ok) passed++;
    const row = document.createElement('div'); row.className = 'check-row';
    const name = document.createElement('span'); name.textContent = key[0].toUpperCase() + key.slice(1);
    const result = document.createElement('span'); result.className = ok ? 'pass' : 'fail';
    result.textContent = `$${(expected[key] / 100).toFixed(2)} / $${receipt[key].toFixed(2)} ${ok ? 'PASS' : 'FAIL'}`;
    row.append(name, result); $('test-result').append(row);
  }
  $('receipt-state').textContent = 'From Java standard output';
  $('run-status').textContent = `Java completed. ${passed} of 3 checks passed.`;
}

$('checkout-form').onsubmit = async event => {
  event.preventDefault();
  if (busy || !connected) return;
  if (!$('access-code').value) { $('run-status').textContent = 'Enter the classroom access code.'; $('access-code').focus(); return; }
  const payload = { source: $('source').value, subtotal: $('subtotal').value, cash: $('cash').value };
  const runRevision = revision;
  busy = true; $('run').disabled = true; $('run').textContent = 'Running...';
  clearReceipt('Running Java...'); $('console').textContent = 'Waiting for Java execution...';
  $('run-status').textContent = 'Compiling and running Cashier.java...';
  const requestSummary = { method: 'POST', path: '/api/java/run', language: 'java', stdin: `${payload.subtotal}\n${payload.cash}\n`, sourceCharacters: payload.source.length };
  $('exchange').textContent = JSON.stringify({ request: requestSummary }, null, 2);
  const started = performance.now();
  try {
    const response = await fetch(new URL('run', api), { method: 'POST', headers: {
      'Content-Type': 'application/json', Authorization: `Bearer ${$('access-code').value}`
    }, body: JSON.stringify(payload), signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    $('exchange').textContent = JSON.stringify({ request: requestSummary, response: { httpStatus: response.status, ...data } }, null, 2);
    if (!response.ok) throw new Error(data.error || 'Execution request failed.');
    $('console').textContent = data.output || '(No output)';
    if (runRevision !== revision) { clearReceipt('Inputs or code changed during execution'); $('run-status').textContent = 'Previous snapshot finished. Run again for your current code and inputs.'; return; }
    if (data.status === 'completed' && data.receipt) showReceipt(data.receipt, payload);
    else {
      clearReceipt('No valid receipt');
      $('run-status').textContent = ({ compile_error: 'Compilation failed. Check the console.', runtime_error: 'Java stopped with a runtime error.', timeout: 'Java execution timed out.', output_error: 'Output contract missing. Print TAX, TOTAL, and CHANGE on separate lines.' })[data.status] || 'Execution did not complete.';
    }
  } catch (error) {
    clearReceipt('Execution unavailable');
    $('run-status').textContent = error.name === 'TimeoutError' ? 'Response timed out. The run may still finish; no automatic retry was sent.' : error.message;
    $('console').textContent = 'No Java result received.';
  } finally {
    $('execution-time').textContent = `${((performance.now() - started) / 1000).toFixed(1)} s round trip`;
    busy = false; $('run').disabled = !connected; $('run').textContent = 'Run checkout';
  }
};
async function checkConnection() {
  $('reconnect').disabled = true;
  $('connection').textContent = 'Checking execution service...';
  connected = false;
  $('run').disabled = true;
  try {
    const response = await fetch(new URL('status', api), { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) throw new Error();
    const status = await response.json();
    if (typeof status.ready !== 'boolean') throw new Error();
    connected = status.ready;
    $('connection').textContent = connected ? 'JDoodle configured' : 'Java execution not configured';
  } catch {
    $('connection').textContent = location.hostname === 'java-cashier-lab.jingkevin0408.workers.dev'
      ? 'Could not connect to Java service. Retry connection.'
      : 'Java service is not available on this address. Open the online lab.';
  }
  $('connection-help').hidden = connected;
  $('reconnect').disabled = false;
  $('run').disabled = !connected || busy;
}
$('reconnect').onclick = checkConnection;
checkConnection();
