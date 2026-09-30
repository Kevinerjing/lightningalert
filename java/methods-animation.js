(() => {
  const root = document.getElementById('method-demo');
  if (!root) return;
  const el = id => root.querySelector('[data-md="' + id + '"]');
  let step = 0, timer = null, a = 5, b = 3;
  const descriptions = [
    () => 'A method is a named task. getSum needs two integers and gives one integer back. Its declaration does not run until it is called.',
    () => `main reaches getSum(${a}, ${b}). It sends these two arguments and waits for the result before assigning answer.`,
    () => `getSum starts. Its parameters receive the values in order: a = ${a}, b = ${b}. Parameters are local variables in this method.`,
    () => `Inside getSum, a + b is ${a} + ${b} = ${a+b}. The local variable sum stores ${a+b}. main is still waiting.`,
    () => `return sum ends getSum and sends ${a+b} back to the caller. It does not print anything.`,
    () => `Back in main, getSum(${a}, ${b}) has produced ${a+b}. The assignment stores it in answer. The console is still empty.`,
    () => `main now executes System.out.println(answer). Only now does ${a+b} appear in the console.`
  ];
  function pause() { clearInterval(timer); timer = null; el('play').textContent = 'Play'; }
  function render() {
    const sum = a+b;
    el('caption').textContent = `Step ${step} of 6. ` + descriptions[step]();
    el('progress').value = step;
    el('main').classList.toggle('active', step === 1 || step >= 5);
    el('helper').classList.toggle('active', step >= 2 && step <= 4);
    el('main-status').textContent = step === 0 ? 'Ready' : step <= 4 ? 'Waiting for getSum' : 'Running again';
    el('helper-status').textContent = step < 2 ? 'Not running yet' : step <= 4 ? 'Running' : 'Finished';
    el('answer').textContent = step >= 5 ? `answer = ${sum}` : 'answer: not assigned yet';
    el('params').textContent = step >= 2 && step <= 4 ? `a = ${a}, b = ${b}` : 'Parameters: a, b';
    el('sum').textContent = step >= 3 && step <= 4 ? `sum = ${sum}` : 'Local variable: sum';
    el('console').textContent = step === 6 ? String(sum) : '';
    el('call').textContent = `int answer = getSum(${a}, ${b});`;
    root.querySelectorAll('[data-line]').forEach(line => line.classList.toggle('current', ({1:'call',2:'header',3:'add',4:'return',5:'call',6:'print'})[step] === line.dataset.line));
    const transfer = el('transfer');
    transfer.replaceChildren();
    if (step === 1 || step === 4) {
      const packet = document.createElement('span');
      packet.className = 'md-packet' + (step === 4 ? ' back' : '');
      packet.textContent = step === 1 ? `${a}, ${b}` : String(sum);
      const direction = document.createElement('span');
      direction.className = 'md-direction'; direction.textContent = step === 1 ? '→ call' : '← return';
      transfer.append(packet, direction);
    }
    el('previous').disabled = step === 0;
    el('next').disabled = step === 6;
  }
  el('play').addEventListener('click', () => {
    if (timer) { pause(); return; }
    if (step === 6) step = 0;
    el('play').textContent = 'Pause'; render();
    timer = setInterval(() => { step++; render(); if (step === 6) pause(); }, 2300);
  });
  el('next').addEventListener('click', () => { pause(); step = Math.min(6,step+1); render(); });
  el('previous').addEventListener('click', () => { pause(); step = Math.max(0,step-1); render(); });
  el('reset').addEventListener('click', () => { pause(); step = 0; render(); });
  el('example').addEventListener('change', event => { pause(); [a,b] = event.target.value.split(',').map(Number); step = 0; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  render();
})();
