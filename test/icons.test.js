import test from 'node:test';
import assert from 'node:assert/strict';
import { ICONS, EMOJI_ICON } from '../webapp/icon-set.js';
import { icon, emojiIconName, stripEmoji } from '../webapp/icons.js';
import { FEATURE_ICONS, NAV_TABS, navHtml, featuresForTab } from '../webapp/nav.js';

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{23F3}]/u;

test('every emoji maps to an icon that exists', () => {
  for (const [emoji, name] of Object.entries(EMOJI_ICON)) assert.ok(ICONS[name], `${emoji} -> ${name}`);
  assert.equal(emojiIconName('⚔️'), 'swords');
  assert.equal(emojiIconName('🪙'), 'coin');
  assert.equal(emojiIconName('x'), null);
});

test('icon() renders stroke SVG and ignores unknown names', () => {
  assert.match(icon('castle'), /^<svg class="ui-icon ui-icon-castle"[^>]*stroke="currentColor"[^>]*aria-hidden="true"/);
  assert.equal(icon('no-such-icon'), '');
});

test('stripEmoji removes mapped emoji from attribute text', () => {
  assert.equal(stripEmoji('🪙 Мора'), 'Мора');
  assert.equal(stripEmoji('Босс ⚔️'), 'Босс');
});

test('bottom navigation is SVG-only with plain Russian labels', () => {
  const html = navHtml('city');
  assert.ok(!EMOJI.test(html), 'no emoji in the navigation');
  assert.equal((html.match(/<svg/g) || []).length, 5);
  assert.deepEqual([...html.matchAll(/<small>([^<]+)<\/small>/g)].map(m => m[1]), ['Город', 'Герой', 'Бой', 'Игры', 'Клан']);
  for (const tab of NAV_TABS) assert.ok(ICONS[tab.icon], tab.id);
  assert.ok(NAV_TABS.find(tab => tab.id === 'more').hidden, 'the menu opens from the header gear');
});

test('every feature has an icon and sits in a tab that describes it', () => {
  for (const name of Object.values(FEATURE_ICONS)) assert.ok(ICONS[name], name);
  const ids = Object.keys(FEATURE_ICONS).map(id => ({ id }));
  const where = id => NAV_TABS.find(tab => featuresForTab(ids, tab.id).some(f => f.id === id)).id;
  assert.equal(where('boss'), 'battle');
  assert.equal(where('gacha'), 'games');
  assert.equal(where('shop'), 'more');
  assert.equal(where('friends'), 'clan');
});
