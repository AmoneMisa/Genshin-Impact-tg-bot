import { escapeHtml } from './escape-html.js';
import { rewardsHtml } from './mail.js';

// Admin screen (only offered to the bot owner): promo codes, hello popups and the
// owner tools that used to be text commands.

const KINDS = [['gold', '🪙 Золото'], ['crystals', '💎 Кристаллы'], ['luckCoins', '🍀 Монеты удачи'], ['ironOre', '⛏️ Железная руда'], ['bonusChances', '🎁 Попытки бонуса']];

const toMs = value => (value ? new Date(value).getTime() : null);
const dateText = ms => (ms ? new Date(ms).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export async function openAdminGame({ api, haptic }) {
  let data = await api('/api/admin');
  let tab = 'promo';
  let tools = null;
  let selectedPlayer = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay admin-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass feedback-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Админка</h2>
        <span class="ds-round" aria-hidden="true">🛠️</span>
      </header>
      <nav class="fr-tabs"><button type="button" data-admin-tab="promo">Промокоды</button><button type="button" data-admin-tab="notice">Объявления</button><button type="button" data-admin-tab="tools">Инструменты</button></nav>
      <div data-admin-body></div>
      <div class="feedback-result" data-admin-result hidden></div>
    </div>`;
  const body = overlay.querySelector('[data-admin-body]');
  const result = overlay.querySelector('[data-admin-result]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function say(kind, text) {
    result.hidden = false;
    result.className = `feedback-result ${kind}`;
    result.textContent = text;
  }

  async function post(path, payload, okText) {
    try {
      haptic?.('medium');
      const response = await api(path, { method: 'POST', body: JSON.stringify(payload) });
      data = { ...data, ...response };
      say('success', okText);
      return true;
    } catch (error) {
      if (error.payload?.promos) data.promos = error.payload.promos;
      if (error.payload?.notices) data.notices = error.payload.notices;
      const reason = { code_exists: 'Такой код уже существует.', not_found: 'Не найдено.', too_many: 'Слишком много объявлений.' }[error.payload?.reason];
      say('error', error.payload?.error || reason || error.message);
      return false;
    } finally {
      render();
    }
  }

  function promoHtml() {
    return `
      <div class="feedback-card">
        <label class="feedback-field"><span>Код</span><input type="text" maxlength="40" autocapitalize="characters" data-p-code placeholder="SPRING2026" /></label>
        <div class="admin-rewards">${KINDS.map(([kind, label]) => `
          <label class="feedback-field"><span>${label}</span><input type="number" min="0" step="1" inputmode="numeric" data-p-reward="${kind}" placeholder="0" /></label>`).join('')}
        </div>
        <label class="feedback-field"><span>Начало (необязательно)</span><input type="datetime-local" data-p-start /></label>
        <label class="feedback-field"><span>Окончание (необязательно)</span><input type="datetime-local" data-p-end /></label>
        <label class="feedback-field"><span>Лимит использований (пусто — без лимита)</span><input type="number" min="1" step="1" inputmode="numeric" data-p-max /></label>
        <button type="button" class="feedback-submit" data-p-create>Создать промокод</button>
      </div>
      <div class="mail-list">${data.promos.length ? data.promos.map(promo => `
        <article class="mail-letter ${promo.deleted ? 'claimed' : 'pending'}">
          <div class="mail-head"><strong>${escapeHtml(promo.code)}</strong><small>${promo.deleted ? 'удалён' : `${promo.uses}${promo.maxUses ? ` / ${promo.maxUses}` : ''} исп.`}</small></div>
          <div class="mail-rewards">${rewardsHtml(promo.rewards)}</div>
          <small>с ${dateText(promo.startsAt)} до ${dateText(promo.expiresAt)}</small>
          ${promo.deleted ? '' : `<div class="admin-row">
            <input type="datetime-local" data-p-expiry-input="${escapeHtml(promo.code)}" />
            <button type="button" class="fr-btn ghost" data-p-expiry="${escapeHtml(promo.code)}">Срок</button>
            <button type="button" class="fr-btn ghost" data-p-delete="${escapeHtml(promo.code)}">Удалить</button>
          </div>`}
        </article>`).join('') : '<p class="mail-empty">Промокодов нет.</p>'}</div>`;
  }

  function noticeHtml() {
    return `
      <div class="feedback-card">
        <label class="feedback-field"><span>Заголовок</span><input type="text" maxlength="80" data-n-title /></label>
        <label class="feedback-field"><span>Текст</span><textarea rows="4" maxlength="1000" data-n-body></textarea></label>
        <label class="feedback-field"><span>Начало (необязательно)</span><input type="datetime-local" data-n-start /></label>
        <label class="feedback-field"><span>Окончание (необязательно)</span><input type="datetime-local" data-n-end /></label>
        <button type="button" class="feedback-submit" data-n-create>Опубликовать</button>
      </div>
      <div class="mail-list">${data.notices.length ? data.notices.map(notice => `
        <article class="mail-letter pending">
          <div class="mail-head"><strong>${escapeHtml(notice.title)}</strong><small>${notice.active ? 'активно' : 'выключено'}</small></div>
          <p>${escapeHtml(notice.body)}</p>
          <small>с ${dateText(notice.startsAt)} до ${dateText(notice.endsAt)}</small>
          <div class="admin-row">
            <button type="button" class="fr-btn ghost" data-n-toggle="${escapeHtml(notice.id)}">${notice.active ? 'Выключить' : 'Включить'}</button>
            <button type="button" class="fr-btn ghost" data-n-delete="${escapeHtml(notice.id)}">Удалить</button>
          </div>
        </article>`).join('') : '<p class="mail-empty">Объявлений нет.</p>'}</div>`;
  }

  function optionHtml(player) {
    return `<option value="${escapeHtml(player.userId)}" ${player.userId === selectedPlayer ? 'selected' : ''}>${escapeHtml(player.name)}</option>`;
  }

  function toolsHtml() {
    if (!tools) return '<p class="mail-empty">Загрузка…</p>';
    return `
      <div class="feedback-card">
        <h4>Игрок этого чата</h4>
        <label class="feedback-field"><span>Игрок</span><select data-t-player>${tools.players.map(optionHtml).join('')}</select></label>
        <label class="feedback-field"><span>Количество (для добавления; можно отрицательное)</span><input type="number" step="1" inputmode="numeric" data-t-amount placeholder="100" /></label>
        <div class="admin-tools">${tools.playerTools.map(tool => `<button type="button" class="fr-btn ghost" data-t-player-tool="${escapeHtml(tool.id)}" data-t-needs-amount="${tool.amountLabel ? '1' : ''}">${escapeHtml(tool.label)}</button>`).join('')}</div>
      </div>
      <div class="feedback-card">
        <h4>Этот чат</h4>
        <div class="admin-tools">${tools.chatTools.map(tool => `<button type="button" class="fr-btn ghost" data-t-chat-tool="${escapeHtml(tool.id)}">${escapeHtml(tool.label)}</button>`).join('')}</div>
      </div>
      <div class="feedback-card">
        <h4>Весь бот</h4>
        <label class="feedback-field"><span>Текст рассылки</span><textarea rows="3" maxlength="3500" data-t-text placeholder="Новости для подписчиков"></textarea></label>
        <div class="admin-tools">${tools.globalTools.map(tool => `<button type="button" class="fr-btn ghost" data-t-global-tool="${escapeHtml(tool.id)}">${escapeHtml(tool.label)}</button>`).join('')}</div>
      </div>`;
  }

  async function runTool(payload, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      haptic?.('medium');
      const response = await api('/api/admin/tools', { method: 'POST', body: JSON.stringify(payload) });
      say('success', response.message);
    } catch (error) {
      say('error', error.payload?.error || error.message);
    }
  }

  async function loadTools() {
    try {
      tools = await api('/api/admin/tools');
      selectedPlayer ||= tools.players[0]?.userId || '';
    } catch (error) {
      say('error', error.message);
      tools = { players: [], playerTools: [], chatTools: [], globalTools: [] };
    }
    render();
  }

  function bindTools() {
    const player = body.querySelector('[data-t-player]');
    player?.addEventListener('change', () => { selectedPlayer = player.value; });
    body.querySelectorAll('[data-t-player-tool]').forEach(button => button.addEventListener('click', () => {
      const amount = body.querySelector('[data-t-amount]').value;
      if (button.dataset.tNeedsAmount && amount === '') return say('error', 'Введи количество.');
      runTool({ scope: 'player', userId: player.value, action: button.dataset.tPlayerTool, amount: button.dataset.tNeedsAmount ? Number(amount) : undefined });
    }));
    body.querySelectorAll('[data-t-chat-tool]').forEach(button => button.addEventListener('click', () => {
      runTool({ scope: 'chat', action: button.dataset.tChatTool }, `${button.textContent}?`);
    }));
    body.querySelectorAll('[data-t-global-tool]').forEach(button => button.addEventListener('click', () => {
      const text = body.querySelector('[data-t-text]').value;
      runTool({ scope: 'global', action: button.dataset.tGlobalTool, text }, `${button.textContent}? Это затронет всех игроков.`);
    }));
  }

  function render() {
    overlay.querySelectorAll('[data-admin-tab]').forEach(button => button.classList.toggle('active', button.dataset.adminTab === tab));
    body.innerHTML = tab === 'promo' ? promoHtml() : tab === 'notice' ? noticeHtml() : toolsHtml();
    if (tab === 'tools') bindTools();

    body.querySelector('[data-p-create]')?.addEventListener('click', () => {
      const rewards = [...body.querySelectorAll('[data-p-reward]')]
        .map(input => ({ kind: input.dataset.pReward, amount: Number(input.value) }))
        .filter(reward => reward.amount > 0);
      const max = body.querySelector('[data-p-max]').value;
      post('/api/admin/promo', {
        code: body.querySelector('[data-p-code]').value,
        rewards,
        startsAt: toMs(body.querySelector('[data-p-start]').value),
        expiresAt: toMs(body.querySelector('[data-p-end]').value),
        maxUses: max === '' ? null : Number(max),
      }, 'Промокод создан.');
    });
    body.querySelectorAll('[data-p-delete]').forEach(button => button.addEventListener('click', () => {
      if (window.confirm(`Удалить промокод ${button.dataset.pDelete}?`)) post('/api/admin/promo', { action: 'delete', code: button.dataset.pDelete }, 'Промокод удалён.');
    }));
    body.querySelectorAll('[data-p-expiry]').forEach(button => button.addEventListener('click', () => {
      const input = body.querySelector(`[data-p-expiry-input="${CSS.escape(button.dataset.pExpiry)}"]`);
      post('/api/admin/promo', { action: 'expiry', code: button.dataset.pExpiry, expiresAt: toMs(input.value) }, 'Срок обновлён.');
    }));

    body.querySelector('[data-n-create]')?.addEventListener('click', () => {
      post('/api/admin/notice', {
        title: body.querySelector('[data-n-title]').value,
        body: body.querySelector('[data-n-body]').value,
        startsAt: toMs(body.querySelector('[data-n-start]').value),
        endsAt: toMs(body.querySelector('[data-n-end]').value),
      }, 'Объявление опубликовано.');
    });
    body.querySelectorAll('[data-n-delete]').forEach(button => button.addEventListener('click', () => {
      if (window.confirm('Удалить объявление?')) post('/api/admin/notice', { action: 'delete', id: button.dataset.nDelete }, 'Объявление удалено.');
    }));
    body.querySelectorAll('[data-n-toggle]').forEach(button => button.addEventListener('click', () => {
      const notice = data.notices.find(item => item.id === button.dataset.nToggle);
      post('/api/admin/notice', { ...notice, active: !notice.active }, notice.active ? 'Объявление выключено.' : 'Объявление включено.');
    }));
  }

  overlay.querySelectorAll('[data-admin-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.adminTab; result.hidden = true; render(); if (tab === 'tools' && !tools) loadTools(); }));
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  render();
}
