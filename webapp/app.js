import { startWebGL } from './renderer.js';

const tg = window.Telegram?.WebApp;
const $ = (id) => document.getElementById(id);
const status = $('status');

function haptic(type = 'light') {
  try { tg?.HapticFeedback?.impactOccurred(type); } catch {}
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    notation: value >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

function render(state) {
  const firstName = state.context.user.firstName || state.context.user.username || 'Путешественник';
  $('hello').textContent = `Привет, ${firstName}`;
  $('level').textContent = state.player.level;
  $('class-name').textContent = state.player.className === 'noClass' ? 'Без класса' : state.player.className;
  $('chat-badge').textContent = state.context.chatType || (state.context.chatId === state.context.user.id ? 'private' : 'group');
  $('gold').textContent = formatNumber(state.player.gold);
  $('crystals').textContent = formatNumber(state.player.crystals);
  $('ore').textContent = formatNumber(state.player.ironOre);
  $('arena-text').textContent = `Арена: ${state.player.arenaChances}`;
  $('xp-text').textContent = `${formatNumber(state.player.currentExp)} / ${formatNumber(state.player.needExp)} XP`;
  $('xp-fill').style.width = `${Math.min(100, Math.max(0, state.player.currentExp / state.player.needExp * 100))}%`;

  const grid = $('game-grid');
  grid.replaceChildren(...state.features.map((feature) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'game-card';
    button.innerHTML = `<span class="game-icon">${feature.icon}</span><h3>${feature.title}</h3><p>${feature.subtitle}</p><span class="arrow">↗</span>`;
    button.addEventListener('click', () => {
      haptic('medium');
      status.textContent = `${feature.title}: перенос игровой логики в Mini App будет следующим слоем. Текстовая команда пока остаётся рабочим fallback.`;
    });
    return button;
  }));

  status.textContent = 'Mini App подключён к существующей игровой сессии.';
}

async function loadState() {
  if (!tg?.initData) {
    throw new Error('Открой Mini App из Telegram — initData отсутствует.');
  }

  const response = await fetch('/api/bootstrap', {
    headers: { 'x-telegram-init-data': tg.initData },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  render(payload);
}

async function boot() {
  try {
    startWebGL($('webgl'));
  } catch (error) {
    console.warn(error);
    document.body.style.background = 'radial-gradient(circle at top, #241842, #0b0d17 60%)';
  }

  try {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.('#0f1120');
    tg?.setBackgroundColor?.('#0b0d17');
    tg?.disableVerticalSwipes?.();
  } catch {}

  $('fullscreen').addEventListener('click', () => {
    haptic();
    try {
      if (tg?.isFullscreen) tg.exitFullscreen();
      else tg?.requestFullscreen?.();
    } catch {}
  });

  try {
    await loadState();
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
    $('hello').textContent = 'Не удалось загрузить профиль';
  }
}

boot();
