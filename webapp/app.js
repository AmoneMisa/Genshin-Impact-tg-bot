import { startWebGL } from './renderer.js';
import { menuArtFor } from './menu-art.js';
import { startGameVfx } from './vfx.js';
import { renderPlayerHud } from './hud.js';
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
import { openSkillsGame } from './skills.js';
import { openFormsGame } from './forms.js';
import { openInventoryGame } from './inventory.js';
import { openExchangeGame } from './exchange.js';
import { openUpdatesGame } from './updates.js';
import { openFeedbackGame } from './feedback.js';
import { openHelpGame } from './help.js';
import { openChatSettings } from './chat-settings.js';
import { openSelfMute } from './self-mute.js';
import { mountCity } from './city.js';
import { openFriendsGame } from './friends.js';
import { featuresForTab, navHtml, NAV_TABS } from './nav.js';

const tg = window.Telegram?.WebApp;
const $ = id => document.getElementById(id);
const status = $('status');
let currentState = null;
let webglFx = null;
let activeTab = 'city';
let city = null;
let cityMounting = null;

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
  skills: [openSkillsGame, 'Навыки и их улучшения работают через Mini App и сохраняются в Mongo.'],
  forms: [openFormsGame, 'Анкеты работают через Mini App и сохраняются в Mongo.'],
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
  friends: [openFriendsGame, 'Друзья работают через Mini App и хранятся в Mongo.'],
  clan: [openClanGame, 'Кланы работают через Mini App; основное состояние хранится в Mongo.'],
  bonus: [openBonusGame, 'Ежедневный бонус работает через серверный RNG и сохраняется в Mongo.'],
  titles: [openTitlesGame, 'Титулы работают через Mongo и серверный выбор участника.'],
  horoscope: [openHoroscopeGame, 'Гороскоп работает через серверный FreeLLMAPI с локальным fallback.'],
  sword: [openSwordGame, 'Меч работает через Mini App; бросок и дневной таймер считаются на сервере.'],
  arcade: [openArcadeGame, 'Аркада работает через Mini App; результаты генерируются на сервере.'],
  selfMute: [openSelfMute, 'Само-мут работает через Telegram moderation API.'],
  chatSettings: [openChatSettings, 'Админские настройки текущего чата работают через Mini App.'],
  updates: [openUpdatesGame, 'Настройки уведомлений сохранены в Mongo.'],
  feedback: [openFeedbackGame, 'Форма обратной связи открыта в Mini App.'],
  help: [openHelpGame, 'Справка и каталог fallback-команд открыты в Mini App.'],
};

async function launchFeature(feature, render) {
  if (feature.available === false) {
    status.textContent = `${feature.title}: доступно только в групповом чате.`;
    haptic('light');
    return;
  }

  const entry = launchers[feature.id];
  if (!entry || feature.status !== 'webgl') {
    status.textContent = `${feature.title}: пока используется текстовый fallback.`;
    return;
  }

  const [open, successText] = entry;
  try {
    webglFx?.transition?.(feature.id);
    await open({
      api,
      renderState: render,
      haptic,
      statusElement: status,
      context: currentState?.context || null,
      player: currentState?.player || null,
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
  renderPlayerHud({ state, getElement: $, formatNumber });
  $('gold').textContent = formatNumber(state.player.gold);
  $('crystals').textContent = formatNumber(state.player.crystals);
  $('ore').textContent = formatNumber(state.player.ironOre);

  const cards = featuresForTab(state.features, activeTab).map(feature => {
    const unavailable = feature.available === false;
    const button = document.createElement('button');
    button.type = 'button';
    button.disabled = unavailable;
    const art = menuArtFor(feature.id, state.player);
    button.className = `game-card ${feature.status === 'webgl' ? 'migrated' : ''} ${unavailable ? 'unavailable' : ''} ${art ? 'has-art' : ''}`.trim();
    if (art) button.style.setProperty('--card-art', `url("${art}")`);
    button.setAttribute('aria-disabled', String(unavailable));
    button.innerHTML = `
      ${art ? '<span class="game-art" aria-hidden="true"></span>' : ''}
      <span class="game-icon">${feature.icon}</span>
      ${unavailable
        ? '<span class="mode-badge group-only">GROUP</span>'
        : feature.status === 'webgl'
          ? '<span class="mode-badge">PLAY</span>'
          : '<span class="mode-badge legacy">TEXT</span>'}
      <h3>${feature.title}</h3>
      <p>${unavailable ? 'Доступно только в групповом чате' : feature.subtitle}</p>
      <span class="arrow">${unavailable ? '🔒' : '↗'}</span>`;
    if (!unavailable) {
      button.addEventListener('click', () => {
        haptic('medium');
        launchFeature(feature, render);
      });
    }
    return button;
  });
  $('game-grid').replaceChildren(...cards);
  renderTabs();
  status.textContent = 'Mini App подключён к Mongo-сессии игрока.';
}

function renderTabs() {
  $('bottom-nav').innerHTML = navHtml(activeTab);
  const isCity = activeTab === 'city';
  document.querySelectorAll('[data-tab-panel]').forEach(node => {
    node.hidden = (node.dataset.tabPanel === 'city') !== isCity;
  });
  const tab = NAV_TABS.find(item => item.id === activeTab);
  $('tab-title').textContent = isCity ? '' : tab.label;
  if (isCity) showCity();
}

async function showCity() {
  if (city) return;
  if (cityMounting) return cityMounting;
  cityMounting = mountCity($('city'), { api, haptic, onState: render })
    .then(mounted => { city = mounted; })
    .catch(error => {
      console.error(error);
      $('city').innerHTML = `<p class="city-error">Город не загрузился: ${error.message}</p>`;
    })
    .finally(() => { cityMounting = null; });
  return cityMounting;
}

function switchTab(tabId) {
  if (tabId === activeTab || !NAV_TABS.some(tab => tab.id === tabId)) return;
  activeTab = tabId;
  haptic('light');
  if (tabId === 'city') city?.refresh().catch(() => {});
  if (currentState) render(currentState);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openFeatureById(id) {
  const feature = currentState?.features.find(item => item.id === id);
  if (feature) launchFeature(feature, render);
}

async function loadState() {
  render(await api('/api/bootstrap'));
}

async function boot() {
  try {
    webglFx = startWebGL($('webgl'));
  } catch (error) {
    console.warn(error);
    document.body.style.background = 'radial-gradient(circle at top, #241842, #0b0d17 60%)';
  }

  startGameVfx();

  try {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.('#0f1120');
    tg?.setBackgroundColor?.('#0b0d17');
    tg?.disableVerticalSwipes?.();
  } catch {}

  $('bottom-nav').addEventListener('click', event => {
    const tab = event.target.closest('[data-nav-tab]');
    if (tab) switchTab(tab.dataset.navTab);
  });
  document.querySelectorAll('[data-open-feature]').forEach(button => {
    button.addEventListener('click', () => { haptic('light'); openFeatureById(button.dataset.openFeature); });
  });
  document.querySelectorAll('[data-nav-jump]').forEach(button => {
    button.addEventListener('click', () => switchTab(button.dataset.navJump));
  });

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
