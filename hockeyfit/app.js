const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const productFamilies = [
  { brand:'CCM', name:'Ribcor Trigger 60', kick:'Low', tiers:['recreational','developing'], prices:{Youth:89.99,Junior:99.99,Intermediate:109.99,Senior:109.99}, flexes:[20,30,40,50,55,65,70,75,85], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Ribcor-Sticks' },
  { brand:'CCM', name:'Tacks XF 70', kick:'Mid', tiers:['recreational','developing'], prices:{Youth:109.99,Junior:119.99,Intermediate:129.99,Senior:129.99}, flexes:[30,40,50,55,65,70,75,85], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Tacks-Sticks' },
  { brand:'Bauer', name:'Vapor League', kick:'Low', tiers:['developing','competitive'], prices:{Youth:119.99,Junior:149.99,Intermediate:179.99,Senior:189.99}, flexes:[20,30,40,50,55,65,70,77,87], url:'https://ca.bauer.com/collections/hockey-sticks' },
  { brand:'CCM', name:'Tacks XF', kick:'Mid', tiers:['developing','competitive'], prices:{Youth:149.99,Junior:179.99,Intermediate:229.99,Senior:229.99}, flexes:[30,40,50,55,65,70,75,85], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Tacks-Sticks' },
  { brand:'CCM', name:'Ribcor Trigger Unleashed', kick:'Low', tiers:['developing','competitive'], prices:{Youth:159.99,Junior:189.99,Intermediate:239.99,Senior:239.99}, flexes:[20,30,40,50,55,65,70,75,85,95], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Ribcor-Sticks' },
  { brand:'Bauer', name:'Nexus Tracer', kick:'Mid', tiers:['competitive','elite'], prices:{Youth:179.99,Junior:164.99,Intermediate:277.49,Senior:299.99}, flexes:[30,40,50,55,65,70,77,87], url:'https://ca.bauer.com/products/nexus-tracer-stick-senior' },
  { brand:'CCM', name:'Ribcor Trigger Unleashed XT', kick:'Low', tiers:['competitive','elite'], prices:{Youth:199.99,Junior:229.99,Intermediate:289.99,Senior:299.99}, flexes:[30,40,50,55,65,70,75,85,95], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Ribcor-Sticks' },
  { brand:'Bauer', name:'Vapor Twitch', kick:'Low', tiers:['competitive','elite'], prices:{Youth:199.99,Junior:289.99,Intermediate:399.99,Senior:419.99}, flexes:[30,40,50,55,65,70,77,87], url:'https://ca.bauer.com/collections/hockey-sticks' },
  { brand:'CCM', name:'Tacks XF Pro', kick:'Mid', tiers:['elite'], prices:{Youth:239.99,Junior:299.99,Intermediate:399.99,Senior:419.99}, flexes:[30,40,50,55,65,70,75,80,85,95], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Tacks-Sticks' },
  { brand:'CCM', name:'Jetspeed FT9 Pro', kick:'Hybrid', tiers:['elite'], prices:{Youth:239.99,Junior:309.99,Intermediate:409.99,Senior:439.99}, flexes:[10,20,30,40,50,55,65,70,75,80,85,95], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/JetSpeed-Sticks' },
  { brand:'CCM', name:'Ribcor Trigger Unleashed Pro', kick:'Low', tiers:['elite'], prices:{Youth:239.99,Junior:309.99,Intermediate:409.99,Senior:439.99}, flexes:[20,30,40,50,55,65,70,75,80,85,95], url:'https://ca.ccmhockey.com/en/Sticks/Shop-All-Sticks/Ribcor-Sticks' },
  { brand:'Bauer', name:'Vapor Flylite', kick:'Low', tiers:['elite'], prices:{Youth:239.99,Junior:309.99,Intermediate:409.99,Senior:439.99}, flexes:[20,30,40,50,55,65,70,77,87], url:'https://ca.bauer.com/collections/hockey-sticks' },
  { brand:'Bauer', name:'Supreme Fuse', kick:'Mid', tiers:['elite'], prices:{Youth:239.99,Junior:309.99,Intermediate:409.99,Senior:439.99}, flexes:[30,40,50,55,65,70,77,87], url:'https://ca.bauer.com/collections/hockey-sticks' }
];

const state = { step: 1, results: [], fit: null };
const form = $('#fitForm');
const kg = $('#weightKg');
const lb = $('#weightLb');
const cm = $('#heightCm');
const ft = $('#heightFt');
const inch = $('#heightIn');

function round(value, places = 1) { const factor = 10 ** places; return Math.round(value * factor) / factor; }
function syncWeight(source) {
  if (source === 'kg' && kg.value) lb.value = round(Number(kg.value) * 2.2046226218);
  if (source === 'lb' && lb.value) kg.value = round(Number(lb.value) / 2.2046226218);
}
function syncHeight(source) {
  if (source === 'cm' && cm.value) {
    const total = Number(cm.value) / 2.54;
    ft.value = Math.floor(total / 12);
    inch.value = round(total % 12);
  } else if (ft.value && inch.value !== '') {
    cm.value = round((Number(ft.value) * 12 + Number(inch.value)) * 2.54);
  }
}
kg.addEventListener('input', () => syncWeight('kg'));
lb.addEventListener('input', () => syncWeight('lb'));
cm.addEventListener('input', () => syncHeight('cm'));
ft.addEventListener('input', () => syncHeight('imperial'));
inch.addEventListener('input', () => syncHeight('imperial'));

function selected(name) { return form.elements[name].value; }
function validateStepOne() {
  let valid = true;
  const checks = [[$('#age'),5,75],[$('#experience'),0,60]];
  checks.forEach(([input,min,max]) => {
    const bad = input.value === '' || Number(input.value) < min || Number(input.value) > max;
    input.closest('.field').classList.toggle('invalid', bad); valid = valid && !bad;
  });
  const weightBad = !kg.value || Number(kg.value) < 18 || Number(kg.value) > 180;
  kg.closest('.measure-card').classList.toggle('invalid', weightBad); valid = valid && !weightBad;
  const heightBad = !cm.value || Number(cm.value) < 100 || Number(cm.value) > 215;
  cm.closest('.measure-card').classList.toggle('invalid', heightBad); valid = valid && !heightBad;
  return valid;
}

function showStep(step) {
  state.step = step;
  $$('.form-step').forEach(panel => panel.classList.toggle('active', Number(panel.dataset.step) === step));
  $$('.steps li').forEach((dot, index) => {
    dot.classList.toggle('active', index + 1 === step);
    dot.classList.toggle('done', index + 1 < step);
    if (index + 1 < step) $('span', dot).textContent = '✓'; else $('span', dot).textContent = index + 1;
  });
  $('#backButton').hidden = step === 1;
  $('#nextButton').innerHTML = step === 3 ? 'See my matches <span>→</span>' : 'Continue <span>→</span>';
  $('#formActions').style.display = step === 4 ? 'none' : 'flex';
  if (step === 4) buildResults();
  if (window.innerWidth < 760) $('.steps').scrollIntoView({behavior:'smooth',block:'start'});
}

function nearest(value, options) { return options.reduce((a,b) => Math.abs(b-value) < Math.abs(a-value) ? b : a); }
function collectProfile() {
  return { age:Number($('#age').value), experience:Number($('#experience').value), kg:Number(kg.value), lb:Number(lb.value), cm:Number(cm.value), position:selected('position'), level:selected('level'), shot:selected('shot'), hand:selected('hand'), feel:selected('feel'), budget:Number(selected('budget')) };
}
function calculateFit(p) {
  let rawFlex = p.lb * (p.age < 13 ? .48 : .5);
  if (p.level === 'recreational') rawFlex -= 4;
  if (p.level === 'developing') rawFlex -= 2;
  if (p.level === 'elite') rawFlex += 2;
  if (p.experience < 2) rawFlex -= 3;
  if (p.feel === 'easy') rawFlex -= 4;
  if (p.feel === 'stiff') rawFlex += 4;
  if (p.shot === 'snap') rawFlex -= 2;
  if (p.shot === 'slap' || p.shot === 'onetimer') rawFlex += 2;
  rawFlex = Math.max(10, Math.min(95, rawFlex));
  const availableFlexes = [10,20,30,35,40,50,55,60,65,70,75,77,80,85,87,95,100];
  const flex = nearest(rawFlex, availableFlexes);
  const softer = availableFlexes.filter(x => x < flex).pop() || flex;
  const firmer = availableFlexes.find(x => x > flex) || flex;
  let stickClass = flex <= 30 ? 'Youth' : flex <= 50 ? 'Junior' : flex <= 65 ? 'Intermediate' : 'Senior';
  let lengthIn = p.cm / 2.54 - 9;
  if (p.position === 'defense') lengthIn += .75;
  if (p.shot === 'snap') lengthIn -= .5;
  lengthIn = Math.max(30, Math.min(66, Math.round(lengthIn * 2) / 2));
  const kick = p.shot === 'snap' ? 'Low' : p.shot === 'slap' || p.shot === 'onetimer' ? 'Mid' : 'Hybrid';
  const curve = p.shot === 'slap' ? 'P88 / P40' : p.shot === 'snap' ? 'P28' : 'P29 / P92';
  return { flex, flexRange:`${softer}–${flex === softer ? firmer : flex}`, stickClass, lengthIn, lengthCm:Math.round(lengthIn*2.54), kick, curve };
}

const tierScore = {recreational:1,developing:2,competitive:3,elite:4};
function rankProducts(profile, fit) {
  const desiredTier = tierScore[profile.level];
  return productFamilies.map(product => {
    const price = product.prices[fit.stickClass];
    const optionFlex = nearest(fit.flex, product.flexes);
    const flexGap = Math.abs(optionFlex-fit.flex);
    const hasFlex = flexGap <= 3;
    const productTier = Math.max(...product.tiers.map(t => tierScore[t]));
    let score = 100;
    score -= Math.min(28, Math.abs(productTier-desiredTier)*10);
    score -= product.kick === fit.kick ? 0 : (fit.kick === 'Hybrid' ? 4 : 13);
    score -= flexGap * 2.5;
    if (price > profile.budget) score -= Math.min(22, 7 + (price-profile.budget)/18);
    if (profile.position === 'defense' && product.kick === 'Mid') score += 4;
    if (profile.position === 'forward' && product.kick === 'Low') score += 3;
    if (product.name.includes('Jetspeed')) score += fit.kick === 'Hybrid' ? 8 : 1;
    if (product.name.includes('Ribcor') && fit.kick === 'Low') score += 5;
    if ((product.name.includes('Tacks') || product.name.includes('Supreme')) && fit.kick === 'Mid') score += 5;
    return {...product, price, score:Math.round(score), productTier, hasFlex, optionFlex};
  }).filter(p => Number.isFinite(p.price)).sort((a,b) => b.score-a.score).slice(0,5);
}

function reasonFor(product, profile, fit) {
  const shotText = fit.kick === 'Low' ? 'quick release and easy loading' : fit.kick === 'Mid' ? 'power shots and strong loading' : 'a versatile mix of release and power';
  const budgetText = product.price <= profile.budget ? 'fits your selected budget' : 'sits above your budget as a performance upgrade';
  const flexText = product.hasFlex ? '' : ` Closest listed flex is ${product.optionFlex}.`;
  return `${product.kick}-kick profile suits ${shotText}; ${budgetText}.${flexText}`;
}
function badgeFor(product, index, profile) {
  if (product === state.results[0]) return '<span class="badge best">Best match</span>';
  if (product.price === Math.min(...state.results.map(x=>x.price))) return '<span class="badge">Budget pick</span>';
  if (product.productTier === 4) return '<span class="badge level">Elite option</span>';
  if (product.name.includes('Jetspeed') || product.name.includes('Nexus')) return '<span class="badge">Most players pick</span>';
  return '<span class="badge">Strong alternative</span>';
}
function renderProducts(sort='match') {
  let products = [...state.results];
  if (sort === 'price') products.sort((a,b)=>a.price-b.price);
  if (sort === 'level') products.sort((a,b)=>a.productTier-b.productTier || b.score-a.score);
  const profile = state.profile, fit = state.fit;
  $('#stickResults').innerHTML = products.map((p,index) => `
    <article class="stick-card">
      <div class="stick-rank">${index+1}</div>
      <div class="stick-main">
        <div class="badges">${badgeFor(p,index,profile)}<span class="badge">${p.brand}</span></div>
        <h4>${p.name} ${fit.stickClass}</h4>
        <p>${reasonFor(p,profile,fit)}</p>
        <div class="spec-row"><span>Level <b>${p.tiers.map(t=>t[0].toUpperCase()+t.slice(1)).join(' / ')}</b></span><span>Kick <b>${p.kick}</b></span><span>Available flex <b>${p.optionFlex}${p.hasFlex ? '' : '*'}</b></span><span>Curve <b>${fit.curve.split(' / ')[0]}</b></span><span>Match <b>${Math.min(100,Math.max(60,p.score))}%</b></span></div>
      </div>
      <div class="stick-buy"><small>REFERENCE CAD</small><strong>$${p.price.toFixed(2)}</strong><a href="${p.url}" target="_blank" rel="noopener">Check availability ↗</a></div>
    </article>`).join('');
}
function buildResults() {
  const p = collectProfile();
  const fit = calculateFit(p);
  state.profile = p; state.fit = fit; state.results = rankProducts(p,fit);
  const position = p.position === 'defense' ? 'defense' : 'forward';
  const shotNames = {wrist:'balanced-shot',snap:'quick-release',slap:'power-shot',onetimer:'one-timer'};
  $('#resultTitle').textContent = `${p.level[0].toUpperCase()+p.level.slice(1)} ${position} · ${shotNames[p.shot]} setup`;
  $('#resultSummary').textContent = p.feel === 'easy' ? 'A softer-loading setup designed to help generate release with less force.' : p.feel === 'stiff' ? 'A firmer setup for a player who deliberately wants more resistance.' : 'A balanced setup that is easy to load without giving up stability.';
  $('#resultFlex').textContent = fit.flex;
  $('#flexRange').textContent = `Comparison range ${fit.flexRange}`;
  $('#resultLength').innerHTML = `${fit.lengthIn}<span>″</span>`;
  $('#lengthMetric').textContent = `${fit.lengthCm} cm shaft · on skates`;
  $('#resultClass').textContent = fit.stickClass;
  $('#classDetail').textContent = `Confirm ${fit.flex} flex stock length`;
  $('#resultKick').textContent = fit.kick;
  $('#curveDetail').textContent = `${fit.curve} starting point`;
  $('#heroFlex').textContent = fit.flex;
  $('#heroLength').innerHTML = `${fit.lengthIn}<span>″</span>`;
  const cutWarning = fit.lengthIn < (fit.stickClass === 'Junior' ? 54 : fit.stickClass === 'Intermediate' ? 57 : fit.stickClass === 'Senior' ? 60 : 48);
  $('#fitNote').innerHTML = `<b>Fit check:</b> In skates, the top should usually land between the chin and nose. ${p.position === 'defense' ? 'Your result leans slightly longer for reach and defensive play.' : 'Your result stays near the middle of the range for control.'} ${cutWarning ? 'If the stock shaft needs cutting, it will feel stiffer than its printed flex—test before cutting.' : 'Avoid adding length unless the exact stock shaft is too short.'}`;
  $('#sortResults').value = 'match'; renderProducts();
}

$('#nextButton').addEventListener('click', () => {
  if (state.step === 1 && !validateStepOne()) return;
  if (state.step < 4) showStep(state.step+1);
});
$('#backButton').addEventListener('click', () => showStep(Math.max(1,state.step-1)));
$('#editButton').addEventListener('click', () => showStep(1));
$('#restartButton').addEventListener('click', () => { form.reset(); kg.value=36; syncWeight('kg'); cm.value=157; syncHeight('cm'); showStep(1); });
$('#sortResults').addEventListener('change', e => renderProducts(e.target.value));
$('#photoButton').addEventListener('click', () => { const toast=$('#toast'); toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2400); $('#photoFit').scrollIntoView({behavior:'smooth'}); });
$('#shareButton').addEventListener('click', async () => {
  const shareData = { title:'HockeyFit', text:'Find a better starting point for hockey stick length and flex with this free community tool.', url:window.location.href };
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(window.location.href); const toast=$('#toast'); toast.textContent='HockeyFit link copied.'; toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'),2200); }
  } catch (error) { if (error.name !== 'AbortError') console.warn('Sharing was not available.', error); }
});

window.HockeyFit = { calculateFit, rankProducts, productFamilies };
