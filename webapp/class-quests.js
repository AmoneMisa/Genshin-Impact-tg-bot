import { escapeHtml } from './escape-html.js';
import { menuArtFor } from './menu-art.js';

const REASONS = {
  unknown_quest: 'Такой профессии нет.',
  wrong_class: 'Эта профессия доступна другому классу.',
  level_too_low: 'Не хватает уровня.',
  already_mastered: 'Эта профессия уже освоена.',
  already_active: 'Это задание уже взято.',
  other_quest_active: 'Сначала заверши или брось текущее задание.',
  no_quest: 'Нет активного задания.',
  nothing_to_pay: 'Платить больше нечего.',
  not_enough_gold: 'Недостаточно золота.',
  not_enough_crystals: 'Недостаточно кристаллов.',
  quest_not_started: 'Сначала возьми задание у наставника.',
  quest_not_complete: 'Задание ещё не выполнено.',
};

const STATUS_LABEL = {
  available: 'Доступно',
  active: 'В процессе',
  ready: 'Готово к повышению',
  mastered: 'Освоено',
  locked: 'Недоступно',
  blocked: 'Идёт другое задание',
};

const TIER_LABEL = { 2: '2-я профессия', 3: '3-я профессия' };

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function rewardText(reward = {}) {
  const parts = [];
  if (reward.sp) parts.push(`✦ ${formatNumber(reward.sp)} ОП`);
  if (reward.crystals) parts.push(`💎 ${formatNumber(reward.crystals)}`);
  if (reward.gold) parts.push(`🪙 ${formatNumber(reward.gold)}`);
  const items = { skill_scroll: '📜 Свиток мастерства', ancient_seal: '🔱 Древняя печать' };
  for (const [key, amount] of Object.entries(reward.items || {})) parts.push(`${items[key] || key} ×${amount}`);
  return parts.join(' · ');
}

export function stepRow(step) {
  const percent = step.target > 0 ? Math.round((step.progress / step.target) * 100) : 0;
  const detail = step.manual
    ? `${step.gold ? `🪙 ${formatNumber(step.gold)}` : ''}${step.crystals ? ` 💎 ${formatNumber(step.crystals)}` : ''}`
    : `${formatNumber(step.progress)} / ${formatNumber(step.target)}`;
  return `
    <li class="cq-step ${step.done ? 'done' : ''}">
      <span class="cq-check" aria-hidden="true">${step.done ? '✔' : step.icon || '•'}</span>
      <div>
        <strong>${escapeHtml(step.text)}</strong>
        ${step.manual ? '' : `<span class="cq-bar"><i style="width:${percent}%"></i></span>`}
      </div>
      <em>${step.manual && step.done ? 'оплачено' : escapeHtml(detail)}</em>
    </li>`;
}

export function promotionCard(item, level) {
  const active = item.status === 'active' || item.status === 'ready';
  const payStep = item.steps.find(step => step.manual && !step.done);
  const others = item.steps.filter(step => !step.manual);
  const canPay = Boolean(payStep) && others.every(step => step.done);
  let actions = '';
  if (item.status === 'available') {
    actions = `<button type="button" data-cq-action="start" data-cq-to="${escapeHtml(item.to)}">Взять задание</button>`;
  } else if (item.status === 'active') {
    actions = `${payStep ? `<button type="button" data-cq-action="pay" ${canPay ? '' : 'disabled'}>Заплатить наставнику</button>` : ''}
      <button type="button" class="cq-ghost" data-cq-action="abandon">Отказаться</button>`;
  } else if (item.status === 'ready') {
    actions = `<button type="button" class="cq-promote" data-cq-action="promote" data-cq-to="${escapeHtml(item.to)}">Стать: ${escapeHtml(item.title)}</button>
      <button type="button" class="cq-ghost" data-cq-action="abandon">Отказаться</button>`;
  } else if (item.status === 'mastered') {
    actions = `<button type="button" data-cq-action="promote" data-cq-to="${escapeHtml(item.to)}">Вернуть профессию · 🪙 ${formatNumber(item.returnFee.gold)}</button>`;
  } else if (item.status === 'locked') {
    actions = `<small class="cq-lock">🔒 Нужен ${item.minLevel} уровень (сейчас ${level})</small>`;
  }

  return `
    <article class="cq-card status-${item.status} tier-${item.tier}" data-cq-card="${escapeHtml(item.to)}">
      <header>
        <div><small>${TIER_LABEL[item.tier] || ''} · ур. ${item.minLevel}</small><h3>${escapeHtml(item.title)}</h3></div>
        <span class="cq-status">${STATUS_LABEL[item.status] || ''}</span>
      </header>
      <p class="cq-desc">${escapeHtml(item.description)}</p>
      ${item.status === 'locked' || item.status === 'blocked' ? '' : `
      <blockquote class="cq-giver"><b>${escapeHtml(item.giver.icon)} ${escapeHtml(item.giver.name)}</b><small>${escapeHtml(item.giver.title)}</small>
        <p>${escapeHtml(item.status === 'ready' ? item.outro : item.intro)}</p></blockquote>`}
      ${active || item.status === 'available' ? `<ul class="cq-steps">${item.steps.map(stepRow).join('')}</ul>` : ''}
      ${item.status === 'mastered' ? '' : `<div class="cq-reward"><small>Награда</small><strong>${escapeHtml(rewardText(item.reward))}</strong></div>`}
      <div class="cq-actions">${actions}</div>
    </article>`;
}

export async function openClassQuests({ api, renderState, haptic, statusElement }) {
  let state = await api('/api/class-quests');
  let pending = false;
  let feedbackText = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay class-quests-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass cq-panel">
      <header class="cq-head">
        <button class="overlay-close cq-round" type="button" aria-label="Закрыть">←</button>
        <h2>Профессии</h2>
        <span class="cq-round" aria-hidden="true">🎓</span>
      </header>
      <div data-cq-content></div>
      <div class="cq-feedback" data-cq-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-cq-content]');
  const feedback = overlay.querySelector('[data-cq-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  async function act(action, to) {
    if (pending) return;
    pending = true;
    haptic('medium');
    try {
      const payload = await api('/api/class-quests', { method: 'POST', body: JSON.stringify({ action, to }) });
      state = payload.quests;
      if (payload.state) renderState(payload.state);
      if (action === 'promote') {
        feedbackText = `Ты стал: ${payload.classTitle}! Новые навыки уже в списке.`;
        statusElement.textContent = `Профессия: ${payload.classTitle}.`;
        haptic('heavy');
      } else {
        feedbackText = { start: 'Задание взято. Сражайся с боссами!', pay: 'Плата принята.', abandon: 'Задание отменено.' }[action] || '';
      }
    } catch (error) {
      if (error.payload?.quests) state = error.payload.quests;
      feedbackText = REASONS[error.payload?.reason] || error.message;
      haptic('light');
    } finally {
      pending = false;
      render();
    }
  }

  function render() {
    const inv = state.inventory || {};
    const body = state.needsBaseClass
      ? '<div class="cq-empty">Сначала выбери класс в разделе «Персонаж».</div>'
      : state.maxTier
        ? '<div class="cq-empty">🏆 Ты достиг высшей профессии. Теперь улучшай навыки и их пути.</div>'
        : state.promotions.length
          ? state.promotions.map(item => promotionCard(item, state.level)).join('')
          : '<div class="cq-empty">Для этого класса профессий нет.</div>';

    content.innerHTML = `
      <section class="cq-summary">
        <span class="cq-portrait" style="--art:url('${menuArtFor('profile', { className: state.className })}')" aria-hidden="true"></span>
        <div><small>Класс · ${state.tier}-й ранг</small><strong>${escapeHtml(state.classTitle)}</strong>
        <em>2-я профессия — с 20 уровня, 3-я — с 40. Задания выполняются в боях с боссами.</em></div>
      </section>
      <div class="cq-resources"><span>🪙 ${formatNumber(inv.gold)}</span><span>💎 ${formatNumber(inv.crystals)}</span><span>✦ ${formatNumber(inv.sp)} ОП</span></div>
      <div class="cq-list">${body}</div>`;
    feedback.textContent = feedbackText;
    content.querySelectorAll('[data-cq-action]').forEach(button => {
      button.addEventListener('click', () => act(button.dataset.cqAction, button.dataset.cqTo));
    });
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  statusElement.textContent = `Профессии: ${state.classTitle}`;
}
