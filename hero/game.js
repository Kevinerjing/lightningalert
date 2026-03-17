const WORKER_URL = "https://element-heroes-worker.jingkevin0408.workers.dev";

let socket = null;
let roomCode = "";
let playerId = null;
let isHost = false;
let gameState = null;
let selectedCardIndex = null;
let selectedFieldIndex = null;
let playerName = "";

const CARD_LIBRARY = {
  sulfur: { id: "sulfur", name: "Sulfur", type: "Element", cost: 1, symbol: "S", text: "Combustible element used in fire reactions.", className: "element-sulfur", tags: ["element", "fire"] },
  oxygen: { id: "oxygen", name: "Oxygen", type: "Element", cost: 1, symbol: "O", text: "Supports combustion and oxidation.", className: "element-oxygen", tags: ["element", "air"] },
  water: { id: "water", name: "Water", type: "Element", cost: 1, symbol: "H2O", text: "Liquid element enabling steam reactions.", className: "element-water", tags: ["element", "liquid"] },
  iron: { id: "iron", name: "Iron", type: "Element", cost: 1, symbol: "Fe", text: "Metal used for rust reactions.", className: "element-iron", tags: ["element", "metal"] },
  hydrogen: { id: "hydrogen", name: "Hydrogen", type: "Element", cost: 1, symbol: "H", text: "Highly flammable gas element.", className: "element-hydrogen", tags: ["element", "gas"] },
  carbon: { id: "carbon", name: "Carbon", type: "Element", cost: 1, symbol: "C", text: "Foundation of many reactions.", className: "element-carbon", tags: ["element", "solid"] },
  chlorine: { id: "chlorine", name: "Chlorine", type: "Element", cost: 1, symbol: "Cl", text: "Reactive gas useful for salt and poison combos.", className: "element-chlorine", tags: ["element", "gas"] },
  sodium: { id: "sodium", name: "Sodium", type: "Element", cost: 1, symbol: "Na", text: "Reactive metal that pairs with chlorine.", className: "element-sodium", tags: ["element", "metal"] },
  combustion: { id: "combustion", name: "Combustion", type: "Reaction", cost: 2, symbol: "RXN", text: "Sulfur + Oxygen = 7 damage.", tags: ["reaction", "fire"] },
  steamBurst: { id: "steamBurst", name: "Steam Burst", type: "Reaction", cost: 2, symbol: "RXN", text: "Water + Oxygen = 5 damage and Wet.", tags: ["reaction", "steam"] },
  acidRain: { id: "acidRain", name: "Acid Rain", type: "Reaction", cost: 2, symbol: "RXN", text: "Sulfur + Water = 4 damage and Corroded.", tags: ["reaction", "acid"] },
  rust: { id: "rust", name: "Rust", type: "Reaction", cost: 2, symbol: "RXN", text: "Iron + Oxygen = 4 damage and Corroded.", tags: ["reaction", "metal"] },
  explosion: { id: "explosion", name: "Explosion", type: "Reaction", cost: 3, symbol: "RXN", text: "Hydrogen + Oxygen = 8 damage.", tags: ["reaction", "burst"] },
  saltFormation: { id: "saltFormation", name: "Salt Formation", type: "Reaction", cost: 2, symbol: "RXN", text: "Sodium + Chlorine = 5 damage and cleanse your Wet.", tags: ["reaction", "salt"] },
  carbonBurn: { id: "carbonBurn", name: "Carbon Burn", type: "Reaction", cost: 2, symbol: "RXN", text: "Carbon + Oxygen = 5 damage.", tags: ["reaction", "fire"] },
  fireball: { id: "fireball", name: "Fireball", type: "Attack", cost: 1, symbol: "ATK", text: "Deal 3 damage. +2 if enemy Wet.", tags: ["attack", "fire"] },
  hammerStrike: { id: "hammerStrike", name: "Hammer Strike", type: "Attack", cost: 1, symbol: "ATK", text: "Deal 2 damage. +2 if Iron on field.", tags: ["attack", "metal"] },
  corrode: { id: "corrode", name: "Corrode", type: "Attack", cost: 2, symbol: "ATK", text: "Destroy enemy field card if enemy Corroded.", tags: ["attack", "control"] },
  lightning: { id: "lightning", name: "Lightning", type: "Attack", cost: 2, symbol: "ATK", text: "Deal 4 damage.", tags: ["attack", "shock"] },
  poisonCloud: { id: "poisonCloud", name: "Poison Cloud", type: "Attack", cost: 2, symbol: "ATK", text: "Deal 2 damage and apply Corroded.", tags: ["attack", "poison"] },
  catalyst: { id: "catalyst", name: "Catalyst", type: "Utility", cost: 1, symbol: "UTL", text: "Gain 1 energy.", tags: ["utility", "lab"] },
  shield: { id: "shield", name: "Lab Shield", type: "Utility", cost: 1, symbol: "UTL", text: "Heal 2 HP.", tags: ["utility", "defense"] }
};

const nameModal = document.getElementById("nameModal");
const playerNameInput = document.getElementById("playerNameInput");
const p1NameLabel = document.getElementById("p1NameLabel");
const p2NameLabel = document.getElementById("p2NameLabel");

function getEnteredPlayerName() {
  if (!playerNameInput) return "Guest";
  const rawName = playerNameInput.value.trim();
  return rawName ? rawName.slice(0, 20) : "Guest";
}

function syncPlayerNameFromInput() {
  playerName = getEnteredPlayerName();
  updatePlayerLabels();
}

function hideNameModal() {
  if (nameModal) {
    nameModal.classList.add("hidden");
  }
}

function showNameModal() {
  if (nameModal) {
    nameModal.classList.remove("hidden");
  }
}

function updatePlayerLabels() {
  if (p1NameLabel) {
    p1NameLabel.textContent =
      playerId === 1 ? `Player 1 - ${playerName || "Guest"}` : "Player 1";
  }

  if (p2NameLabel) {
    p2NameLabel.textContent =
      playerId === 2 ? `Player 2 - ${playerName || "Guest"}` : "Player 2";
  }
}

if (playerNameInput) {
  playerNameInput.addEventListener("input", () => {
    syncPlayerNameFromInput();
  });

  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("hostBtn")?.click();
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function addConnectionLog(message) {
  const log = document.getElementById("connectionLog");
  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = message;
  log.prepend(item);
  while (log.children.length > 20) {
    log.removeChild(log.lastChild);
  }
  document.getElementById("lobbyMessage").textContent = message;
}

function updateHeaderState() {
  document.getElementById("connectionPill").textContent =
    socket && socket.readyState === WebSocket.OPEN ? "Connected" : "Disconnected";
  document.getElementById("roomPill").textContent = roomCode ? `Room ${roomCode}` : "No room";
  document.getElementById("gameRoomCodePill").textContent = roomCode ? `Room: ${roomCode}` : "Room: ----";
  document.getElementById("playerRoleText").textContent =
    playerId ? `You are Player ${playerId}${isHost ? " (Host)" : ""}` : "Not in a room";
}

function showLobby() {
  document.getElementById("lobbyPanel").classList.remove("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
}

function showGame() {
  document.getElementById("lobbyPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");
}

function showOverlay(title, text, winnerText = "") {
  document.getElementById("overlayTitle").textContent = title;
  document.getElementById("overlayText").textContent = text;
  const winner = document.getElementById("winnerText");
  if (winnerText) {
    winner.textContent = winnerText;
    winner.classList.remove("hidden");
  } else {
    winner.textContent = "";
    winner.classList.add("hidden");
  }
  document.getElementById("gameOverlay").classList.remove("hidden");
}

function hideOverlay() {
  document.getElementById("gameOverlay").classList.add("hidden");
}

async function createRoom() {
  try {
    syncPlayerNameFromInput();

    const response = await fetch(`${WORKER_URL}/create-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: playerName || "Guest"
      })
    });

    const data = await response.json();
    if (data.type === "error") {
      throw new Error(data.message);
    }

    roomCode = data.roomCode;
    playerId = data.playerId;
    isHost = true;

    hideNameModal();
    updatePlayerLabels();
    updateHeaderState();
    showGame();
    addConnectionLog(`Room created: ${roomCode}`);
    connectSocket();
  } catch (error) {
    addConnectionLog(`Create Room failed: ${error.message}`);
  }
}

async function joinRoom() {
  try {
    syncPlayerNameFromInput();

    const code = document.getElementById("joinCodeInput").value.trim().toUpperCase();
    if (!code) {
      throw new Error("Enter a room code.");
    }

    const response = await fetch(`${WORKER_URL}/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        roomCode: code,
        name: playerName || "Guest"
      })
    });

    const data = await response.json();
    if (data.type === "error") {
      throw new Error(data.message);
    }

    roomCode = data.roomCode;
    playerId = data.playerId;
    isHost = false;

    hideNameModal();
    updatePlayerLabels();
    updateHeaderState();
    showGame();
    addConnectionLog(`Joined room: ${roomCode}`);
    connectSocket();
  } catch (error) {
    addConnectionLog(`Join Room failed: ${error.message}`);
  }
}

function connectSocket() {
  if (socket) {
    socket.close();
  }

  const wsBase = WORKER_URL.replace(/^https:/, "wss:");
  socket = new WebSocket(`${wsBase}/ws?room=${encodeURIComponent(roomCode)}&player=${encodeURIComponent(playerId)}`);

  socket.addEventListener("open", () => {
    updateHeaderState();
    addConnectionLog("WebSocket connected.");
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "info") {
      addConnectionLog(message.message);
      return;
    }

    if (message.type === "error") {
      addConnectionLog(`Server error: ${message.message}`);
      showOverlay("Action Rejected", message.message);
      return;
    }

    if (message.type === "state") {
      gameState = message.game;
      selectedCardIndex = null;
      selectedFieldIndex = null;
      render();

      if (gameState && gameState.winner) {
        showOverlay(
          "Match Over",
          "The duel has ended.",
          gameState.winner === "Draw" ? "It is a draw." : `${gameState.winner} wins!`
        );
      } else {
        hideOverlay();
      }
    }
  });

  socket.addEventListener("close", () => {
    updateHeaderState();
    addConnectionLog("WebSocket disconnected.");
  });

  socket.addEventListener("error", () => {
    addConnectionLog("WebSocket error.");
  });
}

function sendAction(action, payload = {}) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    addConnectionLog("Not connected.");
    return;
  }
  socket.send(JSON.stringify({ action, payload }));
}

function isMyTurn() {
  return !!gameState && playerId === gameState.currentPlayer && !gameState.winner;
}

function selectCard(index) {
  if (!isMyTurn()) return;
  const player = gameState.players[playerId];
  if (!player.hand[index]) return;
  selectedCardIndex = index;
  selectedFieldIndex = null;
  render();
}

function selectFieldCard(index) {
  if (!isMyTurn()) return;
  const player = gameState.players[playerId];
  if (!player.field[index]) return;
  selectedFieldIndex = index;
  selectedCardIndex = null;
  render();
}

function createCardElement(card, isSelected, onClick) {
  const el = document.createElement("div");
  const tags = Array.isArray(card.tags) ? card.tags : [];
  el.className = (`card ${card.className || ""} ${isSelected ? "selected" : ""}`).trim();
  el.innerHTML =
    `<div class="card-top">
      <div class="card-name">${escapeHtml(card.name || "")}</div>
      <div class="card-cost">${escapeHtml(String(card.cost || 0))}</div>
    </div>
    <div class="card-art">${escapeHtml(card.symbol || "")}</div>
    <div>
      <div class="card-type">${escapeHtml(card.type || "")}</div>
      <div class="card-text">${escapeHtml(card.text || "")}</div>
    </div>
    <div class="card-tags">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;

  el.addEventListener("click", onClick);
  return el;
}

function createMiniCard(card) {
  const el = document.createElement("div");
  el.className = "mini-card";
  el.innerHTML = `<strong>${escapeHtml(card.name || "")}</strong><span>${escapeHtml(card.symbol || "")}</span><span>${escapeHtml(card.type || "")}</span>`;
  return el;
}

function renderStatuses(containerId, statuses) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  if (!statuses.length) {
    const chip = document.createElement("div");
    chip.className = "status-chip";
    chip.textContent = "No active statuses";
    container.appendChild(chip);
    return;
  }
  statuses.forEach((status) => {
    const chip = document.createElement("div");
    chip.className = "status-chip";
    chip.textContent = status;
    container.appendChild(chip);
  });
}

function renderField(containerId, pid) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const player = gameState.players[pid];
  const clickable = pid === playerId && isMyTurn();

  player.field.forEach((card, index) => {
    container.appendChild(
      createCardElement(
        card,
        clickable && selectedFieldIndex === index,
        clickable ? () => selectFieldCard(index) : () => {}
      )
    );
  });

  for (let i = player.field.length; i < 3; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "Empty field slot";
    container.appendChild(slot);
  }
}

function renderHand(containerId, pid) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const player = gameState.players[pid];

  if (pid !== playerId) {
    for (let i = 0; i < player.hand.length; i += 1) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "Hidden card";
      container.appendChild(slot);
    }
    if (!player.hand.length) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "No cards in hand";
      container.appendChild(slot);
    }
    return;
  }

  player.hand.forEach((card, index) => {
    container.appendChild(
      createCardElement(card, selectedCardIndex === index, () => selectCard(index))
    );
  });

  if (!player.hand.length) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "No cards in hand";
    container.appendChild(slot);
  }
}

function renderPreview(containerId, pid) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const player = gameState.players[pid];

  if (!player.field.length) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.width = "100%";
    slot.style.minHeight = "82px";
    slot.textContent = "No field cards";
    container.appendChild(slot);
    return;
  }

  player.field.forEach((card) => {
    container.appendChild(createMiniCard(card));
  });
}

function renderSelectedCardBox() {
  const box = document.getElementById("selectedCardBox");
  const playBtn = document.getElementById("playCardBtn");
  const removeBtn = document.getElementById("removeFieldCardBtn");

  playBtn.disabled = true;
  removeBtn.disabled = true;

  if (!gameState) {
    box.textContent = "No card selected.";
    return;
  }

  if (!isMyTurn()) {
    box.textContent = gameState.winner ? "Match finished." : "Wait for your turn.";
    return;
  }

  const player = gameState.players[playerId];

  if (selectedCardIndex !== null && player.hand[selectedCardIndex]) {
    const card = player.hand[selectedCardIndex];
    box.innerHTML =
      `<strong style="font-size:18px;">${escapeHtml(card.name || "")}</strong><br>
      <span style="color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-size: 12px;">${escapeHtml(card.type || "")}</span>
      <p style="line-height:1.55;">${escapeHtml(card.text || "")}</p>
      <div style="color: var(--muted);">Cost: ${escapeHtml(String(card.cost || 0))} energy</div>`;
    playBtn.disabled = false;
    return;
  }

  if (selectedFieldIndex !== null && player.field[selectedFieldIndex]) {
    const card = player.field[selectedFieldIndex];
    box.innerHTML =
      `<strong style="font-size:18px;">${escapeHtml(card.name || "")}</strong><br>
      <span style="color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-size: 12px;">Field Card</span>
      <p style="line-height:1.55;">This card is on your field. Remove it if you want to free a slot or change your combo.</p>
      <div style="color: var(--muted);">Remove cost: 0 energy</div>`;
    removeBtn.disabled = false;
    return;
  }

  box.textContent = "No card selected.";
}

function renderCombatLog() {
  const log = document.getElementById("combatLog");
  log.innerHTML = "";
  const items = Array.isArray(gameState.log) ? gameState.log : [];
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "log-item";
    el.textContent = item;
    log.appendChild(el);
  });
}

function updatePlayerBars(pid) {
  const p = gameState.players[pid];
  document.getElementById(`p${pid}HpText`).textContent = `${p.hp} / ${p.maxHp}`;
  document.getElementById(`p${pid}EnergyText`).textContent = `${p.energy} / ${p.maxEnergy}`;
  document.getElementById(`p${pid}HpBar`).style.width = `${(p.hp / p.maxHp) * 100}%`;
  document.getElementById(`p${pid}EnergyBar`).style.width = `${(p.energy / p.maxEnergy) * 100}%`;
  document.getElementById(`p${pid}DeckCount`).textContent = p.deck.length;
  document.getElementById(`p${pid}HandCount`).textContent = p.hand.length;
  document.getElementById(`p${pid}DiscardCount`).textContent = p.discard.length;
}

function render() {
  if (!gameState) return;

  updatePlayerBars(1);
  updatePlayerBars(2);
  renderStatuses("p1Statuses", gameState.players[1].statuses);
  renderStatuses("p2Statuses", gameState.players[2].statuses);
  renderField("p1Field", 1);
  renderField("p2Field", 2);
  renderHand("p1Hand", 1);
  renderHand("p2Hand", 2);
  renderPreview("p1FieldPreview", 1);
  renderPreview("p2FieldPreview", 2);
  renderSelectedCardBox();
  renderCombatLog();

  document.getElementById("turnPill").textContent = `Turn: ${gameState.turn}`;
  document.getElementById("turnBanner").textContent =
    gameState.winner ? "Finished" : `Turn ${gameState.turn} - Player ${gameState.currentPlayer}`;
  document.getElementById("roomStateText").textContent =
    gameState.winner
      ? `Winner: ${gameState.winner}`
      : isMyTurn()
      ? "Your turn."
      : "Opponent turn.";

  document.getElementById("endTurnBtn").disabled = !isMyTurn();
  document.getElementById("restartBtn").disabled = !isHost;
  updatePlayerLabels();
  updateHeaderState();
}

function playSelectedCard() {
  if (!isMyTurn() || selectedCardIndex === null) return;
  sendAction("play_card", { handIndex: selectedCardIndex });
}

function removeSelectedFieldCard() {
  if (!isMyTurn() || selectedFieldIndex === null) return;
  sendAction("remove_field_card", { fieldIndex: selectedFieldIndex });
}

function clearSelection() {
  selectedCardIndex = null;
  selectedFieldIndex = null;
  render();
}

function endTurn() {
  if (!isMyTurn()) return;
  sendAction("end_turn", {});
}

function restartMatch() {
  if (!isHost) return;
  sendAction("restart_match", {});
}

function leaveRoom() {
  if (socket) {
    socket.close();
  }
  socket = null;
  roomCode = "";
  playerId = null;
  isHost = false;
  gameState = null;
  selectedCardIndex = null;
  selectedFieldIndex = null;
  showNameModal();
  updatePlayerLabels();
  updateHeaderState();
  showLobby();
  addConnectionLog("Left room.");
}

document.getElementById("hostBtn").addEventListener("click", createRoom);
document.getElementById("joinBtn").addEventListener("click", joinRoom);
document.getElementById("playCardBtn").addEventListener("click", playSelectedCard);
document.getElementById("removeFieldCardBtn").addEventListener("click", removeSelectedFieldCard);
document.getElementById("clearSelectionBtn").addEventListener("click", clearSelection);
document.getElementById("endTurnBtn").addEventListener("click", endTurn);
document.getElementById("restartBtn").addEventListener("click", restartMatch);
document.getElementById("leaveBtn").addEventListener("click", leaveRoom);
document.getElementById("overlayBtn").addEventListener("click", hideOverlay);

updatePlayerLabels();
updateHeaderState();
addConnectionLog("Ready."); now?