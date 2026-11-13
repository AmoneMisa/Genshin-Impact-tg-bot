import {dialogHeading} from './dialog-heading.js';
import { bar, escapeHtml, formatNumber } from './boss-hud.js';
import { icon } from './icons.js';
import { classArtUrl } from './boss-stage.js';
import {L2_UI_ART,l2IconHtml} from './art/l2-icon-art.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {openDetailDialog} from './detail-dialog.js';
import {confirmDialog} from './confirm-dialog.js';

// Parties of up to nine players. Ordinary buffs require selecting each recipient.

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
  installOverlayA11y();
  let state = await api('/api/party');
  let pending = false, feedback = '', memberId = null, detail = null;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay party-overlay character-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel l2-status-window character-panel party-panel">
      ${dialogHeading('Группа').replace('data-dismiss', 'class="overlay-close" data-dismiss')}
      <div class="character-scroll" data-party-content></div>
      <p class="party-feedback" data-party-feedback role="status" hidden></p>
    </div>`;
  const content = overlay.querySelector('[data-party-content]');
  const feedbackNode = overlay.querySelector('[data-party-feedback]');
  let poll = 0;
  const closeDetail = () => { memberId = null; detail?.close(); detail = null; };
  const close = () => {
    window.clearInterval(poll);
    closeDetail();
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
  const lootIcon = mode => mode === 'turn' ? icon('rotate-cw') : l2IconHtml(L2_UI_ART['loot-' + mode]);
  const section = (title, html, note = '') => `<section class="character-section"><h3>${escapeHtml(title)}${note ? ` <small>${escapeHtml(note)}</small>` : ''}</h3><div class="character-section-body">${html}</div></section>`;
  const row = (label, value) => `<div class="character-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
  const vitals = member => `<span class="ui-party-vitals" role="group" aria-label="CP ${Number(member.cp) || 0}, HP ${Number(member.hp) || 0}, MP ${Number(member.mp) || 0}">${['cp', 'hp', 'mp'].map(kind => bar(kind, member[kind] || 0, member['max' + kind[0].toUpperCase() + kind.slice(1)] || 1, { text: '', variant: 'l2' })).join('')}</span>`;

  // A member is one row; leadership and removal live in the selected member's menu.
  function memberHtml(member) {
    return `<button type="button" class="ui-button ui-choice-row compact party-row ${member.me ? 'me' : ''}" data-party-member="${escapeHtml(member.userId)}" aria-label="${escapeHtml(member.name)}${member.leader ? ' · Лидер' : ''}">
      <img src="${classArtUrl(member.className, member.gender)}" alt="" width="32" height="32">
      <span class="party-row-body"><strong>${escapeHtml(member.name)}${member.leader ? ' ' + l2IconHtml(L2_UI_ART.leader) : ''}</strong><small>${escapeHtml(member.classTitle)} · ${formatNumber(member.level)} ур.</small>${vitals(member)}</span>
    </button>`;
  }

  function memberDetailHtml(member, party) {
    const stats = row('Класс', `${member.classTitle} · ${formatNumber(member.level)} ур.`)
      + row('CP', `${formatNumber(member.cp || 0)} / ${formatNumber(member.maxCp || 0)}`)
      + row('HP', `${formatNumber(member.hp)} / ${formatNumber(member.maxHp)}`)
      + row('MP', `${formatNumber(member.mp)} / ${formatNumber(member.maxMp)}`);
    const actions = party.amLeader && !member.me
      ? `<div class="ui-action-stack"><button type="button" class="ui-button" data-party-transfer="${escapeHtml(member.userId)}" ${pending ? 'disabled' : ''}>Передать лидерство</button><button type="button" class="ui-button" data-party-kick="${escapeHtml(member.userId)}" ${pending ? 'disabled' : ''}>Исключить из группы</button></div>` : '';
    return `<div class="ui-stat-table">${stats}</div>${member.leader ? '<p class="character-empty">Лидер группы.</p>' : ''}${actions}`;
  }

  function showMember(id) {
    const member = state.party?.members.find(m => String(m.userId) === String(id));
    if (!member) { closeDetail(); return; }
    memberId = member.userId;
    if (detail?.open) { detail.update(member.name, memberDetailHtml(member, state.party)); return; }
    detail = openDetailDialog({
      owner: overlay, title: member.name, html: memberDetailHtml(member, state.party),
      onAction: async button => {
        if (button.dataset.partyTransfer) {
          if (await confirmDialog({ owner: overlay, title: 'Передать лидерство', text: `Сделать лидером игрока ${member.name}?`, confirmLabel: 'Передать' })) act('transfer', { userId: button.dataset.partyTransfer });
        }
        if (button.dataset.partyKick) {
          if (await confirmDialog({ owner: overlay, title: 'Исключить из группы', text: `Исключить игрока ${member.name} из группы?`, confirmLabel: 'Исключить' })) act('kick', { userId: button.dataset.partyKick });
        }
      },
      onClose: () => { memberId = null; detail = null; },
    });
  }

  function invitesHtml() {
    if (!state.invites.length) return '';
    return section('Приглашения', state.invites.map(invite => `<div class="ui-inline-content party-invite"><span>${escapeHtml(invite.fromName)} · ${invite.size} в группе</span>
      <span class="ui-control-row"><button type="button" class="ui-button primary" data-party-accept="${escapeHtml(invite.partyId)}">Принять</button><button type="button" class="ui-button" data-party-decline="${escapeHtml(invite.partyId)}">Отклонить</button></span></div>`).join(''), String(state.invites.length));
  }

  // Candidates open on request; a row invites that player, an invited player shows a state.
  function candidatesHtml(party) {
    if (!state.candidates.length) return '<p class="character-empty">Некого приглашать: все игроки чата уже в группах.</p>';
    const full = party.members.length >= state.max;
    return `<details class="ui-disclosure party-candidates"><summary>Пригласить игрока · ${party.members.length} / ${state.max}</summary>${full ? '<p class="character-empty">Группа заполнена.</p>' : ''}<div class="ui-choice-list">${state.candidates.map(candidate => candidate.invited || full
      ? `<div class="ui-inline-content party-candidate"><span>${escapeHtml(candidate.name)} · ${formatNumber(candidate.level)} ур.</span><small>${candidate.invited ? 'Приглашён' : ''}</small></div>`
      : `<button type="button" class="ui-button ui-choice-row compact" data-party-invite="${escapeHtml(candidate.userId)}"><span>${escapeHtml(candidate.name)} · ${formatNumber(candidate.level)} ур.<small>Пригласить в группу</small></span></button>`).join('')}</div></details>`;
  }

  function render() {
    const party = state.party;
    const opened = content.querySelector('.party-candidates')?.open;
    const scroll = content.scrollTop;
    if (!party) {
      content.innerHTML = invitesHtml() + section('Группа', `<div class="party-empty"><p class="character-empty">Ты не в группе. Создай группу до ${state.max} игроков: баффы накладываются вручную на выбранного участника. Стоимость MP не зависит от размера группы.</p>
        <button type="button" class="ui-button primary" data-party-action="create" ${pending ? 'disabled' : ''}>Создать группу</button></div>`);
    } else {
      const loot = party.amLeader
        ? `<div class="ui-control-row" role="group" aria-label="Распределение добычи">${state.lootModes.map(mode => `<button type="button" class="ui-button ${party.loot === mode ? 'active' : ''}" aria-pressed="${party.loot === mode}" data-party-loot="${mode}">${lootIcon(mode)} ${LOOT_LABELS[mode][0]}</button>`).join('')}</div>`
        : `<div class="ui-stat-table">${row('Режим', LOOT_LABELS[party.loot][0])}</div>`;
      content.innerHTML = invitesHtml()
        + section('Состав', `<div class="ui-choice-list party-members">${party.members.map(memberHtml).join('')}</div>`, `${party.members.length} / ${state.max}`)
        + section('Добыча', `${loot}<p class="character-empty">${LOOT_LABELS[party.loot][1]} Адена делится поровну.</p>`)
        + (party.amLeader ? `<section class="character-section">${candidatesHtml(party)}</section>` : '')
        + `<div class="ui-control-row party-exit"><button type="button" class="ui-button" data-party-action="leave">Покинуть группу</button>${party.amLeader ? '<button type="button" class="ui-button" data-party-action="disband">Распустить</button>' : ''}</div>`;
      if (opened) content.querySelector('.party-candidates')?.setAttribute('open', '');
    }
    content.scrollTop = scroll;
    feedbackNode.hidden = !feedback;
    feedbackNode.textContent = feedback;
    if (memberId) showMember(memberId);
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
      if (action === 'kick' || action === 'transfer') closeDetail();
    } catch (error) {
      if (error.payload?.party) state = error.payload.party;
      feedback = REASONS[error.payload?.reason] || error.message;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
      render();
    }
  }

  content.addEventListener('click', async event => {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const data = button.dataset;
    if (data.partyMember) { haptic('light'); showMember(data.partyMember); return; }
    if (data.partyAction === 'disband' && !await confirmDialog({ owner: overlay, title: 'Распустить группу', text: 'Группа распадётся для всех участников.', confirmLabel: 'Распустить' })) return;
    if (data.partyAction) act(data.partyAction);
    if (data.partyLoot) act('loot', { mode: data.partyLoot });
    if (data.partyInvite) act('invite', { userId: data.partyInvite });
    if (data.partyAccept) act('accept', { partyId: data.partyAccept });
    if (data.partyDecline) act('decline', { partyId: data.partyDecline });
  });

  // Members' HP/MP and invitations change from outside: refresh while the screen is open.
  poll = window.setInterval(async () => {
    if (pending || document.hidden) return;
    try { state = await api('/api/party'); render(); } catch { /* the next tick tries again */ }
  }, 5000);

  document.body.append(overlay);
  render();
  requestAnimationFrame(() => overlay.classList.add('visible'));
  if (statusElement) statusElement.textContent = 'Группа';
}
