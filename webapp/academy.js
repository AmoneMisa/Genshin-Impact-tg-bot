import { escapeHtml } from './escape-html.js';
import { luckCoinHtml } from './currency-icons.js';
// The Academy window: daily and weekly orders (quality follows the Academy's level), epic raid passes and
// the entry to the main profession quests.

const REASONS = {
  unknown_bounty: 'Такого поручения нет.',
  already_claimed: 'Награда уже получена.',
  bounty_not_done: 'Поручение ещё не выполнено.',
  unknown_epic: 'Такого босса нет.',
  level_too_low: 'Не хватает уровня.',
  pass_owned: 'Допуск уже получен.',
  already_active: 'Это задание уже взято.',
  no_quest: 'Сначала возьми задание.',
  quest_not_complete: 'Шаг ещё не выполнен.',
  not_a_dialog: 'Сейчас нужно не говорить, а выполнить шаг.',
  not_a_farm_step: 'Сейчас нужно поговорить с персонажем.',
  not_enough_gold: 'Недостаточно адены.',
};

const fmt = value => new Intl.NumberFormat('ru-RU').format(Math.round(Number(value) || 0));
const duration = ms => {
  const total = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(total / 1440), h = Math.floor((total % 1440) / 60), m = total % 60;
  return d ? `${d}д ${h}ч` : h ? `${h}ч ${m}м` : `${m}м`;
};

function rewardHtml(reward = {}) {
  const parts = [];
  if (reward.gold) parts.push(`🪙 ${fmt(reward.gold)}`);
  if (reward.sp) parts.push(`✧ ${fmt(reward.sp)} ОП`);
  if (reward.moonDew) parts.push(`💧 ${fmt(reward.moonDew)}`);
  if (reward.ironOre) parts.push(`⛏️ ${fmt(reward.ironOre)}`);
  if (reward.luckCoins) parts.push(`${luckCoinHtml(14)} ${fmt(reward.luckCoins)}`);
  return parts.join(' · ');
}

function bountyHtml(scope, quest, kinds) {
  const done = quest.progress >= quest.target;
  return `<article class="academy-row ${quest.claimed ? 'claimed' : done ? 'done' : ''}">
    <div><strong>${escapeHtml(kinds[quest.kind] || quest.kind)} · ${fmt(quest.target)}</strong>
      <small>${fmt(quest.progress)} / ${fmt(quest.target)} · ${rewardHtml(quest.reward)}</small></div>
    <button type="button" class="city-btn" data-academy-claim="${escapeHtml(scope)}:${escapeHtml(quest.id)}" ${done && !quest.claimed ? '' : 'disabled'}>${quest.claimed ? 'Получено' : 'Забрать'}</button>
  </article>`;
}

function passHtml(pass) {
  const head = `<strong>${escapeHtml(pass.nameCall)}</strong>`;
  const have = pass.owned ? `${escapeHtml(pass.title)} ×${fmt(pass.owned)} · привязан к персонажу` : '';
  if (!pass.active && pass.owned) {
    return `<article class="academy-row done"><div>${head}<small>${have}</small></div>
      <button type="button" class="city-btn" data-academy-pass="pass_start:${escapeHtml(pass.name)}" ${pass.canStart ? '' : 'disabled'}>Ещё квест</button></article>`;
  }
  if (!pass.active) {
    return `<article class="academy-row"><div>${head}<small>Квест: ${escapeHtml(pass.npc)} · с ${fmt(pass.minLevel)} ур. · или ${fmt(pass.price)} ${luckCoinHtml(14)} в Донат-магазине</small></div>
      <button type="button" class="city-btn" data-academy-pass="pass_start:${escapeHtml(pass.name)}" ${pass.canStart ? '' : 'disabled'}>${pass.canStart ? 'Взять квест' : `С ${fmt(pass.minLevel)} ур.`}</button></article>`;
  }
  const step = pass.step;
  const where = `Шаг ${fmt(pass.stepIndex + 1)} из ${fmt(pass.stepCount)}`;
  if (step.type === 'talk') {
    return `<article class="academy-row"><div>${head}<small>${where} · Поговори: ${escapeHtml(step.npc)}</small></div>
      <button type="button" class="city-btn upgrade" data-academy-pass="pass_talk:${escapeHtml(pass.name)}">Поговорить</button></article>`;
  }
  // the quest item is the pass: it drops by itself, there is nothing to hand in
  return `<article class="academy-row"><div>${head}<small>${where} · ${escapeHtml(step.text || '')} · ${fmt(step.progress)} / ${fmt(step.target)}${have ? ` · ${have}` : ''}</small></div>
    <button type="button" class="city-btn" disabled>Ищи в бою</button></article>`;
}

function mainQuestsHtml(view) {
  const promotions = view?.promotions || view?.available || [];
  const next = Array.isArray(promotions) ? promotions.length : 0;
  return `<section class="city-block"><h4>Основные задания</h4>
    <p class="city-desc">Задания на 1-ю, 2-ю и 3-ю профессию выдаёт Академия. Награда за них не зависит от её уровня.${next ? ` Доступно повышений: ${next}.` : ''}</p>
    <button type="button" class="city-btn upgrade" data-academy-main>Открыть задания профессий</button></section>`;
}

export async function openAcademy({ api, haptic = () => {}, openMainQuests = () => {} } = {}) {
  let state = await api('/api/academy');
  let dialog = null;
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay city-window academy-window';
  overlay.innerHTML = `<div class="overlay-backdrop" data-academy-close></div>
    <div class="overlay-panel city-window-panel"><button type="button" class="overlay-close icon-button" data-academy-close aria-label="Закрыть">×</button>
    <div class="city-window-content" data-academy-body></div></div>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('[data-academy-body]');

  function render(message = '') {
    const now = Date.now();
    const section = (title, scope) => `<section class="city-block"><h4>${title} <small>обновится через ${duration(state.bounties[scope].resetsAt - now)}</small></h4>
      ${state.bounties[scope].quests.map(quest => bountyHtml(scope, quest, state.kinds)).join('')}</section>`;
    body.innerHTML = `<div class="city-window-body">
      <div class="city-window-title"><strong>Академия</strong><small>Уровень ${fmt(state.level)} · качество поручений ${state.quality} / 5</small></div>
      <p class="city-desc">Чем выше уровень Академии, тем крупнее поручения и награды. Задания профессий и допуски к эпическим боссам от неё не зависят.</p>
      ${section('Ежедневные поручения', 'day')}
      ${section('Еженедельные поручения', 'week')}
      ${mainQuestsHtml(state.classQuests)}
      ${dialog ? `<section class="city-block academy-dialog"><h4>${escapeHtml(dialog.npc)}</h4>${dialog.lines.map(line => `<p>«${escapeHtml(line)}»</p>`).join('')}${dialog.done ? '<p><b>Допуск получен.</b></p>' : ''}</section>` : ''}
      <section class="city-block"><h4>Допуски к эпическим боссам</h4><p class="city-desc">Закен требует группу от двух игроков, Фринтезза — от четырёх, и допуск нужен только лидеру группы. Орфен, Кора и Королева Муравьёв доступны в одиночку. Допуск привязан к персонажу: его нельзя продать, положить на хранение или передать.</p>${state.passes.map(passHtml).join('')}</section>
      <p class="city-feedback" aria-live="polite">${escapeHtml(message)}</p></div>`;
  }

  async function act(payload) {
    try {
      const result = await api('/api/academy/action', { method: 'POST', body: JSON.stringify(payload) });
      state = result.academy || state;
      dialog = result.lines ? { npc: result.npc, lines: result.lines, done: Boolean(result.done) } : null;
      haptic('medium');
      render();
    } catch (error) {
      if (error.payload?.academy) state = error.payload.academy;
      render(REASONS[error.payload?.reason] || error.message);
    }
  }

  overlay.addEventListener('click', event => {
    if (event.target.closest('[data-academy-close]')) { overlay.remove(); return; }
    const claim = event.target.closest('[data-academy-claim]');
    if (claim) { const [scope, id] = claim.dataset.academyClaim.split(':'); act({ action: 'claim', scope, id }); return; }
    const pass = event.target.closest('[data-academy-pass]');
    if (pass) { const [action, ...rest] = pass.dataset.academyPass.split(':'); act({ action, name: rest.join(':') }); return; }
    if (event.target.closest('[data-academy-main]')) { overlay.remove(); openMainQuests(); }
  });
  render();
}
