import { escapeHtml } from './escape-html.js';
// Friends / clanmates (prototype "Друзья / Соклановцы") and the public player
// card ("Чужой персонаж"): portrait, clan, gear on the paper doll, stats and a
// "Написать" link into Telegram.

import { menuArtFor } from './menu-art.js';

import {openTradeGame} from './trade.js';

const REASONS = {
  already_friend: 'Этот игрок уже в друзьях.',
  not_friend: 'Этого игрока уже нет в друзьях.',
  unknown_player: 'Игрок больше не найден в этом чате.',
  self: 'Нельзя добавить самого себя.',
  too_many: 'Список друзей заполнен.',
  target_too_many: 'У этого игрока список друзей заполнен.',
  already_requested: 'Заявка уже отправлена.',
  no_request: 'Заявка больше не актуальна.',
};

const STATUS_TEXT = {
  friends: 'Теперь вы друзья.',
  requested: 'Заявка отправлена.',
  declined: 'Заявка отклонена.',
  cancelled: 'Заявка отозвана.',
  removed: 'Удалён из друзей.',
};

function friendLabel(card) {
  if (card.isFriend) return 'Удалить из друзей';
  if (card.requestState === 'incoming') return 'Принять заявку';
  if (card.requestState === 'outgoing') return 'Отозвать заявку';
  return 'Добавить в друзья';
}

function formatNumber(value) { return new Intl.NumberFormat('ru-RU').format(Number(value) || 0); }

export function portraitFor(person) {
  return menuArtFor('profile', { className: person?.className, gender: person?.gender });
}

/** Telegram link to message a player, when they have a public username. */
export function chatLink(person) {
  return person?.username ? `https://t.me/${encodeURIComponent(person.username)}` : null;
}

function openChat(person, haptic) {
  const url = chatLink(person);
  if (!url) return;
  haptic?.('light');
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) tg.openTelegramLink(url);
  else window.open(url, '_blank', 'noopener');
}

export function friendRowHtml(person, { action = 'chat' } = {}) {
  const link = chatLink(person);
  const id = escapeHtml(person.userId);
  const name = escapeHtml(person.name);
  const button = action === 'request'
    ? `<span class="fr-actions"><button type="button" class="fr-icon add" data-fr-accept="${id}" aria-label="Принять ${name}">✓</button><button type="button" class="fr-icon" data-fr-decline="${id}" aria-label="Отклонить ${name}">✕</button></span>`
    : action === 'cancel'
    ? `<button type="button" class="fr-icon" data-fr-cancel="${id}" aria-label="Отозвать заявку ${name}">↩</button>`
    : action === 'add'
    ? `<button type="button" class="fr-icon add" data-fr-add="${escapeHtml(person.userId)}" aria-label="Добавить ${escapeHtml(person.name)} в друзья">＋</button>`
    : `<button type="button" class="fr-icon" data-fr-chat="${escapeHtml(person.userId)}" ${link ? '' : 'disabled'} aria-label="Написать ${escapeHtml(person.name)}">💬</button>`;
  return `
    <article class="fr-row" data-fr-open="${escapeHtml(person.userId)}" role="button" tabindex="0">
      <span class="fr-avatar ${person.online ? 'online' : ''}" style="--art:url('${portraitFor(person)}')"><i></i></span>
      <div class="fr-copy">
        <strong>${escapeHtml(person.name)}</strong>
        <small>Ур. ${formatNumber(person.level)}${person.classTitle ? ` · ${escapeHtml(person.classTitle)}` : ''}</small>
        <em class="${person.online ? 'online' : ''}">${escapeHtml(person.text || '')}</em>
      </div>
      ${button}
    </article>`;
}

export function statsHtml(stats = {}) {
  const rows = [
    ['❤️', 'Здоровье', stats.hp], ['🔷', 'Мана', stats.mp], ['🟡', 'CP', stats.cp],
    ['⚔️', 'Атака', stats.attack], ['🛡️', 'Защита', stats.defense], ['✦', 'Сила снаряжения', stats.gearScore], ['🗡️', 'Меч, мм', stats.sword],
  ];
  return `<div class="fr-stats">${rows.map(([icon, label, value]) => `<div><span>${icon}</span><small>${label}</small><strong>${formatNumber(value)}</strong></div>`).join('')}</div>`;
}

/** Another player's card, on top of whatever is open. Resolves once it is shown, with `{ closed }`. */
export async function openPlayerCard({ api, renderState, haptic = () => {}, userId, onChange = () => {} }) {
  let card = await api(`/api/player?userId=${encodeURIComponent(userId)}`);

  let pending = false;
  const overlay = document.createElement('section');
  overlay.className = 'game-overlay player-card-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel fr-panel player-card-panel">
      <header class="fr-head">
        <button class="overlay-close fr-round" type="button" aria-label="Назад">←</button>
        <h2>Игрок</h2>
        <span class="fr-round" aria-hidden="true">👤</span>
      </header>
      <div data-pc-body></div>
      <div class="fr-feedback" data-pc-feedback aria-live="polite"></div>
    </div>`;
  const body = overlay.querySelector('[data-pc-body]');
  const feedback = overlay.querySelector('[data-pc-feedback]');
  let resolveClosed;
  const closed = new Promise(resolve => { resolveClosed = resolve; });
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => { overlay.remove(); resolveClosed(); }, 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function render() {
    body.innerHTML = `
      <section class="pc-hero">
        <span class="fr-avatar big ${card.online ? 'online' : ''}" style="--art:url('${portraitFor(card)}')"><i></i></span>
        <div>
          <strong>${escapeHtml(card.name)}</strong>
          <small>Ур. ${formatNumber(card.level)}${card.classTitle ? ` · ${escapeHtml(card.classTitle)}` : ''}</small>
          ${card.clanName ? `<small class="pc-clan">&lt;${escapeHtml(card.clanName)}&gt;</small>` : ''}
          <em class="${card.online ? 'online' : ''}">${escapeHtml(card.text)}</em>
        </div>
      </section>
      ${card.isSelf ? '' : `
      <div class="fr-actions">
        <button type="button" class="fr-btn gold" data-pc-trade>Обмен</button>
        ${card.canInviteClan?'<button type="button" class="fr-btn gold" data-pc-clan>Пригласить в клан</button>':''}
        ${card.canInviteParty?'<button type="button" class="fr-btn gold" data-pc-party>Пригласить в группу</button>':''}
        ${card.canDuel?'<button type="button" class="fr-btn ghost" data-pc-duel>Кинуть дуэль</button>':''}
        <button type="button" class="fr-btn gold" data-pc-chat ${chatLink(card) ? '' : 'disabled'}>${chatLink(card) ? 'Написать' : 'Нет @username'}</button>
        <button type="button" class="fr-btn ${card.isFriend || card.requestState === 'outgoing' ? 'ghost' : 'blue'}" data-pc-friend>${friendLabel(card)}</button>
        ${card.requestState === 'incoming' ? '<button type="button" class="fr-btn ghost" data-pc-decline>Отклонить</button>' : ''}
      </div>`}`;
    body.querySelector('[data-pc-chat]')?.addEventListener('click', () => openChat(card, haptic));
    body.querySelector('[data-pc-trade]')?.addEventListener('click',()=>openTradeGame({api,renderState,haptic,targetId:card.userId}));
    body.querySelector('[data-pc-clan]')?.addEventListener('click',()=>interact('/api/clan/activity',{action:'invite',targetId:card.userId},'Игрок приглашён в клан.'));
    body.querySelector('[data-pc-party]')?.addEventListener('click',()=>interact('/api/party/action',{action:'invite',userId:card.userId},'Приглашение в группу отправлено.'));
    body.querySelector('[data-pc-duel]')?.addEventListener('click',()=>interact('/api/clan/activity',{action:'pvp_fight',opponentId:card.userId},'Дуэль завершена.'));
    body.querySelector('[data-pc-friend]')?.addEventListener('click', () => toggleFriend());
    body.querySelector('[data-pc-decline]')?.addEventListener('click', () => toggleFriend('decline'));
  }

  async function interact(url,payload,message){
    if(pending)return;pending=true;
    try{
      const result=await api(url,{method:'POST',body:JSON.stringify(payload)});
      if(result.state)renderState?.(result.state);
      feedback.textContent=result.message||result.result?.message||message;
      card=await api(`/api/player?userId=${encodeURIComponent(userId)}`);render();haptic('light');
    }catch(error){feedback.textContent=({not_leader:'Приглашать может только лидер группы.',party_full:'Группа заполнена.',target_in_party:'Игрок уже в группе.',owner_only:'Недостаточно прав в клане.',target_already_in_clan:'Игрок уже состоит в клане.',clan_full:'Клан заполнен.',pvp_cooldown:'Подожди до следующей дуэли.',pvp_opponent_no_class:'У соперника нет боевого класса.'})[error.payload?.reason]||error.message;}
    finally{pending=false;}
  }

  async function toggleFriend(forced) {
    if (pending) return;
    pending = true;
    haptic('medium');
    const action = forced || (card.isFriend ? 'remove' : card.requestState === 'incoming' ? 'accept'
      : card.requestState === 'outgoing' ? 'cancel' : 'add');
    try {
      const payload = await api('/api/social/friend', { method: 'POST', body: JSON.stringify({ userId: card.userId, action }) });
      card = {
        ...card,
        isFriend: payload.status === 'friends',
        requestState: payload.status === 'requested' ? 'outgoing' : null,
      };
      feedback.textContent = STATUS_TEXT[payload.status] || '';
      onChange(payload.social);
      render();
    } catch (error) {
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.social) onChange(error.payload.social);
    } finally {
      pending = false;
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  return { closed };
}

export async function openFriendsGame({ api, renderState, haptic, statusElement }) {
  let social = await api('/api/social');
  let tab = 'friends';
  let picking = false;
  let pending = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay friends-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel fr-panel">
      <header class="fr-head">
        <button class="overlay-close fr-round" type="button" aria-label="Закрыть">←</button>
        <h2>Друзья</h2>
        <button class="fr-round" type="button" data-fr-refresh aria-label="Обновить">↻</button>
      </header>
      <nav class="fr-tabs" data-fr-tabs></nav>
      <div data-fr-body></div>
      <div class="fr-feedback" data-fr-feedback aria-live="polite"></div>
    </div>`;
  const tabs = overlay.querySelector('[data-fr-tabs]');
  const body = overlay.querySelector('[data-fr-body]');
  const feedback = overlay.querySelector('[data-fr-feedback]');
  const close = () => { overlay.classList.add('closing'); window.setTimeout(() => overlay.remove(), 180); };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-fr-refresh]').addEventListener('click', async () => { haptic('light'); social = await api('/api/social'); render(); });

  function findPerson(userId) {
    return [...social.friends, ...social.clanmates, ...social.candidates].find(person => person.userId === String(userId));
  }

  function listHtml() {
    if (picking) {
      return `
        <p class="fr-hint">Игроки этого чата</p>
        <div class="fr-list">${social.candidates.length ? social.candidates.map(person => friendRowHtml(person, { action: 'add' })).join('') : '<p class="fr-empty">Некого добавлять: все игроки чата уже в друзьях или в заявках.</p>'}</div>
        <button type="button" class="fr-btn ghost" data-fr-pick-done>Готово</button>`;
    }
    if (tab === 'requests') {
      const incoming = social.incoming || [];
      const outgoing = social.outgoing || [];
      if (!incoming.length && !outgoing.length) return '<p class="fr-empty">Заявок нет.</p>';
      return `
        ${incoming.length ? `<p class="fr-hint">Входящие</p><div class="fr-list">${incoming.map(person => friendRowHtml(person, { action: 'request' })).join('')}</div>` : ''}
        ${outgoing.length ? `<p class="fr-hint">Отправленные</p><div class="fr-list">${outgoing.map(person => friendRowHtml(person, { action: 'cancel' })).join('')}</div>` : ''}`;
    }
    if (tab === 'clan') {
      if (!social.clanName) return '<p class="fr-empty">Ты пока не состоишь в клане.</p>';
      return `
        <p class="fr-hint">Клан «${escapeHtml(social.clanName)}» · в этом чате ${social.clanmates.length}</p>
        <div class="fr-list">${social.clanmates.length ? social.clanmates.map(person => friendRowHtml(person, { action: person.isFriend ? 'chat' : 'add' })).join('') : '<p class="fr-empty">Соклановцев в этом чате нет.</p>'}</div>`;
    }
    return `
      <div class="fr-list">${social.friends.length ? social.friends.map(person => friendRowHtml(person)).join('') : '<p class="fr-empty">Пока никого. Добавь игроков из этого чата.</p>'}</div>
      <button type="button" class="fr-btn gold" data-fr-pick>＋ Добавить друга</button>`;
  }

  function render() {
    const online = social.friends.filter(person => person.online).length;
    tabs.innerHTML = `
      <button type="button" data-fr-tab="friends" class="${tab === 'friends' ? 'active' : ''}">Друзья <small>${online}/${social.friends.length}</small></button>
      <button type="button" data-fr-tab="requests" class="${tab === 'requests' ? 'active' : ''}">Заявки${(social.incoming || []).length ? ` <small>${social.incoming.length}</small>` : ''}</button>
      <button type="button" data-fr-tab="clan"class="${tab === 'clan' ? 'active' : ''}">Соклановцы</button>`;
    body.innerHTML = listHtml();
    tabs.querySelectorAll('[data-fr-tab]').forEach(button => button.addEventListener('click', () => { tab = button.dataset.frTab; picking = false; haptic('light'); render(); }));
    body.querySelector('[data-fr-pick]')?.addEventListener('click', () => { picking = true; haptic('light'); render(); });
    body.querySelector('[data-fr-pick-done]')?.addEventListener('click', () => { picking = false; render(); });
    body.querySelectorAll('[data-fr-add]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); addFriend(button.dataset.frAdd, button); }));
    for (const action of ['accept', 'decline', 'cancel']) {
      body.querySelectorAll(`[data-fr-${action}]`).forEach(button => button.addEventListener('click', event => {
        event.stopPropagation();
        addFriend(button.getAttribute(`data-fr-${action}`), button, action);
      }));
    }
    body.querySelectorAll('[data-fr-chat]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); openChat(findPerson(button.dataset.frChat), haptic); }));
    body.querySelectorAll('[data-fr-open]').forEach(row => {
      const open = () => openPlayerCard({ api, renderState, haptic, userId: row.dataset.frOpen, onChange: next => { social = next; render(); } });
      row.addEventListener('click', open);
      row.addEventListener('keydown', event => { if (event.key === 'Enter') open(); });
    });
  }

  async function addFriend(userId, button, action = 'add') {
    if (pending) return;
    pending = true;
    button.classList.add('working');
    haptic('medium');
    try {
      const payload = await api('/api/social/friend', { method: 'POST', body: JSON.stringify({ userId, action }) });
      const name = findPerson(userId)?.name || 'Игрок';
      social = payload.social;
      feedback.textContent = payload.status === 'requested' ? `Заявка для ${name} отправлена.`
        : payload.status === 'friends' ? `${name} теперь в друзьях.` : (STATUS_TEXT[payload.status] || '');
      statusElement.textContent = 'Друзья: список обновлён.';
    } catch (error) {
      if (error.payload?.social) social = error.payload.social;
      feedback.textContent = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      render();
    }
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
