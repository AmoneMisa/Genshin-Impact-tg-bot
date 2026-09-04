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
      <p class="overlay-copy">Основной клановый контур уже перенесён в Mini App. Создание, вступление, выход, хранилище и викторина работают через сервер и Mongo.</p>
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

  async function refresh() {
    dashboard = await api('/api/clan');
    if (!dashboard.clan) tab = 'discover';
    render();
  }

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
      ${tab === 'warehouse' ? warehouseHtml(clan) : tab === 'quiz' ? quizHtml() : tab === 'activities' ? activitiesHtml() : membersHtml(clan)}
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

  function activitiesHtml() {
    return `
      <section class="clan-section">
        <h4>Следующие фазы миграции</h4>
        <div class="clan-coming">
          <article>👹 Клановый босс</article><article>🛒 Магазин</article>
          <article>⚔️ Дуэли</article><article>🏗️ Постройки</article>
          <article>⬆️ Улучшения</article><article>🏳️ Войны кланов</article>
        </div>
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
