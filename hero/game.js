const WORKER_URL = "https://element-heroes-worker.jingkevin0408.workers.dev";

let socket = null;
let roomCode = null;
let playerId = null;
let gameState = null;

const lobby = document.getElementById("lobby");
const game = document.getElementById("game");
const roomLabel = document.getElementById("roomCode");
const logBox = document.getElementById("log");

const createBtn = document.getElementById("createGame");
const joinBtn = document.getElementById("joinGame");
const roomInput = document.getElementById("roomInput");

createBtn.onclick = createRoom;
joinBtn.onclick = joinRoom;

async function createRoom() {
  const res = await fetch(WORKER_URL + "/create-room", {
    method: "POST"
  });

  const data = await res.json();

  roomCode = data.roomCode;
  playerId = data.playerId;

  connectSocket();
}

async function joinRoom() {
  const code = roomInput.value.trim().toUpperCase();

  const res = await fetch(WORKER_URL + "/join-room", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ roomCode: code })
  });

  const data = await res.json();

  if (data.type === "error") {
    alert(data.message);
    return;
  }

  roomCode = data.roomCode;
  playerId = data.playerId;

  connectSocket();
}

function connectSocket() {
  const url = WORKER_URL.replace("https://", "wss://");

  socket = new WebSocket(
    `${url}/ws?room=${roomCode}&player=${playerId}`
  );

  socket.onopen = () => {
    lobby.style.display = "none";
    game.style.display = "block";
    roomLabel.textContent = "Room: " + roomCode;
  };

  socket.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    if (msg.type === "state") {
      gameState = msg.game;
      render();
    }

    if (msg.type === "info") {
      addLog(msg.message);
    }

    if (msg.type === "error") {
      alert(msg.message);
    }
  };
}

function send(action, payload = {}) {
  socket.send(
    JSON.stringify({
      action,
      payload
    })
  );
}

function playCard(i) {
  send("play_card", { handIndex: i });
}

function removeFieldCard(i) {
  send("remove_field_card", { fieldIndex: i });
}

function endTurn() {
  send("end_turn");
}

function restartMatch() {
  send("restart_match");
}

function addLog(text) {
  const line = document.createElement("div");
  line.textContent = text;
  logBox.prepend(line);
}

function render() {
  if (!gameState) return;

  const me = gameState.players[playerId];
  const enemy = gameState.players[playerId === 1 ? 2 : 1];

  document.getElementById("myHP").textContent = me.hp;
  document.getElementById("enemyHP").textContent = enemy.hp;
  document.getElementById("energy").textContent = me.energy;

  renderHand(me);
  renderField(me, "myField", true);
  renderField(enemy, "enemyField", false);

  renderLog();
}

function renderHand(player) {
  const handDiv = document.getElementById("hand");
  handDiv.innerHTML = "";

  player.hand.forEach((card, i) => {
    const btn = document.createElement("button");
    btn.textContent = `${card.name} (${card.cost})`;
    btn.onclick = () => playCard(i);
    handDiv.appendChild(btn);
  });
}

function renderField(player, id, mine) {
  const div = document.getElementById(id);
  div.innerHTML = "";

  player.field.forEach((card, i) => {
    const el = document.createElement("div");
    el.textContent = card.name;

    if (mine) {
      el.onclick = () => removeFieldCard(i);
    }

    div.appendChild(el);
  });
}

function renderLog() {
  logBox.innerHTML = "";

  gameState.log.forEach((line) => {
    const el = document.createElement("div");
    el.textContent = line;
    logBox.appendChild(el);
  });
}