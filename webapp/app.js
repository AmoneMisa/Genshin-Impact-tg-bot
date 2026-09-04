import { startWebGL } from './renderer.js';
import { openChestGame } from './chest.js';

const tg = window.Telegram?.WebApp;
const $ = (id) => document.getElementById(id);
const status = $('status');
let currentState = null;

function haptic(type = 'light') {
  try { tg?.HapticFeedback?.impactOccurred(type); } catch {}
}

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU', {
    notation: value >= 100000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value || 0);
}

async function api(path, options = {}) {
  if (!tg?.initData) throw new Error('Telegram initData отсутствует');

  const headers = {
    ...(options.headers || {}),
    'x-telegram-init-data': tg.initData,
  };
  if (options.body && !headers['content-type']) headers['content-type'] = 'application/json';

  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || payload.reason || `HTTP ${response.status}`);
    error.payload = payload;
    error.status = response.status;
    throw error;
  }
  return payload;
}

function render(state) {
  currentState = state;
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
    button.className = `game-card ${feature.status === 'webgl' ? 'migrated' : ''}`;
    button.innerHTML = `
      <span class="game-icon">${feature.icon}</span>
      ${feature.status === 'webgl' ? '<span class="mode-badge">PLAY</span>' : '<span class="mode-badge legacy">TEXT</span>'}
      <h3>${feature.title}</h3>
      <p>${feature.subtitle}</p>
      <span class="arrow">↗</span>`;

    button.addEventListener('click', async () => {
      haptic('medium');

      if (feature.id === 'chest' && feature.status === 'webgl') {
        try {
          await openChestGame({
            api,
            renderState: render,
            haptic,
            statusElement: status,
          });
          status.textContent = 'Сундуки работают через Mini App и используют ту же игровую сессию.';
        } catch (error) {
          console.error(error);
          status.textContent = `Сундуки: ${error.message}`;
        }
        return;
      }

      status.textContent = `${feature.title}: пока используется текстовый fallback. Перенесём этот режим следующим.`;
    });
    return button;
  }));

  status.textContent = 'Mini App подключён к существующей игровой сессии.';
}

async function loadState() {
  const payload = await api('/api/bootstrap');
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
