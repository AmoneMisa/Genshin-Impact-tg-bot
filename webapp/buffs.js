import {dialogHeading} from './dialog-heading.js';
import {itemGridHtml} from './item-grid.js';
import {enhanceSelects} from './design/select.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {l2SkillIcon} from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import { escapeHtml } from './escape-html.js';

// Original High Five effect skills alongside the project's class buffs.

const KINDS = [['buff', 'Баффы', '1040'], ['debuff', 'Дебаффы', '1164'], ['pet', 'Питомцы', '1111']];
const art = id => l2EffectIcon(id) || l2SkillIcon(id);
const kindOf = skill => skill.group === 'Питомцы' ? 'pet' : skill.kind || 'buff';
const REASONS = {
  not_learned: 'Этот бафф ещё не изучен.',
  player_dead: 'Мёртвые не колдуют: сначала воскресни.',
  self_only: 'Твой класс накладывает баффы только на себя.',
  unknown_player: 'Игрок не найден в этом чате.',
  cooldown: 'Бафф ещё восстанавливается.',
  not_enough_mp: 'Не хватает маны.',
  unknown_buff: 'Неизвестный бафф.',
  no_target: 'Выбери монстра на поле боя.',
  pvp_not_here: 'Игрок должен находиться рядом на том же поле боя.',
  pvp_out_of_range: 'Подойди ближе к цели.',
  pvp_force_required: 'Для атаки мирного игрока включи принудительную атаку.',
  effect_condition: 'Не выполнено условие использования этого умения.',
  effect_betray:'На тебе предательство.',effect_distrust:'На тебе смятение.',
  requires_transformation:'Для этого умения нужна система трансформаций.',
  requires_corpse:'Для этого умения нужна доступная мёртвая цель.',
  effect_fakedeath:'Сначала выключи притворную смерть.',
  effect_disarm:'Ты разоружён.',
  effect_stun: 'Ты оглушён.',effect_sleep:'Ты спишь.',effect_paralyze:'Ты парализован.',effect_petrification:'Ты окаменел.',effect_fear:'На тебе страх.',effect_silence:'Магия запрещена.',effect_physical_silence:'Физические навыки запрещены.',
};

function minutesLeft(until) {
  return Math.max(1, Math.ceil((until - Date.now()) / 60_000));
}

/** Support skills in the Character window shell: a dense icon grid, details and the cast on tap. */
export async function openBuffsGame({ api, haptic, renderState }) {
  installOverlayA11y();
  let state = await api('/api/buffs');
  let target = '', kind = 'buff', search = '', force = false, openId = null;
  let feedback = { kind: '', text: '' };

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay buffs-overlay character-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel l2-status-window character-panel">
      ${dialogHeading('Баффы и дебаффы').replace('data-dismiss', 'class="overlay-close" data-dismiss')}
      <nav class="ui-folder-tabs ui-window-tabs ui-icon-tabs character-tabs" role="tablist" aria-label="Виды умений" data-effect-tabs></nav>
      <div class="character-scroll" data-buffs-body></div>
    </div>`;
  const body = overlay.querySelector('[data-buffs-body]'), tabs = overlay.querySelector('[data-effect-tabs]');
  let detail = null;
  const closeDetail = () => { openId = null; const node = detail; detail = null; if (node?.open) node.close(); node?.remove(); };
  const close = () => { closeDetail(); overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const all = () => { const native = state.l2Skills || [], names = new Set(native.map(s => s.name)); return [...state.buffs.filter(s => !names.has(s.name)), ...native]; };
  const section = (title, html) => `<section class="character-section"><h3>${escapeHtml(title)}</h3><div class="character-section-body">${html}</div></section>`;
  const row = (label, value) => `<div class="character-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  const status = skill => skill.level < 1 ? `Откроется на ${skill.firstLevelAt} уровне` : skill.active ? `Активен, ещё ${minutesLeft(skill.active.until)} мин.` : `Уровень ${skill.level} из ${skill.maxLevel}`;

  function detailHtml(skill) {
    const locked = skill.level < 1, cooling = skill.cooldownUntil > Date.now() && !(skill.toggle && skill.active);
    const cost = state.support && target ? skill.costOthers : skill.cost;
    const params = row('Состояние', status(skill))
      + (skill.seconds != null ? row(skill.toggle ? 'Тип' : 'Длительность', skill.toggle ? 'Переключаемый эффект' : `${skill.seconds} сек.`) : '')
      + (skill.group ? row('Группа', skill.group) : '')
      + (!locked && skill.nextLevelAt && skill.level < skill.maxLevel ? row('Следующий уровень', `${skill.nextLevelAt} ур.`) : '');
    const action = locked ? '' : `<button type="button" class="ui-button primary" data-buff-cast="${escapeHtml(skill.id)}" ${cooling ? 'disabled' : ''}>${cooling ? 'Восстанавливается…' : `${skill.group === 'Питомцы' ? 'Призвать' : 'Наложить'} · ${cost} MP`}</button>`;
    return `${section('Эффект', `<p>${escapeHtml(skill.effect || 'Описание не указано.')}</p>`)}${section('Параметры', `<div class="ui-stat-table">${params}</div>`)}${action}`;
  }

  function showDetail(id) {
    const skill = all().find(s => String(s.id) === String(id));
    if (!skill) { closeDetail(); return; }
    const opening = !detail;
    if (opening) {
      const node = document.createElement('dialog');
      node.className = 'game-dialog-panel character-detail-dialog';
      node.addEventListener('close', () => { if (detail === node) { openId = null; detail = null; } node.remove(); });
      node.addEventListener('click', event => {
        if (event.target === node) { const r = node.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) { closeDetail(); return; } }
        if (event.target.closest('[data-dismiss]')) { closeDetail(); return; }
        const button = event.target.closest('[data-buff-cast]'); if (button && !button.disabled) cast(button.dataset.buffCast);
      });
      overlay.append(node);
      detail = node;
    }
    openId = skill.id;
    detail.innerHTML = dialogHeading(skill.name) + detailHtml(skill);
    if (opening) detail.showModal();
  }

  function render() {
    tabs.innerHTML = KINDS.map(([id, label, iconId]) => `<button type="button" role="tab" aria-label="${label}" title="${label}" aria-selected="${id === kind}" tabindex="${id === kind ? 0 : -1}" data-effect-kind="${id}">${art(iconId)}</button>`).join('');
    const label = KINDS.find(k => k[0] === kind)[1];
    const query = search.trim().toLowerCase();
    const rows = all().filter(s => kindOf(s) === kind && (!query || `${s.name} ${s.effect} ${s.group || ''}`.toLowerCase().includes(query)));
    const skillArt = s => art(s.iconId || s.id);
    const withIcons = rows.filter(skillArt), withoutIcons = rows.filter(s => !skillArt(s));
    const cell = s => `<button type="button" class="item-grid-cell ${s.level < 1 ? 'unlearned' : ''}" data-buff="${escapeHtml(s.id)}" aria-label="${escapeHtml(s.name)}" title="${escapeHtml(`${s.name} · ${status(s)}`)}">${skillArt(s)}${s.level >= 1 ? `<em class="item-grid-count">${s.level}</em>` : ''}</button>`;
    // Some project skills have no original client art: they stay as named rows, never a substitute icon.
    const named = withoutIcons.map(s => `<button type="button" class="ui-button ui-choice-row compact" data-buff="${escapeHtml(s.id)}"><span>${escapeHtml(s.name)}<small>${escapeHtml(status(s))}</small></span></button>`).join('');
    const own = kind === 'debuff' ? 'Выбранный монстр' + (state.selectedMob ? ' · ' + state.selectedMob.name : '') : 'На себя';
    const targetField = kind !== 'pet' && (state.support || kind === 'debuff') ? `<label><span>Цель</span><select data-buff-target><option value="">${escapeHtml(own)}</option>${(state.effectTargets || state.players).map(player => `<option value="${escapeHtml(player.userId)}" ${player.userId === target ? 'selected' : ''}>${escapeHtml(player.name)}</option>`).join('')}</select></label>` : '';
    const forceField = kind === 'debuff' && target ? `<label class="ui-check"><input type="checkbox" data-effect-force ${force ? 'checked' : ''}> Принудительная атака мирного игрока (PvP / PK)</label>` : '';
    const list = rows.length ? (withIcons.length ? itemGridHtml(withIcons.map(cell), { min: 0, fill: false, label }) : '') + named : '<p class="character-empty">Таких умений нет или ничего не найдено.</p>';
    body.innerHTML = section('Персонаж', `<div class="ui-stat-table">${row(state.classTitle, `${state.level} ур.`)}${row('MP', `${state.mp} / ${state.maxMp}`)}</div><p class="character-empty">Одновременно действуют до 24 баффов, 12 песен и танцев и 16 дебаффов.</p>`)
      + section(label, `<div class="ui-action-stack">${targetField}${forceField}<input type="search" data-effect-search value="${escapeHtml(search)}" placeholder="Поиск по названию или эффекту" aria-label="Поиск по названию или эффекту"></div>${list}`)
      + (feedback.text ? `<p class="feedback-result ${feedback.kind}" role="status">${escapeHtml(feedback.text)}</p>` : '');
    enhanceSelects(body);
    if (openId) showDetail(openId);
  }

  tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-effect-kind]'); if (!button) return;
    kind = button.dataset.effectKind; target = ''; force = false; feedback = { kind: '', text: '' }; render();
    tabs.querySelector('[aria-selected="true"]')?.focus();
  });
  body.addEventListener('click', event => { const button = event.target.closest('[data-buff]'); if (button) { haptic?.('light'); showDetail(button.dataset.buff); } });
  body.addEventListener('change', event => {
    if (event.target.matches('[data-buff-target]')) { target = event.target.value; render(); }
    if (event.target.matches('[data-effect-force]')) force = event.target.checked;
  });
  body.addEventListener('input', event => {
    if (!event.target.matches('[data-effect-search]')) return;
    const position = event.target.selectionStart; search = event.target.value; render();
    const field = body.querySelector('[data-effect-search]'); field.focus(); field.setSelectionRange(position, position);
  });

  async function cast(buffId) {
    try {
      haptic?.('medium');
      const payload = await api('/api/buffs/cast', { method: 'POST', body: JSON.stringify({ buffId, targetId: target || (kind === 'debuff' ? 'mob' : undefined), force }) });
      state = payload.buffs;
      const name = all().find(buff => buff.id === buffId)?.name || buffId;
      feedback = { kind: 'success', text: payload.resisted ? `${name}: цель сопротивляется.` : payload.toggledOff ? `${name}: эффект выключен.` : payload.summoned ? `${name}: питомец призван.` : payload.onSelf ? `${name} наложен на тебя.` : `${name} наложен на ${payload.targetName}.` };
      renderState?.(payload.state);
    } catch (error) {
      if (error.payload?.buffs) state = error.payload.buffs;
      feedback = { kind: 'error', text: REASONS[error.payload?.reason] || error.message };
    }
    closeDetail();
    render();
  }

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
