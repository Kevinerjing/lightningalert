(function () {
    'use strict';
    function buildTrace(kind, values) {
        const tennis = kind === 'tennis';
        const totalName = tennis ? 'totalMinutes' : 'total';
        const valueName = tennis ? 'minutes' : 'temperature';
        const states = [];
        let day = null, total = 0, freezing = 0, value = null, valid = true;
        let processed = [], output = [];
        function push(line, text, extra = {}) {
            states.push({line, text, day, total, freezing, value, valid,
                processed: [...processed], output: output.join('\n'), ...extra});
        }
        push('init', `Menu option 2 has been selected. Start ${totalName} at 0 and valid at true.`);
        if (!tennis) push('freeze-init', 'Start freezingDays at 0. It counts days, not degrees.');
        day = 1;
        push('for', 'Initialize day = 1 once. The loop has not read any input yet.');
        while (day <= 5) {
            value = null;
            push('for', `Check day <= 5: ${day} <= 5 is true. Enter the loop body.`);
            output.push(`Day ${day}: ${values[day - 1]}${tennis ? ' minutes' : ' C'}`);
            value = values[day - 1];
            push('read', `Read Day ${day}: ${value}. This number is stored in ${valueName}; the total has not changed yet.`);
            const bad = tennis ? value < 0 || value > 1440 : !(value >= -60 && value <= 60);
            push('validate', `Check the allowed range: ${value} is ${bad ? 'outside' : 'inside'} ${tennis ? '0–1440 minutes' : '-60–60 C'}.`, {badDay: bad ? day : null});
            if (bad) {
                output.push(tennis ? 'Invalid minutes. Start again from the menu.' : 'Invalid temperature. Start again from the menu.');
                push('warning', 'Print a range warning. This input has not been added to the total.', {badDay: day});
                valid = false;
                push('invalid', 'Set valid = false, so the incomplete result will not be summarized.', {badDay: day});
                push('break', 'break exits this for loop immediately. It does not execute day++.', {badDay: day});
                break;
            }
            const before = total;
            total += value;
            processed.push(value);
            push('add', `Add Day ${day}: ${before} + (${value}) = ${total}. ${totalName} changes; day stays ${day}.`);
            if (!tennis) {
                push('cold-check', `Check temperature <= 0: ${value} <= 0 is ${value <= 0}.`);
                if (value <= 0) {
                    freezing++;
                    push('cold-add', `Increase freezingDays by 1. It is now ${freezing}. Zero counts too.`);
                }
            }
            day++;
            push('for', `The body is finished. Execute day++: day becomes ${day}. Next, check the loop condition again.`);
        }
        if (valid) push('for', 'Check day <= 5: 6 <= 5 is false. Skip the body and leave the loop. No Day 6 input is read.');
        push('valid-check', `After the loop, check valid: ${valid}. ${valid ? 'Calculate the summary.' : 'Skip the summary and return to the menu.'}`);
        if (valid) {
            if (tennis) {
                const hours = Math.trunc(total / 60), remainder = total % 60;
                push('hours', `Integer division: ${total} / 60 gives ${hours} whole hours.`, {hours});
                push('remainder', `Remainder: ${total} % 60 gives ${remainder} minutes left.`, {hours, remainder});
                output.push(`Total: ${hours} hours, ${remainder} minutes`);
                push('print-total', 'Print the hours and remaining minutes. The result appears only at this print statement.', {hours, remainder});
                output.push(`Daily average: ${(total / 5).toFixed(1)} minutes`);
                push('average-print', `Use decimal division: ${total} / 5.0 = ${total / 5}. printf displays one decimal place.`, {hours, remainder, average: total / 5});
            } else {
                const average = total / 5;
                push('average', `Calculate average = ${total} / 5 = ${average}. total is double, so the division is decimal arithmetic.`, {average});
                output.push(`Average: ${average.toFixed(1)} C`);
                push('average-print', 'printf displays the average with one decimal place.', {average});
                output.push(`Days at or below 0 C: ${freezing}`);
                push('count-print', 'Print the day count separately from the average.', {average});
                push('label-cold', `Check average <= 0: ${average} <= 0 is ${average <= 0}.`, {average});
                let label;
                if (average <= 0) label = 'freezing or below';
                else {
                    push('label-cool', `The first condition was false. Check average < 15: ${average} < 15 is ${average < 15}.`, {average});
                    label = average < 15 ? 'cool' : 'mild or warm';
                }
                output.push('Average label: ' + label);
                push(average <= 0 ? 'print-cold' : average < 15 ? 'print-cool' : 'print-warm', `Print only the selected branch: ${label}.`, {average});
            }
        }
        push('finish', 'This menu action is complete. Its final break leaves the switch; the outer while loop displays the menu again.');
        return states;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = {buildTrace};
    if (typeof document === 'undefined') return;
    document.querySelectorAll('[data-loop-demo]').forEach(root => {
        const kind = root.dataset.loopDemo;
        const find = name => root.querySelector('[data-loop="' + name + '"]');
        const fields = [...root.querySelectorAll('input')];
        let trace, index = 0, timer = null;
        function pause() { clearInterval(timer); timer = null; find('play').textContent = 'Play'; }
        function render() {
            const state = trace[index];
            find('caption').textContent = `Step ${index + 1} of ${trace.length}. ${state.text}`;
            find('progress').max = trace.length - 1; find('progress').value = index;
            const data = {day: state.day ?? 'not set', total: state.total,
                value: state.value ?? 'not read', valid: String(state.valid), freezing: state.freezing};
            for (const key of Object.keys(data)) { const node = find(key); if (node) node.textContent = data[key]; }
            find('console').textContent = state.output;
            root.querySelectorAll('[data-loop-line]').forEach(line => line.classList.toggle('active', line.dataset.loopLine === state.line));
            root.querySelectorAll('.loop-day').forEach((card, n) => {
                const done = state.processed.length > n;
                card.classList.toggle('done', done);
                card.classList.toggle('cold', done && kind === 'weather' && state.processed[n] <= 0);
                card.classList.toggle('current', state.day === n + 1);
                card.classList.toggle('bad', state.badDay === n + 1 || (!state.valid && state.day === n + 1));
                card.querySelector('strong').textContent = done ? state.processed[n] + (kind === 'tennis' ? ' min' : ' C') : 'not added';
            });
            find('previous').disabled = index === 0;
            find('next').disabled = index === trace.length - 1;
        }
        function rebuild() {
            pause();
            if (fields.some(field => field.value.trim() === '' || !Number.isFinite(Number(field.value)) || (kind === 'tennis' && !Number.isInteger(Number(field.value))))) {
                find('error').textContent = kind === 'tennis' ? 'Enter five whole numbers. Range errors can be traced, but text input is not simulated here.' : 'Enter five finite numbers. Range errors can be traced, but text input is not simulated here.';
                find('play').disabled = true; find('next').disabled = true; find('previous').disabled = true;
                return false;
            }
            find('error').textContent = ''; find('play').disabled = false;
            trace = buildTrace(kind, fields.map(field => Number(field.value))); index = 0; render(); return true;
        }
        find('play').addEventListener('click', () => {
            if (timer) { pause(); return; }
            if (index === trace.length - 1) index = 0;
            find('play').textContent = 'Pause'; render();
            timer = setInterval(() => { index++; render(); if (index === trace.length - 1) pause(); }, 1500);
        });
        find('previous').addEventListener('click', () => { pause(); index = Math.max(0, index - 1); render(); });
        find('next').addEventListener('click', () => { pause(); index = Math.min(trace.length - 1, index + 1); render(); });
        find('reset').addEventListener('click', rebuild);
        fields.forEach(field => field.addEventListener('input', rebuild));
        find('sample').addEventListener('click', () => { const sample = kind === 'tennis' ? [30,45,60,20,25] : [-5,0,5,10,15]; fields.forEach((field,n) => field.value = sample[n]); rebuild(); });
        document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
        rebuild();
    });
})();
