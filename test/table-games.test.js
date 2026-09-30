import test from 'node:test';
import assert from 'node:assert/strict';
import { isChatAdmin, isStaleTable, seatLook, STALE_MS } from '../miniapp/tableGames.js';
import { getPoint21State, resetPoint21, setPoint21Bet, startPoint21 } from '../miniapp/point21.js';
import { resetElements, startElements } from '../miniapp/elements.js';
import { betControls, emptySeat, resetBanner, seatTile, timerRing } from '../webapp/table-seats.js';

function makeChat(gold = 10_000) {
  return {
    game: {},
    members: [1, 2].map(id => ({ userId: id, userChatData: { user: { id, username: `u${id}` } }, game: { inventory: { gold } } })),
  };
}

test('a table is stale only when its deadline and last update are both long past', () => {
  const game = { phase: 'playing', gameSessionLastUpdateAt: 0 };
  assert.equal(isStaleTable(game, 10_000, 10_000 + STALE_MS), false);
  assert.equal(isStaleTable(game, 10_000, 10_001 + STALE_MS), true);
  assert.equal(isStaleTable({ ...game, gameSessionLastUpdateAt: 10_000 + STALE_MS }, 10_000, 10_001 + STALE_MS), false);
  assert.equal(isStaleTable({ phase: 'finished', gameSessionLastUpdateAt: 0 }, null, 1e12), false);
  assert.equal(isStaleTable(null, null, 1e12), false);
});

test('seat look and admin status come from the member and chat session', () => {
  assert.deepEqual(seatLook({ gender: 'female', game: { gameClass: { stats: { name: 'mage' } } } }), { className: 'mage', gender: 'female' });
  assert.deepEqual(seatLook(null), { className: 'noClass', gender: 'male' });
  assert.equal(isChatAdmin({ userChatData: { status: 'creator' } }), true);
  assert.equal(isChatAdmin({ userChatData: { status: 'administrator' } }), true);
  assert.equal(isChatAdmin({ userChatData: { status: 'member' } }), false);
  assert.equal(isChatAdmin(null), false);
});

test('point21 reset: refused on a live table, allowed for admins or once stale, gold untouched', () => {
  const chat = makeChat();
  startPoint21(chat, 1, { now: 1_000 });
  setPoint21Bet(chat, 1, 500, { now: 1_100 });

  const live = resetPoint21(chat, 2, { now: 2_000 });
  assert.equal(live.ok, false);
  assert.equal(live.reason, 'not_stuck');
  assert.ok(chat.game.pointsMiniApp);

  const state = getPoint21State(chat, 1, { now: 2_000, isAdmin: true });
  assert.equal(state.canReset, true);
  assert.equal(state.stuck, false);

  const stale = resetPoint21(chat, 2, { now: 1_000 + 25_000 + STALE_MS + 1 });
  assert.equal(stale.ok, true);
  assert.equal(chat.game.pointsMiniApp, undefined);
  assert.equal(chat.members[0].game.inventory.gold, 10_000);

  assert.equal(resetPoint21(chat, 1, { now: 3_000 }).reason, 'no_game');

  startPoint21(chat, 1, { now: 5_000 });
  assert.equal(resetPoint21(chat, 2, { now: 5_100, isAdmin: true }).ok, true);
});

test('elements reset follows the same rules', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: 1_000 });
  assert.equal(resetElements(chat, 2, { now: 2_000 }).reason, 'not_stuck');
  assert.equal(resetElements(chat, 2, { now: 2_000, isAdmin: true }).ok, true);
  assert.equal(chat.game.elementsMiniApp, undefined);
  assert.equal(resetElements(chat, 2, { now: 2_000 }).reason, 'no_game');
});

test('seat tiles mark you, the bot, statuses and payouts', () => {
  const player = { id: '7', name: '<b>Kira</b>', bet: 1200, className: 'mage', gender: 'female' };
  const other = seatTile(player, { status: { text: 'пас', tone: 'wait' }, score: 18, delta: -1200 });
  assert.match(other, /data-player-card="7"/);
  assert.match(other, /tone-wait/);
  assert.match(other, /&lt;b&gt;Kira/);
  assert.match(other, /class="down"/);
  const mine = seatTile(player, { you: true });
  assert.match(mine, /is-you/);
  assert.doesNotMatch(mine, /data-player-card/);
  assert.match(seatTile({ id: 'bot', name: 'Бот', isBot: true }), /is-bot[\s\S]*дилер/);
  assert.match(seatTile({ id: '1', name: 'A', bet: 0 }), /без ставки/);
  assert.match(emptySeat(), /is-empty/);
});

test('timer ring and reset banner', () => {
  const ring = timerRing(12_500, 25_000, 'Запись');
  assert.match(ring, /--f:0\.5/);
  assert.match(ring, /0:13/);
  assert.doesNotMatch(ring, /urgent/);
  assert.match(timerRing(3_000, 20_000, 'x'), /urgent/);
  assert.equal(resetBanner({ canReset: false }), '');
  assert.match(resetBanner({ canReset: true, stuck: true }), /table-reset stuck[\s\S]*Сбросить стол/);
  assert.match(resetBanner({ canReset: true, stuck: false }, true), /админ[\s\S]*Точно сбросить/);
});

test('bet controls: free amount, all in and no bet', () => {
  const html = betControls(12_450, 0);
  assert.match(html, /Сколько ставишь\?/);
  assert.match(html, /data-table-quick="all"[^>]*>Ва-банк · 12 450/);
  assert.match(html, /data-table-quick="0"[^>]*>Без ставки/);
  assert.match(html, /без ставки · баланс/);
  assert.match(betControls(12_450, 700), /value="700"[\s\S]*Твоя ставка 🪙 700/);
  assert.match(betControls(0, 0), /data-table-quick="all" disabled/);
});
