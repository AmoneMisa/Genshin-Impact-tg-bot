const REASONS = {
  already_in_clan: 'Ты уже состоишь в клане.',
  invalid_name: 'Название клана должно быть от 1 до 40 символов.',
  name_taken: 'Клан с таким названием уже существует.',
  invalid_clan: 'Некорректный клан.',
  clan_not_found: 'Клан не найден.',
  closed: 'Этот клан закрыт для вступления.',
  not_in_clan: 'Ты не состоишь в клане.',
  owner_cannot_leave: 'Глава не может покинуть клан — только расформировать его.',
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
  shop_delivery_failed: 'Не удалось выдать предмет в инвентарь.',
  unknown_upgrade: 'Неизвестное улучшение персонажа.',
  upgrade_maxed: 'Это улучшение уже максимального уровня.',
  not_enough_gold: 'Недостаточно личного золота.',
  unknown_building: 'Неизвестная постройка.',
  building_maxed: 'Постройка уже максимального уровня.',
  unknown_clan_activity: 'Неизвестное клановое действие.',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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
  let pending = false;
  let feedbackText = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay clan-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass clan-panel">
      <header class="overlay-head">
        <div><div class="eyebrow">CLANS · MONGO</div><h2>Клан</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
      </header>
      <p class="overlay-copy">Клановые данные и игровые действия выполняются на сервере и сохраняются в Mongo.</p>
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
              <div><strong>${escapeHtml(clan.name)}</strong><small>Уровень ${clan.level} · ${clan.members} участников · ${clan.entryType === 1 ? 'по заявке' : 'свободный вход'}</small></div>
              <button type="button" class="clan-join-button" data-clan-join="${clan.id}">${clan.entryType === 1 ? 'Заявка' : 'Вступить'}</button>
            </article>`).join('') : '<p>Открытых кланов пока нет.</p>'}
        </div>
      </section>`;
  }

  function overviewHtml(clan) {
    return `
      <section class="clan-summary">
        <div class="clan-summary-head">
          <div><h3>${escapeHtml(clan.name)}</h3><p>${escapeHtml(clan.description || 'Описание пока не задано')}</p></div>
          <div class="clan-level"><strong>${clan.level}</strong><small>LEVEL</small></div>
        </div>
        <div class="clan-stats">
          <article><small>XP</small><strong>${formatNumber(clan.xp)}</strong></article>
          <article><small>РЕПУТАЦИЯ</small><strong>${formatNumber(clan.reputation)}</strong></article>
          <article><small>ТВОЙ ВКЛАД</small><strong>${formatNumber(clan.myContribution)}</strong></article>
        </div>
      </section>
      <nav class="clan-tabs">
        <button type="button" data-clan-tab="overview" class="${tab === 'overview' ? 'active' : ''}">Обзор</button>
        <button type="button" data-clan-tab="warehouse" class="${tab === 'warehouse' ? 'active' : ''}">Хранилище</button>
        <button type="button" data-clan-tab="quiz" class="${tab === 'quiz' ? 'active' : ''}">Викторина</button>
        <button type="button" data-clan-tab="activities" class="${tab === 'activities' ? 'active' : ''}">Активности</button>
      </nav>
      ${tab === 'warehouse' ? warehouseHtml(clan) : tab === 'quiz' ? quizHtml() : tab === 'activities' ? activitiesHtml(clan) : membersHtml(clan)}
      <button type="button" class="clan-danger" data-clan-exit>${clan.isOwner ? 'Расформировать клан' : 'Покинуть клан'}</button>`;
  }

  function membersHtml(clan) {
    return `
      <section class="clan-section">
        <h4>Участники · ${clan.members.length}</h4>
        <div class="clan-members">
          ${clan.members.map(member => `
            <article class="clan-member">
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

  function activitiesHtml(clan) {
    const activities = dashboard.activities;
    if (!activities) return '<section class="clan-section"><p>Активности недоступны.</p></section>';
    return `
      <section class="clan-section clan-activities">
        <h4>Клановые активности</h4>
        ${bossHtml(activities)}
        ${shopHtml(activities)}
        ${upgradesHtml(activities)}
        ${buildingsHtml(clan, activities)}
        <div class="clan-coming"><article>⚔️ Дуэли · следующий этап</article><article>🏳️ Войны кланов · следующий этап</article></div>
      </section>`;
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
