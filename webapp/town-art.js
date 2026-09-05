const ART = {
  palace: `
    <svg viewBox="0 0 260 170" role="img" aria-label="Дворец">
      <defs><linearGradient id="palace-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6d7184"/><stop offset="1" stop-color="#272b38"/></linearGradient><linearGradient id="palace-roof" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#45527e"/><stop offset="1" stop-color="#1b2137"/></linearGradient></defs>
      <ellipse class="town-art-shadow" cx="130" cy="151" rx="92" ry="12"/>
      <path d="M47 141V89l13-9V58l17-16 17 16v20l15-8v-31l21-26 21 26v31l15 8V58l17-16 17 16v22l13 9v52z" fill="url(#palace-stone)"/>
      <path d="M58 80h39V58L77 39 58 58zm51-9h42V39l-21-26-21 26zm54 9h39V58l-20-19-19 19z" fill="url(#palace-roof)"/>
      <path d="M120 141V92h20v49M70 141V104h15v37m90 0v-37h15v37" fill="#181c27" opacity=".75"/>
      <g class="town-windows"><rect x="124" y="48" width="5" height="11" rx="2"/><rect x="133" y="48" width="5" height="11" rx="2"/><rect x="124" y="69" width="5" height="11" rx="2"/><rect x="133" y="69" width="5" height="11" rx="2"/><rect x="70" y="75" width="5" height="10" rx="2"/><rect x="83" y="75" width="5" height="10" rx="2"/><rect x="172" y="75" width="5" height="10" rx="2"/><rect x="185" y="75" width="5" height="10" rx="2"/></g>
      <path class="town-banner" d="M129 16h3v31h-3zM132 17l22 7-22 8z"/><path d="M39 141h182v8H39z" fill="#20232d"/>
    </svg>`,
  academy: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Академия"><defs><linearGradient id="academy-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5f6782"/><stop offset="1" stop-color="#252a39"/></linearGradient></defs><ellipse class="town-art-shadow" cx="120" cy="151" rx="79" ry="11"/><path d="M58 143V93l24-14v64zm100 0V79l24 14v50zM84 143V64h72v79z" fill="url(#academy-stone)"/><path d="M77 65l43-49 43 49z" fill="#313a62"/><path d="M110 143V95h20v48z" fill="#171b28"/><g class="town-windows magic"><rect x="94" y="72" width="8" height="15" rx="4"/><rect x="138" y="72" width="8" height="15" rx="4"/><rect x="67" y="104" width="7" height="13" rx="3"/><rect x="166" y="104" width="7" height="13" rx="3"/></g><circle class="town-magic-orb" cx="120" cy="43" r="13"/><circle class="town-magic-ring" cx="120" cy="43" r="22"/><path class="town-runes" d="M90 126h60M95 132h50"/></svg>`,
  forge: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Кузня"><defs><linearGradient id="forge-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#544d47"/><stop offset="1" stop-color="#221f20"/></linearGradient></defs><ellipse class="town-art-shadow" cx="120" cy="151" rx="83" ry="11"/><path d="M43 143V86l27-19 28 19 28-19 27 19 24-16 20 16v57z" fill="url(#forge-stone)"/><path d="M59 67l11-31h15l-2 40zm72 0l8-42h16l-3 52z" fill="#303036"/><g class="town-smoke-stack"><circle cx="76" cy="27" r="8"/><circle cx="68" cy="16" r="10"/><circle cx="78" cy="7" r="12"/></g><g class="town-smoke-stack smoke-delay"><circle cx="147" cy="18" r="8"/><circle cx="156" cy="8" r="11"/><circle cx="149" cy="-3" r="13"/></g><path d="M91 143v-42h58v42z" fill="#151619"/><path class="town-forge-fire" d="M111 139c-9-15 6-21 5-36 16 14 24 23 13 36z"/><rect class="town-window ember" x="55" y="100" width="12" height="15" rx="2"/><rect class="town-window ember" x="173" y="100" width="12" height="15" rx="2"/><path d="M35 143h170v7H35z" fill="#1b1b1e"/></svg>`,
  goldMine: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Золотая шахта"><ellipse class="town-art-shadow" cx="120" cy="151" rx="86" ry="11"/><path d="M25 143L67 64l27 26 28-54 41 49 25-31 31 89z" fill="#373637"/><path d="M40 143l37-61 22 22 24-43 30 42 24-29 27 69z" fill="#26272b"/><path d="M76 143v-42c0-19 18-34 40-34s40 15 40 34v42z" fill="#1a1a1e"/><path d="M88 143v-38c0-13 12-24 28-24s28 11 28 24v38z" fill="#0b0c10"/><path d="M81 101h70M93 83l-7 60m50-60 8 60" stroke="#735735" stroke-width="6"/><g class="town-mine-lantern"><circle cx="104" cy="104" r="5"/><circle cx="132" cy="104" r="5"/></g><path class="town-gold-vein" d="M48 121l12-8 9 3 12-12M166 124l13-10 12 4" fill="none" stroke-width="3"/><path d="M45 143h145v7H45z" fill="#1b1b1d"/></svg>`,
  crystalLake: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Озеро кристаллов"><ellipse class="town-art-shadow" cx="120" cy="150" rx="88" ry="11"/><ellipse class="town-lake" cx="120" cy="135" rx="79" ry="18"/><g class="town-crystals"><path d="M111 131L96 78l21-35 13 35-8 53z"/><path d="M74 133L68 97l17-27 13 29-9 34z"/><path d="M139 133l6-47 19-31 14 35-17 43z"/><path d="M169 137l7-28 14-18 9 25-13 21z"/></g><g class="town-crystal-glints"><circle cx="111" cy="74" r="3"/><circle cx="158" cy="84" r="3"/><circle cx="82" cy="98" r="2"/></g><path class="town-water-ripple" d="M48 137c25-8 45 6 70 0s46-7 74 0M63 145c19-5 31 5 50 0s36-4 57 0" fill="none"/></svg>`,
  traineeArea: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Тренировочная площадка"><ellipse class="town-art-shadow" cx="120" cy="151" rx="88" ry="11"/><path d="M37 143v-44l27-23 27 23v44zm112 0v-39l25-20 25 20v39z" fill="#403733"/><path d="M37 100l27-28 27 28zm112 4 25-24 25 24z" fill="#6b3940"/><path d="M100 143v-58h40v58z" fill="#2a2a2d"/><path d="M105 143V93l15-14 15 14v50z" fill="#18191d"/><g class="town-training-flags"><path d="M45 78V35m0 2 28 8-28 10zM187 85V42m0 2-28 8 28 10z"/></g><g class="town-training-dummies"><path d="M82 138v-25m-10 8h20m-16-7 6-10 6 10M158 138v-25m-10 8h20m-16-7 6-10 6 10" fill="none"/></g><path d="M28 143h184v7H28z" fill="#222224"/></svg>`,
  ironDeposit: `
    <svg viewBox="0 0 240 170" role="img" aria-label="Залежи руды"><ellipse class="town-art-shadow" cx="120" cy="151" rx="86" ry="11"/><path d="M36 143l25-55 31 17 22-49 31 32 25-21 35 76z" fill="#3c4047"/><path d="M55 143l17-36 25 14 19-40 25 27 25-18 20 53z" fill="#282c31"/><g class="town-ore-veins"><path d="M71 119l14-7 9 8 12-6M130 111l13-7 11 6 14-9M112 133l13-7 9 4"/></g><path d="M73 143l8-20h37l7 20z" fill="#1d1f23"/><path class="town-mine-cart" d="M143 128h38l-5 13h-28zm3-4h28l6 4h-37z"/><circle cx="151" cy="144" r="6" fill="#17191d"/><circle cx="174" cy="144" r="6" fill="#17191d"/><path d="M35 143h170v7H35z" fill="#202329"/></svg>`,
};

export const TOWN_ART_IDS = Object.freeze(Object.keys(ART));

export function renderTownBuildingArt(buildId) {
  const art = ART[buildId];
  if (!art) return '';
  return `<div class="town-building-art" data-town-art="${buildId}" aria-hidden="true">${art}</div>`;
}

export function renderTownWorld() {
  return `<div class="town-world" aria-hidden="true"><div class="town-world-layer town-sky" data-parallax-layer="1"></div><div class="town-world-layer town-mountains far" data-parallax-layer="2"></div><div class="town-world-layer town-mountains near" data-parallax-layer="3"></div><div class="town-world-layer town-city-glow" data-parallax-layer="2"></div><div class="town-world-layer town-mist" data-parallax-layer="1"></div><div class="town-world-layer town-foreground" data-parallax-layer="4"></div></div>`;
}

export function attachTownParallax(root) {
  if (!root?.addEventListener) return () => {};
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  if (reduceMotion) return () => {};
  let frame = 0;
  let pendingX = 0;
  let pendingY = 0;
  const apply = () => { frame = 0; root.style.setProperty('--town-parallax-x', `${pendingX.toFixed(3)}`); root.style.setProperty('--town-parallax-y', `${pendingY.toFixed(3)}`); };
  const move = (event) => { const rect = root.getBoundingClientRect(); if (!rect.width || !rect.height) return; pendingX = ((event.clientX - rect.left) / rect.width - .5) * 2; pendingY = ((event.clientY - rect.top) / rect.height - .5) * 2; if (!frame) frame = requestAnimationFrame(apply); };
  const leave = () => { pendingX = 0; pendingY = 0; if (!frame) frame = requestAnimationFrame(apply); };
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerleave', leave, { passive: true });
  return () => { root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave); if (frame) cancelAnimationFrame(frame); };
}
