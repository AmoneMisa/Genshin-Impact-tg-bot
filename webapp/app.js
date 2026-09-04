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
import { openElementsGame } from './elements.js';
import { openBonusGame } from './bonus.js';
import { openTitlesGame } from './titles.js';
import { openHoroscopeGame } from './horoscope.js';
import { openClanGame } from './clan.js';
import { openStealGame } from './steal.js';
import { openPlayerProfile } from './profile.js';
import { openInventoryGame } from './inventory.js';
import { openExchangeGame } from './exchange.js';

const tg = window.Telegram?.WebApp;
const $ = id => document.getElementById(id);
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
  const headers = { ...(options.headers || {}), 'x-telegram-init-data': tg.initData };
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

const launchers = {
  profile: [openPlayerProfile, 'Профиль персонажа работает через Mini App и сохраняется в Mongo.'],
  inventory: [openInventoryGame, 'Инвентарь работает через Mini App; расходники сохраняются в Mongo.'],
  exchange: [openExchangeGame, 'Обменник работает через Mini App и сохраняет покупку в Mongo.'],
  boss: [openBossGame, 'Босс работает через Mini App; общий рейд хранится в Mongo.'],
  chest: [openChestGame, 'Сундуки работают через Mini App и сохраняют награды в Mongo.'],
  gacha: [openGachaGame, 'Гача работает через Mini App; RNG и списание ресурсов остаются серверными.'],
  equipment: [openEquipmentGame, 'Снаряжение работает через Mini App и сохраняется в Mongo.'],
  builds: [openBuildsGame, 'Постройки работают через Mini App; улучшения и сбор ресурсов сохраняются в Mongo.'],
  arena: [openArenaGame, 'Арена работает через Mini App; бой и рейтинг считаются на сервере.'],
  steal: [openStealGame, 'Ограбление работает через Mini App; бой и перенос ресурсов считаются на сервере.'],
  shop: [openShopGame, 'Магазин работает через Mini App и сохраняет покупки в Mongo.'],
  transfer: [openGoldTransfer, 'Переводы золота работают через Mini App и сохраняются в Mongo.'],
  point21: [openPoint21, '21 очко работает через общий серверный стол Mini App.'],
  elements: [openElementsGame, 'Стихии работают через общий серверный стол Mini App.'],
  clan: [openClanGame, 'Кланы работают через Mini App; основное состояние хранится в Mongo.'],
  bonus: [openBonusGame, 'Ежедневный бонус работает через серверный RNG и сохраняется в Mongo.'],
  titles: [openTitlesGame, 'Титулы работают через Mongo и серверный выбор участника.'],
  horoscope: [openHoroscopeGame, 'Гороскоп работает через серверный FreeLLMAPI с локальным fallback.'],
  sword: [openSwordGame, 'Меч работает через Mini App; бросок и дневной таймер считаются на сервере.'],
  arcade: [openArcadeGame, 'Аркада работает через Mini App; результаты генерируются на сервере.'],
};

async function launchFeature(feature, render) {
  const entry = launchers[feature.id];
  if (!entry || feature.status !== 'webgl') {
    status.textContent = `${feature.title}: пока используется текстовый fallback.`;
    return;
  }

  const [open, successText] = entry;
  try {
    await open({
      api,
      renderState: render,
      haptic,
      statusElement: status,
      ...(feature.id === 'gacha' ? { playerLevel: currentState?.player?.level || 1 } : {}),
    });
    status.textContent = successText;
  } catch (error) {
    console.error(error);
    status.textContent = `${feature.title}: ${error.message}`;
  }
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

  const cards = state.features.map(feature => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `game-card ${feature.status === 'webgl' ? 'migrated' : ''}`;
    button.innerHTML = `
      <span class="game-icon">${feature.icon}</span>
      ${feature.status === 'webgl' ? '<span class="mode-badge">PLAY</span>' : '<span class="mode-badge legacy">TEXT</span>'}
      <h3>${feature.title}</h3>
      <p>${feature.subtitle}</p>
      <span class="arrow">↗</span>`;
    button.addEventListener('click', () => {
      haptic('medium');
      launchFeature(feature, render);
    });
    return button;
  });
  $('game-grid').replaceChildren(...cards);
  status.textContent = 'Mini App подключён к Mongo-сессии игрока.';
}

async function loadState() {
  render(await api('/api/bootstrap'));
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