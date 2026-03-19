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
    text: "Deal 3 damage.",
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
    text: "Deal 4 damage. +2 if enemy Wet.",
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

const LEARNING_GOAL_CONFIG = [
  {
    id: "steam_combo",
    title: "Trigger a steam reaction",
    description: "Use Steam Burst or Calcium Steam after setting up the right elements.",
  },
  {
    id: "corrosion",
    title: "Cause corrosion",
    description: "Apply Corroded with Rust, Acid Rain, or Poison Cloud.",
  },
  {
    id: "lightning_combo",
    title: "Use Wet to strengthen Lightning",
    description: "Apply Wet first, then use Lightning for the conductivity bonus.",
  },
];

const DEFAULT_SCIENCE_INSIGHT = {
  title: "Build a combo to start learning.",
  equation: "Place elements, then trigger a reaction or attack.",
  body:
    "Reactions teach reactants and products. Attacks teach how statuses like Wet and Corroded can change later outcomes.",
};

const SCIENCE_NOTES = {
  sulfur: {
    title: "Sulfur Is a Reactant",
    equation: "Sulfur -> fuel-like reactant",
    body: "Sulfur is a setup element that helps unlock fire and acid style reactions.",
    preview: "Place Sulfur first if you want to unlock Combustion or Acid Rain.",
  },
  oxygen: {
    title: "Oxygen Supports Reactions",
    equation: "Oxygen -> combustion and oxidation support",
    body: "Oxygen appears in many reactions because it helps drive burning, rusting, and energy release.",
    preview: "Oxygen is a strong setup card because it supports several reactions and boosts Plasma Shock.",
  },
  water: {
    title: "Water Creates Conditions",
    equation: "Water -> Wet status and steam combos",
    body: "Water helps create Wet-based setups that make later effects, especially Lightning, more meaningful.",
    preview: "Water is often a setup card. Use it to enable Wet and steam combinations.",
  },
  iron: {
    title: "Iron Shows Oxidation",
    equation: "Iron + Oxygen -> Rust",
    body: "Iron helps students connect oxidation to gameplay through Rust and metal-based attacks.",
    preview: "Iron unlocks Rust and also improves Hammer Strike.",
  },
  combustion: {
    title: "Combustion Reaction",
    equation: "Sulfur + Oxygen -> energy release",
    body: "This reaction models the idea that a fuel and oxygen combine to release energy.",
    reason: "Combustion worked because Sulfur and Oxygen were both already on the field.",
    preview: "Combustion needs Sulfur and Oxygen on your field before you can use it.",
  },
  steamBurst: {
    title: "Steam Reaction",
    equation: "Water + Oxygen -> Wet target",
    body: "Steam Burst teaches that combining water-based and oxygen-based resources can create a new condition for later plays.",
    reason: "Steam Burst created Wet, which can set up stronger follow-up attacks.",
    preview: "Steam Burst is a setup reaction. It damages now and prepares Wet for later combos.",
  },
  acidRain: {
    title: "Acidic Reaction",
    equation: "Sulfur + Water -> Corroded",
    body: "Acid Rain links chemical combination to corrosion by turning the target into a Corroded state.",
    reason: "Acid Rain applied Corroded, showing that one reaction can change later turns.",
    preview: "Acid Rain is useful when you want a reaction that also creates a status effect.",
  },
  rust: {
    title: "Rust and Oxidation",
    equation: "Iron + Oxygen -> rust",
    body: "Rust models oxidation by linking iron and oxygen to a corrosion-style effect.",
    reason: "Rust worked because Iron and Oxygen were both on the field, modeling oxidation.",
    preview: "Rust is a clear science card because it directly shows oxidation.",
  },
  explosion: {
    title: "Explosive Combination",
    equation: "Hydrogen + Oxygen -> burst of energy",
    body: "Explosion highlights that some element combinations release a large amount of energy quickly.",
    reason: "Explosion rewards setting up a high-energy pair before attacking.",
    preview: "Hydrogen and Oxygen create one of the strongest burst reactions in the game.",
  },
  saltFormation: {
    title: "Salt Formation",
    equation: "Sodium + Chlorine -> stable product",
    body: "Salt Formation helps students see that two reactive elements can combine into a more stable result.",
    reason: "This reaction also cleanses Wet, showing that a reaction can remove as well as create conditions.",
    preview: "Salt Formation is a good example of a reaction that changes your own status too.",
  },
  carbonBurn: {
    title: "Carbon Burning",
    equation: "Carbon + Oxygen -> combustion",
    body: "Carbon Burn reinforces that carbon-based materials release energy when burned with oxygen.",
    reason: "Carbon Burn succeeded because Carbon and Oxygen were already prepared on the field.",
    preview: "Use Carbon Burn to show a simple fuel-plus-oxygen pattern.",
  },
  potassiumWater: {
    title: "Alkali Metal Reaction",
    equation: "Potassium + Water -> violent reaction + Wet",
    body: "This is a strong teaching card because it links alkali metals with highly reactive behavior in water.",
    reason: "Potassium Water creates Wet, which can prepare the target for a stronger Lightning attack next.",
    preview: "Potassium Water is both a big hit and a setup move for conductivity combos.",
  },
  limeFormation: {
    title: "Lime Formation",
    equation: "Calcium + Water -> product + energy gain",
    body: "Lime Formation shows that some reactions can create useful products and extra resources at the same time.",
    reason: "The bonus energy teaches that reactions can change both matter and momentum.",
    preview: "Lime Formation is a reaction with both science value and strategy value.",
  },
  calciumSteam: {
    title: "Steam and Metal Reaction",
    equation: "Calcium + Water -> Wet + damage",
    body: "Calcium Steam shows that a reactive metal plus water can create a strong effect and change the target's condition.",
    reason: "Calcium Steam applied Wet, which sets up a later Lightning bonus.",
    preview: "Calcium Steam bridges reaction learning and attack combo planning.",
  },
  lightning: {
    title: "Conductivity Matters",
    equation: "Wet target + Lightning -> extra damage",
    body: "Lightning teaches conductivity: when the target is Wet, electricity travels more effectively and the attack becomes stronger.",
    reason: (context) =>
      context.enemyWet
        ? "Lightning gained +2 damage because the target was Wet, demonstrating conductivity."
        : "Lightning dealt base damage because the target was not Wet yet.",
    preview: "Try to apply Wet first, then use Lightning to show a conductivity-based combo.",
  },
  fireball: {
    title: "Direct Heat Attack",
    equation: "Fireball -> steady heat damage",
    body: "Fireball is a straightforward attack card, which helps students compare simple damage with more conditional combo cards.",
    reason: "Fireball acts as a baseline attack so students can compare simple damage with science-based combos.",
    preview: "Fireball is useful for comparing simple attacks with conditional combo attacks.",
  },
  poisonCloud: {
    title: "Corrosion Setup",
    equation: "Poison Cloud -> Corroded",
    body: "Poison Cloud teaches that attacks can create conditions that make later turns more dangerous.",
    reason: "Poison Cloud applied Corroded, which can set up Corrode or ongoing damage.",
    preview: "Use Poison Cloud to set up the Corroded status before a control play.",
  },
  corrode: {
    title: "Condition-Based Control",
    equation: "Corroded target + Corrode -> destroy field card",
    body: "Corrode is useful for teaching prerequisites because it only works when the opponent is already Corroded.",
    reason: "Corrode only works after the Corroded status is present, so students must plan the sequence first.",
    preview: "Corrode is strongest when you think one step ahead and create Corroded first.",
  },
};

let cardPreviewHideTimer = null;
let cardPreviewFadeTimer = null;
const ROOM_LIST_REFRESH_INTERVAL_MS = 30000;
let roomListRequestInFlight = false;
let learningGoalState = createInitialLearningGoalState();
let scienceInsight = { ...DEFAULT_SCIENCE_INSIGHT };
let scienceReasonLog = [];
let matchScienceSummary = createInitialMatchScienceSummary();

function createInitialLearningGoalState() {
  return LEARNING_GOAL_CONFIG.reduce((state, goal) => {
    state[goal.id] = false;
    return state;
  }, {});
}

function createInitialMatchScienceSummary() {
  return {
    reactionsUsed: {},
    statusesApplied: {},
    comboHighlights: [],
  };
}

function getScienceNote(cardId, context = {}) {
  const note = SCIENCE_NOTES[cardId];
  const card = CARD_LIBRARY[cardId];

  if (note) {
    return {
      title: note.title || card?.name || "Science Insight",
      equation: note.equation || card?.text || "",
      body:
        typeof note.body === "function"
          ? note.body(context)
          : note.body || note.preview || card?.text || "",
      reason:
        typeof note.reason === "function"
          ? note.reason(context)
          : note.reason || note.preview || note.body || card?.text || "",
      preview: note.preview || note.body || card?.text || "",
    };
  }

  if (!card) return null;

  if (card.type === "Reaction") {
    return {
      title: `${card.name} Reaction`,
      equation: card.text || "",
      body: "Reaction cards teach that the right reactants must already be present before a scientific change can happen.",
      reason: "This move worked because its field requirements were met first.",
      preview: "Check which elements must already be on the field before you play this reaction.",
    };
  }

  if (card.type === "Attack") {
    return {
      title: `${card.name} Attack`,
      equation: card.text || "",
      body: "Attack cards help students compare direct effects with more conditional combo-based effects.",
      reason: "This attack shows how battle outcomes can depend on field setup and status effects.",
      preview: "Think about whether another element or status could make this attack even better.",
    };
  }

  if (card.type === "Element") {
    return {
      title: `${card.name} Element`,
      equation: card.text || "",
      body: "Element cards act as reactants and building blocks for later science-based combinations.",
      reason: "Placing elements first teaches that reactions need preparation before results appear.",
      preview: "Ask which reactions this element can unlock on your field.",
    };
  }

  return {
    title: card.name || "Science Insight",
    equation: card.text || "",
    body: "This card supports the overall system of setup, reaction, and consequence.",
    reason: card.text || "",
    preview: card.text || "",
  };
}

function renderLearningGoals() {
  const container = document.getElementById("learningGoals");
  if (!container) return;

  container.innerHTML = LEARNING_GOAL_CONFIG.map((goal) => {
    const complete = !!learningGoalState[goal.id];
    return `
      <div class="learning-goal${complete ? " complete" : ""}">
        <div class="learning-goal-mark">${complete ? "OK" : "?"}</div>
        <div>
          <div class="learning-goal-title">${escapeHtml(goal.title)}</div>
          <div class="learning-goal-desc">${escapeHtml(goal.description)}</div>
        </div>
      </div>
    `;
  }).join("");
}

function renderScienceInsight() {
  const card = document.getElementById("scienceInsightCard");
  if (!card) return;

  const nextInsight = scienceInsight || DEFAULT_SCIENCE_INSIGHT;
  card.innerHTML = `
    <div class="insight-kicker">Science Insight</div>
    <div class="insight-title">${escapeHtml(nextInsight.title || DEFAULT_SCIENCE_INSIGHT.title)}</div>
    <div class="insight-equation">${escapeHtml(nextInsight.equation || DEFAULT_SCIENCE_INSIGHT.equation)}</div>
    <div class="insight-body">${escapeHtml(nextInsight.body || DEFAULT_SCIENCE_INSIGHT.body)}</div>
  `;
}

function renderScienceReasonLog() {
  const container = document.getElementById("scienceReasonLog");
  if (!container) return;

  if (!scienceReasonLog.length) {
    container.innerHTML = `
      <div class="science-reason-item">
        <strong>Why It Worked</strong>
        Your latest reaction or attack will be explained here.
      </div>
    `;
    return;
  }

  container.innerHTML = scienceReasonLog.map((item) => `
    <div class="science-reason-item">
      <strong>${escapeHtml(item.title)}</strong>
      ${escapeHtml(item.reason)}
    </div>
  `).join("");
}

function pushScienceReason(title, reason) {
  if (!reason) return;

  scienceReasonLog.unshift({ title, reason });
  scienceReasonLog = scienceReasonLog.slice(0, 4);
  renderScienceReasonLog();
}

function incrementScienceSummaryCount(bucket, key) {
  if (!key) return;
  bucket[key] = (bucket[key] || 0) + 1;
}

function addScienceSummaryHighlight(text) {
  if (!text || matchScienceSummary.comboHighlights.includes(text)) return;
  matchScienceSummary.comboHighlights.push(text);
}

function formatScienceSummaryCounts(counts) {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return "None this match.";
  return entries
    .slice(0, 3)
    .map(([label, value]) => `${label} x${value}`)
    .join(", ");
}

function renderEndOfGameScienceSummary() {
  const summaryEl = document.getElementById("scienceSummary");
  if (!summaryEl) return;

  const completedGoals = LEARNING_GOAL_CONFIG
    .filter((goal) => learningGoalState[goal.id])
    .map((goal) => goal.title);

  const reactionText = formatScienceSummaryCounts(matchScienceSummary.reactionsUsed);
  const statusText = formatScienceSummaryCounts(matchScienceSummary.statusesApplied);
  const goalsText = completedGoals.length ? completedGoals.join(", ") : "No learning goals completed yet.";
  const highlightsText = matchScienceSummary.comboHighlights.length
    ? matchScienceSummary.comboHighlights.slice(0, 3).join(" ")
    : "No major science combo was recorded this match.";

  summaryEl.innerHTML = `
    <div class="science-summary-title">End-of-Game Science Summary</div>
    <div class="science-summary-grid">
      <div class="science-summary-item">
        <strong>Reactions Used</strong>
        <div>${escapeHtml(reactionText)}</div>
      </div>
      <div class="science-summary-item">
        <strong>Statuses Applied</strong>
        <div>${escapeHtml(statusText)}</div>
      </div>
      <div class="science-summary-item">
        <strong>Learning Goals Met</strong>
        <div>${escapeHtml(goalsText)}</div>
      </div>
      <div class="science-summary-item">
        <strong>Science Takeaway</strong>
        <div>${escapeHtml(highlightsText)}</div>
      </div>
    </div>
  `;
  summaryEl.classList.remove("hidden");
}

function hideEndOfGameScienceSummary() {
  const summaryEl = document.getElementById("scienceSummary");
  if (!summaryEl) return;
  summaryEl.classList.add("hidden");
  summaryEl.innerHTML = "";
}

function applyLearningUpdate(cardId, effect = {}) {
  const card = CARD_LIBRARY[cardId];
  const note = getScienceNote(cardId, effect);

  if (note) {
    scienceInsight = {
      title: note.title,
      equation: note.equation,
      body: note.body,
    };
    renderScienceInsight();
    pushScienceReason(note.title, note.reason);
  }

  if (card?.type === "Reaction") {
    incrementScienceSummaryCount(matchScienceSummary.reactionsUsed, card.name);
  }

  if (effect.applyStatus) {
    incrementScienceSummaryCount(matchScienceSummary.statusesApplied, effect.applyStatus);
  }

  if (cardId === "steamBurst" || cardId === "calciumSteam") {
    learningGoalState.steam_combo = true;
    addScienceSummaryHighlight("Steam-style reactions can create Wet and set up later combo damage.");
  }

  if (effect.applyStatus === "Corroded" || ["acidRain", "rust", "poisonCloud"].includes(cardId)) {
    learningGoalState.corrosion = true;
    addScienceSummaryHighlight("Corroded shows how a reaction or attack can change later turns, not just immediate damage.");
  }

  if (cardId === "lightning" && effect.enemyWet) {
    learningGoalState.lightning_combo = true;
    addScienceSummaryHighlight("Lightning became stronger after Wet, demonstrating conductivity in a simple game rule.");
  }

  renderLearningGoals();
}

function getSelectedCardScienceHtml(card) {
  const note = getScienceNote(card?.id || card);
  if (!note?.preview) return "";

  return `
    <div class="science-link">
      <strong>Science Link</strong>
      <div>${escapeHtml(note.preview)}</div>
    </div>
  `;
}

function resetLearningState() {
  learningGoalState = createInitialLearningGoalState();
  scienceInsight = { ...DEFAULT_SCIENCE_INSIGHT };
  scienceReasonLog = [];
  matchScienceSummary = createInitialMatchScienceSummary();
  renderLearningGoals();
  renderScienceInsight();
  renderScienceReasonLog();
  hideEndOfGameScienceSummary();
}

function shouldResetLearningForNewMatch(prevState, nextState) {
  if (!nextState || nextState.turn !== 1 || nextState.winner) return false;
  if (!Array.isArray(nextState.log) || !nextState.log[0]?.includes("Match initialized")) return false;
  if (!prevState) return true;
  return !!prevState.winner || prevState.turn !== 1;
}

function showPlayedCardPreview(card) {
  if (!card || !card.image) return;

  const overlay = document.getElementById("card-preview-overlay");
  const image = document.getElementById("card-preview-image");

  if (!overlay || !image) return;

  clearTimeout(cardPreviewFadeTimer);
  clearTimeout(cardPreviewHideTimer);

  image.src = card.image;
  image.alt = card.name || "Card Preview";

  overlay.classList.remove("hidden", "fade-out", "show");


  void overlay.offsetWidth;

  overlay.classList.add("show");

  cardPreviewFadeTimer = setTimeout(() => {
    overlay.classList.remove("show");
    overlay.classList.add("fade-out");
  }, 1700);

  cardPreviewHideTimer = setTimeout(() => {
    overlay.classList.add("hidden");
    overlay.classList.remove("fade-out", "show");
    image.src = "";
  }, 2000);
}

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
  if (roomListRequestInFlight) return;
  if (document.visibilityState === "hidden") return;

  roomListRequestInFlight = true;

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
  } finally {
    roomListRequestInFlight = false;
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
  roomListRefreshTimer = setInterval(loadRoomList, ROOM_LIST_REFRESH_INTERVAL_MS);
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
  hideEndOfGameScienceSummary();
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
      ctx.damage = 3;
      break;
    case "hammerStrike":
      ctx.damage = actorField.some((c) => c?.id === "iron") ? 4 : 2;
      break;
    case "lightning":
      ctx.damage = opponentStatuses.includes("Wet") ? 6 : 4;
      ctx.enemyWet = opponentStatuses.includes("Wet");
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

  if (hasEffectSystem()) {
    try {
      window.playCardEffect(cardId, ctx);
    } catch (error) {
      console.warn("Effect play failed:", cardId, error);
    }
  }

  applyLearningUpdate(cardId, ctx);
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
    resetLearningState();

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
    resetLearningState();

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
        renderEndOfGameScienceSummary();
      } else {
        hideOverlay();
        hideEndOfGameScienceSummary();
      }

      if (shouldResetLearningForNewMatch(prevState, gameState)) {
        resetLearningState();
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

  if (!isMobile) {
    container.onpointerdown = null;
    container.onpointermove = null;
    container.onpointerup = null;
    container.onpointercancel = null;
    container.dataset.dragging = "0";
    return;
  }

  let isDown = false;
  let startX = 0;
  let startScrollLeft = 0;

  container.onpointerdown = (e) => {
    isDown = true;
    startX = e.clientX;
    startScrollLeft = container.scrollLeft;
    container.dataset.dragging = "0";
  };

  container.onpointermove = (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) {
      container.dataset.dragging = "1";
    }
    container.scrollLeft = startScrollLeft - dx;
  };

  container.onpointerup = () => {
    isDown = false;
    setTimeout(() => {
      container.dataset.dragging = "0";
    }, 0);
  };

  container.onpointercancel = () => {
    isDown = false;
    container.dataset.dragging = "0";
  };
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
      container.appendChild(slot);
    }

    if (!player.hand.length) {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = "No cards in hand";
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
      <div style="color: var(--muted);">Cost: ${escapeHtml(String(card.cost || 0))} energy</div>
      ${getSelectedCardScienceHtml(card)}`;
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
  if (!player || !player.hand || !player.hand[selectedCardIndex]) return;

  const rawCard = player.hand[selectedCardIndex];
  const card = rawCard.image ? rawCard : CARD_LIBRARY[rawCard.id || rawCard];

  console.log("PLAY CLICKED:", card);

  if (card?.id) {
    pendingLocalEffect = {
      cardId: card.id,
      actorPid: Number(playerId),
    };
  }

  if (card?.image) {
    showPlayedCardPreview(card);
  } else {
    console.warn("No image found for selected card:", rawCard);
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

  // Tell the server we are leaving so it can free the player slot immediately.
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ action: "leave_room", payload: {} }));
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
  resetLearningState();

  updateHeaderState();
  updateHostRoomCard();
  showLobby();
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
  if (!roomCode) {
    if (document.visibilityState === "visible") {
      loadRoomList();
      startRoomListAutoRefresh();
    } else {
      stopRoomListAutoRefresh();
    }
  }

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

window.addEventListener("resize", () => {
  const p1Hand = document.getElementById("p1Hand");
  const p2Hand = document.getElementById("p2Hand");
  applyMobileHandBehavior(p1Hand);
  applyMobileHandBehavior(p2Hand);
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
resetLearningState();
addConnectionLog("Ready.");
