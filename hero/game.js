const handEl = document.getElementById('hand');
const logEl = document.getElementById('log');

const cards = ["Fire","Water","Air","Earth"];

cards.forEach(c=>{
  const div=document.createElement('div');
  div.className='card';
  div.innerText=c;
  handEl.appendChild(div);
});

function log(msg){
  const p=document.createElement('div');
  p.innerText=msg;
  logEl.appendChild(p);
}

document.getElementById('play-btn').onclick=()=>log("Played card");
document.getElementById('end-turn-btn').onclick=()=>log("End Turn");
document.getElementById('clear-btn').onclick=()=>log("Cleared");
