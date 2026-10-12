import {dialogHeading} from './dialog-heading.js';
import {lightAnimationHtml,playLightAnimation} from './light-animation.js';
// Daily bonus as a prize wheel: segments in proportion to each prize's chance,
// interleaved; the wheel spins to a segment of the prize the server picked.

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

const SEGMENT_COLORS = { gold: ['#6a4f1f', '#4a3614'], moonDew: ['#243a6a', '#182848'], ironOre: ['#3a3440', '#26222c'] };

/** Prize names for `count` wheel segments, weighted by chance and spread out. */
export function wheelSegments(prizes = [], count = 10) {
  const total = prizes.reduce((sum, prize) => sum + (Number(prize.chance) || 0), 0) || 1;
  const quotas = prizes.map(prize => ({ name: prize.name, left: Math.max(1, Math.round((Number(prize.chance) || 0) / total * count)) }));
  const segments = [];
  while (quotas.some(quota => quota.left > 0) && segments.length < count * 2) {
    // Take the prize with the most segments left that differs from the last one.
    const pick = quotas
      .filter(quota => quota.left > 0 && quota.name !== segments.at(-1))
      .sort((a, b) => b.left - a.left)[0] || quotas.find(quota => quota.left > 0);
    segments.push(pick.name);
    pick.left -= 1;
  }
  return segments;
}

/** Absolute wheel rotation (deg) that stops the top pointer on a segment of `name`. */
export function landingRotation(segments, name, { from = 0, turns = 5, random = Math.random } = {}) {
  const slots = segments.map((segment, index) => (segment === name ? index : -1)).filter(index => index >= 0);
  const index = slots.length ? slots[Math.floor(random() * slots.length)] : 0;
  const size = 360 / segments.length;
  const jitter = (random() - 0.5) * size * 0.6;
  const target = 360 - (index + 0.5) * size + jitter;
  const base = Math.ceil(from / 360) * 360;
  return base + turns * 360 + ((target % 360) + 360) % 360;
}

export async function openBonusGame({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/bonus');
  let lastPrize = null;
  let pending = false;
  let closed=false;const lifetime=new AbortController();
  const segments = wheelSegments(state.prizes);

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay bonus-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel bonus-panel">
      ${dialogHeading('Ежедневный бонус').replace('<button type=', '<button class="overlay-close" type=')}
      <div data-bonus-content></div>
      <div class="bonus-feedback" data-bonus-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-bonus-content]');
  const feedback = overlay.querySelector('[data-bonus-feedback]');
  const close = () => { closed=true;lifetime.abort();overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    content.innerHTML = `
      <div class="bonus-animation light-game-stage">${lightAnimationHtml('wheel','Колесо наград')}</div>
      ${lastPrize ? `<section class="bonus-win"><span>${lastPrize.icon}</span><strong>+${formatNumber(lastPrize.amount)} ${lastPrize.label}</strong></section>` : ''}
      <button class="bonus-spin ui-button primary" type="button" data-bonus-claim ${state.chances <= 0 || pending ? 'disabled' : ''}>
        <strong>${state.chances > 0 ? 'Крутить колесо' : 'Попытки закончились'}</strong>
        <small>${state.chances > 0 ? `Попыток сегодня: ${state.chances}` : 'Новые — после ежедневного сброса'}</small>
      </button>
      <section class="bonus-prizes">
        ${state.prizes.map(prize => `
          <article class="bonus-prize">
            <span>${prize.icon}</span>
            <div><strong>${prize.label}</strong><small>${formatNumber(prize.minAmount)}–${formatNumber(prize.maxAmount)}</small></div>
            <b>${prize.chance}%</b>
          </article>`).join('')}
      </section>`;
    content.querySelector('[data-bonus-claim]')?.addEventListener('click', claim);
    if(lastPrize)content.querySelector('[data-light-animation]').src='/art/minigames/wheel-'+lastPrize.name+'-result.webp';
  }

  async function claim() {
    if (pending || state.chances <= 0) return;
    pending = true;
    feedback.textContent = '';
    haptic('heavy');
    content.querySelector('[data-bonus-claim]').disabled = true;
    try {
      const payload = await api('/api/bonus/claim', { method: 'POST' });
      if(closed)return;
      await playLightAnimation(content.querySelector('[data-light-animation]'),{name:'wheel-'+payload.prize.name,duration:1680,signal:lifetime.signal,resultSrc:'/art/minigames/wheel-'+payload.prize.name+'-result.webp'});
      if(closed)return;
      state = payload.bonus;
      lastPrize = payload.prize;
      if (payload.state) renderState(payload.state);
      statusElement.textContent = `Бонус: ${lastPrize.icon} +${formatNumber(lastPrize.amount)} ${lastPrize.label}`;
      haptic('heavy');
    } catch (error) {
      if(closed)return;
      if (error.payload?.bonus) state = error.payload.bonus;
      feedback.textContent = error.payload?.reason === 'no_chances' ? 'Попытки на сегодня закончились.' : error.message;
      haptic('light');
    } finally {
      pending = false;
      if(!closed)render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
