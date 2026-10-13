import {updateDeathPopup} from './death-popup.js';
import {bindFeatureLinks} from './feature-links.js';
import {requestJson} from './request-json.js';
import {observeSelects} from './design/select.js';
import {ensureFeatureStyles} from './feature-styles.js';
import { language } from './i18n/init.js';
const openLanguageGame = (...args) => Promise.all([ensureFeatureStyles(),import('./language.js')]).then(([,module]) => module.openLanguageGame(...args));
const openBuffsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./buffs.js')]).then(([,module]) => module.openBuffsGame(...args));
const openPassivesGame = (...args) => Promise.all([ensureFeatureStyles(),import('./passives.js')]).then(([,module]) => module.openPassivesGame(...args));
const openHuntGame = (...args) => Promise.all([ensureFeatureStyles(),import('./hunt.js')]).then(([,module]) => module.openHuntGame(...args));
const openWorldMap = (...args) => Promise.all([ensureFeatureStyles(),import('./world-map.js')]).then(([,module]) => module.openWorldMap(...args));
const openPartyGame = (...args) => Promise.all([ensureFeatureStyles(),import('./party.js')]).then(([,module]) => module.openPartyGame(...args));
const openMerchantsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./merchants.js')]).then(([,module]) => module.openMerchantsGame(...args));
const openTattoosGame = (...args) => Promise.all([ensureFeatureStyles(),import('./tattoos.js')]).then(([,module]) => module.openTattoosGame(...args));
const openFishingGame = (...args) => Promise.all([ensureFeatureStyles(),import('./fishing.js')]).then(([,module]) => module.openFishingGame(...args));
const openAuctionGame = (...args) => Promise.all([ensureFeatureStyles(),import('./auction.js')]).then(([,module]) => module.openAuctionGame(...args));
import { startItemArt } from './item-art-runtime.js';
import { installOverlayA11y } from './overlay-a11y.js';
import { startWebGL } from './renderer.js';
import { menuArtFor } from './menu-art.js';
import { startGameVfx } from './vfx.js';
import { renderPlayerHud } from './hud.js';
const openChestGame = (...args) => Promise.all([ensureFeatureStyles(),import('./chest.js')]).then(([,module]) => module.openChestGame(...args));
const openGachaGame = (...args) => Promise.all([ensureFeatureStyles(),import('./gacha.js')]).then(([,module]) => module.openGachaGame(...args));
const openEquipmentGame = (...args) => Promise.all([ensureFeatureStyles(),import('./equipment.js')]).then(([,module]) => module.openEquipmentGame(...args));
const openArenaGame = (...args) => Promise.all([ensureFeatureStyles(),import('./arena.js')]).then(([,module]) => module.openArenaGame(...args));
const openBossGame = (...args) => Promise.all([ensureFeatureStyles(),import('./boss.js')]).then(([,module]) => module.openBossGame(...args));
const openShopGame = (...args) => Promise.all([ensureFeatureStyles(),import('./shop.js')]).then(([,module]) => module.openShopGame(...args));
const openSwordGame = (...args) => Promise.all([ensureFeatureStyles(),import('./sword.js')]).then(([,module]) => module.openSwordGame(...args));
const openArcadeGame = (...args) => Promise.all([ensureFeatureStyles(),import('./arcade.js')]).then(([,module]) => module.openArcadeGame(...args));
const openGoldTransfer = (...args) => Promise.all([ensureFeatureStyles(),import('./gold-transfer.js')]).then(([,module]) => module.openGoldTransfer(...args));
const openPoint21 = (...args) => Promise.all([ensureFeatureStyles(),import('./point21.js')]).then(([,module]) => module.openPoint21(...args));
const openElementsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./elements.js')]).then(([,module]) => module.openElementsGame(...args));
const openBonusGame = (...args) => Promise.all([ensureFeatureStyles(),import('./bonus.js')]).then(([,module]) => module.openBonusGame(...args));
const openLoginRewards = (...args) => Promise.all([ensureFeatureStyles(),import('./login-rewards.js')]).then(([,module]) => module.openLoginRewards(...args));
const openTitlesGame = (...args) => Promise.all([ensureFeatureStyles(),import('./titles.js')]).then(([,module]) => module.openTitlesGame(...args));
const openHoroscopeGame = (...args) => Promise.all([ensureFeatureStyles(),import('./horoscope.js')]).then(([,module]) => module.openHoroscopeGame(...args));
const openClanGame = (...args) => Promise.all([ensureFeatureStyles(),import('./clan.js')]).then(([,module]) => module.openClanGame(...args));
const openStealGame = (...args) => Promise.all([ensureFeatureStyles(),import('./steal.js')]).then(([,module]) => module.openStealGame(...args));
const openPlayerProfile = (...args) => Promise.all([ensureFeatureStyles(),import('./profile.js')]).then(([,module]) => module.openPlayerProfile(...args));
const openCharacterPage = (...args) => Promise.all([ensureFeatureStyles(),import('./character.js')]).then(([,module]) => module.openCharacterPage(...args));
const openSkillsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./skills.js')]).then(([,module]) => module.openSkillsGame(...args));
const openClassQuests = (...args) => Promise.all([ensureFeatureStyles(),import('./class-quests.js')]).then(([,module]) => module.openClassQuests(...args));
const openFormsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./forms.js')]).then(([,module]) => module.openFormsGame(...args));
const openInventoryGame = (...args) => Promise.all([ensureFeatureStyles(),import('./inventory.js')]).then(([,module]) => module.openInventoryGame(...args));
const openWarehouseGame = (...args) => Promise.all([ensureFeatureStyles(),import('./warehouse.js')]).then(([,module]) => module.openWarehouseGame(...args));
const openTradeGame = (...args) => Promise.all([ensureFeatureStyles(),import('./trade.js')]).then(([,module]) => module.openTradeGame(...args));
const openExchangeGame = (...args) => Promise.all([ensureFeatureStyles(),import('./exchange.js')]).then(([,module]) => module.openExchangeGame(...args));
const openUpdatesGame = (...args) => Promise.all([ensureFeatureStyles(),import('./updates.js')]).then(([,module]) => module.openUpdatesGame(...args));
const openFeedbackGame = (...args) => Promise.all([ensureFeatureStyles(),import('./feedback.js')]).then(([,module]) => module.openFeedbackGame(...args));
const openMailGame = (...args) => Promise.all([ensureFeatureStyles(),import('./mail.js')]).then(([,module]) => module.openMailGame(...args));
const openPromoGame = (...args) => Promise.all([ensureFeatureStyles(),import('./mail.js')]).then(([,module]) => module.openPromoGame(...args));
const openAdminGame = (...args) => Promise.all([ensureFeatureStyles(),import('./admin.js')]).then(([,module]) => module.openAdminGame(...args));
const showHelloNotices = (...args) => import('./notices.js').then(module => module.showHelloNotices(...args));
const openHelpGame = (...args) => Promise.all([ensureFeatureStyles(),import('./help.js')]).then(([,module]) => module.openHelpGame(...args));
const openChatSettings = (...args) => Promise.all([ensureFeatureStyles(),import('./chat-settings.js')]).then(([,module]) => module.openChatSettings(...args));
const openSelfMute = (...args) => Promise.all([ensureFeatureStyles(),import('./self-mute.js')]).then(([,module]) => module.openSelfMute(...args));
import { mountCity } from './city.js';
const openFriendsGame = (...args) => Promise.all([ensureFeatureStyles(),import('./friends.js')]).then(([,module]) => module.openFriendsGame(...args));
const openPlayerCard = (...args) => Promise.all([ensureFeatureStyles(),import('./friends.js')]).then(([,module]) => module.openPlayerCard(...args));
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

  return requestJson(path, {...options,headers});
}

// Feature id → the function that opens its screen.
const launchers = {
  profile: options => openCharacterPage(options, 'stats'),
  skills: options => openCharacterPage(options, 'skills'),
  classQuests: openClassQuests,
  forms: openFormsGame,
  inventory: openInventoryGame,
  warehouse: openWarehouseGame,
  trade: openTradeGame,
  exchange: openExchangeGame,
  boss: openBossGame,
  hunt: openWorldMap,
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
  loginRewards: openLoginRewards,
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
  luckShop: openShopGame,
  auction: openAuctionGame,
  mail: openMailGame,
  promo: openPromoGame,
  admin: openAdminGame,
  help: openHelpGame,
};

async function launchFeature(feature, render, navigation = {}) {
  if (feature.id === 'admin' && currentState?.context?.isAdmin !== true) return;
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
      initialView: navigation.view,
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
  if(state.player.dead||state.player.hp<=0){ensureFeatureStyles().then(()=>{if(currentState===state)updateDeathPopup({dead:true,api,onResolved:next=>{if(next.state)render(next.state);else api('/api/bootstrap').then(render);}});});}
  else updateDeathPopup({dead:false});
  const quest = state.activeQuest;
  $('active-quest').hidden = !quest;
  if (quest) {
    $('active-quest-details').textContent = `${quest.title} · ${quest.goal}${quest.progress ? ' · '+quest.progress : ''}`;
    const open = (id, navigation) => {
      const feature = state.features.find(item => item.id === id);
      if (feature) launchFeature(feature, render, navigation);
    };
    $('active-quest-details').onclick = () => open('classQuests');
    $('active-quest-go').onclick = () => open(quest.navigation?.feature || 'classQuests', quest.navigation);
  }
  renderPlayerHud({ state, getElement: $, formatNumber });
  $('gold').textContent = formatNumber(state.player.gold);
  $('moonDew').textContent = formatNumber(state.player.moonDew);
  $('luck-coins').textContent = formatNumber(state.player.luckCoins);
  $('ore').textContent = formatNumber(state.player.ironOre);
  for (const id of ['gold', 'moonDew', 'luck-coins', 'ore']) {
    $(id).title = `${$(id).getAttribute('aria-label')}: ${$(id).textContent}`;
  }

  const cards = featuresForTab(state.features.filter(feature => feature.id !== 'admin' || state.context?.isAdmin === true), activeTab).map(feature => {
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
  $('moonDew')?.closest('.top-res')?.toggleAttribute('hidden', !isCity);
  document.querySelector('.top-hud')?.classList.add('is-city-compact');
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
  bindFeatureLinks(document, {openFeature:openFeatureById,haptic});
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
    showHelloNotices({ api, haptic }).catch(error => console.warn('[notices]', error));
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
observeSelects(document.body);
