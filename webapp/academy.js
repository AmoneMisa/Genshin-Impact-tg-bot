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
  quest_not_complete: 'Задание ещё не выполнено.',
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
  const label = pass.owned ? 'Допуск получен' : pass.active ? (pass.progress >= pass.target ? `Сдать · ${fmt(pass.fee)} адены` : `${fmt(pass.progress)} / ${fmt(pass.target)} боссов`) : pass.canStart ? 'Взять задание' : `С ${pass.minLevel} ур.`;
  const action = pass.active && pass.progress >= pass.target ? 'pass_claim' : 'pass_start';
  const enabled = !pass.owned && (pass.active ? pass.progress >= pass.target : pass.canStart);
  return `<article class="academy-row ${pass.owned ? 'done' : ''}">
    <div><strong>${escapeHtml(pass.nameCall)}</strong><small>Победи ${fmt(pass.target)} боссов · взнос ${fmt(pass.fee)} адены</small></div>
    <button type="button" class="city-btn" data-academy-pass="${action}:${escapeHtml(pass.name)}" ${enabled ? '' : 'disabled'}>${escapeHtml(label)}</button>
  </article>`;
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
      <section class="city-block"><h4>Допуски к эпическим боссам</h4>${state.passes.map(passHtml).join('')}</section>
      <p class="city-feedback" aria-live="polite">${escapeHtml(message)}</p></div>`;
  }

  async function act(payload) {
    try {
      const result = await api('/api/academy/action', { method: 'POST', body: JSON.stringify(payload) });
      state = result.academy || state;
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
