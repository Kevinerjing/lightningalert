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
    combustion: "fireBurst",
    steamBurst: "steamCloud",
    acidRain: "acidRain",
    rust: "rustSpread",
    explosion: "bigExplosion",
    saltFormation: "crystalBurst",
    carbonBurn: "smokeBurn",
    potassiumWater: "alkaliExplosion",
    limeFormation: "crystalBurst",
    hydrogenBurn: "fireBurst",
    calciumSteam: "steamCloud",
    alkaliExplosion: "bigExplosion",

    // Attacks
    fireball: "fireball",
    hammerStrike: "metalImpact",
    corrode: "corrodeDestroy",
    lightning: "lightningStrike",
    poisonCloud: "toxicCloud",
    plasmaShock: "plasmaShock",
    alkaliBlast: "bigExplosion",
    metalCrush: "metalImpact",
    noblePressure: "pressureWave",

    // Utility
    catalyst: "energyBoost",
    shield: "shieldGlow",
  };

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
        width: 160px;
        height: 260px;
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

      .ehx-corrode-beam {
        position: fixed;
        width: 150px;
        height: 150px;
        margin-left: -75px;
        margin-top: -75px;
        border-radius: 50%;
        pointer-events: none;
        background:
          radial-gradient(circle,
            rgba(160,255,110,0.9) 0%,
            rgba(40,200,60,0.65) 42%,
            rgba(0,0,0,0) 100%);
        filter: blur(3px);
        animation: ehxCorrodePulse 0.75s ease-out forwards;
        z-index: 10012;
      }

      @keyframes ehxCorrodePulse {
        0%   { opacity: 0; transform: scale(0.35); }
        20%  { opacity: 1; }
        100% { opacity: 0; transform: scale(1.8); }
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
      return (
        qs("#player-hero") ||
        qs(".player-hero") ||
        qs(".player") ||
        qs("[data-side='player']")
      );
    }
    return (
      qs("#enemy-hero") ||
      qs(".enemy-hero") ||
      qs(".enemy") ||
      qs("[data-side='enemy']")
    );
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
    const ring = createNode("ehx-air-ring", {
      left: `${x}px`,
      top: `${y}px`,
    });
    removeLater(ring, 720);
    screenFlash(
      "radial-gradient(circle, rgba(220,240,255,0.14), rgba(180,210,255,0.05), rgba(0,0,0,0))"
    );
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
    const pulse = createNode("ehx-corrode-beam", {
      left: `${x}px`,
      top: `${y}px`,
    });
    removeLater(pulse, 780);

    const fog = createNode("ehx-poison-fog", {
      left: `${x}px`,
      top: `${y + 12}px`,
    });
    removeLater(fog, 1000);

    screenFlash(
      "radial-gradient(circle, rgba(120,255,120,0.12), rgba(20,120,20,0.06), rgba(0,0,0,0))"
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
        if (cardId === "saltFormation") {
          const self = ctx.sourceEl || getDefaultElement("player");
          setTimeout(() => {
            floatText(rectCenter(self).x, rectCenter(self).y - 35, "Cleanse Wet", {
              color: "#eef7ff",
              fontSize: "24px",
            });
          }, 180);
        }
        if (cardId === "limeFormation") {
          const self = ctx.sourceEl || getDefaultElement("player");
          setTimeout(() => {
            energyAt(self);
            showEnergy(self, 1);
          }, 140);
        }
        break;

      case "fireBurst":
        playFireBurst(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 6);
        break;

      case "smokeBurn":
        playSmokeBurn(ctx.sourceEl, ctx.targetEl, ctx.damage ?? 5);
        break;

      case "metalImpact":
        metalImpactAt(ctx.targetEl, ctx.damage ?? 3);
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
        break;

      case "toxicCloud":
        toxicCloudAt(ctx.targetEl, ctx.pulses ?? 3, ctx.damagePerPulse ?? 1);
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
        if (ctx.hasHelium || cardId === "noblePressure") {
          setTimeout(() => {
            const self = ctx.sourceEl || getDefaultElement("player");
            showDraw(self, ctx.draw ?? 1);
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

  // Expose globals
  window.CARD_EFFECT_MAP = CARD_EFFECT_MAP;
  window.playCardEffect = playCardEffect;
  window.ensureEffectStyles = ensureEffectStyles;
})();