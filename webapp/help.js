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
  { id: 'hub', icon: '✨', title: 'Mini App', text: 'Игровой хаб теперь является основным интерфейсом. Карточки открывают серверные экраны игр, инвентаря, построек, анкет и других механик. Slash-команды остаются fallback-интерфейсом.' },
  { id: 'boss', icon: '⚔️', title: 'Босс', text: 'В группе одновременно существует один босс. Его характеристики масштабируются, атаки и награды считаются на сервере. Управление рейдом доступно из карточки «Босс».' },
  { id: 'arcade', icon: '🎲', title: 'Аркада', text: 'Кубики, боулинг, дартс, футбол, баскетбол и слоты объединены в один экран. RNG и начисления выполняются сервером; спортивные сессии можно сбросить из интерфейса.' },
  { id: 'profile', icon: '🧙', title: 'Персонаж', text: 'Класс, пол, характеристики, инвентарь, снаряжение и постройки вынесены в отдельные интерактивные экраны. Изменения сохраняются в Mongo.' },
  { id: 'forms', icon: '📝', title: 'Анкеты', text: 'Свою Genshin-анкету можно редактировать прямо в Mini App, а анкеты активных участников группы — просматривать без Telegram-клавиатур.' },
  { id: 'updates', icon: '🔔', title: 'Что нового', text: 'Подписку на новости бота можно включить или выключить в карточке «Что нового». Настройка сохраняется в Mongo для вашего участника текущего игрового чата; сами новости приходят в личный Telegram-чат с ботом.' },
  { id: 'mute', icon: '🔇', title: 'Self mute', text: 'Команда /self_mute остаётся Telegram-командой: она временно ограничивает отправку сообщений в супергруппе и зависит от прав бота.' },
  { id: 'contact', icon: '💬', title: 'Связь с разработчиком', text: 'Для вопросов, багов и предложений используйте карточку «Написать разработчику». Сообщение отправляется сервером через Telegram; /feedback сохранён как fallback с возможностью продолжить переписку в Telegram.' },
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
      <header class="overlay-head">
        <div><div class="eyebrow">HELP · MINI APP</div><h2>Справка</h2></div>
        <button class="overlay-close icon-button" type="button" aria-label="Закрыть">×</button>
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
      <p class="help-legacy-note">Slash-команды сохранены как fallback. Для уже перенесённых механик предпочтительнее использовать карточки Mini App.</p>`;
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
        <button type="button" data-help-tab="commands" class="${tab === 'commands' ? 'active' : ''}">Команды fallback</button>
      </div>
      ${tab === 'guides' ? guidesMarkup() : commandsMarkup()}`;
    bind();
    if (updateStatus) statusElement.textContent = tab === 'guides' ? 'Справка Mini App открыта.' : 'Открыт каталог fallback-команд.';
  }

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
}
