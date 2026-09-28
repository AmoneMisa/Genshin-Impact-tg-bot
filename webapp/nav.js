// Bottom navigation of the main screen: the city plus feature groups.
// Features not listed in any group land in "Ещё", so new ones never disappear.

export const NAV_TABS = Object.freeze([
  { id: 'city', label: 'Город', icon: '🏰' },
  { id: 'hero', label: 'Персонаж', icon: '🧙', features: ['profile', 'skills', 'equipment', 'inventory', 'titles', 'horoscope'] },
  { id: 'battle', label: 'Арена', icon: '⚔️', features: ['boss', 'arena', 'steal', 'chest', 'gacha', 'sword', 'arcade', 'point21', 'elements', 'bonus'] },
  { id: 'clan', label: 'Клан', icon: '🛡️', features: ['clan', 'forms', 'transfer'] },
  { id: 'more', label: 'Ещё', icon: '☰' },
]);

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

export function navHtml(activeId) {
  return NAV_TABS.map(tab => `
    <button type="button" class="nav-tab ${tab.id === activeId ? 'active' : ''}" data-nav-tab="${tab.id}" aria-pressed="${tab.id === activeId}">
      <span aria-hidden="true">${tab.icon}</span><small>${tab.label}</small>
    </button>`).join('');
}
