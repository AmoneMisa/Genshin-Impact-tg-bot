import {l2SkillIcon} from './art/l2-extra-art.js';
import { escapeHtml } from './escape-html.js';

// Class buffs: the seven Lineage II style buffs cast by the class itself.

const ROMAN = ['', 'I', 'II', 'III'];
const REASONS = {
  not_learned: 'Этот бафф ещё не изучен.',
  player_dead: 'Мёртвые не колдуют: сначала воскресни.',
  self_only: 'Твой класс накладывает баффы только на себя.',
  unknown_player: 'Игрок не найден в этом чате.',
  cooldown: 'Бафф ещё восстанавливается.',
  not_enough_mp: 'Не хватает маны.',
  unknown_buff: 'Неизвестный бафф.',
};

function minutesLeft(until) {
  return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
}

export async function openBuffsGame({ api, haptic, renderState }) {
  let state = await api('/api/buffs');
  let target = '';
  let feedback = { kind: '', text: '' };

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay buffs-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Баффы</h2>
        <span class="ds-round" aria-hidden="true">✨</span>
      </header>
      <div data-buffs-body></div>
    </div>`;
  const body = overlay.querySelector('[data-buffs-body]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function buffHtml(buff) {
    const now = Date.now();
    const locked = buff.level < 1;
    const cooling = buff.cooldownUntil > now;
    const forOthers = state.support && target;
    const cost = forOthers ? buff.costOthers : buff.cost;
    const next = buff.level >= 1 && buff.nextLevelAt && buff.level < buff.maxLevel ? `<small>Следующий уровень: ${buff.nextLevelAt} ур.</small>` : '';
    return `
      <article class="mail-letter buff-card ${locked ? 'claimed' : 'pending'}">
        <div class="mail-head"><strong>${l2SkillIcon(buff.id)} ${escapeHtml(buff.name)} ${locked ? '' : ROMAN[buff.level]}</strong>
          <small>${locked ? `Откроется на ${buff.firstLevelAt} уровне` : buff.active ? `активен, ещё ${minutesLeft(buff.active.until)} мин.` : `уровень ${buff.level} из ${buff.maxLevel}`}</small></div>
        <p>${escapeHtml(buff.effect)}</p>
        ${next}
        ${locked ? '' : `<button type="button" class="feedback-submit" data-buff-cast="${escapeHtml(buff.id)}" ${cooling ? 'disabled' : ''}>${cooling ? 'Восстанавливается…' : `Наложить · ${cost} МП`}</button>`}
      </article>`;
  }

  function render() {
    body.innerHTML = `
      <div class="feedback-card">
        <div class="feedback-intro"><span>✨</span><div><strong>${escapeHtml(state.classTitle)} · ${state.level} ур.</strong>
          <p>Баффы действуют ${state.durationMinutes} минут и растут вместе с уровнем. Мана: ${state.mp} / ${state.maxMp}.</p></div></div>
        ${state.support ? `<label class="feedback-field"><span>Кому</span>
          <select data-buff-target><option value="">На себя</option>${state.players.map(player => `<option value="${escapeHtml(player.userId)}" ${player.userId === target ? 'selected' : ''}>${escapeHtml(player.name)}</option>`).join('')}</select></label>` : ''}
      </div>
      <div class="mail-list">${state.buffs.length ? state.buffs.map(buffHtml).join('') : '<p class="mail-empty">Твой класс пока не знает баффов. Выбери класс в разделе «Персонаж».</p>'}</div>
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelector('[data-buff-target]')?.addEventListener('change', event => { target = event.target.value; render(); });
    body.querySelectorAll('[data-buff-cast]').forEach(button => button.addEventListener('click', () => cast(button.dataset.buffCast)));
  }

  async function cast(buffId) {
    try {
      haptic?.('medium');
      const payload = await api('/api/buffs/cast', { method: 'POST', body: JSON.stringify({ buffId, targetId: target || undefined }) });
      state = payload.buffs;
      const name = state.buffs.find(buff => buff.id === buffId)?.name || buffId;
      feedback = { kind: 'success', text: payload.onSelf ? `Бафф ${name} наложен на тебя.` : `Бафф ${name} наложен на ${payload.targetName}.` };
      renderState?.(payload.state);
    } catch (error) {
      if (error.payload?.buffs) state = error.payload.buffs;
      feedback = { kind: 'error', text: REASONS[error.payload?.reason] || error.message };
    }
    render();
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
