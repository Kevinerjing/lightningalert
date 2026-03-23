/* effect-system.js
   Element Hero visual effects system
   Usage:
     playCardEffect("fireball", {
       sourceSide: "player",
       targetSide: "enemy"
     });

   Optional context:
     {
       sourceSide: "player" | "enemy",
       targetSide: "player" | "enemy",
       sourceEl: HTMLElement,
       targetEl: HTMLElement,
       sourceSelector: "#player-hero",
       targetSelector: "#enemy-hero",
       damage: 3,
       heal: 2,
       draw: 1,
       enemyWet: true,
       enemyCorroded: true,
       hasOxygen: true,
       hasHelium: true,
       onComplete: () => {}
     }
*/

(function () {
  const DEFAULT_STYLE_ID = "element-hero-effect-styles";
  let combatCinematicQueue = Promise.resolve();
  let combatLockDepth = 0;

  const CARD_EFFECT_MAP = {
    // Elements
    sulfur: "emberAura",
    oxygen: "airPulse",
    water: "waterDrop",
    iron: "metalShine",
    hydrogen: "gasFloat",
    carbon: "smokeAura",
    chlorine: "toxicAura",
    sodium: "unstableSpark",
    potassium: "unstableSpark",
    helium: "lightGasAura",
    calcium: "dustAura",

    // Reactions
    combustion: "combustionBlast",
    steamBurst: "steamBurst",
    acidRain: "acidRain",
    rust: "rustSpread",
    explosion: "hydrogenExplosion",
    saltFormation: "saltFormation",
    carbonBurn: "carbonBurn",
    potassiumWater: "alkaliReaction",
    limeFormation: "limeFormation",
    hydrogenBurn: "fireBurst",
    calciumSteam: "calciumSteam",
    alkaliExplosion: "alkaliExplosion",

    // Attacks
    fireball: "fireball",
    hammerStrike: "hammerStrike",
    corrode: "corrodeDestroy",
    lightning: "lightningStrike",
    poisonCloud: "toxicCloud",
    plasmaShock: "plasmaShock",
    alkaliBlast: "alkaliBlast",
    metalCrush: "metalCrush",
    noblePressure: "noblePressure",

    // Utility
    catalyst: "energyBoost",
    shield: "shieldGlow",
  };

  const SPECIAL_CINEMATIC_CARD_IDS = new Set([
    "fireball",
    "hammerStrike",
    "corrode",
    "lightning",
    "poisonCloud",
    "plasmaShock",
    "alkaliBlast",
    "metalCrush",
    "noblePressure",
    "combustion",
    "steamBurst",
    "acidRain",
    "rust",
    "explosion",
    "saltFormation",
    "carbonBurn",
    "potassiumWater",
    "limeFormation",
    "calciumSteam",
    "alkaliExplosion",
    "hydrogenBurn",
  ]);

  function getFxLayer() {
    return document.getElementById("fx-layer") || document.body;
  }

  function getCombatCinematicLayer() {
    return document.getElementById("combat-cinematic-root") || getFxLayer();
  }

  function ensureEffectStyles() {
    if (document.getElementById(DEFAULT_STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = DEFAULT_STYLE_ID;
    style.textContent = `
      .ehx-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 9999;
      }

      #fx-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 10040;
      }

      #combat-cinematic-root {
        position: fixed;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
        z-index: 10120;
      }

      .ehx-cinematic-lock {
        position: fixed;
        inset: 0;
        pointer-events: auto;
        background: rgba(4, 10, 18, 0.001);
        z-index: 10118;
      }

      .ehx-cinematic-card-highlight {
        position: fixed;
        border-radius: 20px;
        border: 2px solid rgba(139, 247, 255, 0.95);
        background: radial-gradient(circle at center, rgba(139, 247, 255, 0.28), rgba(139, 247, 255, 0.04) 62%, rgba(0, 0, 0, 0) 100%);
        box-shadow:
          0 0 0 2px rgba(139, 247, 255, 0.12),
          0 0 24px rgba(85, 214, 255, 0.35),
          inset 0 0 30px rgba(139, 247, 255, 0.16);
        animation: ehxCinematicHighlight 0.28s ease-out forwards;
      }

      .ehx-cinematic-local {
        position: fixed;
        width: 132px;
        height: 132px;
        margin-left: -66px;
        margin-top: -66px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, var(--ehx-local-core, rgba(255,255,255,0.96)) 0%, var(--ehx-local-mid, rgba(139,247,255,0.45)) 26%, var(--ehx-local-glow, rgba(85,214,255,0.12)) 58%, rgba(0,0,0,0) 100%);
        box-shadow:
          0 0 24px var(--ehx-local-mid, rgba(139,247,255,0.35)),
          0 0 64px var(--ehx-local-glow, rgba(85,214,255,0.2));
        animation: ehxCinematicLocal 0.42s ease-out forwards;
      }

      .ehx-cinematic-local::after {
        content: "";
        position: absolute;
        inset: -10px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.35);
        animation: ehxCinematicRing 0.42s ease-out forwards;
      }

      .ehx-cinematic-impact {
        position: fixed;
        width: 320px;
        height: 320px;
        margin-left: -160px;
        margin-top: -160px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, var(--ehx-impact-core, rgba(255,255,255,0.98)) 0%, var(--ehx-impact-mid, rgba(139,247,255,0.54)) 18%, var(--ehx-impact-glow, rgba(85,214,255,0.14)) 42%, rgba(0,0,0,0) 74%);
        box-shadow:
          0 0 36px var(--ehx-impact-mid, rgba(139,247,255,0.3)),
          0 0 120px var(--ehx-impact-glow, rgba(85,214,255,0.18));
        animation: ehxCinematicImpact 0.46s ease-out forwards;
      }

      .ehx-cinematic-impact::after {
        content: "";
        position: absolute;
        inset: 18%;
        border-radius: 50%;
        border: 6px solid rgba(255,255,255,0.32);
        animation: ehxCinematicShock 0.46s ease-out forwards;
      }

      .ehx-attacker-glow,
      .ehx-defender-glow {
        position: fixed;
        border-radius: 28px;
        pointer-events: none;
      }

      .ehx-attacker-glow {
        border: 2px solid rgba(139, 247, 255, 0.65);
        box-shadow: 0 0 28px rgba(85, 214, 255, 0.28);
        background: radial-gradient(circle at center, rgba(139, 247, 255, 0.18), rgba(139, 247, 255, 0.02) 70%, rgba(0,0,0,0) 100%);
        animation: ehxAttackerGlow 0.46s ease-out forwards;
      }

      .ehx-defender-glow {
        border: 2px solid rgba(255, 214, 120, 0.56);
        box-shadow: 0 0 32px rgba(255, 153, 72, 0.3);
        background: radial-gradient(circle at center, rgba(255, 214, 120, 0.16), rgba(255, 120, 72, 0.04) 70%, rgba(0,0,0,0) 100%);
        animation: ehxDefenderGlow 0.56s ease-out forwards;
      }

      @keyframes ehxCinematicHighlight {
        0% { opacity: 0; transform: scale(0.92); }
        30% { opacity: 1; transform: scale(1.02); }
        100% { opacity: 0; transform: scale(1.08); }
      }

      @keyframes ehxCinematicLocal {
        0% { opacity: 0; transform: scale(0.42); }
        18% { opacity: 1; transform: scale(0.94); }
        100% { opacity: 0; transform: scale(1.22); }
      }

      @keyframes ehxCinematicRing {
        0% { opacity: 0.7; transform: scale(0.62); }
        100% { opacity: 0; transform: scale(1.26); }
      }

      @keyframes ehxCinematicImpact {
        0% { opacity: 0; transform: scale(0.38); }
        22% { opacity: 1; transform: scale(0.96); }
        100% { opacity: 0; transform: scale(1.28); }
      }

      @keyframes ehxCinematicShock {
        0% { opacity: 0.68; transform: scale(0.44); }
        100% { opacity: 0; transform: scale(1.42); }
      }

      @keyframes ehxAttackerGlow {
        0% { opacity: 0; transform: scale(0.96); }
        25% { opacity: 1; transform: scale(1.01); }
        100% { opacity: 0; transform: scale(1.05); }
      }

      @keyframes ehxDefenderGlow {
        0% { opacity: 0; transform: scale(0.94); }
        20% { opacity: 1; transform: scale(1.01); }
        100% { opacity: 0; transform: scale(1.04); }
      }

      .card-cast-flash {
        position: fixed;
        border-radius: 18px;
        border: 2px solid rgba(139, 247, 255, 0.85);
        background:
          radial-gradient(circle at center, rgba(139, 247, 255, 0.28), rgba(139, 247, 255, 0.04) 55%, rgba(0, 0, 0, 0) 100%);
        box-shadow:
          0 0 0 2px rgba(139, 247, 255, 0.18),
          0 0 24px rgba(85, 214, 255, 0.22),
          inset 0 0 28px rgba(139, 247, 255, 0.16);
        animation: ehxCardCastFlash 0.45s ease-out forwards;
      }

      .card-cast-flash.corrode-cast {
        border-color: rgba(170, 255, 92, 0.88);
        background:
          radial-gradient(circle at 35% 35%, rgba(245,255,170,0.42), rgba(124,255,54,0.22) 42%, rgba(12,34,12,0.04) 78%, rgba(0,0,0,0) 100%);
        box-shadow:
          0 0 0 2px rgba(168,255,102,0.16),
          0 0 26px rgba(124,255,54,0.24),
          inset 0 0 26px rgba(209,255,132,0.18);
      }

      .corrode-cast-splash {
        position: fixed;
        width: 68px;
        height: 68px;
        margin-left: -34px;
        margin-top: -34px;
        pointer-events: none;
        opacity: 0;
        filter: drop-shadow(0 0 10px rgba(124,255,54,.28));
        animation: corrodeCastSplash 0.9s ease-out forwards;
        z-index: 10043;
      }

      .corrode-cast-splash::before,
      .corrode-cast-splash::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 35% 45%, rgba(240,255,180,.96), rgba(124,255,54,.88) 40%, rgba(46,219,79,0) 72%);
        clip-path: polygon(18% 46%, 30% 23%, 43% 39%, 54% 16%, 66% 42%, 82% 30%, 74% 56%, 89% 70%, 63% 72%, 51% 88%, 38% 68%, 15% 75%, 25% 56%);
      }

      .corrode-cast-splash::after {
        transform: scale(.72) translate(8px, 5px);
        opacity: .78;
      }

      @keyframes corrodeCastSplash {
        0%{ opacity:0; transform:scale(.3);}
        20%{ opacity:1; transform:scale(.95);}
        70%{ opacity:.65; transform:scale(1.18);}
        100%{ opacity:0; transform:scale(1.3);}
      }

      .corrode-cast-trail {
        position: fixed;
        height: 22px;
        border-radius: 999px;
        transform-origin: left center;
        pointer-events: none;
        opacity: 0;
        filter: drop-shadow(0 0 10px rgba(124,255,54,.24));
        animation: corrodeCastTrail 0.7s linear forwards;
        z-index: 10042;
      }

      .corrode-cast-trail::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(90deg, rgba(236,255,160,.94), rgba(124,255,54,.92) 28%, rgba(46,219,79,.72) 60%, rgba(46,219,79,0));
        clip-path: polygon(0 43%, 8% 28%, 18% 35%, 28% 18%, 43% 32%, 54% 26%, 68% 40%, 82% 34%, 100% 46%, 100% 58%, 82% 66%, 68% 60%, 54% 74%, 43% 68%, 28% 82%, 18% 65%, 8% 73%, 0 57%);
        border-radius: 999px;
      }

      @keyframes corrodeCastTrail {
        0%{ opacity:0; }
        10%{ opacity:.95; }
        55%{ opacity:.7; }
        100%{ opacity:0; }
      }

      @keyframes ehxCardCastFlash {
        0% { opacity: 0; transform: scale(0.9); }
        18% { opacity: 1; transform: scale(1.03); }
        100% { opacity: 0; transform: scale(1.08); }
      }

      .screen-hit-effect {
        position: fixed;
        left: 50%;
        top: 50%;
        width: 320px;
        height: 320px;
        margin-left: -160px;
        margin-top: -160px;
        border-radius: 50%;
        background:
          radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(139,247,255,0.42) 18%, rgba(85,214,255,0.16) 38%, rgba(0,0,0,0) 72%);
        box-shadow:
          0 0 34px rgba(139,247,255,0.28),
          0 0 120px rgba(85,214,255,0.18);
        animation: ehxScreenHit 0.52s ease-out forwards;
      }

      @keyframes ehxScreenHit {
        0% { opacity: 0; transform: scale(0.42); }
        20% { opacity: 1; transform: scale(0.94); }
        100% { opacity: 0; transform: scale(1.24); }
      }

      .screen-hit-effect.lightning-hit {
        background:
          radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(210,245,255,0.78) 10%, rgba(148,232,255,0.34) 26%, rgba(94,184,255,0.14) 42%, rgba(0,0,0,0) 74%);
        box-shadow:
          0 0 40px rgba(180, 240, 255, 0.34),
          0 0 120px rgba(110, 185, 255, 0.28),
          0 0 220px rgba(80, 130, 255, 0.14);
      }

      @keyframes ehxScreenHitText {
        0% { opacity: 0; transform: translate(-50%, -34%) scale(0.8); }
        18% { opacity: 1; transform: translate(-50%, -50%) scale(1.04); }
        100% { opacity: 0; transform: translate(-50%, -70%) scale(1); }
      }

      .ehx-float-text {
        position: fixed;
        font-weight: 900;
        transform: translate(-50%, 0);
        pointer-events: none;
        z-index: 10020;
        animation: ehxFloatText 0.95s ease-out forwards;
        text-shadow:
          0 0 8px rgba(255,255,255,0.25),
          0 0 18px rgba(0,0,0,0.18);
      }

      @keyframes ehxFloatText {
        0%   { opacity: 0; transform: translate(-50%, 0) scale(0.72); }
        15%  { opacity: 1; transform: translate(-50%, -8px) scale(1.08); }
        100% { opacity: 0; transform: translate(-50%, -84px) scale(1); }
      }

      .ehx-shake {
        animation: ehxShake 0.36s ease;
      }

      @keyframes ehxShake {
        0%   { transform: translate(0, 0); }
        20%  { transform: translate(-7px, 1px); }
        40%  { transform: translate(7px, -1px); }
        60%  { transform: translate(-5px, 1px); }
        80%  { transform: translate(4px, 0); }
        100% { transform: translate(0, 0); }
      }

      .ehx-screen-flash {
        position: fixed;
        inset: 0;
        pointer-events: none;
        animation: ehxScreenFlash 0.26s ease-out forwards;
      }

      @keyframes ehxScreenFlash {
        0% { opacity: 0.92; }
        100% { opacity: 0; }
      }

      .ehx-fireball {
        position: fixed;
        width: 190px;
        height: 190px;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle at 35% 35%,
            rgba(255,255,220,1) 0%,
            #ffe08a 10%,
            #ffbf47 18%,
            #ff8c1a 34%,
            #ff5a00 52%,
            #d92500 72%,
            rgba(120,0,0,0.85) 100%);
        box-shadow:
          0 0 55px rgba(255,160,40,1),
          0 0 120px rgba(255,90,0,0.8),
          0 0 200px rgba(255,40,0,0.45);
        transform: translate(0,0) scale(0.92) rotate(0deg);
        transition: transform 0.68s cubic-bezier(.2,.7,.2,1), filter 0.68s linear;
        z-index: 10005;
      }

      .ehx-fireball::after {
        content: "";
        position: absolute;
        inset: -16px;
        border-radius: 50%;
        background:
          radial-gradient(circle,
            rgba(255, 210, 110, 0.25) 0%,
            rgba(255, 120, 0, 0.14) 45%,
            rgba(255, 0, 0, 0) 72%);
        animation: ehxPulseGlow 0.18s linear infinite alternate;
      }

      @keyframes ehxPulseGlow {
        from { transform: scale(0.98); opacity: 0.9; }
        to   { transform: scale(1.04); opacity: 1; }
      }

      .ehx-trail {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle,
            rgba(255,224,138,0.9) 0%,
            rgba(255,140,26,0.7) 35%,
            rgba(217,37,0,0.32) 65%,
            rgba(217,37,0,0) 100%);
        animation: ehxFadeTrail 0.42s ease-out forwards;
        z-index: 10004;
      }

      @keyframes ehxFadeTrail {
        0%   { opacity: 0.9; transform: scale(1); }
        100% { opacity: 0; transform: scale(0.55); }
      }

      .ehx-explosion {
        position: fixed;
        width: 300px;
        height: 300px;
        margin-left: -150px;
        margin-top: -150px;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle,
            rgba(255,255,220,1) 0%,
            rgba(255,220,120,0.96) 12%,
            rgba(255,150,30,0.88) 28%,
            rgba(255,70,0,0.65) 50%,
            rgba(255,0,0,0.18) 72%,
            rgba(255,0,0,0) 100%);
        box-shadow:
          0 0 80px rgba(255,180,40,0.9),
          0 0 180px rgba(255,80,0,0.5);
        animation: ehxBoom 0.56s ease-out forwards;
        z-index: 10012;
      }

      @keyframes ehxBoom {
        0%   { transform: scale(0.15); opacity: 1; }
        70%  { transform: scale(1.12); opacity: 1; }
        100% { transform: scale(1.55); opacity: 0; }
      }

      .ehx-shockwave {
        position: fixed;
        width: 300px;
        height: 300px;
        margin-left: -60px;
        margin-top: -60px;
        border-radius: 50%;
        border: 8px solid rgba(255,210,130,0.88);
        pointer-events: none;
        animation: ehxShockwave 0.56s ease-out forwards;
        z-index: 10011;
      }

      @keyframes ehxShockwave {
        0%   { transform: scale(0.2); opacity: 1; }
        100% { transform: scale(4.1); opacity: 0; }
      }

      .ehx-toxic-overlay {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 78% 25%,
            rgba(120,255,120,0.12) 0%,
            rgba(60,180,60,0.09) 18%,
            rgba(30,80,30,0.02) 42%,
            rgba(0,0,0,0) 65%);
        animation: ehxPoisonTint 2.3s ease-out forwards;
        z-index: 10000;
      }

      @keyframes ehxPoisonTint {
        0%   { opacity: 0; }
        18%  { opacity: 1; }
        100% { opacity: 0; }
      }

      .ehx-cloud {
        position: fixed;
        width: 300px;
        height: 280px;
        pointer-events: none;
        filter: blur(2px);
        animation: ehxCloudHover 2.3s ease-in-out forwards;
        z-index: 10006;
      }

      @keyframes ehxCloudHover {
        0%   { opacity: 0; transform: translateY(12px) scale(0.82); }
        15%  { opacity: 1; transform: translateY(0) scale(1); }
        70%  { opacity: 1; transform: translateY(-8px) scale(1.05); }
        100% { opacity: 0; transform: translateY(-16px) scale(1.1); }
      }

      .ehx-cloud-lobe {
        position: absolute;
        border-radius: 50%;
        background:
          radial-gradient(circle,
            rgba(186,255,120,0.95) 0%,
            rgba(80,220,80,0.7) 35%,
            rgba(32,100,42,0.38) 65%,
            rgba(0,0,0,0) 100%);
        box-shadow:
          0 0 35px rgba(80,255,100,0.35),
          0 0 80px rgba(60,180,60,0.2);
        animation: ehxLobeDrift 1.8s ease-in-out infinite alternate;
      }

      @keyframes ehxLobeDrift {
        from { transform: translateY(0) scale(1); }
        to   { transform: translateY(-6px) scale(1.06); }
      }

      .ehx-poison-fog {
        position: fixed;
        width: 300px;
        height: 300px;
        margin-left: -110px;
        margin-top: -35px;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle,
            rgba(120,255,120,0.28) 0%,
            rgba(80,200,80,0.18) 35%,
            rgba(30,80,30,0.08) 60%,
            rgba(0,0,0,0) 100%);
        filter: blur(4px);
        animation: ehxFogPulse 1s ease-out forwards;
        z-index: 10007;
      }

      @keyframes ehxFogPulse {
        0%   { opacity: 0; transform: scale(0.5); }
        20%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.5); }
      }

      .ehx-bubble {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle at 35% 35%,
            rgba(240,255,220,0.9) 0%,
            rgba(180,255,120,0.85) 16%,
            rgba(80,220,80,0.55) 52%,
            rgba(0,0,0,0) 100%);
        box-shadow: 0 0 12px rgba(120,255,120,0.4);
        animation: ehxBubbleRise 1s ease-out forwards;
        z-index: 10008;
      }

      @keyframes ehxBubbleRise {
        0%   { opacity: 0; transform: translateY(16px) scale(0.5); }
        18%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-48px) scale(1.25); }
      }

      .ehx-rain-layer {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 10003;
      }

      .ehx-acid-sky {
        position: fixed;
        inset: 0;
        background: rgba(0,255,0,0.08);
        pointer-events: none;
        animation: ehxAcidSky 2s forwards;
        z-index: 10001;
      }

      @keyframes ehxAcidSky {
        0%   { opacity: 0; }
        30%  { opacity: 1; }
        100% { opacity: 0; }
      }

      .ehx-drop {
        position: absolute;
        width: 4px;
        height: 22px;
        background: linear-gradient(#7CFF00,#00FF66);
        border-radius: 2px;
        box-shadow: 0 0 8px #7CFF00;
        animation: ehxFall linear forwards;
      }

      @keyframes ehxFall {
        from { transform: translateY(-100px); opacity: 1; }
        to   { transform: translateY(100vh); opacity: 0; }
      }

      .ehx-steam {
        position: fixed;
        width: 300px;
        height: 260px;
        pointer-events: none;
        filter: blur(2px);
        animation: ehxSteamExpand 1.2s ease-out forwards;
        z-index: 10006;
      }

      @keyframes ehxSteamExpand {
        0%   { opacity: 0; transform: scale(0.5); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.45) translateY(-28px); }
      }

      .ehx-steam-part {
        position: absolute;
        border-radius: 50%;
        background:
          radial-gradient(circle,
            rgba(255,255,255,0.95) 0%,
            rgba(235,235,235,0.72) 42%,
            rgba(255,255,255,0) 100%);
      }

      .ehx-wet-drop {
        position: fixed;
        width: 32px;
        height: 52px;
        border-radius: 50% 50% 55% 55%;
        background: linear-gradient(180deg, rgba(180,240,255,0.95), rgba(50,160,255,0.78));
        box-shadow: 0 0 12px rgba(100,200,255,0.45);
        pointer-events: none;
        animation: ehxWetFall 1.4s ease-in forwards;
        z-index: 10006;
      }

      @keyframes ehxWetFall {
        0%   { opacity: 0; transform: translateY(-8px) scale(0.8); }
        18%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(120px) scale(0.92); }
      }

      .ehx-rust-layer {
        position: fixed;
        width: 300px;
        height: 300px;
        pointer-events: none;
        animation: ehxRustFade 1.8s ease-out forwards;
        z-index: 10007;
      }

      @keyframes ehxRustFade {
        0%   { opacity: 0; transform: scale(0.8); }
        25%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.06); }
      }

      .ehx-rust-spot {
        position: absolute;
        border-radius: 50%;
        background:
          radial-gradient(circle,
            rgba(201,120,44,0.95) 0%,
            rgba(142,74,24,0.88) 55%,
            rgba(60,30,8,0.05) 100%);
        box-shadow: 0 0 16px rgba(160,80,30,0.28);
      }

      .ehx-salt {
        position: fixed;
        width: 120px;
        height: 120px;
        border-radius: 3px;
        background: white;
        box-shadow: 0 0 10px rgba(255,255,255,0.95);
        pointer-events: none;
        animation: ehxSaltFly 0.8s ease-out forwards;
        z-index: 10009;
      }

      @keyframes ehxSaltFly {
        0%   { opacity: 0; transform: scale(0.3) translate(0,0); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1) translate(var(--tx), var(--ty)); }
      }

      .ehx-bolt {
        position: fixed;
        width: 14px;
        background: linear-gradient(
          180deg,
          rgba(255,255,255,1),
          rgba(120,220,255,0.95),
          rgba(90,170,255,0.15)
        );
        clip-path: polygon(45% 0%, 70% 0%, 54% 36%, 78% 36%, 26% 100%, 42% 58%, 18% 58%);
        filter:
          drop-shadow(0 0 18px rgba(180,240,255,0.95))
          drop-shadow(0 0 36px rgba(100,190,255,0.8));
        pointer-events: none;
        transform-origin: top center;
        animation: ehxBoltFlash 0.28s ease-out forwards;
        z-index: 10013;
      }

      @keyframes ehxBoltFlash {
        0%   { opacity: 0; transform: scaleY(0.2); }
        20%  { opacity: 1; transform: scaleY(1); }
        100% { opacity: 0; transform: scaleY(1.05); }
      }

      .ehx-air-ring {
        position: fixed;
        width: 70px;
        height: 70px;
        margin-left: -35px;
        margin-top: -35px;
        border-radius: 50%;
        border: 5px solid rgba(210,235,255,0.88);
        pointer-events: none;
        animation: ehxAirRing 0.7s ease-out forwards;
        z-index: 10010;
      }

      @keyframes ehxAirRing {
        0%   { opacity: 1; transform: scale(0.2); }
        100% { opacity: 0; transform: scale(2.9); }
      }

      .ehx-metal-hit {
        position: fixed;
        width: 160px;
        height: 160px;
        margin-left: -80px;
        margin-top: -80px;
        pointer-events: none;
        z-index: 10012;
      }

      .ehx-metal-hit::before,
      .ehx-metal-hit::after {
        content: "";
        position: absolute;
        inset: 0;
        background:
          linear-gradient(45deg, transparent 44%, rgba(255,255,255,0.95) 49%, transparent 54%);
        animation: ehxMetalSlash 0.32s ease-out forwards;
      }

      .ehx-metal-hit::after {
        transform: rotate(90deg);
      }

      @keyframes ehxMetalSlash {
        0%   { opacity: 0; transform: scale(0.5); }
        30%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.25); }
      }

      .ehx-hammer-anticipation {
        position: fixed;
        width: 92px;
        height: 164px;
        margin-left: -46px;
        margin-top: -138px;
        pointer-events: none;
        z-index: 10013;
        animation: ehxHammerAnticipation 0.12s ease-out forwards;
      }

      .ehx-hammer-anticipation::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 14px;
        width: 18px;
        height: 108px;
        margin-left: -9px;
        border-radius: 12px;
        background: linear-gradient(180deg, rgba(54,60,70,0.78), rgba(18,22,28,0.92));
      }

      .ehx-hammer-anticipation::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 0;
        width: 84px;
        height: 52px;
        margin-left: -42px;
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(28,32,38,0.86), rgba(10,12,15,0.96));
        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
      }

      @keyframes ehxHammerAnticipation {
        0% { opacity: 0; transform: translateY(10px) scale(0.9); }
        100% { opacity: 0.75; transform: translateY(-12px) scale(1); }
      }

      .ehx-hammer-slam {
        position: fixed;
        width: 108px;
        height: 198px;
        margin-left: -54px;
        margin-top: -170px;
        pointer-events: none;
        z-index: 10014;
        animation: ehxHammerSlam 0.22s cubic-bezier(.15,.9,.18,1) forwards;
      }

      .ehx-hammer-slam::before {
        content: "";
        position: absolute;
        left: 50%;
        top: 24px;
        width: 20px;
        height: 132px;
        margin-left: -10px;
        border-radius: 12px;
        background: linear-gradient(180deg, rgba(68,76,88,0.92), rgba(24,28,34,0.96));
      }

      .ehx-hammer-slam::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 0;
        width: 104px;
        height: 62px;
        margin-left: -52px;
        border-radius: 20px;
        background: linear-gradient(180deg, rgba(238,242,248,0.96), rgba(126,138,152,0.94));
        box-shadow:
          inset 0 -10px 14px rgba(70,78,90,0.35),
          0 10px 18px rgba(0,0,0,0.22);
      }

      @keyframes ehxHammerSlam {
        0% { opacity: 0; transform: translateY(-160px) scale(0.9); }
        58% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(6px) scale(1.02); }
      }

      .ehx-hit-stop-burst {
        position: fixed;
        width: 160px;
        height: 160px;
        margin-left: -80px;
        margin-top: -80px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, rgba(255,255,255,0.96) 0%, rgba(240,246,252,0.4) 30%, rgba(0,0,0,0) 72%);
        animation: ehxHitStopBurst 0.18s ease-out forwards;
        z-index: 10015;
      }

      @keyframes ehxHitStopBurst {
        0% { opacity: 0; transform: scale(0.4); }
        28% { opacity: 1; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.18); }
      }

      .ehx-hammer-crack {
        position: fixed;
        width: 190px;
        height: 190px;
        margin-left: -95px;
        margin-top: -95px;
        pointer-events: none;
        opacity: 0;
        animation: ehxHammerCrackIn 0.34s ease-out forwards;
        z-index: 10014;
      }

      @keyframes ehxHammerCrackIn {
        0% { opacity: 0; transform: scale(0.72); }
        20% { opacity: 0.92; transform: scale(1); }
        100% { opacity: 0.68; transform: scale(1); }
      }

      .ehx-hammer-crack svg {
        width: 100%;
        height: 100%;
      }

      .ehx-hammer-gravel {
        position: fixed;
        width: 12px;
        height: 10px;
        pointer-events: none;
        background: linear-gradient(180deg, #b1aba4, #6c6865);
        clip-path: polygon(14% 24%, 57% 0, 100% 22%, 87% 76%, 41% 100%, 0 76%);
        opacity: 0.96;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        animation: ehxHammerGravelFly 0.72s cubic-bezier(.15,.75,.2,1) forwards;
        z-index: 10015;
      }

      @keyframes ehxHammerGravelFly {
        0% { opacity: 0; transform: translate(0, 0) rotate(0deg) scale(0.88); }
        16% { opacity: 1; }
        45% { opacity: 1; transform: translate(calc(var(--dx) * 0.7), var(--peak)) rotate(var(--rot)) scale(1); }
        100% { opacity: 0; transform: translate(var(--dx), calc(var(--peak) + 76px)) rotate(calc(var(--rot) + 70deg)) scale(0.84); }
      }

      .ehx-corrode-darkwash {
        position: fixed;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at center, rgba(35, 45, 12, 0.16) 0%, rgba(10, 16, 10, 0.34) 50%, rgba(0, 0, 0, 0.68) 100%);
        animation: ehxCorrodeDarkwash 0.9s ease-out forwards;
        z-index: 10009;
      }

      @keyframes ehxCorrodeDarkwash {
        0% { opacity: 0; }
        18% { opacity: 1; }
        100% { opacity: 0; }
      }

      .corrode-liquid {
        position: fixed;
        pointer-events: none;
        width: 260px;
        height: 120px;
        margin-left: -130px;
        margin-top: -60px;
        transform-origin: center;
        opacity: 0;
        animation: corrodeLiquidSpread 5s cubic-bezier(.12,.75,.15,1) forwards;
        z-index: 10013;
      }

      .corrode-liquid::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: 44% 56% 58% 42% / 56% 42% 58% 44%;
        background:
          radial-gradient(circle at 45% 35%, rgba(236,255,140,0.78), rgba(124,255,54,0.78) 28%, rgba(46,219,79,0.85) 58%, rgba(13,122,42,0.9) 80%, rgba(6,59,22,0.92));
        clip-path: polygon(4% 60%, 10% 41%, 18% 32%, 28% 34%, 38% 24%, 50% 31%, 60% 23%, 72% 30%, 86% 40%, 96% 57%, 90% 72%, 80% 82%, 64% 86%, 48% 88%, 34% 84%, 22% 80%, 10% 71%);
        box-shadow:
          0 0 18px rgba(124,255,54,.28),
          inset 0 -8px 18px rgba(6,59,22,.45);
      }

      .corrode-liquid::after {
        content: "";
        position: absolute;
        inset: -10px;
        background:
          radial-gradient(circle at 50% 45%, rgba(40,60,28,.45), rgba(12,18,10,.6) 65%, rgba(0,0,0,0) 90%);
        clip-path: polygon(5% 62%, 12% 45%, 22% 33%, 32% 35%, 42% 27%, 54% 31%, 66% 24%, 78% 31%, 90% 42%, 96% 58%, 91% 73%, 80% 82%, 65% 86%, 47% 89%, 30% 85%, 18% 79%, 9% 70%);
        filter: blur(4px);
      }

      @keyframes corrodeLiquidSpread {
        0%{ opacity:0; transform:scale(.22) rotate(-6deg);}
        12%{ opacity:.95; transform:scale(.7) rotate(-2deg);}
        35%{ opacity:1; transform:scale(1) rotate(0deg);}
        70%{ opacity:.82; transform:scale(1.08) rotate(1deg);}
        100%{ opacity:0; transform:scale(1.16) rotate(2deg);}
      }

      .corrode-bubble {
        position: fixed;
        pointer-events: none;
        border-radius: 50%;
        background:
          radial-gradient(circle at 35% 35%, rgba(255,255,220,.9), rgba(200,255,120,.75) 35%, rgba(124,255,54,.35) 70%, rgba(124,255,54,0) 72%);
        box-shadow:
          0 0 10px rgba(124,255,54,.25);
        animation: corrodeBubblePop 2.8s ease-out forwards;
        z-index: 10015;
      }

      @keyframes corrodeBubblePop {
        0%{ opacity:0; transform:translateY(8px) scale(.45);}
        35%{ opacity:.95; transform:translateY(-10px) scale(.9);}
        100%{ opacity:0; transform:translateY(-26px) scale(1.1);}
      }

      .corrode-smoke {
        position: fixed;
        pointer-events: none;
        border-radius: 50%;
        background:
          radial-gradient(circle at 50% 50%, rgba(160,255,120,.28), rgba(120,255,120,.12) 48%, rgba(120,255,120,0) 72%);
        filter: blur(10px);
        animation: corrodeSmokeRise 3s ease-out forwards;
        z-index: 10011;
      }

      @keyframes corrodeSmokeRise {
        0%{ opacity:0; transform:translateY(0) scale(.65);}
        25%{ opacity:.8; transform:translateY(-8px) scale(1);}
        100%{ opacity:0; transform:translateY(-24px) scale(1.35);}
      }

      .corrode-splat {
        position: fixed;
        width: 250px;
        height: 180px;
        margin-left: -125px;
        margin-top: -90px;
        transform: scale(.3);
        opacity: 0;
        filter:
          drop-shadow(0 0 18px rgba(140,255,80,.28))
          drop-shadow(0 0 38px rgba(70,255,40,.18));
        animation: corrodeSplatIn 2.2s cubic-bezier(.15,.85,.2,1) forwards;
        z-index: 10014;
      }

      .corrode-splat .blob {
        position:absolute;
        inset:0;
        background:
          radial-gradient(circle at 35% 35%, rgba(246,255,174,.95), rgba(124,255,54,.92) 34%, rgba(46,219,79,.88) 58%, rgba(13,122,42,.92) 82%, rgba(6,59,22,.95) 100%);
        clip-path:polygon(6% 48%, 12% 32%, 22% 20%, 33% 24%, 45% 12%, 58% 19%, 71% 11%, 82% 21%, 91% 38%, 98% 48%, 92% 62%, 84% 76%, 70% 83%, 55% 88%, 39% 84%, 22% 76%, 11% 64%);
        border-radius:40% 60% 52% 48% / 52% 38% 62% 48%;
      }

      .corrode-splat .blob2 {
        position:absolute;
        width:70%;
        height:60%;
        left:10%;
        top:18%;
        background:
          radial-gradient(circle at 40% 40%, rgba(236,255,140,.8), rgba(124,255,54,.55) 45%, rgba(46,219,79,0) 75%);
        clip-path:polygon(8% 45%, 18% 28%, 40% 19%, 60% 18%, 78% 28%, 92% 45%, 84% 66%, 64% 78%, 36% 80%, 16% 68%);
        opacity:.8;
      }

      @keyframes corrodeSplatIn{
        0%{ opacity:0; transform:scale(.2) rotate(-10deg);}
        10%{ opacity:1; transform:scale(.96) rotate(2deg);}
        28%{ opacity:1; transform:scale(1.03) rotate(0deg);}
        60%{ opacity:.95; transform:scale(1.07) rotate(1deg);}
        100%{ opacity:0; transform:scale(1.12) rotate(2deg);}
      }

      .corrode-impact-flash {
        position: fixed;
        width: 220px;
        height: 160px;
        margin-left: -110px;
        margin-top: -80px;
        pointer-events: none;
        opacity: 0;
        background:
          radial-gradient(circle at 50% 50%, rgba(236,255,160,.6), rgba(124,255,54,.3) 45%, rgba(124,255,54,0) 75%);
        filter: blur(4px);
        animation: corrodeImpactFlash 0.45s ease-out forwards;
        mix-blend-mode: screen;
        z-index: 10016;
      }

      @keyframes corrodeImpactFlash {
        0%{ opacity:0; transform:scale(.4);}
        18%{ opacity:1; transform:scale(.95);}
        100%{ opacity:0; transform:scale(1.12);}
      }

      .corrode-droplet {
        position: fixed;
        width: 16px;
        height: 24px;
        pointer-events: none;
        background:
          radial-gradient(circle at 40% 28%, rgba(244,255,180,.9), rgba(124,255,54,.95) 42%, rgba(13,122,42,.95) 90%);
        clip-path: polygon(50% 0, 82% 28%, 88% 58%, 72% 84%, 50% 100%, 28% 84%, 12% 58%, 18% 28%);
        filter: drop-shadow(0 0 8px rgba(124,255,54,.22));
        opacity: .95;
        z-index: 10015;
      }

      .corrode-drip {
        position:absolute;
        width:10px;
        height:34px;
        transform:translate(-50%, -50%);
        opacity:0;
        z-index:10012;
      }

      .corrode-drip::before{
        content:"";
        position:absolute;
        left:50%;
        top:0;
        width:6px;
        height:24px;
        transform:translateX(-50%);
        background:linear-gradient(180deg, rgba(124,255,54,.85), rgba(13,122,42,.95));
        border-radius:999px;
      }

      .corrode-drip::after{
        content:"";
        position:absolute;
        left:50%;
        bottom:0;
        width:12px;
        height:12px;
        transform:translateX(-50%);
        border-radius:50%;
        background:radial-gradient(circle, rgba(236,255,180,.95), rgba(124,255,54,.95) 45%, rgba(13,122,42,.95));
      }

      .corrode-stain {
        position: fixed;
        width: 240px;
        height: 110px;
        margin-left: -120px;
        margin-top: -55px;
        pointer-events: none;
        opacity: 0;
        animation: corrodeStainFade 5.2s ease-out forwards;
        z-index: 10010;
      }

      .corrode-stain::before{
        content:"";
        position:absolute;
        inset:0;
        background:
          radial-gradient(circle at 50% 45%, rgba(40,60,28,.45), rgba(12,18,10,.6) 65%, rgba(0,0,0,0) 90%);
        clip-path:polygon(5% 62%, 12% 45%, 22% 33%, 32% 35%, 42% 27%, 54% 31%, 66% 24%, 78% 31%, 90% 42%, 96% 58%, 91% 73%, 80% 82%, 65% 86%, 47% 89%, 30% 85%, 18% 79%, 9% 70%);
        filter:blur(4px);
      }

      @keyframes corrodeStainFade{
        0%{ opacity:0; }
        12%{ opacity:.3; }
        28%{ opacity:.75; }
        75%{ opacity:.55; }
        100%{ opacity:0; }
      }

      .ehx-corrode-hole {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle at 42% 38%, rgba(18,18,18,1) 0%, rgba(8,8,8,0.96) 44%, rgba(102,255,72,0.28) 58%, rgba(88,42,18,0.5) 72%, rgba(0,0,0,0) 100%);
        box-shadow:
          inset 0 0 12px rgba(0,0,0,0.85),
          0 0 12px rgba(98,255,72,0.2),
          0 0 18px rgba(80,40,18,0.28);
        animation: ehxCorrodeHole 1.15s ease-out forwards;
        z-index: 10015;
      }

      @keyframes ehxCorrodeHole {
        0% { opacity: 0; transform: scale(0.2); }
        24% { opacity: 0.95; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.14); }
      }

      .ehx-ember {
        position: fixed;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: radial-gradient(circle, #fff2a8 0%, #ffad33 50%, rgba(255,80,0,0) 100%);
        box-shadow: 0 0 12px rgba(255,140,0,0.7);
        pointer-events: none;
        animation: ehxEmberRise 0.9s ease-out forwards;
        z-index: 10008;
      }

      @keyframes ehxEmberRise {
        0%   { opacity: 0; transform: translateY(8px) scale(0.6); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-40px) scale(1); }
      }

      .ehx-smoke {
        position: fixed;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, rgba(90,90,90,0.55), rgba(0,0,0,0));
        filter: blur(3px);
        animation: ehxSmokeRise 1.15s ease-out forwards;
        z-index: 10007;
      }

      @keyframes ehxSmokeRise {
        0%   { opacity: 0; transform: translateY(8px) scale(0.5); }
        18%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-50px) scale(1.4); }
      }

      .ehx-energy-ring {
        position: fixed;
        width: 100px;
        height: 100px;
        margin-left: -50px;
        margin-top: -50px;
        border-radius: 50%;
        border: 6px solid rgba(120,255,220,0.9);
        box-shadow: 0 0 20px rgba(120,255,220,0.45);
        pointer-events: none;
        animation: ehxEnergyRing 0.7s ease-out forwards;
        z-index: 10010;
      }

      @keyframes ehxEnergyRing {
        0%   { opacity: 1; transform: scale(0.25); }
        100% { opacity: 0; transform: scale(2.1); }
      }

      .ehx-shield {
        position: fixed;
        width: 190px;
        height: 190px;
        margin-left: -95px;
        margin-top: -95px;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle,
            rgba(180,230,255,0.18) 0%,
            rgba(80,170,255,0.14) 35%,
            rgba(0,0,0,0) 72%);
        border: 5px solid rgba(150,220,255,0.75);
        box-shadow: 0 0 28px rgba(120,200,255,0.45);
        animation: ehxShieldPulse 0.9s ease-out forwards;
        z-index: 10009;
      }

      @keyframes ehxShieldPulse {
        0%   { opacity: 0; transform: scale(0.65); }
        20%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.15); }
      }

      .ehx-gas-dot {
        position: fixed;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        pointer-events: none;
        animation: ehxGasFloat 1s ease-out forwards;
        z-index: 10007;
      }

      @keyframes ehxGasFloat {
        0%   { opacity: 0; transform: translateY(10px) scale(0.65); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: translateY(-46px) scale(1.05); }
      }

      .ehx-dust {
        position: fixed;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(circle, rgba(255,248,220,0.95), rgba(190,180,140,0));
        animation: ehxDustScatter 0.75s ease-out forwards;
        z-index: 10007;
      }

      @keyframes ehxDustScatter {
        0%   { opacity: 0; transform: scale(0.5) translate(0,0); }
        15%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1) translate(var(--dx), var(--dy)); }
      }
    `;
    document.head.appendChild(style);
  }

  function qs(selector) {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

function getDefaultElement(side) {
  if (side === "player") {
    return qs("#player-desk");
  }
  return qs("#enemy-desk");
}

  function getElementFromContext(ctx, kind) {
    const direct = kind === "source" ? ctx.sourceEl : ctx.targetEl;
    if (direct) return direct;

    const selector = kind === "source" ? ctx.sourceSelector : ctx.targetSelector;
    if (selector) {
      const found = qs(selector);
      if (found) return found;
    }

    const side = kind === "source" ? ctx.sourceSide : ctx.targetSide;
    if (side) return getDefaultElement(side);

    return null;
  }

  function rectCenter(el) {
    if (!el) {
      return {
        rect: {
          left: window.innerWidth / 2 - 50,
          top: window.innerHeight / 2 - 50,
          width: 100,
          height: 100,
        },
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };
    }

    const rect = el.getBoundingClientRect();
    return {
      rect,
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  function removeLater(el, ms) {
    setTimeout(() => el && el.remove(), ms);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function createNode(className, styleObj = {}, parent = document.body) {
    const el = document.createElement("div");
    if (className) el.className = className;
    Object.assign(el.style, styleObj);
    parent.appendChild(el);
    return el;
  }

  function lockCombatInteraction() {
    ensureEffectStyles();
    combatLockDepth += 1;
    if (combatLockDepth > 1) return;

    const root = getCombatCinematicLayer();
    const blocker = createNode("ehx-cinematic-lock", {}, root);
    blocker.dataset.lockId = "combat-lock";
    document.body.dataset.combatLocked = "true";
  }

  function unlockCombatInteraction() {
    combatLockDepth = Math.max(0, combatLockDepth - 1);
    if (combatLockDepth > 0) return;

    const root = getCombatCinematicLayer();
    root.querySelectorAll('[data-lock-id="combat-lock"]').forEach((node) => node.remove());
    delete document.body.dataset.combatLocked;
  }

  function getCardTheme(cardId) {
    const lower = String(cardId || "").toLowerCase();

    if (["combustion", "fireball", "explosion", "carbonBurn", "hydrogenBurn"].includes(lower)) {
      return {
        localCore: "rgba(255,255,220,0.98)",
        localMid: "rgba(255,193,92,0.54)",
        localGlow: "rgba(255,120,40,0.18)",
        impactCore: "rgba(255,244,212,0.98)",
        impactMid: "rgba(255,190,94,0.54)",
        impactGlow: "rgba(255,104,52,0.18)",
        damageColor: "#ffd77a",
      };
    }

    if (["lightning", "plasmaShock"].includes(lower)) {
      return {
        localCore: "rgba(255,255,255,0.98)",
        localMid: "rgba(193,238,255,0.6)",
        localGlow: "rgba(102,186,255,0.2)",
        impactCore: "rgba(255,255,255,0.98)",
        impactMid: "rgba(173,232,255,0.58)",
        impactGlow: "rgba(102,168,255,0.2)",
        damageColor: "#c9f3ff",
      };
    }

    if (["poisonCloud", "acidRain", "rust", "corrode"].includes(lower)) {
      return {
        localCore: "rgba(244,255,188,0.98)",
        localMid: "rgba(160,255,110,0.52)",
        localGlow: "rgba(72,190,84,0.18)",
        impactCore: "rgba(236,255,190,0.98)",
        impactMid: "rgba(151,255,109,0.48)",
        impactGlow: "rgba(72,190,84,0.18)",
        damageColor: "#baff7f",
      };
    }

    return {
      localCore: "rgba(255,255,255,0.98)",
      localMid: "rgba(139,247,255,0.5)",
      localGlow: "rgba(85,214,255,0.18)",
      impactCore: "rgba(255,255,255,0.98)",
      impactMid: "rgba(139,247,255,0.48)",
      impactGlow: "rgba(85,214,255,0.16)",
      damageColor: "#ffd166",
    };
  }

  function getPlayerArea(pid) {
    return Number(pid) === 1 ? qs("#player-area") : qs("#enemy-area");
  }

  function createAreaGlow(el, className) {
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const layer = getCombatCinematicLayer();
    const node = createNode(className, {
      left: `${rect.left - 6}px`,
      top: `${rect.top - 6}px`,
      width: `${rect.width + 12}px`,
      height: `${rect.height + 12}px`,
    }, layer);
    removeLater(node, className === "ehx-attacker-glow" ? 520 : 620);
    return node;
  }

  function findActorHandCard(cardId, actorPid) {
    const currentPlayerId = Number(window.playerId || 0);
    if (!cardId || !actorPid || currentPlayerId !== Number(actorPid)) return null;

    const handRoot = currentPlayerId === 1 ? qs("#p1Hand") : qs("#p2Hand");
    if (!handRoot) return null;

    return handRoot.querySelector(`.card.selected[data-card-id="${cardId}"]`)
      || handRoot.querySelector(`.card[data-card-id="${cardId}"]`);
  }

  function showCardCastFlash(cardId, actorPid) {
    const cardEl = findActorHandCard(cardId, actorPid);
    if (!cardEl) return;

    const rect = cardEl.getBoundingClientRect();
    const layer = getFxLayer();
    const flash = createNode("card-cast-flash", {
      left: `${rect.left - 4}px`,
      top: `${rect.top - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    }, layer);
    if (cardId === "corrode") {
      flash.classList.add("corrode-cast");

      const splash = createNode("corrode-cast-splash", {
        left: `${rect.left + rect.width * 0.46}px`,
        top: `${rect.top + rect.height * 0.34}px`,
      }, layer);
      removeLater(splash, 1200);

      const trail = createNode("corrode-cast-trail", {
        left: `${rect.left + rect.width * 0.42}px`,
        top: `${rect.top + rect.height * 0.36}px`,
        width: `${Math.max(56, rect.width * 0.72)}px`,
        transform: "translateY(-50%) rotate(-18deg)",
      }, layer);
      removeLater(trail, 900);
    }
    removeLater(flash, 520);
  }

  async function highlightCardAsync(cardId, ctx) {
    const layer = getCombatCinematicLayer();
    const cardEl = findActorHandCard(cardId, ctx.actorPid);

    if (cardEl) {
      const rect = cardEl.getBoundingClientRect();
      const node = createNode("ehx-cinematic-card-highlight", {
        left: `${rect.left - 6}px`,
        top: `${rect.top - 6}px`,
        width: `${rect.width + 12}px`,
        height: `${rect.height + 12}px`,
      }, layer);
      removeLater(node, 360);
    } else {
      createAreaGlow(getPlayerArea(ctx.actorPid), "ehx-attacker-glow");
    }

    showCardCastFlash(cardId, ctx.actorPid);
    await wait(240);
  }

  async function showLocalEffectAsync(cardId, ctx) {
    const layer = getCombatCinematicLayer();
    const theme = getCardTheme(cardId);
    const sourceCenter = rectCenter(ctx.sourceEl || getPlayerArea(ctx.actorPid));

    createAreaGlow(getPlayerArea(ctx.actorPid), "ehx-attacker-glow");
    const local = createNode("ehx-cinematic-local", {
      left: `${sourceCenter.x}px`,
      top: `${sourceCenter.y}px`,
      "--ehx-local-core": theme.localCore,
      "--ehx-local-mid": theme.localMid,
      "--ehx-local-glow": theme.localGlow,
    }, layer);
    removeLater(local, 520);
    await wait(360);
  }

  async function showGlobalImpactAsync(cardId, ctx) {
    const layer = getCombatCinematicLayer();
    const theme = getCardTheme(cardId);
    const targetArea = getPlayerArea(ctx.targetPid) || ctx.targetEl;
    const targetCenter = rectCenter(targetArea);

    createAreaGlow(getPlayerArea(ctx.targetPid), "ehx-defender-glow");
    const impact = createNode("ehx-cinematic-impact", {
      left: `${targetCenter.x}px`,
      top: `${targetCenter.y}px`,
      "--ehx-impact-core": theme.impactCore,
      "--ehx-impact-mid": theme.impactMid,
      "--ehx-impact-glow": theme.impactGlow,
    }, layer);
    removeLater(impact, 540);

    if (shouldShowScreenHit(cardId, ctx)) {
      showScreenHit(cardId, ctx.targetPid, ctx);
    }

    await wait(420);
  }

  async function applyDamageStepAsync(cardId, ctx) {
    const theme = getCardTheme(cardId);
    const targetEl = ctx.targetEl || getPlayerArea(ctx.targetPid);
    const sourceEl = ctx.sourceEl || getPlayerArea(ctx.actorPid);

    if ((ctx.damage ?? 0) > 0) {
      showDamage(targetEl, ctx.damage, theme.damageColor);
    }
    if ((ctx.heal ?? 0) > 0) {
      showHeal(sourceEl, ctx.heal);
    }
    if ((ctx.energy ?? 0) > 0) {
      showEnergy(sourceEl, ctx.energy);
    }
    if ((ctx.draw ?? 0) > 0) {
      showDraw(sourceEl, ctx.draw);
    }

    shake(targetEl);
    await wait(360);
  }

  async function playCardEffectCinematic(cardId, context = {}) {
    const ctx = resolveEffectContext(context);
    const effect = CARD_EFFECT_MAP[cardId];
    if (!effect) return false;
    const usesSpecialCinematic = SPECIAL_CINEMATIC_CARD_IDS.has(cardId);

    if (!shouldRunViewerAnimation(cardId, ctx)) {
      return true;
    }

    lockCombatInteraction();
    try {
      await highlightCardAsync(cardId, ctx);
      if (usesSpecialCinematic) {
        playCardEffect(cardId, { ...ctx, cinematicMode: true });
        await wait(Math.max(700, Number(ctx.duration) || 900));
      } else {
        await showLocalEffectAsync(cardId, ctx);
        await showGlobalImpactAsync(cardId, ctx);
        await applyDamageStepAsync(cardId, ctx);
      }
    } finally {
      unlockCombatInteraction();
    }

    if (typeof ctx.onComplete === "function") {
      ctx.onComplete();
    }

    return true;
  }

  function queueCardEffectCinematic(cardId, context = {}) {
    combatCinematicQueue = combatCinematicQueue
      .catch(() => {})
      .then(() => playCardEffectCinematic(cardId, context));
    return combatCinematicQueue;
  }

  function showScreenHit(cardId, targetPid, context = {}) {
    const currentPlayerId = Number(window.playerId || context.playerId || 0);
    if (!targetPid || currentPlayerId !== Number(targetPid)) return;

    const layer = getFxLayer();
    const burst = createNode("screen-hit-effect", {}, layer);
    if (cardId === "lightning") {
      burst.classList.add("lightning-hit");
    }
    removeLater(burst, 560);
  }

  function shouldShowScreenHit(cardId, ctx) {
    if (!ctx || Number(ctx.actorPid) === Number(ctx.targetPid)) return false;
    const impactCards = new Set([
      "fireball", "hammerStrike", "corrode", "lightning", "poisonCloud", "plasmaShock",
      "alkaliBlast", "metalCrush", "noblePressure", "combustion", "steamBurst", "acidRain",
      "rust", "explosion", "saltFormation", "carbonBurn", "potassiumWater", "limeFormation",
      "calciumSteam", "alkaliExplosion", "hydrogenBurn",
    ]);
    return impactCards.has(cardId);
  }

  function shouldRunViewerAnimation(cardId, ctx) {
    const actorPid = Number(ctx.actorPid || 0);
    const targetPid = Number(ctx.targetPid || 0);

    if (actorPid && targetPid && actorPid !== targetPid) {
      return true;
    }

    if (actorPid && targetPid && actorPid === targetPid) {
      return false;
    }

    return true;
  }

  function screenFlash(background) {
    const flash = createNode("ehx-screen-flash", {
      background,
      zIndex: 10002,
    });
    removeLater(flash, 300);
  }

  function shake(el) {
    if (!el) return;
    el.classList.add("ehx-shake");
    setTimeout(() => el.classList.remove("ehx-shake"), 380);
  }

  function decayingShake(el) {
    if (!el) return;
    const keyframes = [
      "translate(-8px, 2px)",
      "translate(6px, -2px)",
      "translate(-4px, 1px)",
      "translate(3px, -1px)",
      "translate(-1px, 0)",
      "translate(0, 0)",
    ];
    keyframes.forEach((transform, index) => {
      setTimeout(() => {
        el.style.transition = "transform 36ms ease-out";
        el.style.transform = transform;
      }, index * 36);
    });
    setTimeout(() => {
      el.style.transform = "";
    }, keyframes.length * 36 + 20);
  }

  function hammerCrackAt(x, y) {
    const crack = createNode("ehx-hammer-crack", {
      left: `${x}px`,
      top: `${y + 42}px`,
    });
    crack.innerHTML = `
      <svg viewBox="0 0 200 200" fill="none">
        <path d="M100 100 L78 84 L57 60" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 100 L112 76 L136 48" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 100 L68 110 L35 114" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 100 L126 112 L166 124" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 100 L92 126 L84 162" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M100 100 L112 132 L126 166" stroke="rgba(215,210,202,0.95)" stroke-width="3" stroke-linecap="round"/>
        <path d="M78 84 L71 71 L61 54" stroke="rgba(215,210,202,0.75)" stroke-width="2" stroke-linecap="round"/>
        <path d="M126 112 L148 110 L177 104" stroke="rgba(215,210,202,0.75)" stroke-width="2" stroke-linecap="round"/>
        <path d="M92 126 L70 134 L58 150" stroke="rgba(215,210,202,0.75)" stroke-width="2" stroke-linecap="round"/>
      </svg>
    `;
    removeLater(crack, 650);
  }

  function hammerGravelAt(x, y, count = 12) {
    for (let i = 0; i < count; i += 1) {
      const gravel = createNode("ehx-hammer-gravel", {
        left: `${x}px`,
        top: `${y}px`,
        "--dx": `${random(-105, 105)}px`,
        "--peak": `${random(-70, -24)}px`,
        "--rot": `${random(-180, 180)}deg`,
      });
      removeLater(gravel, 860);
    }
  }

  function corrodeDripsAt(x, y) {
    [-46, -10, 28].forEach((offset, idx) => {
      const drip = createNode("corrode-drip", {
        left: `${x + offset}px`,
        top: `${y}px`,
      });
      drip.animate([
        { transform: "translate(-50%, -50%) translate(0,0)", opacity: 0, offset: 0 },
        { transform: "translate(-50%, -50%) translate(0,8px)", opacity: 1, offset: 0.2 },
        { transform: "translate(-50%, -50%) translate(0,34px)", opacity: 0.95, offset: 0.75 },
        { transform: "translate(-50%, -50%) translate(0,48px)", opacity: 0, offset: 1 },
      ], {
        duration: 1800 + idx * 500,
        delay: 900 + idx * 350,
        easing: "ease-in",
        fill: "forwards",
      });
      removeLater(drip, 4300);
    });
  }

  function corrodeDropletsAt(x, y) {
    for (let i = 0; i < 12; i += 1) {
      const droplet = createNode("corrode-droplet", {
        left: `${x}px`,
        top: `${y}px`,
      });
      const angle = (-165 + Math.random() * 150) * Math.PI / 180;
      const dist = 24 + Math.random() * 100;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - (8 + Math.random() * 24);
      const rot = Math.random() * 90 - 45;

      droplet.animate([
        { transform: `translate(-50%, -50%) translate(0,0) rotate(${rot}deg) scale(.75)`, opacity: 1 },
        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) rotate(${rot + 40}deg) scale(1)`, opacity: .95, offset: .55 },
        { transform: `translate(-50%, -50%) translate(${dx * 1.15}px, ${dy + 40}px) rotate(${rot + 80}deg) scale(.8)`, opacity: 0 },
      ], {
        duration: 1800 + Math.random() * 1200,
        easing: "cubic-bezier(.15,.75,.2,1)",
        fill: "forwards",
      });

      removeLater(droplet, 3600);
    }
  }

  function floatText(x, y, text, options = {}) {
    const node = createNode("ehx-float-text", {
      left: `${x}px`,
      top: `${y}px`,
      color: options.color || "#ffd166",
      fontSize: options.fontSize || "42px",
      zIndex: options.zIndex || 10020,
    });
    node.textContent = text;
    removeLater(node, 980);
  }

  function showDamage(targetEl, amount, color = "#ffd166") {
    const { x, y } = rectCenter(targetEl);
    floatText(x, y - 10, `-${amount}`, { color });
    shake(targetEl);
  }

  function showHeal(targetEl, amount) {
    const { x, y } = rectCenter(targetEl);
    floatText(x, y - 10, `+${amount}`, { color: "#8dffb1" });
  }

  function showDraw(targetEl, amount) {
    const { x, y } = rectCenter(targetEl);
    floatText(x, y - 36, `+${amount} Card`, { color: "#d8f1ff", fontSize: "30px" });
  }

  function showEnergy(targetEl, amount) {
    const { x, y } = rectCenter(targetEl);
    floatText(x, y - 20, `+${amount} Energy`, { color: "#8ffff1", fontSize: "32px" });
  }

  function explosionAt(x, y, options = {}) {
    const explosion = createNode("ehx-explosion", {
      left: `${x}px`,
      top: `${y}px`,
      width: options.size ? `${options.size}px` : "",
      height: options.size ? `${options.size}px` : "",
      marginLeft: options.size ? `${-options.size / 2}px` : "",
      marginTop: options.size ? `${-options.size / 2}px` : "",
    });
    const shock = createNode("ehx-shockwave", {
      left: `${x}px`,
      top: `${y}px`,
      borderColor: options.ringColor || "rgba(255,210,130,0.88)",
    });

    if (options.flash !== false) {
      screenFlash(
        options.flashBg ||
          "radial-gradient(circle, rgba(255,170,60,0.18), rgba(255,0,0,0.06), rgba(255,0,0,0))"
      );
    }

    removeLater(explosion, 620);
    removeLater(shock, 620);
  }

  function steamAt(x, y) {
    const steam = createNode("ehx-steam", {
      left: `${x - 110}px`,
      top: `${y - 70}px`,
    });

    const parts = [
      { l: 15, t: 58, w: 80, h: 60 },
      { l: 65, t: 28, w: 100, h: 72 },
      { l: 120, t: 46, w: 84, h: 60 },
      { l: 88, t: 66, w: 110, h: 72 },
    ];

    parts.forEach((p) => {
      const part = createNode(
        "ehx-steam-part",
        {
          left: `${p.l}px`,
          top: `${p.t}px`,
          width: `${p.w}px`,
          height: `${p.h}px`,
        },
        steam
      );
      void part;
    });

    removeLater(steam, 1250);
  }

  function toxicCloudAt(targetEl, pulses = 3, damagePerPulse = 1) {
    const { rect, x, y } = rectCenter(targetEl);

    const overlay = createNode("ehx-toxic-overlay");
    removeLater(overlay, 2400);

    const cloud = createNode("ehx-cloud", {
      left: `${x - 140}px`,
      top: `${rect.top - 10}px`,
    });

    const lobes = [
      { left: 18, top: 52, w: 92, h: 72, delay: "0s" },
      { left: 74, top: 25, w: 110, h: 84, delay: "0.18s" },
      { left: 144, top: 42, w: 100, h: 78, delay: "0.08s" },
      { left: 95, top: 70, w: 128, h: 82, delay: "0.22s" },
      { left: 42, top: 82, w: 110, h: 74, delay: "0.12s" },
    ];

    lobes.forEach((l) => {
      createNode(
        "ehx-cloud-lobe",
        {
          left: `${l.left}px`,
          top: `${l.top}px`,
          width: `${l.w}px`,
          height: `${l.h}px`,
          animationDelay: l.delay,
        },
        cloud
      );
    });

    removeLater(cloud, 2450);

    const bubbleTimer = setInterval(() => {
      const size = 18 + Math.random() * 26;
      const bubble = createNode("ehx-bubble", {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x + (Math.random() * 140 - 70) - size / 2}px`,
        top: `${y + (Math.random() * 80 - 15) - size / 2}px`,
      });
      removeLater(bubble, 1000);
    }, 120);

    let done = 0;
    const pulseTimer = setInterval(() => {
      done++;

      const fog = createNode("ehx-poison-fog", {
        left: `${x}px`,
        top: `${y + 28}px`,
      });
      removeLater(fog, 1100);

      showDamage(targetEl, damagePerPulse, "#b8ff7a");

      if (done >= pulses) {
        clearInterval(pulseTimer);
        setTimeout(() => clearInterval(bubbleTimer), 700);
      }
    }, 650);
  }

  function acidRainAt(targetEl, ticks = 2, damagePerTick = 1) {
    const rainLayer = createNode("ehx-rain-layer");
    const sky = createNode("ehx-acid-sky");

    const interval = setInterval(() => {
      const drop = createNode("ehx-drop", {
        left: `${Math.random() * window.innerWidth}px`,
        animationDuration: `${0.7 + Math.random() * 0.6}s`,
      }, rainLayer);
      removeLater(drop, 1200);
    }, 40);

    let applied = 0;
    const tickTimer = setInterval(() => {
      applied++;
      showDamage(targetEl, damagePerTick, "#99ff66");
      if (applied >= ticks) clearInterval(tickTimer);
    }, 850);

    setTimeout(() => {
      clearInterval(interval);
      rainLayer.remove();
      sky.remove();
    }, 2100);
  }

  function rustAt(targetEl) {
    const { rect } = rectCenter(targetEl);
    const layer = createNode("ehx-rust-layer", {
      left: `${rect.left - 10}px`,
      top: `${rect.top - 10}px`,
    });

    for (let i = 0; i < 10; i++) {
      const size = 24 + Math.random() * 44;
      createNode("ehx-rust-spot", {
        width: `${size}px`,
        height: `${size}px`,
        left: `${Math.random() * 140}px`,
        top: `${Math.random() * 140}px`,
      }, layer);
    }

    removeLater(layer, 1900);
  }

  function wetAt(targetEl, count = 8) {
    const { rect } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const drop = createNode("ehx-wet-drop", {
        left: `${rect.left + 20 + Math.random() * (rect.width - 40)}px`,
        top: `${rect.top + 10 + Math.random() * 40}px`,
      });
      removeLater(drop, 1450);
    }
  }

  function crystalBurstAt(targetEl, count = 20) {
    const { x, y } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const crystal = createNode("ehx-salt", {
        left: `${x}px`,
        top: `${y}px`,
        "--tx": `${(Math.random() - 0.5) * 180}px`,
        "--ty": `${(Math.random() - 0.5) * 180}px`,
      });
      removeLater(crystal, 850);
    }
    screenFlash(
      "radial-gradient(circle, rgba(255,255,255,0.16), rgba(255,255,255,0.05), rgba(0,0,0,0))"
    );
  }

  function lightningAt(targetEl, damage = 4, color = "#c9f3ff") {
    const { rect, x, y } = rectCenter(targetEl);

    const screen = createNode("ehx-screen-flash", {
      background: "rgba(210,240,255,0.35)",
      zIndex: 10001,
    });
    removeLater(screen, 260);

    const top = Math.max(20, rect.top - 170);
    const bolt = createNode("ehx-bolt", {
      left: `${x - 7}px`,
      top: `${top}px`,
      height: `${Math.max(220, y - top)}px`,
    });
    removeLater(bolt, 300);

    setTimeout(() => explosionAt(x, y, {
      size: 220,
      ringColor: "rgba(200,235,255,0.95)",
      flashBg: "radial-gradient(circle, rgba(200,235,255,0.18), rgba(100,160,255,0.06), rgba(0,0,0,0))",
    }), 110);

    setTimeout(() => showDamage(targetEl, damage, color), 140);
  }

function pressureWaveAt(targetEl, damage = 2) {
  const { x, y } = rectCenter(targetEl);

  if (targetEl) {
    targetEl.style.transition = "transform 120ms ease-out";
    targetEl.style.transform = "scale(0.95)";
  }

  const ring = createNode("ehx-air-ring", {
    left: `${x}px`,
    top: `${y}px`,
  });
  removeLater(ring, 720);

  screenFlash(
    "radial-gradient(circle, rgba(220,240,255,0.14), rgba(180,210,255,0.05), rgba(0,0,0,0))"
  );

  setTimeout(() => {
    if (targetEl) {
      targetEl.style.transform = "";
    }
  }, 120);

  setTimeout(() => showDamage(targetEl, damage, "#d8f1ff"), 80);
}

  function metalImpactAt(targetEl, damage = 3) {
    const { x, y } = rectCenter(targetEl);
    const hit = createNode("ehx-metal-hit", {
      left: `${x}px`,
      top: `${y}px`,
    });
    removeLater(hit, 380);
    screenFlash(
      "radial-gradient(circle, rgba(255,255,255,0.12), rgba(200,200,200,0.04), rgba(0,0,0,0))"
    );
    setTimeout(() => showDamage(targetEl, damage, "#f1f5f9"), 90);
  }

  function corrodeAt(targetEl) {
    const { x, y } = rectCenter(targetEl);
    const darkwash = createNode("ehx-corrode-darkwash");
    const flash = createNode("corrode-impact-flash", {
      left: `${x}px`,
      top: `${y}px`,
    });
    const splat = createNode("corrode-splat", {
      left: `${x}px`,
      top: `${y}px`,
    });
    splat.innerHTML = '<div class="blob"></div><div class="blob2"></div>';
    const liquid = createNode("corrode-liquid", {
      left: `${x}px`,
      top: `${y + 22}px`,
    });
    const stain = createNode("corrode-stain", {
      left: `${x}px`,
      top: `${y + 30}px`,
    });

      removeLater(darkwash, 5200);
      removeLater(flash, 700);
      removeLater(splat, 2600);
      removeLater(liquid, 5400);
      removeLater(stain, 5600);

    for (let i = 0; i < 12; i += 1) {
      const size = random(12, 18);
      const bubble = createNode("corrode-bubble", {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x + random(-60, 60) - size / 2}px`,
        top: `${y + random(10, 38) - size / 2}px`,
      });
      const rise = random(18, 36);
      const drift = random(-12, 12);
      bubble.animate([
        { transform: "translate(0, 8px) scale(.45)", opacity: 0, offset: 0 },
        { transform: `translate(${drift * 0.35}px, -${rise * 0.35}px) scale(.9)`, opacity: 0.95, offset: 0.35 },
        { transform: `translate(${drift}px, -${rise}px) scale(1.1)`, opacity: 0, offset: 1 },
      ], {
        duration: 2200 + Math.random() * 1500,
        delay: Math.random() * 1400,
        easing: "ease-out",
        fill: "forwards",
      });
      removeLater(bubble, 5200);
    }

    for (let i = 0; i < 3; i += 1) {
      const size = random(110, 150);
      const vapor = createNode("corrode-smoke", {
        width: `${size}px`,
        height: `${size * 0.46}px`,
        left: `${x + random(-25, 25) - size / 2}px`,
        top: `${y + random(6, 18) - size / 2}px`,
      });
      const dx = random(-18, 18);
      const dy = -random(18, 36);
      vapor.animate([
        { transform: "translate(0,0) scale(.65)", opacity: 0 },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4}px) scale(1)`, opacity: 0.8, offset: 0.25 },
        { transform: `translate(${dx}px, ${dy}px) scale(1.35)`, opacity: 0, offset: 1 },
      ], {
        duration: 2400 + Math.random() * 1200,
        delay: 300 + Math.random() * 1000,
        easing: "ease-out",
        fill: "forwards",
      });
      removeLater(vapor, 4700);
    }

    corrodeDripsAt(x, y + 36);
    corrodeDropletsAt(x, y);

    screenFlash(
      "radial-gradient(circle, rgba(236,255,160,.16), rgba(124,255,54,.12), rgba(0,0,0,0.35))"
    );
  }

  function smokeAt(targetEl, count = 8) {
    const { x, y } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const size = random(20, 54);
      const smoke = createNode("ehx-smoke", {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x + random(-34, 34) - size / 2}px`,
        top: `${y + random(-12, 20) - size / 2}px`,
      });
      removeLater(smoke, 1200);
    }
  }

  function embersAt(targetEl, count = 12) {
    const { x, y } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const ember = createNode("ehx-ember", {
        left: `${x + random(-40, 40)}px`,
        top: `${y + random(-10, 30)}px`,
      });
      removeLater(ember, 900);
    }
  }

  function energyAt(targetEl) {
    const { x, y } = rectCenter(targetEl);
    const ring = createNode("ehx-energy-ring", {
      left: `${x}px`,
      top: `${y}px`,
    });
    removeLater(ring, 740);
  }

  function shieldAt(targetEl) {
    const { x, y } = rectCenter(targetEl);
    const shield = createNode("ehx-shield", {
      left: `${x}px`,
      top: `${y}px`,
    });
    removeLater(shield, 920);
  }

  function gasFloatAt(targetEl, count = 8, colorA = "rgba(220,245,255,0.95)", colorB = "rgba(110,180,255,0)") {
    const { x, y } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const node = createNode("ehx-gas-dot", {
        left: `${x + random(-35, 35)}px`,
        top: `${y + random(-5, 24)}px`,
        background: `radial-gradient(circle, ${colorA}, ${colorB})`,
      });
      removeLater(node, 1020);
    }
  }

  function dustAt(targetEl, count = 10) {
    const { x, y } = rectCenter(targetEl);
    for (let i = 0; i < count; i++) {
      const d = createNode("ehx-dust", {
        left: `${x}px`,
        top: `${y}px`,
        "--dx": `${random(-70, 70)}px`,
        "--dy": `${random(-40, 40)}px`,
      });
      removeLater(d, 800);
    }
  }

  function fireballTravel(sourceEl, targetEl, damage = 3, color = "#ffd166", options = {}) {
    const s = rectCenter(sourceEl);
    const t = rectCenter(targetEl);

    const fireball = createNode("ehx-fireball", {
      width: options.size ? `${options.size}px` : "",
      height: options.size ? `${options.size}px` : "",
      left: `${s.x - (options.size || 190) / 2}px`,
      top: `${s.y - (options.size || 190) / 2}px`,
    });

    let count = 0;
    const trailTimer = setInterval(() => {
      count++;
      const progress = Math.min(count / 12, 1);
      const cx = s.x + (t.x - s.x) * progress;
      const cy = s.y + (t.y - s.y) * progress;
      const sz = (options.trailSize || 105) - progress * 34;
      const trail = createNode("ehx-trail", {
        width: `${sz}px`,
        height: `${sz}px`,
        left: `${cx - sz / 2}px`,
        top: `${cy - sz / 2}px`,
      });
      removeLater(trail, 450);
    }, 45);

    requestAnimationFrame(() => {
      fireball.style.transform = `translate(${t.x - s.x}px, ${t.y - s.y}px) scale(1.08) rotate(540deg)`;
      fireball.style.filter = "brightness(1.15) saturate(1.35)";
    });

    setTimeout(() => {
      clearInterval(trailTimer);
      fireball.remove();
      explosionAt(t.x, t.y, { size: options.explosionSize || 260 });
      showDamage(targetEl, damage, color);
      if (typeof options.onImpact === "function") options.onImpact();
    }, 690);
  }

  function playFireBurst(sourceEl, targetEl, damage = 6) {
    fireballTravel(sourceEl, targetEl, damage, "#ffd166", {
      size: 150,
      trailSize: 80,
      explosionSize: 220,
      onImpact: () => {
        embersAt(targetEl, 14);
      },
    });
  }

  function playCombustionBurst(sourceEl, targetEl, damage = 7) {
    fireballTravel(sourceEl, targetEl, damage, "#ffe08a", {
      size: 170,
      trailSize: 90,
      explosionSize: 240,
      onImpact: () => {
        const { x, y } = rectCenter(targetEl);
        explosionAt(x, y, {
          size: 220,
          ringColor: "rgba(255, 232, 150, 0.92)",
          flashBg: "radial-gradient(circle, rgba(255,220,120,0.22), rgba(255,120,30,0.12), rgba(0,0,0,0))",
        });
        embersAt(targetEl, 22);
      },
    });
  }

  function playSmokeBurn(sourceEl, targetEl, damage = 5) {
    fireballTravel(sourceEl, targetEl, damage, "#ffc56b", {
      size: 150,
      trailSize: 78,
      explosionSize: 210,
      onImpact: () => {
        smokeAt(targetEl, 9);
        embersAt(targetEl, 8);
      },
    });
  }

  function playCarbonBurn(sourceEl, targetEl, damage = 5) {
    fireballTravel(sourceEl, targetEl, damage, "#d5b07a", {
      size: 138,
      trailSize: 72,
      explosionSize: 180,
      onImpact: () => {
        smokeAt(targetEl, 14);
        embersAt(targetEl, 6);
        screenFlash(
          "radial-gradient(circle, rgba(160,160,160,0.12), rgba(78,58,34,0.08), rgba(0,0,0,0))"
        );
      },
    });
  }

  function playSteamBurst(targetEl, damage = 5) {
    const { x, y } = rectCenter(targetEl);
    steamAt(x, y);
    setTimeout(() => {
      const ring = createNode("ehx-air-ring", {
        left: `${x}px`,
        top: `${y}px`,
        width: "120px",
        height: "120px",
        marginLeft: "-60px",
        marginTop: "-60px",
        borderColor: "rgba(236, 244, 255, 0.86)",
      });
      removeLater(ring, 760);
    }, 90);
    screenFlash(
      "radial-gradient(circle, rgba(255,255,255,0.24), rgba(216,232,240,0.08), rgba(0,0,0,0))"
    );
    setTimeout(() => {
      showDamage(targetEl, damage, "#f3f4f6");
      wetAt(targetEl, 8);
    }, 120);
  }

  function playCalciumSteam(targetEl, damage = 6) {
    const { x, y } = rectCenter(targetEl);
    steamAt(x, y);
    steamAt(x + 12, y - 8);
    dustAt(targetEl, 10);
    screenFlash(
      "radial-gradient(circle, rgba(255,255,255,0.18), rgba(232,240,244,0.08), rgba(166,176,170,0.05), rgba(0,0,0,0))"
    );
    setTimeout(() => {
      showDamage(targetEl, damage, "#eef2f7");
      wetAt(targetEl, 7);
    }, 130);
  }

  function hydrogenExplosionAt(targetEl, damage = 8) {
    const { x, y } = rectCenter(targetEl);
    explosionAt(x, y, {
      size: 360,
      ringColor: "rgba(255, 236, 166, 0.95)",
      flashBg: "radial-gradient(circle, rgba(255,244,190,0.22), rgba(255,166,60,0.12), rgba(0,0,0,0))",
    });
    setTimeout(() => explosionAt(x, y, {
      size: 240,
      ringColor: "rgba(255, 255, 255, 0.82)",
      flash: false,
    }), 110);
    smokeAt(targetEl, 12);
    embersAt(targetEl, 20);
    setTimeout(() => showDamage(targetEl, damage, "#ffe08a"), 110);
  }

  function alkaliReactionAt(targetEl, damage = 9) {
    const { x, y } = rectCenter(targetEl);
    explosionAt(x, y, {
      size: 300,
      ringColor: "rgba(225, 255, 130, 0.92)",
      flashBg: "radial-gradient(circle, rgba(224,255,160,0.18), rgba(96,220,96,0.1), rgba(0,0,0,0))",
    });
    steamAt(x, y);
    wetAt(targetEl, 10);
    gasFloatAt(targetEl, 8, "rgba(242,255,160,0.95)", "rgba(92,210,86,0)");
    embersAt(targetEl, 8);
    setTimeout(() => showDamage(targetEl, damage, "#e6ff8a"), 100);
  }

  function alkaliBlastAt(targetEl, damage = 4) {
    const { x, y } = rectCenter(targetEl);
    explosionAt(x, y, {
      size: 300,
      ringColor: "rgba(230, 255, 135, 0.92)",
      flashBg: "radial-gradient(circle, rgba(246,255,190,0.18), rgba(180,255,90,0.12), rgba(0,0,0,0))",
    });
    for (let i = 0; i < 8; i += 1) {
      const size = random(14, 28);
      const spark = createNode("ehx-corrode-drop", {
        width: `${size}px`,
        height: `${size * random(0.7, 1.1)}px`,
        left: `${x - size / 2}px`,
        top: `${y - size / 2}px`,
        "--dx": `${random(-120, 120)}px`,
        "--dy": `${random(-70, 85)}px`,
      });
      removeLater(spark, 760);
    }
    gasFloatAt(targetEl, 6, "rgba(255,255,180,0.95)", "rgba(160,255,88,0)");
    setTimeout(() => showDamage(targetEl, damage, "#f1ff8a"), 90);
  }

  function metalCrushAt(targetEl, damage = 3) {
    const { x, y } = rectCenter(targetEl);
    metalImpactAt(targetEl, damage);
    setTimeout(() => {
      const hit = createNode("ehx-metal-hit", {
        left: `${x + 24}px`,
        top: `${y - 12}px`,
        transform: "scale(0.9) rotate(18deg)",
      });
      removeLater(hit, 340);
    }, 70);
    dustAt(targetEl, 12);
    screenFlash(
      "radial-gradient(circle, rgba(255,255,255,0.12), rgba(160,180,200,0.06), rgba(0,0,0,0))"
    );
  }

  function hammerStrikeAt(targetEl, damage = 2) {
    const { x, y } = rectCenter(targetEl);
    const anticipation = createNode("ehx-hammer-anticipation", {
      left: `${x}px`,
      top: `${y - 18}px`,
    });
    removeLater(anticipation, 150);

    if (targetEl) {
      targetEl.style.transition = "transform 80ms ease-out";
      targetEl.style.transform = "scale(1.02)";
    }

    setTimeout(() => {
      const slam = createNode("ehx-hammer-slam", {
        left: `${x}px`,
        top: `${y - 6}px`,
      });
      removeLater(slam, 260);
    }, 90);

    setTimeout(() => {
      const burst = createNode("ehx-hit-stop-burst", {
        left: `${x}px`,
        top: `${y}px`,
      });
      const hit = createNode("ehx-metal-hit", {
        left: `${x}px`,
        top: `${y}px`,
        transform: "scale(0.96) rotate(-8deg)",
      });
      const ring = createNode("ehx-air-ring", {
        left: `${x}px`,
        top: `${y}px`,
        width: "98px",
        height: "98px",
        marginLeft: "-49px",
        marginTop: "-49px",
        borderColor: "rgba(238,244,250,0.86)",
        borderWidth: "6px",
      });
      removeLater(burst, 220);
      removeLater(hit, 300);
      removeLater(ring, 440);
      hammerCrackAt(x, y);
      hammerGravelAt(x, y + 14, 14);

      if (targetEl) {
        targetEl.style.transition = "transform 45ms ease-out";
        targetEl.style.transform = "scale(0.93)";
      }
      screenFlash(
        "radial-gradient(circle, rgba(255,255,255,0.18), rgba(220,228,235,0.06), rgba(0,0,0,0))"
      );
      decayingShake(targetEl);
    }, 170);

    setTimeout(() => {
      if (targetEl) {
        targetEl.style.transition = "transform 110ms cubic-bezier(.2,.9,.2,1)";
        targetEl.style.transform = "scale(1.015)";
      }
    }, 228);

    setTimeout(() => {
      if (targetEl) {
        targetEl.style.transform = "";
      }
    }, 330);

    setTimeout(() => {
      showDamage(targetEl, damage, "#f1f5f9");
    }, 230);

    setTimeout(() => {
      dustAt(targetEl, 10);
      hammerGravelAt(x, y + 18, 8);
    }, 255);
  }

  function noblePressureAt(targetEl, damage = 2) {
    const { x, y } = rectCenter(targetEl);
    pressureWaveAt(targetEl, damage);
    setTimeout(() => {
      const ring = createNode("ehx-air-ring", {
        left: `${x}px`,
        top: `${y}px`,
        width: "110px",
        height: "110px",
        marginLeft: "-55px",
        marginTop: "-55px",
        borderColor: "rgba(234,244,255,0.9)",
        borderWidth: "7px",
      });
      removeLater(ring, 760);
    }, 90);
    gasFloatAt(targetEl, 5, "rgba(245,250,255,0.94)", "rgba(180,220,255,0)");
  }

  function saltFormationAt(sourceEl, targetEl, damage = 5) {
    crystalBurstAt(targetEl, 26);
    gasFloatAt(targetEl, 6, "rgba(255,255,255,0.96)", "rgba(220,240,255,0)");
    setTimeout(() => showDamage(targetEl, damage, "#ffffff"), 100);
    if (sourceEl) {
      setTimeout(() => {
        crystalBurstAt(sourceEl, 10);
        floatText(rectCenter(sourceEl).x, rectCenter(sourceEl).y - 35, "Cleanse Wet", {
          color: "#eef7ff",
          fontSize: "24px",
        });
      }, 180);
    }
  }

  function limeFormationAt(sourceEl, targetEl, damage = 5, energy = 1) {
    crystalBurstAt(targetEl, 18);
    dustAt(targetEl, 10);
    setTimeout(() => showDamage(targetEl, damage, "#f7fafc"), 100);
    if (sourceEl) {
      setTimeout(() => {
        energyAt(sourceEl);
        showEnergy(sourceEl, energy);
      }, 140);
    }
  }

  function resolveEffectContext(context = {}) {
    ensureEffectStyles();

    const sourceEl = getElementFromContext(context, "source") || getDefaultElement("player");
    const targetEl = getElementFromContext(context, "target") || getDefaultElement("enemy");

    return {
      ...context,
      sourceEl,
      targetEl,
    };
  }

  function playCardEffect(cardId, context = {}) {
    const ctx = resolveEffectContext(context);
    const effect = CARD_EFFECT_MAP[cardId];
    if (!effect) return false;

    if (!shouldRunViewerAnimation(cardId, ctx)) {
      return true;
    }

    if (!ctx.cinematicMode) {
      showCardCastFlash(cardId, ctx.actorPid);
    }
    if (!ctx.cinematicMode && shouldShowScreenHit(cardId, ctx)) {
      showScreenHit(cardId, ctx.targetPid, ctx);
    }

    switch (effect) {
      case "fireball":
        fireballTravel(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 3, "#ffd166", {
          size: 190,
          trailSize: 105,
          explosionSize: 260,
          onImpact: () => {
            if (ctx.enemyWet) {
              floatText(rectCenter(ctx.targetEl).x, rectCenter(ctx.targetEl).y - 45, "Wet Bonus!", {
                color: "#9fdcff",
                fontSize: "24px",
              });
            }
          },
        });
        break;

      case "bigExplosion":
        {
          const c = rectCenter(ctx.targetEl);
          explosionAt(c.x, c.y, {
            size: 320,
            ringColor: "rgba(255,220,150,0.9)",
          });
          showDamage(ctx.targetEl, ctx.damage ?? 8, "#ffcf70");
        }
        break;

      case "hydrogenExplosion":
        hydrogenExplosionAt(ctx.targetEl, ctx.damage ?? 8);
        break;

      case "steamCloud":
        {
          const c = rectCenter(ctx.targetEl);
          steamAt(c.x, c.y);
          screenFlash(
            "radial-gradient(circle, rgba(255,255,255,0.22), rgba(220,220,220,0.06), rgba(0,0,0,0))"
          );
          setTimeout(() => {
            showDamage(ctx.targetEl, ctx.damage ?? 5, "#f3f4f6");
            wetAt(ctx.targetEl, 8);
          }, 120);
        }
        break;

      case "steamBurst":
        playSteamBurst(ctx.targetEl, ctx.damage ?? 5);
        break;

      case "acidRain":
        acidRainAt(ctx.targetEl, ctx.ticks ?? 2, ctx.damagePerTick ?? 2);
        break;

      case "rustSpread":
        rustAt(ctx.targetEl);
        setTimeout(() => showDamage(ctx.targetEl, ctx.damage ?? 4, "#d48a4f"), 120);
        break;

      case "crystalBurst":
        crystalBurstAt(ctx.targetEl, 22);
        setTimeout(() => showDamage(ctx.targetEl, ctx.damage ?? 5, "#ffffff"), 100);
        break;

      case "saltFormation":
        saltFormationAt(ctx.sourceEl || getDefaultElement("player"), ctx.targetEl, ctx.damage ?? 5);
        break;

      case "limeFormation":
        limeFormationAt(ctx.sourceEl || getDefaultElement("player"), ctx.targetEl, ctx.damage ?? 5, ctx.energy ?? 1);
        break;

      case "fireBurst":
        playFireBurst(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 6);
        break;

      case "combustionBlast":
        playCombustionBurst(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 7);
        break;

      case "smokeBurn":
        playSmokeBurn(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 5);
        break;

      case "carbonBurn":
        playCarbonBurn(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 5);
        break;

      case "metalImpact":
        metalImpactAt(ctx.targetEl, ctx.damage ?? 3);
        break;

      case "hammerStrike":
        hammerStrikeAt(ctx.targetEl, ctx.damage ?? 2);
        break;

      case "metalCrush":
        metalCrushAt(ctx.targetEl, ctx.damage ?? 3);
        break;

      case "corrodeDestroy":
        corrodeAt(ctx.targetEl);
        setTimeout(() => {
          floatText(rectCenter(ctx.targetEl).x, rectCenter(ctx.targetEl).y - 36, "Corrode!", {
            color: "#a7ff7d",
            fontSize: "30px",
          });
        }, 120);
        break;

      case "lightningStrike":
        lightningAt(ctx.targetEl, ctx.damage ?? 4, "#c9f3ff");
        if (ctx.enemyWet) {
          setTimeout(() => {
            floatText(rectCenter(ctx.targetEl).x, rectCenter(ctx.targetEl).y - 45, "Wet Bonus!", {
              color: "#9fdcff",
              fontSize: "24px",
            });
          }, 90);
        }
        break;

      case "calciumSteam":
        playCalciumSteam(ctx.targetEl, ctx.damage ?? 6);
        break;

      case "toxicCloud":
        toxicCloudAt(ctx.targetEl, ctx.pulses ?? 3, ctx.damagePerPulse ?? 1);
        break;

      case "alkaliReaction":
        alkaliReactionAt(ctx.targetEl, ctx.damage ?? 9);
        break;

      case "alkaliExplosion":
        alkaliBlastAt(ctx.targetEl, ctx.damage ?? 8);
        break;

      case "alkaliBlast":
        alkaliBlastAt(ctx.targetEl, ctx.damage ?? 4);
        break;

      case "plasmaShock":
        lightningAt(ctx.targetEl, ctx.damage ?? 5, "#d7a8ff");
        setTimeout(() => {
          const c = rectCenter(ctx.targetEl);
          const pulse = createNode("ehx-corrode-beam", {
            left: `${c.x}px`,
            top: `${c.y}px`,
            background:
              "radial-gradient(circle, rgba(220,120,255,0.9) 0%, rgba(120,80,255,0.6) 42%, rgba(0,0,0,0) 100%)",
          });
          removeLater(pulse, 700);
        }, 150);
        break;

        case "pressureWave":
        pressureWaveAt(ctx.targetEl, ctx.damage ?? 2);

        if ((ctx.draw ?? 0) > 0) {
            setTimeout(() => {
            const self = ctx.sourceEl || getDefaultElement("player");
            showDraw(self, ctx.draw);
            }, 160);
        }
        break;

      case "noblePressure":
        noblePressureAt(ctx.targetEl, ctx.damage ?? 2);
        if ((ctx.draw ?? 0) > 0) {
          setTimeout(() => {
            const self = ctx.sourceEl || getDefaultElement("player");
            showDraw(self, ctx.draw);
          }, 160);
        }
        break;

      case "energyBoost":
        {
          const self = ctx.sourceEl || getDefaultElement("player");
          energyAt(self);
          showEnergy(self, ctx.energy ?? 1);
        }
        break;

      case "shieldGlow":
        {
          const self = ctx.sourceEl || getDefaultElement("player");
          shieldAt(self);
          showHeal(self, ctx.heal ?? 2);
        }
        break;

      case "emberAura":
        embersAt(ctx.sourceEl || ctx.targetEl, 10);
        break;

      case "airPulse":
        {
          const c = rectCenter(ctx.sourceEl || ctx.targetEl);
          const ring = createNode("ehx-air-ring", {
            left: `${c.x}px`,
            top: `${c.y}px`,
            borderColor: "rgba(220,240,255,0.75)",
          });
          removeLater(ring, 720);
        }
        break;

      case "waterDrop":
        wetAt(ctx.sourceEl || ctx.targetEl, 6);
        break;

      case "metalShine":
        {
          const c = rectCenter(ctx.sourceEl || ctx.targetEl);
          const hit = createNode("ehx-metal-hit", {
            left: `${c.x}px`,
            top: `${c.y}px`,
            opacity: 0.7,
          });
          removeLater(hit, 320);
        }
        break;

      case "gasFloat":
        gasFloatAt(ctx.sourceEl || ctx.targetEl, 8, "rgba(235,248,255,0.95)", "rgba(120,180,255,0)");
        break;

      case "lightGasAura":
        gasFloatAt(ctx.sourceEl || ctx.targetEl, 8, "rgba(200,240,255,0.95)", "rgba(180,220,255,0)");
        break;

      case "smokeAura":
        smokeAt(ctx.sourceEl || ctx.targetEl, 6);
        break;

      case "toxicAura":
        gasFloatAt(ctx.sourceEl || ctx.targetEl, 8, "rgba(210,255,150,0.95)", "rgba(80,180,80,0)");
        break;

      case "unstableSpark":
        {
          const el = ctx.sourceEl || ctx.targetEl;
          embersAt(el, 6);
          gasFloatAt(el, 4, "rgba(255,255,220,0.95)", "rgba(255,120,80,0)");
        }
        break;

      case "dustAura":
        dustAt(ctx.sourceEl || ctx.targetEl, 12);
        break;

      default:
        return false;
    }

    if (typeof ctx.onComplete === "function") {
      setTimeout(() => ctx.onComplete(), 50);
    }

    return true;
  }

  function playStatusEffect(statusId, context = {}) {
    const ctx = resolveEffectContext(context);
    const status = String(statusId || "").toLowerCase();

    if (status === "corroded") {
      corrodeAt(ctx.targetEl);
      setTimeout(() => showDamage(ctx.targetEl, ctx.amount ?? 1, "#d8ff72"), 90);
      return true;
    }

    return false;
  }

  // Expose globals
  window.CARD_EFFECT_MAP = CARD_EFFECT_MAP;
  window.playCardEffect = playCardEffect;
  window.playCardEffectCinematic = playCardEffectCinematic;
  window.queueCardEffectCinematic = queueCardEffectCinematic;
  window.playStatusEffect = playStatusEffect;
  window.ensureEffectStyles = ensureEffectStyles;
})();
