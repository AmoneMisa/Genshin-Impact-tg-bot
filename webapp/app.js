import { startWebGL } from './renderer.js';
import { openChestGame } from './chest.js';
import { openGachaGame } from './gacha.js';
import { openEquipmentGame } from './equipment.js';
import { openBuildsGame } from './builds.js';
import { openArenaGame } from './arena.js';
import { openBossGame } from './boss.js';
import { openShopGame } from './shop.js';
import { openSwordGame } from './sword.js';
import { openArcadeGame } from './arcade.js';
import { openGoldTransfer } from './gold-transfer.js';
import { openPoint21 } from './point21.js';

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

      if (feature.id === 'boss' && feature.status === 'webgl') {
        try {
          await openBossGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Босс работает через Mini App; общий рейд хранится в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Босс: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'chest' && feature.status === 'webgl') {
        try {
          await openChestGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Сундуки работают через Mini App и сохраняют награды в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Сундуки: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'gacha' && feature.status === 'webgl') {
        try {
          await openGachaGame({
            api,
            renderState: render,
            haptic,
            statusElement: status,
            playerLevel: currentState?.player?.level || 1,
          });
          status.textContent = 'Гача работает через Mini App; RNG и списание ресурсов остаются серверными.';
        } catch (error) {
          console.error(error);
          status.textContent = `Гача: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'equipment' && feature.status === 'webgl') {
        try {
          await openEquipmentGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Снаряжение работает через Mini App и сохраняется в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Снаряжение: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'builds' && feature.status === 'webgl') {
        try {
          await openBuildsGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Постройки работают через Mini App; улучшения и сбор ресурсов сохраняются в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Постройки: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'arena' && feature.status === 'webgl') {
        try {
          await openArenaGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Арена работает через Mini App; бой и рейтинг считаются на сервере.';
        } catch (error) {
          console.error(error);
          status.textContent = `Арена: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'shop' && feature.status === 'webgl') {
        try {
          await openShopGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Магазин работает через Mini App и сохраняет покупки в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Магазин: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'transfer' && feature.status === 'webgl') {
        try {
          await openGoldTransfer({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Переводы золота работают через Mini App и сохраняются в Mongo.';
        } catch (error) {
          console.error(error);
          status.textContent = `Переводы: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'point21' && feature.status === 'webgl') {
        try {
          await openPoint21({ api, renderState: render, haptic, statusElement: status });
          status.textContent = '21 очко работает через общий серверный стол Mini App.';
        } catch (error) {
          console.error(error);
          status.textContent = `21 очко: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'sword' && feature.status === 'webgl') {
        try {
          await openSwordGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Меч работает через Mini App; бросок и дневной таймер считаются на сервере.';
        } catch (error) {
          console.error(error);
          status.textContent = `Меч: ${error.message}`;
        }
        return;
      }

      if (feature.id === 'arcade' && feature.status === 'webgl') {
        try {
          await openArcadeGame({ api, renderState: render, haptic, statusElement: status });
          status.textContent = 'Аркада работает через Mini App; результаты генерируются на сервере.';
        } catch (error) {
          console.error(error);
          status.textContent = `Аркада: ${error.message}`;
        }
        return;
      }

      status.textContent = `${feature.title}: пока используется текстовый fallback. Перенесём этот режим следующим.`;
    });
    return button;
  }));

  status.textContent = 'Mini App подключён к Mongo-сессии игрока.';
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
