import { escapeHtml } from './escape-html.js';
// Gacha, banner style: one painted banner per spiral, a summon sequence
// (magic circle, light pillar in the grade's colour, burst) and the item
// reveal with Оставить / Распылить. Odds, payment and the item are server-side.

import { renderLootArt } from './loot-renderer.js';

const PAYMENT_LABELS = {
  free: 'Бесплатная крутка', shards: 'За осколки', currency: 'За ресурсы', level_locked: 'Нужен уровень', gold_locked: 'Не хватает моры', crystals_locked: 'Не хватает кристаллов', locked: 'Недоступно',
};
export const GRADE_ORDER = ['noGrade', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
/** Summon colour per grade: grey -> green -> blue -> purple -> gold -> crimson -> prismatic. */
export const GRADE_TONES = Object.freeze({
  noGrade: 'plain', D: 'plain', C: 'green', B: 'blue', A: 'purple', S: 'gold', SS: 'crimson', SSS: 'prism',
});

function number(value) { return new Intl.NumberFormat('ru-RU').format(Number(value) || 0); }
function gradeLabel(grade) { return grade === 'noGrade' ? '—' : grade; }
export function gradeTone(grade) { return GRADE_TONES[grade] || 'plain'; }

function costText(spiral) {
  if (spiral.paymentMode === 'free') return `Бесплатно · ${spiral.freeSpins}`;
  if (spiral.paymentMode === 'shards') return `💎 ${spiral.shardsCost} осколков`;
  const parts = [];
  if (spiral.spinCost.gold) parts.push(`🪙 ${number(spiral.spinCost.gold)}`);
  if (spiral.spinCost.crystals) parts.push(`💎 ${number(spiral.spinCost.crystals)}`);
  return parts.join(' · ') || 'Бесплатно';
}

export function bannerHtml(spiral, playerLevel = 1) {
  const grades = [...spiral.grades].sort((a, b) => GRADE_ORDER.indexOf(b.value) - GRADE_ORDER.indexOf(a.value));
  const shardPercent = Math.min(100, spiral.shards / Math.max(1, spiral.shardsCost) * 100);
  const locked = playerLevel < spiral.needLvl;
  return `
    <section class="gacha-banner ${spiral.canRoll ? '' : 'locked'}" style="--art:url('/art/gacha/${escapeHtml(spiral.id)}.webp')">
      <div class="gacha-banner-art" aria-hidden="true"></div>
      <div class="gacha-banner-copy">
        <small>Ур. ${spiral.needLvl}+</small>
        <h3>${escapeHtml(spiral.title)}</h3>
        <div class="gacha-rates">${grades.map(grade => `<span class="tone-${gradeTone(grade.value)}"><b>${gradeLabel(grade.value)}</b>${Math.round(Number(grade.chance) * 1000) / 10}%</span>`).join('')}</div>
      </div>
      ${locked ? `<div class="gacha-lock">🔒 Нужен ${spiral.needLvl} уровень · у тебя ${playerLevel}</div>` : ''}
    </section>
    <div class="gacha-shards"><span>Осколки</span><div><i style="width:${shardPercent}%"></i><b>${number(spiral.shards)} / ${number(spiral.shardsCost)}</b></div></div>
    <button type="button" class="gacha-summon" data-gacha-roll ${spiral.canRoll ? '' : 'disabled'}>
      <strong>${spiral.canRoll ? 'Призвать' : escapeHtml(PAYMENT_LABELS[spiral.paymentMode] || 'Недоступно')}</strong>
      <small>${costText(spiral)}</small>
    </button>`;
}

export function itemRevealHtml(item) {
  const grade = item.grade || item.rarity;
  const stats = (item.stats || []).map(stat => `<span><b>${escapeHtml(stat.name)}</b> ${number(stat.value)}</span>`).join('');
  return `
    <div class="gacha-reveal tone-${gradeTone(grade)}">
      <div class="gacha-reveal-grade">${escapeHtml(gradeLabel(grade))}</div>
      <div class="gacha-loot-stage" data-gacha-loot-stage>${renderLootArt(item,{reveal:true})}<div class="loot-stage-ground"></div></div>
      <small class="gacha-reveal-rarity">${escapeHtml(item.rarityTranslated || item.rarity || 'Предмет')}</small>
      <h3>${escapeHtml(item.translatedName || item.name || 'Неизвестный предмет')}</h3>
      ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ''}
      ${stats ? `<div class="gacha-item-stats">${stats}</div>` : ''}
      <div class="gacha-resolve-actions">
        <button class="gacha-action primary" type="button" data-action="save">Оставить</button>
        <button class="gacha-action" type="button" data-action="break">Распылить</button>
      </div>
    </div>`;
}

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));

export async function openGachaGame({ api, renderState, haptic, statusElement, playerLevel = 1 }) {
  let state = await api('/api/gacha');
  let pendingRequest = false;
  let selected = state.spirals.find(spiral => spiral.canRoll)?.id || state.spirals[0]?.id;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay gacha-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel gacha-panel">
      <header class="gacha-head">
        <button class="overlay-close gacha-round" type="button" aria-label="Закрыть">←</button>
        <h2>Призыв</h2>
        <span class="gacha-round" aria-hidden="true">✦</span>
      </header>
      <nav class="gacha-tabs" data-gacha-tabs></nav>
      <div data-gacha-body></div>
      <div class="gacha-status" aria-live="polite"></div>
      <section class="gacha-summon-scene" hidden></section>
    </div>`;

  const tabs = overlay.querySelector('[data-gacha-tabs]');
  const body = overlay.querySelector('[data-gacha-body]');
  const scene = overlay.querySelector('.gacha-summon-scene');
  const localStatus = overlay.querySelector('.gacha-status');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function current() { return state.spirals.find(spiral => spiral.id === selected) || state.spirals[0]; }

  function render() {
    tabs.innerHTML = state.spirals.map(spiral => `
      <button type="button" class="gacha-tab ${spiral.id === selected ? 'active' : ''} ${spiral.canRoll ? 'ready' : ''}" data-gacha-tab="${escapeHtml(spiral.id)}" style="--art:url('/art/gacha/${escapeHtml(spiral.id)}.webp')" aria-label="${escapeHtml(spiral.title)}"><span></span></button>`).join('');
    body.innerHTML = bannerHtml(current(), playerLevel);
    tabs.querySelectorAll('[data-gacha-tab]').forEach(button => button.addEventListener('click', () => {
      if (pendingRequest) return;
      selected = button.dataset.gachaTab;
      haptic('light');
      render();
    }));
    body.querySelector('[data-gacha-roll]')?.addEventListener('click', roll);
    if (state.pending?.item) showReveal(state.pending.item, { instant: true });
  }

  // Summon: circle charges, a pillar in the grade colour lands, burst, reveal.
  async function playSummon(item) {
    const tone = gradeTone(item.grade || item.rarity);
    scene.className = `gacha-summon-scene tone-${tone}`;
    scene.innerHTML = `
      <div class="gs-circle" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="gs-pillar" aria-hidden="true"></div>
      <div class="gs-burst" aria-hidden="true"></div>
      <div class="gs-sparks" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * 26}deg;--d:${(i % 5) * 60}ms"></i>`).join('')}</div>`;
    scene.hidden = false;
    requestAnimationFrame(() => scene.classList.add('charging'));
    await wait(900);
    scene.classList.add('pillar');
    haptic(['S', 'SS', 'SSS'].includes(item.grade) ? 'heavy' : 'medium');
    await wait(700);
    scene.classList.add('burst');
    await wait(450);
  }

  function showReveal(item, { instant = false } = {}) {
    scene.hidden = false;
    scene.className = `gacha-summon-scene tone-${gradeTone(item.grade || item.rarity)} revealed ${instant ? 'instant' : ''}`;
    scene.innerHTML = itemRevealHtml(item);
    scene.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', () => resolvePending(button.dataset.action, button)));
  }

  function hideScene() {
    scene.classList.add('leaving');
    window.setTimeout(() => { scene.hidden = true; scene.innerHTML = ''; scene.className = 'gacha-summon-scene'; }, 250);
  }

  async function roll() {
    if (pendingRequest || state.pending) return;
    pendingRequest = true;
    haptic('medium');
    localStatus.textContent = '';
    try {
      const payload = await api('/api/gacha/roll', { method: 'POST', body: JSON.stringify({ gachaType: selected }) });
      state = payload.gacha;
      if (payload.state) renderState(payload.state);
      await playSummon(payload.item);
      showReveal(payload.item);
      body.innerHTML = bannerHtml(current(), playerLevel);
    } catch (error) {
      scene.hidden = true;
      localStatus.textContent = error.message;
      statusElement.textContent = `Гача: ${error.message}`;
      haptic('light');
    } finally {
      pendingRequest = false;
    }
  }

  async function resolvePending(action, button) {
    if (pendingRequest || !state.pending) return;
    pendingRequest = true;
    haptic('medium');
    scene.querySelectorAll('button').forEach(item => { item.disabled = true; });
    button.classList.add('working');
    try {
      const payload = await api('/api/gacha/resolve', { method: 'POST', body: JSON.stringify({ action }) });
      state = payload.gacha;
      if (payload.state) renderState(payload.state);
      localStatus.textContent = action === 'break' ? `Предмет распылён: +${number(payload.shards)} осколков.` : 'Предмет добавлен в инвентарь.';
      if (action === 'break') scene.classList.add('shatter');
      else scene.classList.add('stored');
      haptic('heavy');
      await wait(500);
      hideScene();
      pendingRequest = false;
      render();
    } catch (error) {
      localStatus.textContent = error.message;
      statusElement.textContent = `Гача: ${error.message}`;
      haptic('light');
      scene.querySelectorAll('button').forEach(item => { item.disabled = false; });
      button.classList.remove('working');
      pendingRequest = false;
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
