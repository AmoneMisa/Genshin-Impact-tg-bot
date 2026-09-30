const COMMAND_GROUPS = [
  {
    id: 'games',
    title: 'Игры',
    icon: '🎮',
    commands: [
      ['title', 'Получить случайный титул'], ['titles', 'Список титулов группы'],
      ['sword', 'Увеличить свой меч'], ['swords', 'Список мечей всей группы'],
      ['shop', 'Магазин'], ['send_gold', 'Перевести золото'], ['chest', 'Открыть сундук'],
      ['point', 'Игра в 21 очко'], ['slots', 'Слоты'], ['dice', 'Кубики'],
      ['bowling', 'Боулинг'], ['darts', 'Дартс'], ['basketball', 'Баскетбол'],
      ['football', 'Футбол'], ['elements', 'Элементы'], ['lucky_roll', 'Гача'],
      ['horoscope', 'Шуточный гороскоп'], ['bonus', 'Ежедневный бонус'], ['boss', 'Меню босса'],
    ],
  },
  {
    id: 'player',
    title: 'Персонаж',
    icon: '🧙',
    commands: [
      ['whoami', 'Статистика и меню персонажа'], ['steal_resources', 'Украсть ресурсы у другого игрока'],
      ['select_gender', 'Указать пол персонажа'], ['exchange', 'Обменник кристаллов'],
    ],
  },
  {
    id: 'forms',
    title: 'Анкеты',
    icon: '📝',
    commands: [['info', 'Анкеты группы'], ['form', 'Заполнить свою анкету']],
  },
  {
    id: 'resets',
    title: 'Сброс игр',
    icon: '↺',
    commands: [
      ['reset_darts_game', 'Сбросить дартс'], ['reset_dice_game', 'Сбросить кубики'],
      ['reset_bowling_game', 'Сбросить боулинг'], ['reset_basketball_game', 'Сбросить баскетбол'],
      ['reset_football_game', 'Сбросить футбол'],
    ],
  },
];

const GUIDES = [
  { id: 'hub', icon: '✨', title: 'Город', text: 'Весь город в одном окне: здания открывают игры, инвентарь, постройки, анкеты и остальное. Старые команды в чате тоже работают.' },
  { id: 'boss', icon: '⚔️', title: 'Босс', text: 'В чате живёт один общий босс. Бейте его всем чатом — награду получает каждый участник рейда.' },
  { id: 'arcade', icon: '🎲', title: 'Аркада', text: 'Кубики, боулинг, дартс, футбол, баскетбол и слоты — в одном зале. Зависшую партию можно сбросить прямо оттуда.' },
  { id: 'profile', icon: '🧙', title: 'Персонаж', text: 'Класс, пол, характеристики, инвентарь, снаряжение и постройки — у каждого свой экран.' },
  { id: 'forms', icon: '📝', title: 'Анкеты', text: 'Заполни свою Genshin-анкету и загляни в анкеты других участников чата.' },
  { id: 'updates', icon: '🔔', title: 'Что нового', text: 'Включи уведомления, чтобы узнавать о новых играх и возможностях первым. Новости приходят в личку от бота.' },
  { id: 'mute', icon: '🔇', title: 'Само-мут', text: 'Нужна пауза? Само-мут на 2 минуты запретит тебе писать в чат. Работает, если у бота есть права администратора.' },
  { id: 'contact', icon: '💬', title: 'Связь с разработчиком', text: 'Нашёл баг или есть идея? Напиши разработчику из экрана «Связь с разработчиком» или командой /feedback в чате.' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function commandRows(query, groupId) {
  const normalized = query.trim().toLowerCase();
  const groups = groupId === 'all' ? COMMAND_GROUPS : COMMAND_GROUPS.filter(group => group.id === groupId);
  const rows = [];
  for (const group of groups) {
    for (const [command, description] of group.commands) {
      if (normalized && !`${command} ${description}`.toLowerCase().includes(normalized)) continue;
      rows.push({ group, command, description });
    }
  }
  return rows;
}

export async function openHelpGame({ haptic, statusElement }) {
  let tab = 'guides';
  let groupId = 'all';
  let query = '';

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay help-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass help-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Справка</h2>
        <span class="ds-round" aria-hidden="true">📖</span>
      </header>
      <div data-help-content></div>
    </div>`;

  const content = overlay.querySelector('[data-help-content]');
  const close = () => {
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  function guidesMarkup() {
    return `<div class="help-guide-grid">${GUIDES.map(guide => `
      <article class="help-guide-card">
        <span>${guide.icon}</span>
        <div><strong>${escapeHtml(guide.title)}</strong><p>${escapeHtml(guide.text)}</p></div>
      </article>`).join('')}</div>`;
  }

  function commandsMarkup() {
    const rows = commandRows(query, groupId);
    return `
      <div class="help-command-tools">
        <label class="help-search"><span>⌕</span><input type="search" value="${escapeHtml(query)}" placeholder="Найти команду…" data-help-search /></label>
        <div class="help-filters">
          <button type="button" data-help-group="all" class="${groupId === 'all' ? 'active' : ''}">Все</button>
          ${COMMAND_GROUPS.map(group => `<button type="button" data-help-group="${group.id}" class="${groupId === group.id ? 'active' : ''}">${group.icon} ${escapeHtml(group.title)}</button>`).join('')}
        </div>
      </div>
      <div class="help-command-list">
        ${rows.length ? rows.map(({ group, command, description }) => `
          <article class="help-command-row">
            <div><code>/${escapeHtml(command)}</code><small>${group.icon} ${escapeHtml(group.title)}</small></div>
            <p>${escapeHtml(description)}</p>
          </article>`).join('') : '<div class="help-empty">Команды не найдены.</div>'}
      </div>
      <p class="help-legacy-note">Команды работают прямо в чате. Для большинства игр удобнее открыть здание в городе.</p>`;
  }

  function bind() {
    content.querySelectorAll('[data-help-tab]').forEach(button => {
      button.addEventListener('click', () => {
        tab = button.dataset.helpTab;
        haptic('light');
        render();
      });
    });
    content.querySelectorAll('[data-help-group]').forEach(button => {
      button.addEventListener('click', () => {
        groupId = button.dataset.helpGroup;
        haptic('light');
        render();
      });
    });
    content.querySelector('[data-help-search]')?.addEventListener('input', event => {
      query = event.target.value;
      render(false);
      const input = content.querySelector('[data-help-search]');
      input?.focus();
      if (input) input.setSelectionRange(input.value.length, input.value.length);
    });
  }

  function render(updateStatus = true) {
    content.innerHTML = `
      <div class="help-tabs">
        <button type="button" data-help-tab="guides" class="${tab === 'guides' ? 'active' : ''}">Как пользоваться</button>
        <button type="button" data-help-tab="commands" class="${tab === 'commands' ? 'active' : ''}">Команды чата</button>
      </div>
      ${tab === 'guides' ? guidesMarkup() : commandsMarkup()}`;
    bind();
    if (updateStatus) statusElement.textContent = tab === 'guides' ? 'Справка открыта.' : 'Открыт список команд.';
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
