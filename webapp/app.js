import { language } from './i18n/init.js';
import { openLanguageGame } from './language.js';
import { openBuffsGame } from './buffs.js';
import { openPassivesGame } from './passives.js';
import { openHuntGame } from './hunt.js';
import { openPartyGame } from './party.js';
import { openMerchantsGame } from './merchants.js';
import { openTattoosGame } from './tattoos.js';
import { openFishingGame } from './fishing.js';
import { openLuckShopGame } from './luck-shop.js';
import { openAuctionGame } from './auction.js';
import { startItemArt } from './item-art-runtime.js';
import { installOverlayA11y } from './overlay-a11y.js';
import { startWebGL } from './renderer.js';
import { menuArtFor } from './menu-art.js';
import { startGameVfx } from './vfx.js';
import { renderPlayerHud } from './hud.js';
import { openChestGame } from './chest.js';
import { openGachaGame } from './gacha.js';
import { openEquipmentGame } from './equipment.js';
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
import { openCharacterPage } from './character.js';
import { openSkillsGame } from './skills.js';
import { openClassQuests } from './class-quests.js';
import { openFormsGame } from './forms.js';
import { openInventoryGame } from './inventory.js';
import { openExchangeGame } from './exchange.js';
import { openUpdatesGame } from './updates.js';
import { openFeedbackGame } from './feedback.js';
import { openMailGame, openPromoGame } from './mail.js';
import { openAdminGame } from './admin.js';
import { showHelloNotices } from './notices.js';
import { openHelpGame } from './help.js';
import { openChatSettings } from './chat-settings.js';
import { openSelfMute } from './self-mute.js';
import { mountCity } from './city.js';
import { openFriendsGame, openPlayerCard } from './friends.js';
import { createLoader } from './loading.js';
import { watchGlyphs } from './glyph-center.js';
import { badgeHtml, featureIconHtml, featuresForTab, navHtml, NAV_TABS } from './nav.js';
import { startEmojiIcons } from './icons.js';

const tg = window.Telegram?.WebApp;
const $ = id => document.getElementById(id);
const status = $('status');
let currentState = null;
let webglFx = null;
let activeTab = 'city';
const loader = createLoader();
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

// Red-dot counts keyed by feature id (see /api/badges).
let badges = {};
const BADGE_REFRESH_MS = 45_000;

async function refreshBadges() {
  try {
    const next = await api('/api/badges');
    const { total, ...counts } = next;
    const changed = JSON.stringify(counts) !== JSON.stringify(badges);
    badges = counts;
    if (changed && currentState) render(currentState);
  } catch {
    // Dots are decorative; keep the last known counts.
  }
}

async function api(path, options = {}) {
  if (!tg?.initData) throw new Error('Telegram initData отсутствует');
  const headers = { ...(options.headers || {}), 'x-telegram-init-data': tg.initData, 'x-app-lang': language };
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

// Feature id → the function that opens its screen.
const launchers = {
  profile: options => openCharacterPage(options, 'stats'),
  skills: options => openCharacterPage(options, 'skills'),
  classQuests: openClassQuests,
  forms: openFormsGame,
  inventory: openInventoryGame,
  exchange: openExchangeGame,
  boss: openBossGame,
  hunt: openHuntGame,
  party: openPartyGame,
  merchants: openMerchantsGame,
  tattoos: openTattoosGame,
  fishing: openFishingGame,
  catacombs: options=>openHuntGame({...options,initialZoneKind:'catacomb'}),
  chest: openChestGame,
  gacha: openGachaGame,
  equipment: options => openCharacterPage(options, 'equipment'),
  arena: openArenaGame,
  steal: openStealGame,
  shop: openShopGame,
  transfer: openGoldTransfer,
  point21: openPoint21,
  elements: openElementsGame,
  friends: openFriendsGame,
  clan: openClanGame,
  bonus: openBonusGame,
  titles: openTitlesGame,
  horoscope: openHoroscopeGame,
  sword: openSwordGame,
  arcade: openArcadeGame,
  selfMute: openSelfMute,
  chatSettings: openChatSettings,
  updates: openUpdatesGame,
  feedback: openFeedbackGame,
  language: openLanguageGame,
  buffs: options => openCharacterPage(options, 'effects'),
  passives: options => openCharacterPage(options, 'skills'),
  luckShop: openLuckShopGame,
  auction: openAuctionGame,
  mail: openMailGame,
  promo: openPromoGame,
  admin: openAdminGame,
  help: openHelpGame,
};

async function launchFeature(feature, render) {
  if (feature.available === false) {
    status.textContent = `${feature.title}: доступно только в групповом чате.`;
    haptic('light');
    return;
  }

  const entry = launchers[feature.id];
  if (!entry || feature.status !== 'webgl') {
    status.textContent = `${feature.title}: пока доступно только командой в чате.`;
    return;
  }

  const open = entry;
  if (loader.busy) return; // a screen is already opening: ignore double taps
  try {
    webglFx?.transition?.(feature.id);
    // Screens resolve once their overlay is on the page, so the veil covers
    // exactly the wait for their data.
    await loader.run(`Открываем: ${feature.title}…`, () => open({
      api,
      renderState: render,
      haptic,
      statusElement: status,
      context: currentState?.context || null,
      player: currentState?.player || null,
      ...(feature.id === 'gacha' ? { playerLevel: currentState?.player?.level || 1 } : {}),
    }));
    status.textContent = '';
    refreshBadges();
  } catch (error) {
    console.error(error);
    status.textContent = `${feature.title}: ${error.message}`;
    loader.error(`${feature.title}: не удалось открыть — ${error.message}`);
  }
}

function render(state) {
  currentState = state;
  renderPlayerHud({ state, getElement: $, formatNumber });
  $('gold').textContent = formatNumber(state.player.gold);
  $('crystals').textContent = formatNumber(state.player.crystals);
  $('luck-coins').textContent = formatNumber(state.player.luckCoins);
  $('ore').textContent = formatNumber(state.player.ironOre);
  for (const id of ['gold', 'crystals', 'luck-coins', 'ore']) {
    $(id).title = `${$(id).getAttribute('aria-label')}: ${$(id).textContent}`;
  }

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
      <span class="game-icon">${featureIconHtml(feature)}</span>
      ${unavailable
        ? '<span class="mode-badge group-only">ГРУППА</span>'
        : feature.status === 'webgl'
          ? '<span class="mode-badge">ИГРАТЬ</span>'
          : '<span class="mode-badge legacy">ЧАТ</span>'}
      ${badgeHtml(badges[feature.id])}
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
  renderGearDot();
  status.textContent = '';
}

// Mail notifications belong to the mail shortcut, not settings.
function renderGearDot() {
  const gear = document.querySelector('[data-open-feature="mail"]');
  if (!gear) return;
  gear.querySelector('.red-dot')?.remove();
  if (badges.mail > 0) gear.insertAdjacentHTML('beforeend', badgeHtml(badges.mail));
}

function renderTabs() {
  $('bottom-nav').innerHTML = navHtml(activeTab, badges);
  const isCity = activeTab === 'city';
  document.querySelector('.top-hud')?.classList.toggle('is-city-compact', isCity);
  document.querySelectorAll('[data-tab-panel]').forEach(node => {
    node.hidden = (node.dataset.tabPanel === 'city') !== isCity;
  });
  const tab = NAV_TABS.find(item => item.id === activeTab);
  $('tab-title').textContent = isCity ? '' : tab.title;
  $('tab-hint').textContent = isCity ? '' : tab.hint;
  if (isCity) showCity();
}

async function showCity() {
  if (city) return;
  if (cityMounting) return cityMounting;
  cityMounting = mountCity($('city'), { api, haptic, onState: render })
    .then(mounted => { city = mounted; })
    .catch(error => {
      console.error(error);
      $('city').innerHTML = `<p class="city-error">Город не загрузился</p>`;
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
  refreshBadges();
}

async function boot() {
  watchGlyphs(document.body);
  startItemArt();
  startEmojiIcons();
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
  // Any player name marked data-player-card (boss party, clan, rankings…) opens their card.
  document.addEventListener('click', async event => {
    const target = event.target.closest?.('[data-player-card]');
    if (!target || event.target.closest('button:not([data-player-card])')) return;
    event.preventDefault();
    if (loader.busy) return;
    haptic('light');
    try {
      await loader.run('Открываем игрока…', () => openPlayerCard({ api, haptic, userId: target.dataset.playerCard }));
    } catch (error) {
      const message = error.status === 404 ? 'Этот игрок не из текущего чата.' : error.message;
      status.textContent = message;
      loader.error(message);
    }
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
    showHelloNotices({ api, haptic });
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
    $('hello').textContent = 'Не удалось загрузить профиль';
  }
}

boot();
window.setInterval(() => { if (!document.hidden) refreshBadges(); }, BADGE_REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshBadges(); });

installOverlayA11y();
