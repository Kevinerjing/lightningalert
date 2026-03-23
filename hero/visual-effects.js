(function () {
  function getCenter(el) {
    if (!el || typeof el.getBoundingClientRect !== "function") {
      return { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    }

    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width * 0.5,
      y: rect.top + rect.height * 0.5,
    };
  }

  function animateElement(el, keyframes, options = {}) {
    if (!el || typeof el.animate !== "function") return Promise.resolve();
    return el.animate(keyframes, {
      duration: options.duration || 360,
      easing: options.easing || "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: options.fill || "none",
    }).finished.catch(() => {});
  }

  function animatePlayCard(cardEl, options = {}) {
    if (!cardEl) return Promise.resolve();

    const fxLayer = document.getElementById("fx-layer") || document.body;
    const rect = cardEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return Promise.resolve();

    const clone = cardEl.cloneNode(true);
    const target = getCenter(options.targetEl);
    const startX = rect.left;
    const startY = rect.top;
    const endX = target.x - rect.width * 0.5;
    const endY = target.y - rect.height * 0.5;
    const controlX = (startX + endX) * 0.5 + (endX > startX ? 80 : -80);
    const controlY = Math.min(startY, endY) - 120;
    const duration = options.duration || 520;
    const startedAt = performance.now();

    clone.style.position = "fixed";
    clone.style.left = `${startX}px`;
    clone.style.top = `${startY}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.height = `${rect.height}px`;
    clone.style.margin = "0";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "10070";
    clone.style.transformOrigin = "50% 50%";
    clone.style.willChange = "transform, opacity";
    fxLayer.appendChild(clone);

    return new Promise((resolve) => {
      const step = (time) => {
        const progress = Math.min(1, (time - startedAt) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const inverse = 1 - eased;
        const x = inverse * inverse * startX + 2 * inverse * eased * controlX + eased * eased * endX;
        const y = inverse * inverse * startY + 2 * inverse * eased * controlY + eased * eased * endY;
        const rotation = -10 + eased * 18;
        const scale = 1 + Math.sin(eased * Math.PI) * 0.12;

        clone.style.transform = `translate3d(${x - startX}px, ${y - startY}px, 0) rotate(${rotation}deg) scale(${scale})`;
        clone.style.opacity = `${1 - progress * 0.08}`;

        if (progress < 1) {
          window.requestAnimationFrame(step);
          return;
        }

        clone.remove();
        resolve();
      };

      window.requestAnimationFrame(step);
    });
  }

  function animateAttack(options = {}) {
    const sourceEl = options.sourceEl;
    const targetEl = options.targetEl;
    if (!sourceEl || !targetEl) return;

    animateElement(sourceEl, [
      { transform: "translate3d(0, 0, 0) scale(1)" },
      { transform: "translate3d(0, -10px, 0) scale(1.08)" },
      { transform: "translate3d(0, -4px, 0) scale(0.99)" },
      { transform: "translate3d(0, 0, 0) scale(1)" },
    ], {
      duration: options.heavy ? 420 : 320,
    });

    animateElement(targetEl, [
      { transform: "translate3d(0, 0, 0) scale(1)" },
      { transform: "translate3d(0, 8px, 0) scale(0.96)" },
      { transform: "translate3d(0, -2px, 0) scale(1.01)" },
      { transform: "translate3d(0, 0, 0) scale(1)" },
    ], {
      duration: options.heavy ? 360 : 260,
      easing: "cubic-bezier(0.18, 0.84, 0.22, 1)",
    });
  }

  window.HeroVfx = {
    animatePlayCard,
    animateAttack,
  };
}());
