// Bottom navigation of the main screen: the city plus feature groups.
// Features not listed in any group land in "Меню", so new ones never disappear.
import { icon } from './icons.js';

export const NAV_TABS = Object.freeze([
  { id: 'city', label: 'Город', title: 'Город', hint: 'Ваше королевство', icon: 'castle' },
  { id: 'hero', label: 'Герой', title: 'Ваш герой', hint: 'Персонаж и снаряжение', icon: 'user-round', features: ['profile', 'skills', 'passives', 'buffs', 'classQuests', 'equipment', 'inventory', 'titles', 'horoscope'] },
  { id: 'battle', label: 'Бой', title: 'Сражения', hint: 'Боссы и PvP', icon: 'swords', features: ['boss', 'arena', 'steal', 'elements'] },
  { id: 'games', label: 'Игры', title: 'Игры и награды', hint: 'Удача и развлечения', icon: 'dices', features: ['chest', 'gacha', 'bonus', 'sword', 'arcade', 'point21'] },
  { id: 'clan', label: 'Клан', title: 'Клан и друзья', hint: 'Сообщество', icon: 'users', features: ['clan', 'friends', 'forms', 'transfer'] },
  // Opened from the gear in the header, not from the bottom bar.
  { id: 'more', label: 'Меню', title: 'Меню', hint: 'Магазин и настройки', icon: 'settings', hidden: true },
]);

/** Icon per feature card; the server's emoji stays as a fallback for new features. */
export const FEATURE_ICONS = Object.freeze({
  profile: 'user-round', skills: 'zap', forms: 'notebook-pen', inventory: 'backpack', exchange: 'arrow-left-right',
  boss: 'swords', chest: 'package-open', gacha: 'sparkles', equipment: 'shield', builds: 'landmark', arena: 'trophy',
  steal: 'venetian-mask', shop: 'shopping-cart', transfer: 'coin', point21: 'spade', elements: 'orbit', clan: 'castle',
  friends: 'handshake', bonus: 'gift', titles: 'tag', horoscope: 'orbit', sword: 'sword', arcade: 'dices',
  selfMute: 'volume-x', chatSettings: 'settings', updates: 'bell', feedback: 'message-circle', help: 'circle-help',
});

/** The city screen replaces the old buildings card. */
const HIDDEN_FEATURES = new Set(['builds']);
const GROUPED = new Set(NAV_TABS.flatMap(tab => tab.features || []));

export function featuresForTab(features = [], tabId) {
  const tab = NAV_TABS.find(item => item.id === tabId);
  if (!tab || tab.id === 'city') return [];
  const visible = features.filter(feature => !HIDDEN_FEATURES.has(feature.id));
  if (tab.id === 'more') return visible.filter(feature => !GROUPED.has(feature.id));
  const order = new Map(tab.features.map((id, index) => [id, index]));
  return visible.filter(feature => order.has(feature.id)).sort((a, b) => order.get(a.id) - order.get(b.id));
}

export function featureIconHtml(feature) {
  return FEATURE_ICONS[feature.id] ? icon(FEATURE_ICONS[feature.id]) : (feature.icon || '');
}

/** Red-dot counts per bottom tab, from the per-feature counts in `badges`. */
export function tabBadgeCount(tab, badges = {}) {
  return (tab.features || []).reduce((sum, id) => sum + (Number(badges[id]) || 0), 0);
}

export function badgeHtml(count) {
  const value = Number(count) || 0;
  return value > 0 ? `<i class="red-dot" aria-label="Новых событий: ${value}">${value > 9 ? '9+' : value}</i>` : '';
}

export function navHtml(activeId, badges = {}) {
  return NAV_TABS.filter(tab => !tab.hidden).map(tab => `
    <button type="button" class="nav-tab ${tab.id === activeId ? 'active' : ''}" data-nav-tab="${tab.id}" aria-pressed="${tab.id === activeId}" aria-label="${tab.title}">
      ${icon(tab.icon)}<small>${tab.label}</small>${badgeHtml(tabBadgeCount(tab, badges))}
    </button>`).join('');
}
