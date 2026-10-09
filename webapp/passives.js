import { escapeHtml } from './escape-html.js';

// Passive skills (Lineage II): permanent class bonuses learned with skill points and gold.

const REASONS = {
  unknown_passive: 'Этот навык твой класс не изучает.',
  max_level: 'Навык уже на максимальном уровне.',
  level_too_low: 'Твой уровень слишком низкий.',
  not_enough_sp: 'Не хватает очков навыков (ОП).',
  not_enough_gold: 'Не хватает золота.',
};

const percent = value => `${Math.round(Number(value) * 10) / 10}%`;
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

export async function openPassivesGame({ api, haptic, renderState }) {
  let state = await api('/api/passives');
  let feedback = { kind: '', text: '' };

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay buffs-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Пассивные навыки</h2>
        <span class="ds-round" aria-hidden="true">🛡️</span>
      </header>
      <div data-passives-body></div>
    </div>`;
  const body = overlay.querySelector('[data-passives-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function passiveHtml(passive) {
    const maxed = passive.level >= passive.maxLevel;
    const locked = !maxed && state.level < passive.needLvl;
    return `
      <article class="mail-letter buff-card ${passive.level ? 'pending' : 'claimed'}">
        <div class="mail-head"><strong>${escapeHtml(passive.name)} ${ROMAN[passive.level]}</strong>
          <small>${passive.level} / ${passive.maxLevel}</small></div>
        <p>${escapeHtml(passive.stat)}: ${passive.current ? escapeHtml(passive.current) : '—'}${maxed ? '' : ` → ${escapeHtml(passive.next)}`}</p>
        ${maxed ? '' : `<button type="button" class="feedback-submit" data-passive="${escapeHtml(passive.id)}" ${passive.canLearn ? '' : 'disabled'}>${locked ? `Нужен ${passive.needLvl} уровень` : `Изучить · ${passive.cost.sp} ОП · ${passive.cost.gold} золота`}</button>`}
      </article>`;
  }

  function characteristicsHtml() {
    const stats = state.characteristics || [];
    const attrs = state.attributes || { attack: null, resist: [] };
    if (!stats.length) return '';
    const resists = attrs.resist.filter(entry => entry.value > 0);
    return `
      <div class="feedback-card">
        <div class="feedback-intro"><span>📊</span><div><strong>Характеристики</strong>
          <p>Базовые значения класса; бижутерия с камнем жизни добавляет очки.</p></div></div>
        <div class="mail-list">${stats.map(stat => `
          <article class="mail-letter ${stat.bonus ? 'pending' : 'claimed'}">
            <div class="mail-head"><strong>${stat.icon} ${escapeHtml(stat.name)}</strong>
              <small>${stat.total}${stat.bonus ? ` (+${stat.bonus})` : ''}</small></div>
            <p>${escapeHtml(stat.text)}${stat.effect ? ` · ${escapeHtml(stat.effect)}` : ''}</p>
          </article>`).join('')}</div>
      </div>
      <div class="feedback-card">
        <div class="feedback-intro"><span>🔥</span><div><strong>Атрибуты</strong>
          <p>${attrs.attack ? `Оружие: ${attrs.attack.icon} ${escapeHtml(attrs.attack.label)} ${attrs.attack.value} (урон +${percent(attrs.attack.bonus)})` : 'Оружие без атрибута.'}</p>
          <p>${resists.length ? resists.map(entry => `${entry.icon} ${escapeHtml(entry.label)} ${entry.value} (−${percent(entry.reduction)} урона)`).join(' · ') : 'Броня без сопротивлений стихиям.'}</p></div></div>
      </div>`;
  }

  function render() {
    body.innerHTML = `
      ${characteristicsHtml()}
      <div class="feedback-card">
        <div class="feedback-intro"><span>🛡️</span><div><strong>Постоянные бонусы класса</strong>
          <p>ОП: ${state.sp} · золото: ${state.gold}. Бонусы действуют всегда; при смене класса навыки другой ветки отключаются, но не теряются.</p></div></div>
      </div>
      <div class="mail-list">${state.passives.map(passiveHtml).join('')}</div>
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelectorAll('[data-passive]').forEach(button => button.addEventListener('click', () => learn(button.dataset.passive)));
  }

  async function learn(id) {
    try {
      haptic?.('medium');
      const payload = await api('/api/passives/learn', { method: 'POST', body: JSON.stringify({ id }) });
      state = payload.passives;
      feedback = { kind: 'success', text: `Навык «${payload.name}» — уровень ${payload.level}.` };
      renderState?.(payload.state);
    } catch (error) {
      if (error.payload?.passives) state = error.payload.passives;
      feedback = { kind: 'error', text: REASONS[error.payload?.reason] || error.message };
    }
    render();
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
