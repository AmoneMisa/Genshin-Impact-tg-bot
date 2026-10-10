import {l2SkillIcon} from './art/l2-extra-art.js';
import {materialIcon} from './material-icons.js';
import { escapeHtml } from './escape-html.js';
import { worldArtUrl } from './art/world-art.js';
const REASONS = {
  hall_auction_closed: 'Торги завершены или зал уже занят.',
  hall_clan_level: 'Для участия нужен клан 3 уровня.',
  hall_already_reserved: 'Клан может владеть одним залом или лидировать в одних торгах.',
  hall_bid_too_low: 'Ставка должна быть целым числом и не ниже следующей ставки.',
  hall_bid_clan_missing: 'Предыдущий клан недоступен. Ставка не списана.',
  hall_auction_reserved: 'Сначала дождись завершения торгов и аренды зала.',
  hall_max_level: 'Зал клана уже развит до максимума.',
  hall_not_enough_glory: 'Клану не хватает славы для следующего уровня зала.',
  no_glory_coins: 'У тебя нет монет славы.',
  already_in_clan: 'Ты уже состоишь в клане.',
  invalid_name: 'Название клана должно быть от 1 до 40 символов.',
  name_taken: 'Клан с таким названием уже существует.',
  invalid_clan: 'Некорректный клан.',
  clan_not_found: 'Клан не найден.',
  closed: 'Этот клан закрыт для вступления.',
  not_in_clan: 'Ты не состоишь в клане.',
  owner_cannot_leave: 'Глава не может покинуть клан — только расформировать его.',
  clan_full: 'В клане нет свободных мест.',
  unknown_player: 'Игрок не найден в этом чате.',
  owner_only: 'Это действие доступно только главе.',
  invalid_resource: 'Неизвестный ресурс.',
  invalid_amount: 'Введи целое положительное количество.',
  player_not_found: 'Игровой профиль не найден.',
  not_enough_resource: 'Недостаточно ресурса.',
  already_answered: 'Ты уже отвечал на сегодняшнюю викторину.',
  invalid_answer: 'Некорректный вариант ответа.',
  boss_already_summoned: 'Клановый босс уже призван.',
  boss_not_summoned: 'Сначала призови кланового босса.',
  boss_cooldown: 'Боец ещё восстанавливается после удара.',
  no_combat_class: 'Для атаки нужен выбранный боевой класс.',
  unknown_shop_item: 'Неизвестный товар кланового магазина.',
  shop_cooldown: 'На этой неделе покупка уже была.',
  warehouse_insufficient: 'В клановом хранилище недостаточно ресурсов.',
  unknown_skill: 'Неизвестный клановый навык.',
  rta_squad_full: 'Отряд заполнен: максимум 5 бойцов.',
  rta_squad_small: 'В вашем отряде меньше 3 бойцов.',
  rta_opponent_squad_small: 'В отряде соперника меньше 3 бойцов.',
  rta_cooldown: 'Клан ещё отдыхает после прошлого боя.',
  rta_rating_gap: 'Рейтинги кланов слишком отличаются.',
  rta_unknown_opponent: 'Такого соперника нет.',
  not_allowed: 'Это действие доступно главе и офицерам.',
  clan_level_too_low: 'Уровень клана слишком низкий для этого навыка.',
  not_enough_reputation: 'Клану не хватает репутации.',
  not_enough_eggs: 'В хранилище не хватает яиц.',
  shop_delivery_failed: 'Не удалось выдать предмет в инвентарь.',
  unknown_upgrade: 'Неизвестное улучшение персонажа.',
  upgrade_maxed: 'Это улучшение уже максимального уровня.',
  not_enough_gold: 'Недостаточно личного золота.',
  unknown_building: 'Неизвестная постройка.',
  building_maxed: 'Постройка уже максимального уровня.',
  unknown_clan_activity: 'Неизвестное клановое действие.',
  pvp_self: 'Нельзя вызвать на дуэль самого себя.',
  pvp_not_clan_member: 'Игрок не состоит в твоём клане.',
  pvp_opponent_not_in_chat: 'Соперник должен находиться в этом игровом чате.',
  pvp_opponent_no_class: 'У соперника нет боевого класса.',
  pvp_cooldown: 'После дуэли нужно восстановиться.',
  war_target_missing: 'Клан-противник не найден.',
  war_self: 'Нельзя объявить войну своему клану.',
  war_already_active: 'Твой клан уже участвует в войне.',
  war_target_busy: 'Клан-противник уже участвует в войне.',
  war_not_active: 'Клан сейчас не участвует в войне.',
  war_expired: 'Война уже завершилась.',
  war_cooldown: 'Военная атака ещё на перезарядке.',
  unknown_clan_competition: 'Неизвестное соревновательное действие.',
  entry_conditions_not_met: 'Ты не соответствуешь условиям вступления.',
  applicant_already_in_clan: 'Игрок уже состоит в другом клане.',
  target_already_in_clan: 'Игрок уже состоит в клане.',
  target_not_in_clan: 'Этот игрок не состоит в клане.',
  kick_insufficient_role: 'Недостаточно прав, чтобы исключить этого участника.',
  kick_cooldown: 'Подожди перед следующим исключением.',
  invalid_role_target: 'Нельзя изменить роль этого участника.',
  invalid_min_level: 'Введи неотрицательное число.',
  invalid_min_gear_score: 'Введи неотрицательное число.',
  invalid_class: 'Неизвестный класс.',
  invalid_gender: 'Неизвестный пол.',
  unknown_clan_management: 'Неизвестное действие управления кланом.',
  unknown_investigation: 'Неизвестное исследование.',
  investigation_already_active: 'Уже идёт другое исследование.',
  investigation_already_completed: 'Это исследование уже завершено.',
  investigation_not_active: 'Сейчас нет активного исследования.',
  investigation_no_resources: 'В хранилище нет ресурсов для пополнения.',
  investigation_not_funded: 'Исследование ещё не полностью профинансировано.',
  investigation_not_ready: 'Исследование ещё не готово.',
  unknown_task: 'Неизвестное задание.',
  task_not_done: 'Это задание ещё не выполнено.',
  task_already_claimed: 'Награда уже получена.',
  tasks_not_all_claimed: 'Сначала забери награды за все задания.',
  bonus_already_claimed: 'Бонус уже получен.',
  unknown_clan_progression: 'Неизвестное действие прогресса клана.',
};


function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value) || 0);
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil((Number(ms) || 0) / 1000));
  if (totalSeconds < 60) return `${totalSeconds} сек.`;
  const totalMinutes = Math.ceil(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} мин.`;
  const totalHours = Math.ceil(totalMinutes / 60);
  if (totalHours < 48) return `${totalHours} ч.`;
  return `${Math.ceil(totalHours / 24)} дн.`;
}

function formatCost(cost) {
  if (!cost) return 'MAX';
  const icons = { gold: '🪙', crystals: '💎', ironOre: '⛏️' };
  return Object.entries(cost).map(([resource, amount]) => `${icons[resource] || resource} ${formatNumber(amount)}`).join(' · ');
}

export async function openClanGame({ api, renderState, haptic, statusElement }) {
  let dashboard = await api('/api/clan');
  let tab = dashboard.clan ? 'overview' : 'discover';
  let hallTab = 'hall';
  let pending = false;
  let feedbackText = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay clan-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass clan-panel">
      <header class="clan-head">
        <button class="overlay-close clan-round" type="button" aria-label="Закрыть">←</button>
        <h2>Клан</h2>
        <button class="clan-round" type="button" data-clan-gear aria-label="Управление" hidden>⚙</button>
      </header>
      <div data-clan-content></div>
      <div class="utility-feedback" data-clan-feedback aria-live="polite"></div>
    </div>`;

  const content = overlay.querySelector('[data-clan-content]');
  const feedback = overlay.querySelector('[data-clan-feedback]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.querySelector('[data-clan-gear]').addEventListener('click', () => {
    tab = tab === 'management' ? 'overview' : 'management';
    haptic('light');
    render();
  });

  async function action(body) {
    if (pending) return null;
    pending = true;
    feedback.textContent = 'Сохраняем…';
    try {
      const payload = await api('/api/clan/action', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      dashboard = payload.dashboard;
      if (payload.state) renderState(payload.state);
      feedbackText = payload.message || '';
      haptic('medium');
      return payload;
    } catch (error) {
      if (error.payload?.dashboard) dashboard = error.payload.dashboard;
      feedbackText = REASONS[error.payload?.reason] || error.message;
      if (error.payload?.reason === 'entry_conditions_not_met' && error.payload?.reasons?.length) {
        feedbackText += ` ${error.payload.reasons.join('; ')}`;
      }
      haptic('light');
      return null;
    } finally {
      pending = false;
      render();
    }
  }

  async function activity(body) {
    if (pending) return null;
    pending = true;
    feedback.textContent = 'Выполняем действие…';
    try {
      const payload = await api('/api/clan/activity', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      dashboard = payload.dashboard;
      if (payload.state) renderState(payload.state);
      feedbackText = payload.message || '';
      haptic(payload.ok ? 'medium' : 'light');
      return payload;
    } catch (error) {
      if (error.payload?.dashboard) dashboard = error.payload.dashboard;
      const base = REASONS[error.payload?.reason] || error.message;
      const cooldown = error.payload?.cooldownRemainingMs ? ` Осталось: ${formatDuration(error.payload.cooldownRemainingMs)}` : '';
      feedbackText = `${base}${cooldown}`;
      haptic('light');
      return null;
    } finally {
      pending = false;
      render();
    }
  }

  function discoverHtml() {
    return `
      <section class="clan-section">
        <h4>Создать клан</h4>
        <div class="clan-create">
          <input type="text" maxlength="40" placeholder="Название клана" data-clan-name />
          <button type="button" data-clan-create>Создать</button>
        </div>
      </section>
      <section class="clan-section">
        <h4>Доступные кланы</h4>
        <div class="clan-list">
          ${dashboard.available.length ? dashboard.available.map(clan => `
            <article class="clan-list-row">
              <div><strong>${escapeHtml(clan.name)}</strong><small>Уровень ${clan.level} · ${clan.members}/${clan.maxMembers || 30} участников · ${clan.entryType === 1 ? 'по заявке' : 'свободный вход'}</small></div>
              <button type="button" class="clan-join-button" data-clan-join="${clan.id}" ${clan.applied ? 'disabled' : ''}>${clan.applied ? 'Заявка отправлена' : clan.entryType === 1 ? 'Заявка' : 'Вступить'}</button>
            </article>`).join('') : '<p>Открытых кланов пока нет.</p>'}
        </div>
      </section>`;
  }

  const TABS = [['overview', 'Обзор'], ['members', 'Участники'], ['tasks', 'Задания'], ['skills', 'Навыки'], ['hall', 'Зал клана'], ['wars', 'Войны']];

  // Prototype header: waving banner, name, level, members, XP bar.
  function bannerHtml(clan) {
    const progress = clan.levelProgress || { current: 0, needed: 1000 };
    const percent = Math.min(100, progress.current / Math.max(1, progress.needed) * 100);
    const tier = clan.level > 20 ? 4 : clan.level > 10 ? 3 : clan.level > 5 ? 2 : 1;
    const banner = worldArtUrl(`clan/clan-banner-${tier}`);
    const hall = worldArtUrl('clan/clan-hero',512);
    return `
      <section class="clan-hero" ${hall ? `style="background-image:linear-gradient(90deg,rgba(8,7,12,.8),rgba(8,7,12,.7)),url('${hall}')"` : ''}>
        <div class="clan-banner ${banner ? 'painted' : ''}" aria-hidden="true">${banner ? `<img src="${banner}" width="64" height="96" alt="" loading="lazy" decoding="async">` : '<span>🌳</span>'}</div>
        <div class="clan-hero-info">
          <h3>${escapeHtml(clan.name)}${clan.tag ? ` <small>[${escapeHtml(clan.tag)}]</small>` : ''}</h3>
          <div class="clan-hero-row"><span>Ур. ${clan.level}</span><span>👥 ${clan.members.length}</span><span>✦ ${formatNumber(clan.reputation)}</span></div>
          <div class="clan-xp"><i style="width:${percent}%"></i></div>
          <small>${formatNumber(progress.current)} / ${formatNumber(progress.needed)} XP</small>
        </div>
      </section>`;
  }

  function overviewTabHtml(clan) {
    const quiz = dashboard.quiz;
    const tasks = dashboard.progression?.tasks;
    const done = tasks ? tasks.items.filter(task => task.done).length : 0;
    return `
      <button type="button" class="clan-card clan-treasury" data-clan-tab="warehouse">
        <h4>Клановое хранилище</h4>
        <div><span>🪙 ${formatNumber(clan.warehouse.gold)}</span><span>💎 ${formatNumber(clan.warehouse.crystals)}</span><span>⛏️ ${formatNumber(clan.warehouse.ironOre)}</span><b>›</b></div>
      </button>
      <section class="clan-card clan-daily">
        <h4>Ежедневное задание</h4>
        <div class="clan-daily-row">
          <span class="clan-daily-icon">📜</span>
          <div><strong>Викторина</strong><small>${quiz?.answered ? (quiz.correct ? 'Сегодня отвечено верно ✅' : 'Сегодня уже отвечено') : quiz?.available ? '+золото, опыт и вклад' : 'Недоступна'}</small></div>
          <button type="button" class="clan-play" data-clan-tab="quiz" ${quiz?.available && !quiz.answered ? '' : 'disabled'}>Играть</button>
        </div>
        ${tasks ? `<div class="clan-daily-row"><span class="clan-daily-icon">📋</span><div><strong>Задания дня</strong><small>${done} / ${tasks.items.length} выполнено</small></div><button type="button" class="clan-play ghost" data-clan-tab="tasks">Открыть</button></div>` : ''}
      </section>
      <section class="clan-card">
        <h4>Твой вклад</h4>
        <div class="clan-contrib"><strong>${formatNumber(clan.myContribution)}</strong><small>${clan.myRole === 'owner' ? '👑 глава клана' : clan.myRole === 'officer' ? '⭐ офицер' : 'участник'}</small></div>
      </section>
      ${clan.description ? `<p class="clan-motto">«${escapeHtml(clan.description)}»</p>` : ''}`;
  }

  function tasksTabHtml(clan) {
    const activities = dashboard.activities;
    return `
      <section class="clan-section clan-activities">
        ${tasksHtml()}
        ${activities ? `${bossHtml(activities)}${shopHtml(activities)}${upgradesHtml(activities)}${buildingsHtml(clan, activities)}` : ''}
        ${investigationsHtml()}
      </section>`;
  }

  // The Clan Hall: five levels, Glory points, and the skills every member has while in the clan.
  function hallHtml() {
    const hall = dashboard.progression?.hall;
    if (!hall) return '';
    const next = hall.next;
    const need = next ? `Нужно: ✦ ${formatNumber(next.glory)} славы · 🪙 ${formatNumber(next.gold)} в хранилище` : 'Зал развит до максимума.';
    return `
      <section class="clan-section clan-activities">
        <img class="clan-hall-art" src="${worldArtUrl('clan/clan-hall',512)}" alt="Зал клана" width="512" height="341" loading="lazy">
        <h4>Зал клана · ${hall.level} / ${hall.maxLevel}</h4>
        ${hall.estate ? `<p class="clan-motto">${escapeHtml(hall.estate.name)} · аренда до ${new Date(hall.estate.until).toLocaleDateString('ru-RU')}</p>` : ''}
        <p class="clan-motto">Слава клана: ${formatNumber(hall.glory)}${hall.farmGloryPerHour ? ` · +${hall.farmGloryPerHour} в час с залов фарма` : ''}. Бонус к шансу заточки +${Math.round(hall.enchantBonus * 100)}% · магазин зала ${hall.shopLevel} ур.</p>
        <p class="clan-motto">Телепорты: ${hall.teleports.map(escapeHtml).join(' · ')}</p>
        <div class="clan-actions-row">
          <button type="button" class="clan-play" data-hall-deposit ${hall.coins > 0 ? '' : 'disabled'}>Передать монеты славы · ${formatNumber(hall.coins)}</button>
          ${next && hall.canManage ? `<button type="button" class="clan-play" data-hall-upgrade ${next.canUpgrade ? '' : 'disabled'}>Развить до ${next.level} ур.</button>` : ''}
        </div>
        <small class="clan-motto">${need}</small>
        ${hall.skills.map(skill => `
          <article class="clan-card">
            <h4>${l2SkillIcon(skill.name)} ${escapeHtml(skill.name)} · ${skill.level} / ${skill.maxLevel}${skill.active ? '' : ' · нет эффекта'}</h4>
            <small>${skill.current ? escapeHtml(skill.current) : '—'}${skill.next ? ` → ${escapeHtml(skill.next)} (зал ${skill.needsHallLevel} ур.)` : ''}</small>
          </article>`).join('')}
      </section>`;
  }

  function hallAuctionHtml() {
    const auction=dashboard.progression?.hallAuctions;
    if(!auction) return '';
    return `<section class="clan-section clan-activities clan-hall-auction">
      <img class="clan-hall-art" src="${worldArtUrl('clan/clan-hall-auction',512)}" alt="Аукцион залов клана" width="512" height="341" loading="lazy">
      <h4>Аукцион залов клана</h4>
      <p class="clan-motto">От ${auction.minClanLevel} уровня клана · аренда на ${auction.leaseDays} дней. Ставки из хранилища; перебитая ставка возвращается полностью. Один зал на клан. Шаг ставки 5%.</p>
      <button type="button" class="clan-play ghost" data-hall-refresh>Обновить торги</button>
      <div class="clan-hall-lots">${auction.halls.map(hall=>`<article class="clan-card clan-hall-lot">
        <h4>${escapeHtml(hall.name)} <small>${escapeHtml(hall.grade)}</small></h4>
        <p class="clan-motto">${escapeHtml(hall.town)} · +${hall.gloryPerHour} славы в час</p>
        ${hall.owner ? `<p class="clan-motto">${hall.mine?'Твой клан':escapeHtml(hall.owner.name)} · аренда ещё ${formatDuration(hall.remainingMs)}</p>` : `<p class="clan-motto">Торги ещё ${formatDuration(hall.remainingMs)}${hall.bid?` · ${hall.mine?'Твоя ставка':escapeHtml(hall.bid.name)}: ${materialIcon('gold')} ${formatNumber(hall.bid.amount)}`:' · ставок нет'}</p>
          <form class="clan-hall-bid" data-hall-bid="${hall.id}">
            <label>Ставка в адене<input name="amount" type="number" inputmode="numeric" min="${hall.minBid}" step="1" placeholder="От ${formatNumber(hall.minBid)}" required ${hall.canBid&&!pending?'':'disabled'}></label>
            <button class="clan-play" type="submit" ${hall.canBid&&!pending?'':'disabled'}>Сделать ставку</button>
          </form>
          ${!hall.canBid?`<small class="clan-motto">${!auction.canManage?'Ставки делает глава или офицер.':dashboard.clan.level<auction.minClanLevel?'Нужен клан 3 уровня.':'У клана уже есть зал или ведущая ставка.'}</small>`:''}`}
      </article>`).join('')}</div></section>`;
  }

  function hallTabHtml() {
    return `<nav class="clan-hall-tabs" aria-label="Зал клана"><button type="button" data-hall-tab="hall" class="${hallTab==='hall'?'active':''}">Зал клана</button><button type="button" data-hall-tab="auction" class="${hallTab==='auction'?'active':''}">Аукцион</button></nav>${hallTab==='auction'?hallAuctionHtml():hallHtml()}`;
  }

  function skillsTabHtml() {
    const skills = dashboard.progression?.skills;
    if (!skills) return '';
    const percent = (value, unit) => (unit ? `${Math.round(value * 1000) / 10}%` : `${value}`);
    return `
      <section class="clan-section clan-activities">
        <h4>Клановые навыки</h4>
        <p class="clan-motto">Навык изучается за золото, репутацию и яйца из хранилища (яйца выпадают с эпических боссов). Бонус получают все участники клана${skills.canManage ? '.' : '; изучают глава и офицеры.'}</p>
        <div class="clan-warehouse">${skills.eggs.map(egg => `<article><span>${materialIcon(egg.key,'🥚')}</span><strong>${egg.count}</strong><small>${escapeHtml(egg.name)}</small></article>`).join('')}</div>
        ${skills.skills.map(skill => `
          <article class="clan-card">
            <h4>${l2SkillIcon(skill.name)} ${escapeHtml(skill.name)} · ${skill.level} / ${skill.maxLevel}</h4>
            <small>${escapeHtml(skill.stat)}: ${skill.current ? escapeHtml(skill.current) : '—'}${skill.next ? ` → ${escapeHtml(skill.next)}` : ''}</small>
            ${skill.cost ? `<small>Нужно: ${skill.cost.clanLevel} ур. клана · ✦ ${formatNumber(skill.cost.reputation)} · 🪙 ${formatNumber(skill.cost.gold)} · ${materialIcon(skill.cost.egg,'🥚')} ${skill.cost.eggs} (${escapeHtml(skill.cost.eggName)})</small>
            ${skills.canManage ? `<button type="button" class="clan-play" data-clan-skill="${escapeHtml(skill.id)}" ${skill.canLearn ? '' : 'disabled'}>Изучить</button>` : ''}` : ''}
          </article>`).join('')}
      </section>`;
  }

  const RTA_RESULT = { win: '🏆', loss: '💀', draw: '🤝' };

  function rtaHtml() {
    const rta = dashboard.rta;
    if (!rta) return '';
    return `
      <section class="clan-card">
        <h4>Командные бои (RTA) · рейтинг ${formatNumber(rta.rating)}</h4>
        <small>Победы ${rta.wins} · поражения ${rta.losses} · ничьи ${rta.draws}. Отряд до ${rta.squadSize} бойцов сражается копиями героев: от ${rta.minSquad} бойцов отряд готов к бою.</small>
        <div class="clan-warehouse">${rta.squad.length ? rta.squad.map(member => `<article><strong>${escapeHtml(member.name)}</strong><small>⚔ ${formatNumber(member.power)}</small>${rta.canManage ? `<button type="button" class="clan-play ghost" data-clan-rta-leave="${member.userId}">Убрать</button>` : ''}</article>`).join('') : '<small>В отряде пока никого.</small>'}</div>
        <button type="button" class="clan-play" data-clan-rta-join>${rta.inSquad ? 'Обновить бойца' : 'Вступить в отряд'}</button>
        ${rta.inSquad ? '<button type="button" class="clan-play ghost" data-clan-rta-leave="me">Выйти из отряда</button>' : ''}
        ${rta.canManage ? `<h4>Соперники</h4>${rta.cooldownMs ? `<small>Следующий бой через ${formatDuration(rta.cooldownMs)}</small>` : ''}
          ${rta.opponents.length ? rta.opponents.map(rival => `<div class="clan-daily-row"><div><strong>${escapeHtml(rival.name)}</strong><small>Рейтинг ${formatNumber(rival.rating)} · бойцов ${rival.squad}</small></div><button type="button" class="clan-play" data-clan-rta-battle="${escapeHtml(rival.id)}" ${rta.cooldownMs || rta.squad.length < rta.minSquad ? 'disabled' : ''}>В бой</button></div>`).join('') : `<small>Подходящих кланов с отрядом от ${rta.minSquad} бойцов пока нет.</small>`}` : ''}
        ${rta.history.length ? `<h4>Последние бои</h4>${rta.history.map(entry => `<small>${RTA_RESULT[entry.result] || ''} ${escapeHtml(entry.opponent)} · ${entry.wins}:${entry.losses} · ${entry.change > 0 ? '+' : ''}${entry.change}</small>`).join('<br>')}` : ''}
        <h4>Топ кланов</h4>
        ${rta.top.map((entry, index) => `<small>${index + 1}. ${entry.mine ? '<b>' : ''}${escapeHtml(entry.name)}${entry.mine ? '</b>' : ''} · ${formatNumber(entry.rating)}</small>`).join('<br>')}
      </section>`;
  }

  function warsTabHtml(clan) {
    return `<section class="clan-section clan-activities">${rtaHtml()}${warHtml(clan)}${pvpHtml()}</section>`;
  }

  function overviewHtml(clan) {
    const gear = overlay.querySelector('[data-clan-gear]');
    if (gear) gear.hidden = !clan.canManage;
    // Right after creating or joining a clan the tab is still "discover": show the overview.
    const main = TABS.some(([id]) => id === tab) ? tab : tab === 'discover' ? 'overview' : null;
    return `
      ${bannerHtml(clan)}
      <nav class="clan-tabs">${TABS.map(([id, label]) => `<button type="button" data-clan-tab="${id}" class="${main === id ? 'active' : ''}">${label}</button>`).join('')}</nav>
      ${main ? '' : `<button type="button" class="clan-backlink" data-clan-tab="overview">‹ Обзор</button>`}
      <div class="clan-tab-body">
      ${tab === 'warehouse' ? warehouseHtml(clan)
        : tab === 'quiz' ? quizHtml()
        : tab === 'members' ? membersHtml(clan)
        : tab === 'tasks' ? tasksTabHtml(clan)
        : tab === 'skills' ? skillsTabHtml()
        : tab === 'hall' ? hallTabHtml()
        : tab === 'wars' ? warsTabHtml(clan)
        : tab === 'management' && clan.canManage ? managementHtml(clan)
        : overviewTabHtml(clan)}
      </div>
      <button type="button" class="clan-danger" data-clan-exit>${clan.isOwner ? 'Расформировать клан' : 'Покинуть клан'}</button>`;
  }

  function membersHtml(clan) {
    return `
      <section class="clan-section">
        <h4>Участники · ${clan.members.length}</h4>
        <div class="clan-members">
          ${clan.members.map(member => `
            <article class="clan-member" data-player-card="${escapeHtml(member.userId)}">
              <span class="clan-avatar" aria-hidden="true">${escapeHtml(String(member.name || '?').trim().charAt(0).toUpperCase())}</span>
              <div><strong>${escapeHtml(member.name)}</strong><small>Вклад: ${formatNumber(member.contribution)}</small></div>
              <span class="clan-role">${member.role === 'owner' ? '👑 глава' : member.role === 'officer' ? '⭐ офицер' : 'участник'}</span>
            </article>`).join('')}
        </div>
      </section>`;
  }

  function warehouseHtml(clan) {
    return `
      <section class="clan-section">
        <h4>Общее хранилище</h4>
        <div class="clan-warehouse">
          <article><span>🪙</span><strong>${formatNumber(clan.warehouse.gold)}</strong></article>
          <article><span>💎</span><strong>${formatNumber(clan.warehouse.crystals)}</strong></article>
          <article><span>⛏️</span><strong>${formatNumber(clan.warehouse.ironOre)}</strong></article>
        </div>
        <div class="clan-contribute">
          <select data-clan-resource><option value="gold">Золото</option><option value="crystals">Кристаллы</option><option value="ironOre">Руда</option></select>
          <input type="number" min="1" step="1" inputmode="numeric" placeholder="Количество" data-clan-amount />
          <button type="button" data-clan-contribute>Внести</button>
        </div>
      </section>`;
  }

  function quizHtml() {
    const quiz = dashboard.quiz;
    if (!quiz?.available) return '<section class="clan-section"><p>Викторина сейчас недоступна.</p></section>';
    if (quiz.answered) return `<section class="clan-section"><h4>Сегодня уже отвечено</h4><p>${quiz.correct ? 'Верно ✅' : 'Неверно ❌'} · новый вопрос после ежедневного сброса.</p></section>`;
    return `
      <section class="clan-section">
        <h4>Клановая викторина</h4>
        <p>${escapeHtml(quiz.question)}</p>
        <div class="clan-quiz-options">
          ${quiz.options.map((option, index) => `<button type="button" data-clan-answer="${index}">${escapeHtml(option)}</button>`).join('')}
        </div>
      </section>`;
  }

  function bossHtml(activities) {
    const boss = activities?.boss;
    if (!boss) {
      return `<article class="clan-activity-card"><div><strong>👹 Клановый босс</strong><small>Общий босс с наградой в хранилище.</small></div><button type="button" data-clan-boss-summon>Призвать</button></article>`;
    }
    const hpPercent = Math.max(0, Math.min(100, boss.currentHp / boss.maxHp * 100));
    return `
      <article class="clan-activity-card clan-boss-card">
        <div class="clan-activity-title"><div><strong>👹 ${escapeHtml(boss.name)}</strong><small>Уровень ${boss.level} · защита ${boss.defence}</small></div><span>${formatNumber(boss.currentHp)} / ${formatNumber(boss.maxHp)} HP</span></div>
        <div class="clan-boss-hp"><span style="width:${hpPercent}%"></span></div>
        ${boss.damage.length ? `<div class="clan-damage-list">${boss.damage.slice(0, 5).map(row => `<span>${escapeHtml(row.name)} <b>${formatNumber(row.damage)}</b></span>`).join('')}</div>` : '<small>Пока никто не атаковал.</small>'}
        <button type="button" data-clan-boss-attack ${boss.cooldownRemainingMs > 0 ? 'disabled' : ''}>${boss.cooldownRemainingMs > 0 ? `Восстановление · ${formatDuration(boss.cooldownRemainingMs)}` : 'Атаковать'}</button>
      </article>`;
  }

  function shopHtml(activities) {
    const shop = activities?.shop;
    return `
      <section class="clan-activity-group"><h4>🛒 Клановый магазин</h4>
        ${shop?.cooldownRemainingMs > 0 ? `<p class="clan-muted">Следующая покупка через ${formatDuration(shop.cooldownRemainingMs)}.</p>` : ''}
        <div class="clan-activity-list">${(shop?.items || []).map(item => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(item.label)}</strong><small>${formatCost(item.cost)}</small></div><button type="button" data-clan-shop-buy="${item.key}" ${item.available ? '' : 'disabled'}>Получить</button></article>`).join('')}</div>
      </section>`;
  }

  function upgradesHtml(activities) {
    return `
      <section class="clan-activity-group"><h4>⬆️ Улучшения персонажа</h4>
        <div class="clan-activity-list">${(activities?.upgrades || []).map(item => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(item.label)} · ${item.level}/${item.maxLevel}</strong><small>${escapeHtml(item.description)} · ${item.cost === null ? 'MAX' : `🪙 ${formatNumber(item.cost)}`}</small></div><button type="button" data-clan-upgrade="${item.key}" ${item.cost !== null && item.affordable ? '' : 'disabled'}>${item.cost === null ? 'MAX' : 'Улучшить'}</button></article>`).join('')}</div>
      </section>`;
  }

  function buildingsHtml(clan, activities) {
    return `
      <section class="clan-activity-group"><h4>🏗️ Постройки</h4>
        <div class="clan-activity-list">${(activities?.buildings || []).map(item => `
          <article class="clan-building-row"><div><strong>${escapeHtml(item.label)} · ${item.level}/${item.maxLevel}</strong><small>${escapeHtml(item.description)}</small><small>${escapeHtml(item.effectLabel)}</small><small>${formatCost(item.cost)}</small></div><button type="button" data-clan-building="${item.key}" ${item.canUpgrade ? '' : 'disabled'}>${item.cost === null ? 'MAX' : clan.isOwner ? 'Улучшить' : 'Только глава'}</button></article>`).join('')}</div>
      </section>`;
  }

  function pvpHtml() {
    const pvp = dashboard.competition?.pvp;
    if (!pvp) return '';
    const record = pvp.record || { wins: 0, losses: 0, draws: 0 };
    return `
      <section class="clan-activity-group"><h4>⚔️ Дружеские дуэли</h4>
        <p class="clan-muted">${record.wins} побед · ${record.losses} поражений · ${record.draws} ничьих</p>
        ${!pvp.ready ? '<p class="clan-muted">Сначала выбери боевой класс.</p>' : ''}
        ${pvp.cooldownRemainingMs > 0 ? `<p class="clan-muted">Следующая дуэль через ${formatDuration(pvp.cooldownRemainingMs)}.</p>` : ''}
        <div class="clan-activity-list">${pvp.opponents?.length ? pvp.opponents.map(opponent => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(opponent.name)}</strong><small>Участник твоего клана в этом чате</small></div><button type="button" data-clan-pvp="${opponent.userId}" ${pvp.ready && pvp.cooldownRemainingMs === 0 ? '' : 'disabled'}>Вызвать</button></article>`).join('') : '<p class="clan-muted">Нет доступных соперников в этом чате.</p>'}</div>
      </section>`;
  }

  function warResultHtml(result) {
    if (!result) return '';
    const label = result.outcome === 'win' ? 'Победа 🏆' : result.outcome === 'loss' ? 'Поражение' : result.outcome === 'draw' ? 'Ничья' : 'Война отменена';
    return `<p class="clan-war-result"><strong>${label}</strong> · ${formatNumber(result.myScore)} : ${formatNumber(result.opponentScore)}</p>`;
  }

  function warHtml(clan) {
    const war = dashboard.competition?.war;
    if (!war) return '';
    if (!war.active) {
      return `
        <section class="clan-activity-group"><h4>🏳️ Войны кланов</h4>
          ${warResultHtml(war.lastResult)}
          ${war.canDeclare ? `<div class="clan-activity-list">${war.targets?.length ? war.targets.map(target => `
            <article class="clan-activity-row"><div><strong>${escapeHtml(target.name)}</strong><small>Ур. ${target.level} · ${target.members} участников</small></div><button type="button" data-clan-war-declare="${target.id}">Объявить войну</button></article>`).join('') : '<p class="clan-muted">Нет свободных кланов-противников.</p>'}</div>` : '<p class="clan-muted">Объявлять войну может только глава клана.</p>'}
        </section>`;
    }
    return `
      <section class="clan-activity-group clan-war-card"><h4>🏳️ Война с ${escapeHtml(war.opponentName)}</h4>
        <div class="clan-war-score"><strong>${formatNumber(war.score)}</strong><span>:</span><strong>${formatNumber(war.opponentScore)}</strong></div>
        <p class="clan-muted">Твой вклад в войну: ${formatNumber(war.myPoints)} · осталось ${formatDuration(war.remainingMs)}</p>
        <button type="button" data-clan-war-attack ${war.cooldownRemainingMs > 0 ? 'disabled' : ''}>${war.cooldownRemainingMs > 0 ? `Перезарядка · ${formatDuration(war.cooldownRemainingMs)}` : 'Атаковать 🗡️'}</button>
      </section>`;
  }

  function investigationsHtml() {
    const investigations = dashboard.progression?.investigations;
    if (!investigations) return '';
    const { active, completed, startable } = investigations;
    return `
      <section class="clan-activity-group"><h4>🔬 Исследования</h4>
        ${completed.length ? `<div class="clan-activity-list">${completed.map(item => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.effectLabel)} · завершено</small></div></article>`).join('')}</div>` : ''}
        ${active ? `
          <article class="clan-activity-card">
            <div><strong>${escapeHtml(active.label)}</strong><small>${escapeHtml(active.description)}</small><small>${escapeHtml(active.effectLabel)}</small></div>
            <div class="clan-activity-list">${Object.entries(active.cost).map(([resource, need]) => `
              <span class="clan-muted">${resource === 'gold' ? '🪙' : resource === 'crystals' ? '💎' : '⛏️'} ${formatNumber(active.progress[resource] || 0)} / ${formatNumber(need)}</span>`).join('')}</div>
            ${!active.durationDone ? `<small class="clan-muted">Осталось минимум: ${formatDuration(active.remainingMs)}</small>` : ''}
            <div class="clan-activity-list">
              <button type="button" data-clan-investigation-fund>Пополнить из хранилища</button>
              ${active.readyToComplete ? '<button type="button" data-clan-investigation-complete>Завершить</button>' : ''}
              ${dashboard.clan?.canManage ? '<button type="button" data-clan-investigation-cancel>Отменить</button>' : ''}
            </div>
          </article>` : `
          <div class="clan-activity-list">${startable.map(item => `
            <article class="clan-activity-row"><div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.effectLabel)}</small><small>${formatCost(item.cost)}</small></div>${dashboard.clan?.canManage ? `<button type="button" data-clan-investigation-start="${item.key}">Начать</button>` : ''}</article>`).join('') || '<p class="clan-muted">Все доступные исследования завершены.</p>'}</div>`}
      </section>`;
  }

  function tasksHtml() {
    const tasks = dashboard.progression?.tasks;
    if (!tasks) return '';
    return `
      <section class="clan-activity-group"><h4>📋 Ежедневные задания</h4>
        <div class="clan-activity-list">${tasks.items.map(task => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(task.label)}</strong><small>${task.claimed ? '🏆 получено' : task.done ? '✅ выполнено' : '⬜ не выполнено'}</small></div>${task.done && !task.claimed ? `<button type="button" data-clan-task-claim="${task.key}">Забрать</button>` : ''}</article>`).join('')}</div>
        ${tasks.bonusAvailable ? `<button type="button" data-clan-task-bonus>Забрать бонус: +${tasks.bonusXp} XP клана</button>` : ''}
      </section>`;
  }

  function applicationsHtml(clan) {
    return `
      <section class="clan-activity-group"><h4>📨 Заявки</h4>
        ${clan.applications.length ? `<div class="clan-activity-list">${clan.applications.map(app => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(app.name)}</strong></div><div class="clan-activity-list">
            <button type="button" data-clan-application-accept="${app.userId}">✅</button>
            <button type="button" data-clan-application-reject="${app.userId}">❌</button>
          </div></article>`).join('')}</div>` : '<p class="clan-muted">Нет новых заявок.</p>'}
      </section>`;
  }

  function inviteKickHtml() {
    const management = dashboard.management;
    if (!management) return '';
    return `
      <section class="clan-activity-group"><h4>➕ Пригласить</h4>
        ${management.inviteCandidates.length ? `<div class="clan-activity-list">${management.inviteCandidates.map(member => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(member.name)}</strong></div><button type="button" data-clan-invite="${member.userId}">Пригласить</button></article>`).join('')}</div>` : '<p class="clan-muted">Нет игроков без клана в этом чате.</p>'}
      </section>
      <section class="clan-activity-group"><h4>➖ Исключить</h4>
        ${management.kickable.length ? `<div class="clan-activity-list">${management.kickable.map(member => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(member.name)}</strong></div><button type="button" data-clan-kick="${member.userId}">Исключить</button></article>`).join('')}</div>` : '<p class="clan-muted">Некого исключить.</p>'}
      </section>`;
  }

  function rolesHtml() {
    const management = dashboard.management;
    if (!management?.isOwner) return '';
    return `
      <section class="clan-activity-group"><h4>⭐ Роли</h4>
        ${management.roleTargets.length ? `<div class="clan-activity-list">${management.roleTargets.map(member => `
          <article class="clan-activity-row"><div><strong>${escapeHtml(member.name)}</strong><small>${member.role === 'officer' ? 'офицер' : 'участник'}</small></div>
            <button type="button" data-clan-${member.role === 'officer' ? 'demote' : 'promote'}="${member.userId}">${member.role === 'officer' ? 'Разжаловать' : 'В офицеры'}</button>
            <button type="button" data-clan-transfer="${member.userId}" data-name="${escapeHtml(member.name)}">Передать клан</button>
          </article>`).join('')}</div>` : '<p class="clan-muted">В клане пока нет других участников.</p>'}
      </section>`;
  }

  function settingsHtml(clan) {
    const management = dashboard.management;
    if (!management?.isOwner) return '';
    const cond = clan.entryConditions || {};
    return `
      <section class="clan-activity-group"><h4>⚙️ Настройки</h4>
        <div class="clan-activity-list">
          <label class="clan-muted">Тег (до 6 символов)<input type="text" maxlength="6" value="${escapeHtml(clan.tag)}" data-clan-settings-tag /></label>
          <label class="clan-muted">Описание<input type="text" maxlength="200" value="${escapeHtml(clan.description)}" data-clan-settings-description /></label>
          <label class="clan-muted">Тип вступления
            <select data-clan-settings-entry>
              <option value="0" ${cond.entryType === 0 ? 'selected' : ''}>Свободный</option>
              <option value="1" ${cond.entryType === 1 ? 'selected' : ''}>По заявке</option>
              <option value="-1" ${cond.entryType === -1 ? 'selected' : ''}>Закрытый</option>
            </select>
          </label>
          <label class="clan-muted">Мин. уровень<input type="number" min="0" step="1" value="${Number(cond.minLevel) || 0}" data-clan-settings-minlevel /></label>
          <label class="clan-muted">Мин. рейтинг снаряжения<input type="number" min="0" step="1" value="${Number(cond.minGearScore) || 0}" data-clan-settings-mingearscore /></label>
          <label class="clan-muted">Требуемый класс
            <select data-clan-settings-class>
              <option value="">любой</option>
              ${(management.classOptions || []).map(opt => `<option value="${opt.key}" ${cond.allowedClass === opt.key ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`).join('')}
            </select>
          </label>
          <label class="clan-muted">Требуемый пол
            <select data-clan-settings-gender>
              <option value="">любой</option>
              <option value="male" ${cond.allowedGender === 'male' ? 'selected' : ''}>муж.</option>
              <option value="female" ${cond.allowedGender === 'female' ? 'selected' : ''}>жен.</option>
            </select>
          </label>
          <button type="button" data-clan-settings-save>Сохранить</button>
        </div>
      </section>`;
  }

  function managementHtml(clan) {
    return `
      ${applicationsHtml(clan)}
      ${inviteKickHtml()}
      ${rolesHtml()}
      ${settingsHtml(clan)}`;
  }

  function bind() {
    content.querySelector('[data-clan-create]')?.addEventListener('click', async () => {
      const name = content.querySelector('[data-clan-name]')?.value || '';
      const payload = await action({ action: 'create', name });
      if (payload?.ok) tab = 'overview';
    });
    content.querySelectorAll('[data-clan-join]').forEach(button => button.addEventListener('click', async () => {
      const payload = await action({ action: 'join', clanId: button.dataset.clanJoin });
      if (payload?.ok && !payload.applied) tab = 'overview';
    }));
    content.querySelectorAll('[data-clan-tab]').forEach(button => button.addEventListener('click', () => {
      tab = button.dataset.clanTab;
      feedbackText = '';
      haptic('light');
      render();
    }));
    content.querySelector('[data-clan-contribute]')?.addEventListener('click', async () => {
      const resource = content.querySelector('[data-clan-resource]')?.value;
      const amount = content.querySelector('[data-clan-amount]')?.value;
      await action({ action: 'contribute', resource, amount });
    });
    content.querySelectorAll('[data-clan-answer]').forEach(button => button.addEventListener('click', async () => {
      if (pending) return;
      pending = true;
      feedback.textContent = 'Проверяем ответ…';
      try {
        const payload = await api('/api/clan/quiz', {
          method: 'POST',
          body: JSON.stringify({ answer: Number(button.dataset.clanAnswer) }),
        });
        dashboard = payload.dashboard;
        if (payload.state) renderState(payload.state);
        feedbackText = payload.correct ? 'Верно! Награда начислена.' : `Неверно. Правильный ответ: ${payload.rightAnswer}`;
        haptic(payload.correct ? 'medium' : 'light');
      } catch (error) {
        if (error.payload?.dashboard) dashboard = error.payload.dashboard;
        feedbackText = REASONS[error.payload?.reason] || error.message;
      } finally {
        pending = false;
        render();
      }
    }));
    content.querySelector('[data-clan-boss-summon]')?.addEventListener('click', () => activity({ action: 'boss_summon' }));
    content.querySelector('[data-clan-boss-attack]')?.addEventListener('click', () => activity({ action: 'boss_attack' }));
    content.querySelectorAll('[data-clan-shop-buy]').forEach(button => button.addEventListener('click', () => activity({ action: 'shop_buy', itemKey: button.dataset.clanShopBuy })));
    content.querySelectorAll('[data-clan-upgrade]').forEach(button => button.addEventListener('click', () => activity({ action: 'upgrade_member', trackKey: button.dataset.clanUpgrade })));
    content.querySelectorAll('[data-clan-building]').forEach(button => button.addEventListener('click', () => activity({ action: 'upgrade_building', buildingKey: button.dataset.clanBuilding })));
    content.querySelectorAll('[data-clan-pvp]').forEach(button => button.addEventListener('click', () => activity({ action: 'pvp_fight', opponentId: button.dataset.clanPvp })));
    content.querySelectorAll('[data-clan-war-declare]').forEach(button => button.addEventListener('click', () => activity({ action: 'war_declare', targetId: button.dataset.clanWarDeclare })));
    content.querySelector('[data-clan-war-attack]')?.addEventListener('click', () => activity({ action: 'war_attack' }));
    content.querySelectorAll('[data-clan-application-accept]').forEach(button => button.addEventListener('click', () => activity({ action: 'application_accept', applicantId: button.dataset.clanApplicationAccept })));
    content.querySelectorAll('[data-clan-application-reject]').forEach(button => button.addEventListener('click', () => activity({ action: 'application_reject', applicantId: button.dataset.clanApplicationReject })));
    content.querySelectorAll('[data-clan-invite]').forEach(button => button.addEventListener('click', () => activity({ action: 'invite', targetId: button.dataset.clanInvite })));
    content.querySelectorAll('[data-clan-kick]').forEach(button => button.addEventListener('click', () => activity({ action: 'kick', targetId: button.dataset.clanKick })));
    content.querySelectorAll('[data-clan-promote]').forEach(button => button.addEventListener('click', () => activity({ action: 'promote', targetId: button.dataset.clanPromote })));
    content.querySelectorAll('[data-clan-transfer]').forEach(button => button.addEventListener('click', () => {
      if (window.confirm(`Передать клан игроку ${button.dataset.name}? Ты станешь офицером.`)) activity({ action: 'transfer', targetId: button.dataset.clanTransfer });
    }));
    content.querySelectorAll('[data-clan-demote]').forEach(button => button.addEventListener('click', () => activity({ action: 'demote', targetId: button.dataset.clanDemote })));
    content.querySelector('[data-clan-settings-save]')?.addEventListener('click', () => {
      const changes = {
        tag: content.querySelector('[data-clan-settings-tag]')?.value ?? '',
        description: content.querySelector('[data-clan-settings-description]')?.value ?? '',
        entryType: Number(content.querySelector('[data-clan-settings-entry]')?.value ?? 0),
        minLevel: Number(content.querySelector('[data-clan-settings-minlevel]')?.value ?? 0),
        minGearScore: Number(content.querySelector('[data-clan-settings-mingearscore]')?.value ?? 0),
        allowedClass: content.querySelector('[data-clan-settings-class]')?.value ?? '',
        allowedGender: content.querySelector('[data-clan-settings-gender]')?.value ?? '',
      };
      activity({ action: 'settings_update', changes });
    });
    content.querySelectorAll('[data-clan-investigation-start]').forEach(button => button.addEventListener('click', () => activity({ action: 'investigation_start', key: button.dataset.clanInvestigationStart })));
    content.querySelector('[data-clan-investigation-fund]')?.addEventListener('click', () => activity({ action: 'investigation_fund' }));
    content.querySelector('[data-clan-investigation-complete]')?.addEventListener('click', () => activity({ action: 'investigation_complete' }));
    content.querySelector('[data-clan-investigation-cancel]')?.addEventListener('click', () => activity({ action: 'investigation_cancel' }));
    content.querySelector('[data-clan-rta-join]')?.addEventListener('click', () => activity({ action: 'rta_join' }));
    content.querySelectorAll('[data-clan-rta-leave]').forEach(button => button.addEventListener('click', () => activity({ action: 'rta_leave', userId: button.dataset.clanRtaLeave === 'me' ? undefined : Number(button.dataset.clanRtaLeave) })));
    content.querySelectorAll('[data-clan-rta-battle]').forEach(button => button.addEventListener('click', () => activity({ action: 'rta_battle', opponentId: button.dataset.clanRtaBattle })));
    content.querySelectorAll('[data-clan-skill]').forEach(button => button.addEventListener('click', () => activity({ action: 'skill_learn', id: button.dataset.clanSkill })));
    content.querySelector('[data-hall-deposit]')?.addEventListener('click', () => activity({ action: 'hall_deposit' }));
    content.querySelector('[data-hall-upgrade]')?.addEventListener('click', () => activity({ action: 'hall_upgrade' }));
    content.querySelectorAll('[data-hall-tab]').forEach(button=>button.addEventListener('click',()=>{hallTab=button.dataset.hallTab;render();}));
    content.querySelectorAll('[data-hall-bid]').forEach(form=>form.addEventListener('submit',event=>{
      event.preventDefault();activity({action:'hall_bid',hallId:form.dataset.hallBid,amount:form.elements.amount.value});
    }));
    content.querySelector('[data-hall-refresh]')?.addEventListener('click',async()=>{
      if(pending)return;pending=true;
      try{dashboard=await api('/api/clan');}catch(error){feedbackText=error.message;}
      finally{pending=false;render();}
    });
    content.querySelectorAll('[data-clan-task-claim]').forEach(button => button.addEventListener('click', () => activity({ action: 'task_claim', taskKey: button.dataset.clanTaskClaim })));
    content.querySelector('[data-clan-task-bonus]')?.addEventListener('click', () => activity({ action: 'task_claim_bonus' }));
    content.querySelector('[data-clan-exit]')?.addEventListener('click', async () => {
      const actionName = dashboard.clan?.isOwner ? 'disband' : 'leave';
      if (!window.confirm(actionName === 'disband' ? 'Расформировать клан?' : 'Покинуть клан?')) return;
      const payload = await action({ action: actionName });
      if (payload?.ok) tab = 'discover';
    });
  }

  function render() {
    content.innerHTML = dashboard.clan ? overviewHtml(dashboard.clan) : discoverHtml();
    feedback.textContent = feedbackText;
    bind();
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  statusElement.textContent = dashboard.clan ? `Клан: ${dashboard.clan.name}` : 'Ты пока не состоишь в клане.';
}
