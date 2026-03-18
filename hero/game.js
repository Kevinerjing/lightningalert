const WORKER_URL = "https://element-heroes-worker.jingkevin0408.workers.dev";

let socket = null;
let reconnectTimer = null;
let manualClose = false;

let roomCode = "";
let playerId = null;
let isHost = false;
let gameState = null;
let previousGameState = null;
let selectedCardIndex = null;
let selectedFieldIndex = null;
let pendingLocalEffect = null;

let roomListRefreshTimer = null;
let currentRoomList = [];

const CARD_LIBRARY = {
  sulfur: {
    id: "sulfur",
    name: "Sulfur",
    type: "Element",
    cost: 1,
    symbol: "S",
    text: "Combustible element used in fire reactions.",
    className: "element-sulfur",
    tags: ["element", "fire"],
    image: "images/cards/sulfur.png",
  },
  oxygen: {
    id: "oxygen",
    name: "Oxygen",
    type: "Element",
    cost: 1,
    symbol: "O",
    text: "Supports combustion and oxidation.",
    className: "element-oxygen",
    tags: ["element", "air"],
    image: "images/cards/oxygen.png",
  },
  water: {
    id: "water",
    name: "Water",
    type: "Element",
    cost: 1,
    symbol: "H2O",
    text: "Liquid element enabling steam reactions.",
    className: "element-water",
    tags: ["element", "liquid"],
    image: "images/cards/water.png",
  },
  iron: {
    id: "iron",
    name: "Iron",
    type: "Element",
    cost: 1,
    symbol: "Fe",
    text: "Metal used for rust reactions.",
    className: "element-iron",
    tags: ["element", "metal"],
    image: "images/cards/iron.png",
  },
  hydrogen: {
    id: "hydrogen",
    name: "Hydrogen",
    type: "Element",
    cost: 1,
    symbol: "H",
    text: "Highly flammable gas element.",
    className: "element-hydrogen",
    tags: ["element", "gas"],
    image: "images/cards/hydrogen.png",
  },
  carbon: {
    id: "carbon",
    name: "Carbon",
    type: "Element",
    cost: 1,
    symbol: "C",
    text: "Foundation of many reactions.",
    className: "element-carbon",
    tags: ["element", "solid"],
    image: "images/cards/carbon.png",
  },
  chlorine: {
    id: "chlorine",
    name: "Chlorine",
    type: "Element",
    cost: 1,
    symbol: "Cl",
    text: "Reactive gas useful for salt and poison combos.",
    className: "element-chlorine",
    tags: ["element", "gas"],
    image: "images/cards/chlorine.png",
  },
  sodium: {
    id: "sodium",
    name: "Sodium",
    type: "Element",
    cost: 1,
    symbol: "Na",
    text: "Reactive metal that pairs with chlorine.",
    className: "element-sodium",
    tags: ["element", "metal"],
    image: "images/cards/sodium.png",
  },
  potassium: {
    id: "potassium",
    name: "Potassium",
    type: "Element",
    cost: 1,
    symbol: "K",
    text: "Highly reactive alkali metal. Violent with water.",
    className: "element-potassium",
    tags: ["element", "metal", "alkali"],
    image: "images/cards/potassium.png",
  },
  helium: {
    id: "helium",
    name: "Helium",
    type: "Element",
    cost: 1,
    symbol: "He",
    text: "Stable noble gas. Hard to react with.",
    className: "element-helium",
    tags: ["element", "gas", "noble"],
    image: "images/cards/helium.png",
  },
  calcium: {
    id: "calcium",
    name: "Calcium",
    type: "Element",
    cost: 1,
    symbol: "Ca",
    text: "Reactive metal forming lime and minerals.",
    className: "element-calcium",
    tags: ["element", "metal", "earth"],
    image: "images/cards/calcium.png",
  },

  combustion: {
    id: "combustion",
    name: "Combustion",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sulfur + Oxygen = 7 damage.",
    tags: ["reaction", "fire"],
    image: "images/cards/combustion.png",
  },
  steamBurst: {
    id: "steamBurst",
    name: "Steam Burst",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Water + Oxygen = 5 damage and Wet.",
    tags: ["reaction", "steam"],
    image: "images/cards/steam_burst.png",
  },
  acidRain: {
    id: "acidRain",
    name: "Acid Rain",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sulfur + Water = 4 damage and Corroded.",
    tags: ["reaction", "acid"],
    image: "images/cards/acid_rain.png",
  },
  rust: {
    id: "rust",
    name: "Rust",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Iron + Oxygen = 4 damage and Corroded.",
    tags: ["reaction", "metal"],
    image: "images/cards/rust.png",
  },
  explosion: {
    id: "explosion",
    name: "Explosion",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Hydrogen + Oxygen = 8 damage.",
    tags: ["reaction", "burst"],
    image: "images/cards/explosion.png",
  },
  saltFormation: {
    id: "saltFormation",
    name: "Salt Formation",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Sodium + Chlorine = 5 damage and cleanse your Wet.",
    tags: ["reaction", "salt"],
    image: "images/cards/salt_formation.png",
  },
  carbonBurn: {
    id: "carbonBurn",
    name: "Carbon Burn",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Carbon + Oxygen = 5 damage.",
    tags: ["reaction", "fire"],
    image: "images/cards/carbon_burn.png",
  },
  potassiumWater: {
    id: "potassiumWater",
    name: "Alkali Reaction",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Potassium + Water = 9 damage and Wet.",
    tags: ["reaction", "alkali"],
    image: "images/cards/potassium_water.png",
  },
  limeFormation: {
    id: "limeFormation",
    name: "Lime Formation",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Calcium + Water = 5 damage and gain 1 energy.",
    tags: ["reaction", "earth"],
    image: "images/cards/lime_formation.png",
  },
  hydrogenBurn: {
    id: "hydrogenBurn",
    name: "Hydrogen Burn",
    type: "Reaction",
    cost: 2,
    symbol: "RXN",
    text: "Hydrogen + Fire = 6 damage.",
    tags: ["reaction", "fire"],
    image: "images/cards/hydrogen_burn.png",
  },
  calciumSteam: {
    id: "calciumSteam",
    name: "Calcium Steam",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Calcium + Water = Apply Wet and deal 6 damage.",
    tags: ["reaction", "steam"],
    image: "images/cards/calcium_steam.png",
  },
  alkaliExplosion: {
    id: "alkaliExplosion",
    name: "Alkali Explosion",
    type: "Reaction",
    cost: 3,
    symbol: "RXN",
    text: "Potassium + Oxygen = 8 damage.",
    tags: ["reaction", "burst"],
    image: "images/cards/alkali_explosion.png",
  },

  fireball: {
    id: "fireball",
    name: "Fireball",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 3 damage. +2 if enemy Wet.",
    tags: ["attack", "fire"],
    image: "images/cards/fireball.png",
  },
  hammerStrike: {
    id: "hammerStrike",
    name: "Hammer Strike",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 2 damage. +2 if Iron on field.",
    tags: ["attack", "metal"],
    image: "images/cards/hammer_strike.png",
  },
  corrode: {
    id: "corrode",
    name: "Corrode",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Destroy enemy field card if enemy Corroded.",
    tags: ["attack", "control"],
    image: "images/cards/corrode.png",
  },
  lightning: {
    id: "lightning",
    name: "Lightning",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 4 damage.",
    tags: ["attack", "shock"],
    image: "images/cards/lightning.png",
  },
  poisonCloud: {
    id: "poisonCloud",
    name: "Poison Cloud",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 2 damage and apply Corroded.",
    tags: ["attack", "poison"],
    image: "images/cards/poison_cloud.png",
  },
  plasmaShock: {
    id: "plasmaShock",
    name: "Plasma Shock",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 5 damage. +2 if Oxygen present.",
    tags: ["attack", "shock"],
    image: "images/cards/plasma_shock.png",
  },
  alkaliBlast: {
    id: "alkaliBlast",
    name: "Alkali Blast",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 4 damage. +3 if Potassium on field.",
    tags: ["attack", "alkali"],
    image: "images/cards/alkali_blast.png",
  },
  metalCrush: {
    id: "metalCrush",
    name: "Metal Crush",
    type: "Attack",
    cost: 2,
    symbol: "ATK",
    text: "Deal 3 damage. +2 if Calcium or Iron on field.",
    tags: ["attack", "metal"],
    image: "images/cards/metal_crush.png",
  },
  noblePressure: {
    id: "noblePressure",
    name: "Noble Pressure",
    type: "Attack",
    cost: 1,
    symbol: "ATK",
    text: "Deal 2 damage. Draw 1 card if Helium on field.",
    tags: ["attack", "gas"],
    image: "images/cards/noble_pressure.png",
  },

  catalyst: {
    id: "catalyst",
    name: "Catalyst",
    type: "Utility",
    cost: 1,
    symbol: "UTL",
    text: "Gain 1 energy.",
    tags: ["utility", "lab"],
    image: "images/cards/catalyst.png",
  },
  shield: {
    id: "shield",
    name: "Lab Shield",
    type: "Utility",
    cost: 1,
    symbol: "UTL",
    text: "Heal 2 HP.",
    tags: ["utility", "defense"],
    image: "images/cards/shield.png",
  },
};

const CARD_NAME_TO_ID = Object.values(CARD_LIBRARY).reduce((map, card) => {
  map[card.name.toLowerCase()] = card.id;
  return map;
}, {});

function maskRoomCode(code) {
  if (!code) return "----";
  if (code.length <= 3) return code;
  return code.slice(0, 3) + "***";
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addConnectionLog(message) {
  const log = document.getElementById("connectionLog");
  if (!log) return;

  const item = document.createElement("div");
  item.className = "log-item";
  item.textContent = message;
  log.prepend(item);

  while (log.children.length > 20) {
    log.removeChild(log.lastChild);
  }

  const lobbyMessage = document.getElementById("lobbyMessage");
  if (lobbyMessage) {
    lobbyMessage.textContent = message;
  }
}

function updateHeaderState() {
  const connected = socket && socket.readyState === WebSocket.OPEN;

  const connectionPill = document.getElementById("connectionPill");
  const roomPill = document.getElementById("roomPill");
  const gameRoomCodePill = document.getElementById("gameRoomCodePill");
  const playerRoleText = document.getElementById("playerRoleText");

  if (connectionPill) {
    connectionPill.textContent = connected ? "Connected" : "Disconnected";
  }

  if (roomPill) {
    roomPill.textContent = roomCode ? `Room ${roomCode}` : "No room";
  }

  if (gameRoomCodePill) {
    gameRoomCodePill.textContent = roomCode ? `Room: ${roomCode}` : "Room: ----";
  }

  if (playerRoleText) {
    playerRoleText.textContent = playerId
      ? `You are Player ${playerId}${isHost ? " (Host)" : ""}`
      : "Not in a room";
  }
}

function updateHostRoomCard() {
  const cardEl = document.getElementById("hostRoomCard");
  const codeEl = document.getElementById("hostRoomCodeText");
  const statusEl = document.getElementById("hostRoomStatusText");

  if (!cardEl || !codeEl || !statusEl) return;

  if (!roomCode) {
    cardEl.classList.add("hidden");
    codeEl.textContent = "------";
    statusEl.textContent = "Not hosting";
    return;
  }

  cardEl.classList.remove("hidden");

  let playerCount = 0;
  let started = false;

  if (gameState?.players) {
    const p1Exists = !!gameState.players[1];
    const p2Exists = !!gameState.players[2];
    playerCount = Number(p1Exists) + Number(p2Exists);
    started = !gameState.winner && playerCount >= 2;
  } else {
    const found = currentRoomList.find((r) => r.code === roomCode);
    if (found) {
      playerCount = found.playerCount || 0;
      started = !!found.started;
    }
  }

  if (playerCount >= 2 || started) {
    codeEl.textContent = maskRoomCode(roomCode);
  } else {
    codeEl.textContent = roomCode;
  }

  if (started) {
    statusEl.textContent = "Battle started";
  } else if (playerCount >= 2) {
    statusEl.textContent = "Room full";
  } else if (isHost) {
    statusEl.textContent = "Waiting for player...";
  } else {
    statusEl.textContent = "Joined room";
  }
}

async function loadRoomList() {
  const listEl = document.getElementById("roomList");
  const countPill = document.getElementById("roomListCountPill");
  const summaryEl = document.getElementById("roomWaitingSummary");

  if (!listEl || !countPill || !summaryEl) return;

  try {
    const res = await fetch(`${WORKER_URL}/rooms`, {
      method: "GET",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Failed to load rooms: ${res.status}`);
    }

    const data = await res.json();
    currentRoomList = Array.isArray(data.rooms) ? data.rooms : [];

    renderRoomList(currentRoomList);
    updateHostRoomCard();
  } catch (err) {
    console.error(err);
    countPill.textContent = "0 rooms";
    summaryEl.textContent = "Could not load room list.";
    listEl.innerHTML = `
      <div class="room-empty-card">
        <div class="room-empty-title">Unable to load rooms</div>
        <div class="room-empty-subtitle">Please try refreshing again.</div>
      </div>
    `;
  }
}

function renderRoomList(rooms) {
  const listEl = document.getElementById("roomList");
  const countPill = document.getElementById("roomListCountPill");
  const summaryEl = document.getElementById("roomWaitingSummary");

  if (!listEl || !countPill || !summaryEl) return;

  const visibleRooms = Array.isArray(rooms) ? rooms : [];
  const waitingCount = visibleRooms.filter((r) => (r.playerCount || 0) < 2 && !r.started).length;

  countPill.textContent = `${visibleRooms.length} room${visibleRooms.length === 1 ? "" : "s"}`;

  if (!visibleRooms.length) {
    summaryEl.textContent = "No rooms available right now.";
    listEl.innerHTML = `
      <div class="room-empty-card">
        <div class="room-empty-title">No open rooms</div>
        <div class="room-empty-subtitle">Create a room to start a match, or refresh to check again.</div>
      </div>
    `;
    return;
  }

  summaryEl.textContent =
    waitingCount > 0
      ? `${waitingCount} room${waitingCount === 1 ? "" : "s"} waiting for players.`
      : "All listed rooms are currently full or already in battle.";

  listEl.innerHTML = visibleRooms
    .map((room) => {
      const code = room.code || "----";
      const hostName = room.hostName || "Host";
      const playerCount = room.playerCount || 0;
      const started = !!room.started;

      let statusText = "Waiting";
      let statusClass = "waiting";
      let canJoin = true;

      if (started) {
        statusText = "In Battle";
        statusClass = "battle";
        canJoin = false;
      } else if (playerCount >= 2) {
        statusText = "Full";
        statusClass = "full";
        canJoin = false;
      }

      const displayCode = canJoin ? code : maskRoomCode(code);

      return `
        <div class="room-row">
          <div class="room-row-main">
            <div class="room-row-code">${escapeHtml(displayCode)}</div>
            <div class="room-row-meta">
              Host: ${escapeHtml(hostName)} · Players: ${playerCount}/2
            </div>
          </div>
          <div class="room-row-status ${statusClass}">${statusText}</div>
          <button
            class="secondary small-btn"
            ${canJoin ? "" : "disabled"}
            onclick="joinListedRoom('${escapeHtml(code)}')"
          >
            ${canJoin ? "Join" : "Locked"}
          </button>
        </div>
      `;
    })
    .join("");
}

function joinListedRoom(code) {
  const input = document.getElementById("joinCodeInput");
  if (input) {
    input.value = code;
  }
  joinRoom();
}

window.joinListedRoom = joinListedRoom;

function startRoomListAutoRefresh() {
  stopRoomListAutoRefresh();
  loadRoomList();
  roomListRefreshTimer = setInterval(loadRoomList, 5000);
}

function stopRoomListAutoRefresh() {
  if (roomListRefreshTimer) {
    clearInterval(roomListRefreshTimer);
    roomListRefreshTimer = null;
  }
}

function showLobby() {
  document.getElementById("lobbyPanel").classList.remove("hidden");
  document.getElementById("gamePanel").classList.add("hidden");
  startRoomListAutoRefresh();
}

function showGame() {
  document.getElementById("lobbyPanel").classList.add("hidden");
  document.getElementById("gamePanel").classList.remove("hidden");
  stopRoomListAutoRefresh();
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

function getSelfDeskSelector() {
  return "#player-desk";
}

function getOpponentDeskSelector() {
  return "#enemy-desk";
}

function getDeskSelectorForPid(pid) {
  if (!playerId) {
    return Number(pid) === 1 ? "#player-desk" : "#enemy-desk";
  }
  return Number(pid) === Number(playerId) ? "#player-desk" : "#enemy-desk";
}

function hasEffectSystem() {
  return typeof window.playCardEffect === "function";
}

function shouldForceEnemyEffect(cardId) {
  const card = CARD_LIBRARY[cardId];
  if (!card) return false;
  return card.type === "Attack" || card.type === "Reaction";
}

function getCardEffectContext(cardId, actorPid) {
  const card = CARD_LIBRARY[cardId];
  if (!card) return null;

  const actorDesk = getDeskSelectorForPid(actorPid);
  const targetDesk = getOpponentDeskSelector();
  const actorField = gameState?.players?.[actorPid]?.field || [];
  const opponentPid = Number(actorPid) === 1 ? 2 : 1;
  const opponentStatuses = gameState?.players?.[opponentPid]?.statuses || [];

  const ctx = {
    sourceSelector: actorDesk,
    targetSelector:
      card.type === "Attack" || card.type === "Reaction" ? targetDesk : actorDesk,
  };

  switch (cardId) {
    case "fireball":
      ctx.damage = opponentStatuses.includes("Wet") ? 5 : 3;
      ctx.enemyWet = opponentStatuses.includes("Wet");
      break;
    case "hammerStrike":
      ctx.damage = actorField.some((c) => c?.id === "iron") ? 4 : 2;
      break;
    case "lightning":
      ctx.damage = 4;
      break;
    case "poisonCloud":
      ctx.damage = 2;
      ctx.pulses = 2;
      ctx.damagePerPulse = 1;
      break;
    case "plasmaShock":
      ctx.damage = actorField.some((c) => c?.id === "oxygen") ? 7 : 5;
      break;
    case "alkaliBlast":
      ctx.damage = actorField.some((c) => c?.id === "potassium") ? 7 : 4;
      break;
    case "metalCrush":
      ctx.damage = actorField.some((c) => c?.id === "calcium" || c?.id === "iron") ? 5 : 3;
      break;
    case "noblePressure":
      ctx.damage = 2;
      ctx.draw = actorField.some((c) => c?.id === "helium") ? 1 : 0;
      ctx.hasHelium = actorField.some((c) => c?.id === "helium");
      break;
    case "combustion":
      ctx.damage = 7;
      break;
    case "steamBurst":
      ctx.damage = 5;
      break;
    case "acidRain":
      ctx.damage = 4;
      ctx.ticks = 2;
      ctx.damagePerTick = 2;
      break;
    case "rust":
      ctx.damage = 4;
      break;
    case "explosion":
      ctx.damage = 8;
      break;
    case "saltFormation":
      ctx.damage = 5;
      break;
    case "carbonBurn":
      ctx.damage = 5;
      break;
    case "potassiumWater":
      ctx.damage = 9;
      break;
    case "limeFormation":
      ctx.damage = 5;
      ctx.energy = 1;
      break;
    case "hydrogenBurn":
      ctx.damage = 6;
      break;
    case "calciumSteam":
      ctx.damage = 6;
      break;
    case "alkaliExplosion":
      ctx.damage = 8;
      break;
    case "catalyst":
      ctx.sourceSelector = actorDesk;
      ctx.targetSelector = actorDesk;
      ctx.energy = 1;
      break;
    case "shield":
      ctx.sourceSelector = actorDesk;
      ctx.targetSelector = actorDesk;
      ctx.heal = 2;
      break;
    default:
      if (card.type === "Utility" || card.type === "Element") {
        ctx.sourceSelector = actorDesk;
        ctx.targetSelector = actorDesk;
      } else {
        ctx.targetSelector = targetDesk;
      }
      break;
  }

  return ctx;
}

function triggerEffectForCard(cardId, actorPid) {
  if (!hasEffectSystem()) return;
  if (!CARD_LIBRARY[cardId]) return;

  const ctx = getCardEffectContext(cardId, actorPid);
  if (!ctx) return;

  try {
    window.playCardEffect(cardId, ctx);
  } catch (error) {
    console.warn("Effect play failed:", cardId, error);
  }
}

function extractNewLogItems(prevLog = [], nextLog = []) {
  if (!Array.isArray(prevLog) || !Array.isArray(nextLog)) return [];

  if (!prevLog.length) return nextLog.slice(0, 3);

  const appended =
    nextLog.length >= prevLog.length &&
    prevLog.every((item, i) => nextLog[i] === item);

  if (appended) {
    return nextLog.slice(prevLog.length);
  }

  const offset = nextLog.length - prevLog.length;
  if (offset >= 0 && prevLog.every((item, i) => nextLog[i + offset] === item)) {
    return nextLog.slice(0, offset);
  }

  return nextLog.slice(-3);
}

function detectCardIdFromLogText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const entries = Object.entries(CARD_NAME_TO_ID).sort((a, b) => b[0].length - a[0].length);

  for (const [name, id] of entries) {
    if (lower.includes(name)) return id;
  }

  return null;
}

function detectActorPidFromLogText(text) {
  if (!text) return null;
  const match = text.match(/player\s+([12])/i);
  if (!match) return null;
  return Number(match[1]);
}

function handleEffectsFromLogTransition(prevState, nextState) {
  if (!hasEffectSystem()) return;
  if (!nextState) return;

  const prevLog = Array.isArray(prevState?.log) ? prevState.log : [];
  const nextLog = Array.isArray(nextState?.log) ? nextState.log : [];
  const newItems = extractNewLogItems(prevLog, nextLog);

  let localEffectAlreadyPlayed = false;

  newItems.forEach((line) => {
    const cardId = detectCardIdFromLogText(line);
    const actorPid = detectActorPidFromLogText(line);

    if (!cardId || !actorPid) return;

    if (
      pendingLocalEffect &&
      pendingLocalEffect.cardId === cardId &&
      Number(pendingLocalEffect.actorPid) === Number(actorPid)
    ) {
      localEffectAlreadyPlayed = true;
      return;
    }

    triggerEffectForCard(cardId, actorPid);
  });

  if (pendingLocalEffect && !localEffectAlreadyPlayed) {
    triggerEffectForCard(pendingLocalEffect.cardId, pendingLocalEffect.actorPid);
  }

  pendingLocalEffect = null;
}

function handleIncomingEffect(effect) {
  if (!hasEffectSystem()) return;
  if (!effect) return;

  const cardId = effect.effectType || effect.cardId;
  if (!cardId || !CARD_LIBRARY[cardId]) return;

  const actorPid = Number(effect.actorPid || effect.sourcePid || effect.source || playerId || 1);
  const fallbackCtx = getCardEffectContext(cardId, actorPid) || {};
  const card = CARD_LIBRARY[cardId];
  const forceEnemy = shouldForceEnemyEffect(cardId);

  const ctx = {
    ...fallbackCtx,
    sourceSelector:
      effect.sourceSelector || fallbackCtx.sourceSelector || getDeskSelectorForPid(actorPid),
    targetSelector: forceEnemy
      ? getOpponentDeskSelector()
      : (effect.targetSelector || fallbackCtx.targetSelector || getSelfDeskSelector()),
    damage: effect.damage ?? fallbackCtx.damage,
    heal: effect.heal ?? fallbackCtx.heal,
    energy: effect.energy ?? fallbackCtx.energy,
    enemyWet: effect.enemyWet ?? fallbackCtx.enemyWet,
    pulses: effect.pulses ?? fallbackCtx.pulses,
    damagePerPulse: effect.damagePerPulse ?? fallbackCtx.damagePerPulse,
    ticks: effect.ticks ?? fallbackCtx.ticks,
    damagePerTick: effect.damagePerTick ?? fallbackCtx.damagePerTick,
    draw: effect.draw ?? fallbackCtx.draw,
    hasHelium: effect.hasHelium ?? fallbackCtx.hasHelium,
    duration: effect.duration ?? fallbackCtx.duration,
    applyStatus: effect.applyStatus ?? fallbackCtx.applyStatus,
    effectGroup: effect.effectGroup ?? fallbackCtx.effectGroup,
  };

  if (card?.type === "Utility" || card?.type === "Element") {
    ctx.targetSelector = effect.targetSelector || fallbackCtx.targetSelector || getSelfDeskSelector();
  }

  try {
    window.playCardEffect(cardId, ctx);
  } catch (error) {
    console.warn("Effect play failed:", cardId, error);
  }
}

async function createRoom() {
  try {
    const response = await fetch(`${WORKER_URL}/create-room`, {
      method: "POST",
    });
    const data = await response.json();

    if (data.type === "error") {
      throw new Error(data.message);
    }

    roomCode = data.roomCode;
    playerId = Number(data.playerId);
    isHost = true;
    manualClose = false;

    updateHeaderState();
    updateHostRoomCard();
    loadRoomList();
    showGame();
    addConnectionLog(`Room created: ${roomCode}`);
    connectSocket();
  } catch (error) {
    addConnectionLog(`Create Room failed: ${error.message}`);
  }
}

async function joinRoom() {
  try {
    const code = document.getElementById("joinCodeInput").value.trim().toUpperCase();

    if (!code) {
      throw new Error("Enter a room code.");
    }

    const response = await fetch(`${WORKER_URL}/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomCode: code }),
    });

    const data = await response.json();

    if (data.type === "error") {
      throw new Error(data.message);
    }

    roomCode = data.roomCode;
    playerId = Number(data.playerId);
    isHost = false;
    manualClose = false;

    updateHeaderState();
    updateHostRoomCard();
    loadRoomList();
    showGame();
    addConnectionLog(`Joined room: ${roomCode}`);
    connectSocket();
  } catch (error) {
    addConnectionLog(`Join Room failed: ${error.message}`);
  }
}

function connectSocket() {
  if (!roomCode || !playerId) {
    addConnectionLog("Missing room or player info.");
    return;
  }

  if (
    socket &&
    (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
  ) {
    return;
  }

  const wsBase = WORKER_URL.replace(/^https:/, "wss:");
  const wsUrl = `${wsBase}/ws?room=${encodeURIComponent(roomCode)}&player=${encodeURIComponent(playerId)}`;

  addConnectionLog(`Connecting to room ${roomCode}...`);
  socket = new WebSocket(wsUrl);

  socket.addEventListener("open", () => {
    updateHeaderState();
    updateHostRoomCard();
    addConnectionLog("WebSocket connected.");

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.type === "info") {
      addConnectionLog(message.message);
      return;
    }

    if (message.type === "error") {
      pendingLocalEffect = null;
      addConnectionLog(`Server error: ${message.message}`);
      showOverlay("Action Rejected", message.message);
      return;
    }

    if (message.type === "play_effect") {
      const effect = message.effect || message;
      handleIncomingEffect(effect);
      return;
    }

    if (message.type === "state") {
      const prevState = gameState;
      previousGameState = prevState;
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

      handleEffectsFromLogTransition(prevState, gameState);
      updateHostRoomCard();
      return;
    }
  });

  socket.addEventListener("close", (event) => {
    updateHeaderState();
    updateHostRoomCard();
    addConnectionLog(
      `WebSocket disconnected.${event?.code ? ` code=${event.code}` : ""}${event?.reason ? ` reason=${event.reason}` : ""}`
    );

    socket = null;

    if (manualClose) return;
    if (!roomCode || !playerId) return;
    if (reconnectTimer) return;

    addConnectionLog("Reconnecting in 2 seconds...");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connectSocket();
    }, 2000);
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
  return !!gameState && Number(playerId) === Number(gameState.currentPlayer) && !gameState.winner;
}

function canPlayCard(card, pid) {
  const player = gameState?.players?.[pid];
  if (!player || !card) return false;
  return (player.energy ?? 0) >= (card.cost ?? 0);
}

function selectCard(index) {
  if (!isMyTurn()) return;
  const player = gameState.players[playerId];
  if (!player?.hand?.[index]) return;

  selectedCardIndex = index;
  selectedFieldIndex = null;
  render();
}

function selectFieldCard(index) {
  if (!isMyTurn()) return;
  const player = gameState.players[playerId];
  if (!player?.field?.[index]) return;

  selectedFieldIndex = index;
  selectedCardIndex = null;
  render();
}

function getCardCssType(card) {
  const type = String(card?.type || "").toLowerCase();

  if (type === "element") return "element";
  if (type === "reaction" || type === "rxn") return "rxn";
  if (type === "attack" || type === "atk") return "atk";
  if (type === "utility") return "utility";

  return "element";
}

function normalizeCardTypeLabel(type) {
  const t = String(type || "").toLowerCase();

  if (t === "element") return "ELEMENT";
  if (t === "reaction" || t === "rxn") return "REACTION";
  if (t === "attack" || t === "atk") return "ATTACK";
  if (t === "utility") return "UTILITY";

  return String(type || "CARD").toUpperCase();
}

function getCardBadge(card) {
  if (card?.symbol) return card.symbol;

  const type = String(card?.type || "").toLowerCase();
  if (type === "reaction" || type === "rxn") return "RXN";
  if (type === "attack" || type === "atk") return "ATK";
  if (type === "utility") return "U";

  return "?";
}

function getFallbackArtText(card) {
  if (card?.symbol) return card.symbol;
  return (card?.name || "CARD").slice(0, 3).toUpperCase();
}

function getCardImage(card) {
  if (!card) return "";
  if (card.image) return card.image;

  const libCard = CARD_LIBRARY[card.id];
  if (libCard?.image) return libCard.image;

  return "";
}

function createCardElement(card, options = {}) {
  const {
    selected = false,
    playable = true,
    onClick = null,
  } = options;

  const el = document.createElement("div");
  const tags = Array.isArray(card.tags) ? card.tags : [];
  const cssType = getCardCssType(card);
  const extraClass = card.className ? ` ${card.className}` : "";

  el.className = `card ${cssType}${extraClass}${selected ? " selected" : ""}${playable ? " playable" : " unplayable"}`.trim();

  const top = document.createElement("div");
  top.className = "card-top";

  const name = document.createElement("div");
  name.className = "card-name";
  name.textContent = card.name || "Unknown";

  const cost = document.createElement("div");
  cost.className = "card-cost";
  cost.textContent = card.cost ?? 0;

  top.appendChild(name);
  top.appendChild(cost);

  const art = document.createElement("div");
  const imgPath = getCardImage(card);

  if (imgPath) {
    art.className = "card-art";

    const img = document.createElement("img");
    img.src = imgPath;
    img.alt = card.name || "Card";
    img.loading = "lazy";
    img.draggable = false;

    img.onerror = () => {
      art.className = "card-art no-image";
      art.innerHTML = "";
      art.textContent = getFallbackArtText(card);
    };

    art.appendChild(img);
  } else {
    art.className = "card-art no-image";
    art.textContent = getFallbackArtText(card);
  }

  const badge = document.createElement("div");
  badge.className = "card-mid-badge";
  badge.textContent = getCardBadge(card);

  const body = document.createElement("div");
  body.className = "card-body";

  const type = document.createElement("div");
  type.className = "card-type";
  type.textContent = normalizeCardTypeLabel(card.type);

  const text = document.createElement("div");
  text.className = "card-text";
  text.textContent = card.text || "No description.";

  const tagWrap = document.createElement("div");
  tagWrap.className = "card-tags";

  tags.forEach((tagText) => {
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = tagText;
    tagWrap.appendChild(tag);
  });

  body.appendChild(type);
  body.appendChild(text);
  body.appendChild(tagWrap);

  el.appendChild(top);
  el.appendChild(art);
  el.appendChild(badge);
  el.appendChild(body);

  el.draggable = false;

  if (window.innerWidth <= 768) {
    el.style.width = "116px";
    el.style.minWidth = "116px";
    el.style.maxWidth = "116px";
    el.style.height = "254px";
    el.style.overflow = "hidden";
  }

  if (typeof onClick === "function") {
    el.addEventListener("click", (event) => {
      const handRow = el.closest("#p1Hand, #p2Hand");
      if (handRow && handRow.dataset.dragging === "1") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick();
    });
  }

  return el;
}

function createMiniCard(card) {
  const el = document.createElement("div");
  el.className = "mini-card";
  el.innerHTML = `
    <strong>${escapeHtml(card.name || "")}</strong>
    <span>${escapeHtml(card.symbol || "")}</span>
    <span>${escapeHtml(normalizeCardTypeLabel(card.type))}</span>
  `;
  return el;
}

function renderStatuses(containerId, statuses) {
  const container = document.getElementById(containerId);
  if (!container) return;

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
  if (!container || !gameState?.players?.[pid]) return;

  container.innerHTML = "";

  const player = gameState.players[pid];
  const clickable = Number(pid) === Number(playerId) && isMyTurn();

  player.field.forEach((card, index) => {
    container.appendChild(
      createCardElement(card, {
        selected: clickable && selectedFieldIndex === index,
        playable: true,
        onClick: clickable ? () => selectFieldCard(index) : null,
      })
    );
  });

  for (let i = player.field.length; i < 3; i += 1) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "Empty field slot";
    container.appendChild(slot);
  }
}

function applyMobileHandBehavior(container) {
  if (!container) return;

  const isMobile = window.innerWidth <= 768;

  if (!isMobile) {
    container.style.display = "";
    container.style.gridAutoFlow = "";
    container.style.gridAutoColumns = "";
    container.style.gap = "";
    container.style.overflowX = "";
    container.style.overflowY = "";
    container.style.webkitOverflowScrolling = "";
    container.style.touchAction = "";
    container.style.paddingBottom = "";
    container.style.maxWidth = "";
    return;
  }

  container.style.display = "grid";
  container.style.gridAutoFlow = "column";
  container.style.gridAutoColumns = "116px";
  container.style.gap = "8px";
  container.style.overflowX = "auto";
  container.style.overflowY = "hidden";
  container.style.webkitOverflowScrolling = "touch";
  container.style.touchAction = "pan-x";
  container.style.paddingBottom = "10px";
  container.style.maxWidth = "100%";

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;
  let moved = false;

  container.onpointerdown = (e) => {
    isDown = true;
    moved = false;
    startX = e.clientX;
    startScrollLeft = container.scrollLeft;
  };

  container.onpointermove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) moved = true;
    container.scrollLeft = startScrollLeft - dx;
  };

  container.onpointerup = () => {
    isDown = false;
    setTimeout(() => {
      moved = false;
    }, 0);
  };

  container.onpointercancel = () => {
    isDown = false;
    moved = false;
  };

  container.dataset.dragging = moved ? "1" : "0";
}

function renderHand(containerId, pid) {
  const container = document.getElementById(containerId);
  if (!container || !gameState?.players?.[pid]) return;

  container.innerHTML = "";

  const player = gameState.players[pid];

  if (Number(pid) !== Number(playerId)) {
    for (let i = 0; i < player.hand.length; i += 1) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "Hidden card";

      if (window.innerWidth <= 768) {
        slot.style.width = "116px";
        slot.style.minWidth = "116px";
        slot.style.maxWidth = "116px";
        slot.style.height = "254px";
      }

      container.appendChild(slot);
    }

    if (!player.hand.length) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "No cards in hand";

      if (window.innerWidth <= 768) {
        slot.style.width = "116px";
        slot.style.minWidth = "116px";
        slot.style.maxWidth = "116px";
        slot.style.height = "254px";
      }

      container.appendChild(slot);
    }

    applyMobileHandBehavior(container);
    return;
  }

  player.hand.forEach((card, index) => {
    const isSelected = selectedCardIndex === index;
    const playable = canPlayCard(card, pid);

    container.appendChild(
      createCardElement(card, {
        selected: isSelected,
        playable,
        onClick: () => selectCard(index),
      })
    );
  });

  if (!player.hand.length) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.textContent = "No cards in hand";

    if (window.innerWidth <= 768) {
      slot.style.width = "116px";
      slot.style.minWidth = "116px";
      slot.style.maxWidth = "116px";
      slot.style.height = "254px";
    }

    container.appendChild(slot);
  }

  applyMobileHandBehavior(container);
}

function renderPreview(containerId, pid) {
  const container = document.getElementById(containerId);
  if (!container || !gameState?.players?.[pid]) return;

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

  if (!box || !playBtn || !removeBtn) return;

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
    box.innerHTML = `<strong style="font-size:18px;">${escapeHtml(card.name || "")}</strong><br>
      <span style="color: var(--muted); text-transform: uppercase; letter-spacing: .08em; font-size: 12px;">${escapeHtml(normalizeCardTypeLabel(card.type))}</span>
      <p style="line-height:1.55;">${escapeHtml(card.text || "")}</p>
      <div style="color: var(--muted);">Cost: ${escapeHtml(String(card.cost || 0))} energy</div>`;
    playBtn.disabled = !canPlayCard(card, playerId);
    return;
  }

  if (selectedFieldIndex !== null && player.field[selectedFieldIndex]) {
    const card = player.field[selectedFieldIndex];
    box.innerHTML = `<strong style="font-size:18px;">${escapeHtml(card.name || "")}</strong><br>
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
  if (!log) return;

  log.innerHTML = "";

  const items = Array.isArray(gameState?.log) ? gameState.log : [];
  items.forEach((item) => {
    const el = document.createElement("div");
    el.className = "log-item";
    el.textContent = item;
    log.appendChild(el);
  });
}

function updatePlayerBars(pid) {
  const p = gameState?.players?.[pid];
  if (!p) return;

  const hpText = document.getElementById(`p${pid}HpText`);
  const energyText = document.getElementById(`p${pid}EnergyText`);
  const hpBar = document.getElementById(`p${pid}HpBar`);
  const energyBar = document.getElementById(`p${pid}EnergyBar`);
  const deckCount = document.getElementById(`p${pid}DeckCount`);
  const handCount = document.getElementById(`p${pid}HandCount`);
  const discardCount = document.getElementById(`p${pid}DiscardCount`);

  if (hpText) hpText.textContent = `${p.hp} / ${p.maxHp}`;
  if (energyText) energyText.textContent = `${p.energy} / ${p.maxEnergy}`;
  if (hpBar) hpBar.style.width = `${(p.hp / p.maxHp) * 100}%`;
  if (energyBar) energyBar.style.width = `${(p.energy / p.maxEnergy) * 100}%`;
  if (deckCount) deckCount.textContent = p.deck.length;
  if (handCount) handCount.textContent = p.hand.length;
  if (discardCount) discardCount.textContent = p.discard.length;
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

  const turnPill = document.getElementById("turnPill");
  const turnBanner = document.getElementById("turnBanner");
  const roomStateText = document.getElementById("roomStateText");
  const endTurnBtn = document.getElementById("endTurnBtn");
  const restartBtn = document.getElementById("restartBtn");

  if (turnPill) turnPill.textContent = `Turn: ${gameState.turn}`;
  if (turnBanner) {
    turnBanner.textContent = gameState.winner
      ? "Finished"
      : `Turn ${gameState.turn} - Player ${gameState.currentPlayer}`;
  }

  if (roomStateText) {
    roomStateText.textContent = gameState.winner
      ? `Winner: ${gameState.winner}`
      : isMyTurn()
        ? "Your turn."
        : "Opponent turn.";
  }

  if (endTurnBtn) endTurnBtn.disabled = !isMyTurn();
  if (restartBtn) restartBtn.disabled = !isHost;

  updateHeaderState();
  updateHostRoomCard();
}

function playSelectedCard() {
  if (!isMyTurn() || selectedCardIndex === null) return;

  const player = gameState.players[playerId];
  const card = player.hand[selectedCardIndex];

  if (card) {
    pendingLocalEffect = {
      cardId: card.id,
      actorPid: Number(playerId),
    };
  }

  sendAction("play_card", { handIndex: selectedCardIndex });
}

function removeSelectedFieldCard() {
  if (!isMyTurn() || selectedFieldIndex === null) return;
  pendingLocalEffect = null;
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
  pendingLocalEffect = null;
  sendAction("restart_match", {});
}

function leaveRoom() {
  manualClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.close();
  }

  socket = null;
  roomCode = "";
  playerId = null;
  isHost = false;
  gameState = null;
  previousGameState = null;
  selectedCardIndex = null;
  selectedFieldIndex = null;
  pendingLocalEffect = null;

  updateHeaderState();
  updateHostRoomCard();
  showLobby();
  loadRoomList();
  addConnectionLog("Left room.");
}

function showTutorial() {
  const overlay = document.getElementById("tutorialOverlay");
  if (overlay) overlay.classList.remove("hidden");
}

function hideTutorial() {
  const overlay = document.getElementById("tutorialOverlay");
  if (overlay) overlay.classList.add("hidden");
}

window.addEventListener("online", () => {
  addConnectionLog("Network back online.");
  if (!manualClose && roomCode && playerId && !socket) {
    connectSocket();
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    document.visibilityState === "visible" &&
    !manualClose &&
    roomCode &&
    playerId &&
    !socket
  ) {
    addConnectionLog("Page visible again, checking connection...");
    connectSocket();
  }
});

const hostBtn = document.getElementById("hostBtn");
const joinBtn = document.getElementById("joinBtn");
const playCardBtn = document.getElementById("playCardBtn");
const removeFieldCardBtn = document.getElementById("removeFieldCardBtn");
const clearSelectionBtn = document.getElementById("clearSelectionBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const restartBtn = document.getElementById("restartBtn");
const leaveBtn = document.getElementById("leaveBtn");
const overlayBtn = document.getElementById("overlayBtn");
const refreshRoomsBtn = document.getElementById("refreshRoomsBtn");
const joinCodeInput = document.getElementById("joinCodeInput");
const closeTutorialBtn = document.getElementById("closeTutorialBtn");

if (hostBtn) hostBtn.addEventListener("click", createRoom);
if (joinBtn) joinBtn.addEventListener("click", joinRoom);
if (playCardBtn) playCardBtn.addEventListener("click", playSelectedCard);
if (removeFieldCardBtn) removeFieldCardBtn.addEventListener("click", removeSelectedFieldCard);
if (clearSelectionBtn) clearSelectionBtn.addEventListener("click", clearSelection);
if (endTurnBtn) endTurnBtn.addEventListener("click", endTurn);
if (restartBtn) restartBtn.addEventListener("click", restartMatch);
if (leaveBtn) leaveBtn.addEventListener("click", leaveRoom);
if (overlayBtn) overlayBtn.addEventListener("click", hideOverlay);
if (refreshRoomsBtn) refreshRoomsBtn.addEventListener("click", loadRoomList);
if (closeTutorialBtn) closeTutorialBtn.addEventListener("click", hideTutorial);

if (joinCodeInput) {
  joinCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      joinRoom();
    }
  });
}

const tutorialOverlay = document.getElementById("tutorialOverlay");
if (tutorialOverlay) {
  tutorialOverlay.addEventListener("click", (event) => {
    if (event.target === tutorialOverlay) {
      hideTutorial();
    }
  });
}

updateHeaderState();
updateHostRoomCard();
showLobby();
loadRoomList();
addConnectionLog("Ready.");