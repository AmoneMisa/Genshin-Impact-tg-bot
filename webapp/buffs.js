import {l2SkillIcon} from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import { escapeHtml } from './escape-html.js';

// Original High Five effect skills alongside the project's class buffs.

const ROMAN = ['', 'I', 'II', 'III'];
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

export async function openBuffsGame({ api, haptic, renderState }) {
  let state = await api('/api/buffs');
  let target = '';
  let feedback = { kind: '', text: '' };
  let kind='buff',search='',page=0,force=false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay buffs-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Баффы и дебаффы</h2>
        <span class="ds-round" aria-hidden="true">${l2EffectIcon('l2:1068')}</span>
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
    const cooling = buff.cooldownUntil > now && !(buff.toggle&&buff.active);
    const forOthers = state.support && target;
    const cost = forOthers ? buff.costOthers : buff.cost;
    const actionLabel=buff.group==='Питомцы'?'Призвать':'Наложить';
    const next = buff.level >= 1 && buff.nextLevelAt && buff.level < buff.maxLevel ? `<small>Следующий уровень: ${buff.nextLevelAt} ур.</small>` : '';
    return `
      <article class="mail-letter buff-card ${locked ? 'claimed' : 'pending'}">
        <div class="mail-head"><strong>${l2EffectIcon(buff.id)||l2SkillIcon(buff.id)} ${escapeHtml(buff.name)} ${locked ? '' : ROMAN[buff.level]||buff.level}</strong>
          <small>${locked ? `Откроется на ${buff.firstLevelAt} уровне` : buff.active ? `активен, ещё ${minutesLeft(buff.active.until)} мин.` : `уровень ${buff.level} из ${buff.maxLevel}`}</small></div>
        <p>${escapeHtml(buff.effect)}</p>
        ${buff.seconds!=null?`<small>${buff.toggle?'Переключаемый эффект':`Длительность: ${buff.seconds} сек.`} · ${escapeHtml(buff.group||'')}</small>`:''}
        ${next}
        ${locked ? '' : `<button type="button" class="feedback-submit" data-buff-cast="${escapeHtml(buff.id)}" ${cooling ? 'disabled' : ''}>${cooling ? 'Восстанавливается…' : `${actionLabel} · ${cost} МП`}</button>`}
      </article>`;
  }

  function render() {
    const native=state.l2Skills||[];
    const names=new Set(native.map(s=>s.name));
    const all=[...state.buffs.filter(s=>!names.has(s.name)),...native];
    const filtered=all.filter(s=>(s.group==='Питомцы'?'pet':s.kind||'buff')===kind&&(s.name+' '+s.effect+' '+(s.group||'')).toLowerCase().includes(search.toLowerCase()));
    const pages=Math.max(1,Math.ceil(filtered.length/20));page=Math.min(page,pages-1);
    const visible=filtered.slice(page*20,page*20+20);
    body.innerHTML = `
      <div class="feedback-card">
        <div class="feedback-intro"><span>${l2EffectIcon('l2:1068')}</span><div><strong>${escapeHtml(state.classTitle)} · ${state.level} ур.</strong>
          <p>Уровни умений растут вместе с персонажем. Мана: ${state.mp} / ${state.maxMp}. Лимиты: 24 баффа, 12 песен и танцев, 16 дебаффов.</p></div></div>
        <div class="party-actions"><button type="button" data-effect-kind="buff" aria-pressed="${kind==='buff'}">Баффы</button><button type="button" data-effect-kind="debuff" aria-pressed="${kind==='debuff'}">Дебаффы</button><button type="button" data-effect-kind="pet" aria-pressed="${kind==='pet'}">Питомцы</button></div>
        <label class="feedback-field"><span>Поиск по названию или эффекту</span><input data-effect-search value="${escapeHtml(search)}" placeholder="Acumen, танец, защита…"></label>
        ${kind!=='pet'&&(state.support||kind==='debuff') ? `<label class="feedback-field"><span>Цель</span>
          <select data-buff-target><option value="">${kind==='debuff'?'Выбранный монстр'+(state.selectedMob?' · '+escapeHtml(state.selectedMob.name):''):'На себя'}</option>${(state.effectTargets||state.players).map(player => `<option value="${escapeHtml(player.userId)}" ${player.userId === target ? 'selected' : ''}>${escapeHtml(player.name)}</option>`).join('')}</select></label>` : ''}
        ${kind==='debuff'&&target?`<label class="feedback-field"><span><input type="checkbox" data-effect-force ${force?'checked':''}> Принудительная атака мирного игрока (PvP / PK)</span></label>`:''}
      </div>
      <div class="mail-list">${visible.length ? visible.map(buffHtml).join('') : '<p class="mail-empty">Для этого класса таких умений нет или ничего не найдено.</p>'}</div>
      <div class="party-actions"><button type="button" data-effect-page="-1" ${page===0?'disabled':''}>←</button><span>${page+1} / ${pages} · ${filtered.length} умений</span><button type="button" data-effect-page="1" ${page+1>=pages?'disabled':''}>→</button></div>
      ${feedback.text ? `<div class="feedback-result ${feedback.kind}">${escapeHtml(feedback.text)}</div>` : ''}`;
    body.querySelector('[data-buff-target]')?.addEventListener('change', event => { target = event.target.value; render(); });
    body.querySelectorAll('[data-effect-kind]').forEach(button=>button.addEventListener('click',()=>{kind=button.dataset.effectKind;page=0;target='';force=false;render();}));
    body.querySelectorAll('[data-effect-page]').forEach(button=>button.addEventListener('click',()=>{page+=Number(button.dataset.effectPage);render();}));
    body.querySelector('[data-effect-search]')?.addEventListener('input',event=>{const position=event.target.selectionStart;search=event.target.value;page=0;render();const field=body.querySelector('[data-effect-search]');field.focus();field.setSelectionRange(position,position);});
    body.querySelector('[data-effect-force]')?.addEventListener('change',event=>force=event.target.checked);
    body.querySelectorAll('[data-buff-cast]').forEach(button => button.addEventListener('click', () => cast(button.dataset.buffCast)));
  }

  async function cast(buffId) {
    try {
      haptic?.('medium');
      const payload = await api('/api/buffs/cast', { method: 'POST', body: JSON.stringify({ buffId, targetId: target || (kind==='debuff'?'mob':undefined),force }) });
      state = payload.buffs;
      const name = [...state.buffs,...(state.l2Skills||[])].find(buff => buff.id === buffId)?.name || buffId;
      feedback = { kind: 'success', text: payload.resisted?`${name}: цель сопротивляется.`:payload.toggledOff?`${name}: эффект выключен.`:payload.summoned?`${name}: питомец призван.`:payload.onSelf ? `${name} наложен на тебя.` : `${name} наложен на ${payload.targetName}.` };
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
