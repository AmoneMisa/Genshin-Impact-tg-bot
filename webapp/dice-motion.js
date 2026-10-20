// Decorative only: final values and accessible labels always come from the match.
const PIPS = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
export { PIPS };

export function createDiceMotion(panel) {
  const rolls = new Map();
  const locked = new Map();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  const paint = (el, value) => el.querySelectorAll('.ui-dice-pips>span').forEach((pip, i) => pip.classList.toggle('is-pip', PIPS[value].includes(i)));
  function unlock() {
    for (const [button, disabled] of locked) button.disabled = disabled;
    locked.clear();
  }
  function stop() {
    clearTimeout(timer);
    rolls.clear();
    for (const el of panel.querySelectorAll('[data-dice-key]')) {
      el.classList.remove('rolling');
      if (el.dataset.face !== '') paint(el, Number(el.dataset.face));
    }
    panel.removeAttribute('aria-busy');
    unlock();
  }
  function tick() {
    if (document.hidden || media.matches || !panel.isConnected) return stop();
    const now = performance.now();
    for (const el of panel.querySelectorAll('[data-dice-key]')) {
      const roll = rolls.get(el.dataset.diceKey);
      if (!roll) continue;
      const elapsed = now - roll.start;
      if (elapsed >= roll.duration) {
        paint(el, roll.value);
        el.classList.remove('rolling');
        rolls.delete(el.dataset.diceKey);
      } else {
        // Slower face changes towards the landing; no game RNG is consumed.
        const step = Math.floor(6 * Math.sqrt(elapsed / roll.duration));
        paint(el, (roll.value + step + 1) % 6);
      }
    }
    if (rolls.size) timer = setTimeout(tick, 65);
    else { panel.removeAttribute('aria-busy'); unlock(); }
  }
  function sync(fresh) {
    clearTimeout(timer);
    unlock();
    if (document.hidden || media.matches) return stop();
    const now = performance.now();
    const keys = new Set();
    for (const el of panel.querySelectorAll('[data-dice-key]')) {
      const key = el.dataset.diceKey;
      if (el.dataset.face === '') continue; // Never animate a hidden opponent face.
      keys.add(key);
      const value = Number(el.dataset.face);
      if (fresh.has(key)) rolls.set(key, { value, start: now, duration: 520 + Number(key.slice(1)) * 28 });
      const roll = rolls.get(key);
      if (!roll) continue;
      if (roll.value !== value) { rolls.delete(key); continue; }
      el.style.setProperty('--dice-duration', `${roll.duration}ms`);
      el.style.setProperty('--dice-elapsed', `${-(now - roll.start)}ms`);
      el.style.setProperty('--dice-direction', Number(key.slice(1)) % 2 ? -1 : 1);
      el.classList.add('rolling');
    }
    for (const key of rolls.keys()) if (!keys.has(key)) rolls.delete(key);
    if (rolls.size) {
      panel.setAttribute('aria-busy', 'true');
      for (const button of panel.querySelectorAll('[data-die],[data-reroll],[data-stand]')) {
        locked.set(button, button.disabled);
        button.disabled = true;
      }
    }
    tick();
  }
  const visibility = () => { if (document.hidden) stop(); };
  document.addEventListener('visibilitychange', visibility);
  media.addEventListener('change', stop);
  return { sync, stop, destroy() { stop(); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', stop); } };
}
