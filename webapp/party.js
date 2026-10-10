import { bar, escapeHtml, formatNumber } from './boss-hud.js';
import { icon } from './icons.js';
import { classArtUrl } from './boss-stage.js';
import {L2_UI_ART,l2IconHtml} from './art/l2-icon-art.js';

// Parties of up to nine players of the chat. A buff cast by a member (class buffs and buff skills) reaches the
// whole party; the leader invites, kicks and disbands.

const REASONS = {
  already_in_party: 'Ты уже в группе.',
  no_party: 'Ты не состоишь в группе.',
  not_leader: 'Это может только лидер группы.',
  unknown_player: 'Игрок недоступен.',
  already_member: 'Игрок уже в вашей группе.',
  target_in_party: 'Игрок уже состоит в другой группе.',
  party_full: 'В группе уже 9 игроков.',
  no_invite: 'Приглашение устарело.',
  party_gone: 'Группа уже распалась.',
  not_member: 'Игрока нет в группе.',
  invalid_target: 'Нельзя выбрать себя.',
  invalid_loot_mode: 'Такого режима добычи нет.',
};

export async function openPartyGame({ api, haptic, statusElement }) {
  let state = await api('/api/party');
  let pending = false;
  let feedback = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay party-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass party-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Группа</h2>
        <span class="ds-round" aria-hidden="true"><img class="mat-icon" src="/art/icons/party-emblem-128.webp" srcset="/art/icons/party-emblem-128.webp 1x, /art/icons/party-emblem-256.webp 2x" width="24" height="24" alt=""></span>
      </header>
      <div data-party-content></div>
      <div class="boss-feedback" data-party-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-party-content]');
  const feedbackNode = overlay.querySelector('[data-party-feedback]');
  let poll = 0;
  const close = () => {
    window.clearInterval(poll);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const LOOT_LABELS = {
    finders: ['Нашедшему', 'Добыча достаётся тому, кто убил монстра.'],
    random: ['Случайно', 'Каждый предмет получает случайный игрок группы.'],
    turn: ['По очереди', 'Предметы раздаются участникам по кругу.'],
  };
  const costText = count => `×${(1 + state.costStep * Math.max(0, count - 1)).toFixed(2)}`;

  function memberHtml(member, amLeader) {
    return `<article class="party-member ${member.me ? 'me' : ''}">
      <img src="${classArtUrl(member.className, member.gender)}" alt="" width="44" height="44">
      <div class="party-member-body">
        <strong>${escapeHtml(member.name)}${member.leader ? ' '+l2IconHtml(L2_UI_ART.leader) : ''}</strong>
        <small>${escapeHtml(member.classTitle)} · ${formatNumber(member.level)} ур.</small>
        ${bar('cp', member.cp||0, member.maxCp||1, { label: 'CP' })}
        ${bar('hp', member.hp, member.maxHp, { label: 'HP' })}
        ${bar('mp', member.mp, member.maxMp, { label: 'MP' })}
      </div>
      ${amLeader && !member.me ? `<div class="party-member-actions"><button type="button" class="equipment-action" data-party-transfer="${escapeHtml(member.userId)}">Передать лидерство</button><button type="button" class="equipment-action party-kick" data-party-kick="${escapeHtml(member.userId)}">Исключить</button></div>` : ''}
    </article>`;
  }

  function invitesHtml() {
    if (!state.invites.length) return '';
    return `<section class="mmo-frame party-invites"><div class="mmo-section-title"><strong>Приглашения</strong><small>${state.invites.length}</small></div>${state.invites.map(invite => `
      <div class="party-invite"><span>${escapeHtml(invite.fromName)} · ${invite.size} в группе</span>
        <button type="button" class="equipment-action forge-action" data-party-accept="${escapeHtml(invite.partyId)}">Принять</button>
        <button type="button" class="equipment-action" data-party-decline="${escapeHtml(invite.partyId)}">Отклонить</button></div>`).join('')}</section>`;
  }

  function candidatesHtml(party) {
    if (!state.candidates.length) return party.amLeader ? '<p class="party-note">Некого приглашать: все игроки чата уже в группах.</p>' : '';
    return `<section class="mmo-frame party-candidates"><div class="mmo-section-title"><strong>Пригласить</strong><small>${party.members.length} / ${state.max}</small></div>${state.candidates.map(candidate => `
      <div class="party-candidate"><span>${escapeHtml(candidate.name)} · ${formatNumber(candidate.level)} ур.</span>
        <button type="button" class="equipment-action" data-party-invite="${escapeHtml(candidate.userId)}" ${candidate.invited || party.members.length >= state.max ? 'disabled' : ''}>${candidate.invited ? 'Приглашён' : 'Позвать'}</button></div>`).join('')}</section>`;
  }

  function render() {
    const party = state.party;
    let body;
    if (!party) {
      body = `${invitesHtml()}<section class="mmo-frame party-empty"><p>Ты не в группе. Создай группу до ${state.max} игроков: бафф, который ты применяешь, получат все её участники (стоимость MP растёт на ${Math.round(state.costStep * 100)}% за каждого).</p>
        <button type="button" class="equipment-action forge-action" data-party-action="create">Создать группу</button></section>`;
    } else {
      body = `${invitesHtml()}<section class="mmo-frame party-roster"><div class="mmo-section-title"><strong>Состав</strong><small>${party.members.length} / ${state.max} · бафф ${costText(party.members.length)} MP</small></div>
          <div class="party-members">${party.members.map(member => memberHtml(member, party.amLeader)).join('')}</div></section>
        <section class="mmo-frame party-loot"><div class="mmo-section-title"><strong>Добыча</strong><small>адена делится поровну</small></div>
          ${party.amLeader
            ? `<div class="party-loot-modes">${state.lootModes.map(mode => `<button type="button" class="equipment-filter ${party.loot === mode ? 'active' : ''}" data-party-loot="${mode}">${mode==='turn'?icon('rotate-cw'):l2IconHtml(L2_UI_ART['loot-'+mode])} ${LOOT_LABELS[mode][0]}</button>`).join('')}</div>`
            : `<strong>${party.loot==='turn'?icon('rotate-cw'):l2IconHtml(L2_UI_ART['loot-'+party.loot])} ${LOOT_LABELS[party.loot][0]}</strong>`}
          <p class="party-note">${LOOT_LABELS[party.loot][1]}</p></section>
        ${party.amLeader ? candidatesHtml(party) : ''}
        <div class="party-actions">
          <button type="button" class="equipment-action" data-party-action="leave">Покинуть группу</button>
          ${party.amLeader ? '<button type="button" class="equipment-action" data-party-action="disband">Распустить</button>' : ''}
        </div>`;
    }
    content.innerHTML = body;
    feedbackNode.textContent = feedback;
    bind();
  }

  async function act(action, extra = {}) {
    if (pending) return;
    pending = true;
    overlay.classList.add('busy');
    haptic('light');
    try {
      const payload = await api('/api/party/action', { method: 'POST', body: JSON.stringify({ action, ...extra }) });
      state = payload.party;
      feedback = '';
    } catch (error) {
      if (error.payload?.party) state = error.payload.party;
      feedback = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  function bind() {
    content.querySelectorAll('[data-party-transfer]').forEach(button=>button.addEventListener('click',()=>act('transfer',{userId:button.dataset.partyTransfer})));
    content.querySelectorAll('[data-party-action]').forEach(button => button.addEventListener('click', () => act(button.dataset.partyAction)));
    content.querySelectorAll('[data-party-loot]').forEach(button => button.addEventListener('click', () => act('loot', { mode: button.dataset.partyLoot })));
    content.querySelectorAll('[data-party-invite]').forEach(button => button.addEventListener('click', () => act('invite', { userId: button.dataset.partyInvite })));
    content.querySelectorAll('[data-party-kick]').forEach(button => button.addEventListener('click', () => act('kick', { userId: button.dataset.partyKick })));
    content.querySelectorAll('[data-party-accept]').forEach(button => button.addEventListener('click', () => act('accept', { partyId: button.dataset.partyAccept })));
    content.querySelectorAll('[data-party-decline]').forEach(button => button.addEventListener('click', () => act('decline', { partyId: button.dataset.partyDecline })));
  }

  // Members' HP/MP and invitations change from outside: refresh while the screen is open.
  poll = window.setInterval(async () => {
    if (pending || document.hidden) return;
    try { state = await api('/api/party'); render(); } catch { /* the next tick tries again */ }
  }, 5000);

  document.body.append(overlay);
  render();
  requestAnimationFrame(()=>overlay.classList.add('visible'));
  if (statusElement) statusElement.textContent = 'Группа';
}
