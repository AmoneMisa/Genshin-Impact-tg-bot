import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPoint21State,
  joinPoint21,
  passPoint21,
  setPoint21Bet,
  startPoint21,
  syncPoint21,
  takePoint21Card,
} from '../miniapp/point21.js';

function makeChat(gold = 10_000) {
  return {
    game: {},
    members: [
      { userId: 1, userChatData: { user: { id: 1, username: 'one' } }, game: { inventory: { gold } } },
      { userId: 2, userChatData: { user: { id: 2, username: 'two' } }, game: { inventory: { gold } } },
      { userId: 3, userChatData: { user: { id: 3, username: 'three' } }, game: { inventory: { gold } } },
      { userId: 4, userChatData: { user: { id: 4, username: 'four' } }, game: { inventory: { gold } } },
      { userId: 5, userChatData: { user: { id: 5, username: 'five' } }, game: { inventory: { gold } } },
    ],
  };
}

const firstAvailable = () => 0;

test('point21 starts a 25 second lobby and auto-joins creator', () => {
  const chat = makeChat();
  const result = startPoint21(chat, 1, { now: 1_000 });

  assert.equal(result.ok, true);
  assert.equal(result.point21.phase, 'lobby');
  assert.equal(result.point21.remainingMs, 25_000);
  assert.equal(result.point21.me.joined, true);
  assert.equal(result.point21.players.some(player => player.isBot), true);
});

test('point21 lobby supports joining and validates exact bets against Mongo balance', () => {
  const chat = makeChat(500);
  startPoint21(chat, 1, { now: 0 });

  assert.equal(joinPoint21(chat, 2, { now: 1 }).ok, true);
  assert.equal(setPoint21Bet(chat, 1, 500, { now: 2 }).ok, true);
  assert.equal(setPoint21Bet(chat, 1, 501, { now: 3 }).reason, 'not_enough_gold');
  assert.equal(setPoint21Bet(chat, 1, 1.5, { now: 4 }).reason, 'invalid_bet');
});

test('point21 transitions to playing on lobby deadline and deals unique cards', () => {
  const chat = makeChat();
  startPoint21(chat, 1, { now: 0 });
  joinPoint21(chat, 2, { now: 1 });

  const synced = syncPoint21(chat, { now: 25_000, randomInt: firstAvailable });
  const state = getPoint21State(chat, 1, { now: 25_000 });

  assert.equal(synced.event, 'started');
  assert.equal(state.phase, 'playing');
  assert.equal(state.players.every(player => player.cards.length === 2), true);
  const cards = state.players.flatMap(player => player.cards);
  assert.equal(new Set(cards).size, cards.length);
});

test('taking cards is server-side and bust settles the round when all humans are done', () => {
  const chat = makeChat(1_000);
  startPoint21(chat, 1, { now: 0 });
  setPoint21Bet(chat, 1, 100, { now: 1 });
  syncPoint21(chat, { now: 25_000, randomInt: firstAvailable });

  assert.equal(takePoint21Card(chat, 1, { now: 25_001, randomInt: firstAvailable }).point21.me.points, 16);
  assert.equal(takePoint21Card(chat, 1, { now: 25_002, randomInt: firstAvailable }).point21.me.points, 20);
  const busted = takePoint21Card(chat, 1, { now: 25_003, randomInt: firstAvailable });

  assert.equal(busted.ok, true);
  assert.equal(busted.point21.phase, 'finished');
  assert.equal(busted.point21.result.players.find(player => player.id === '1').delta, -100);
  assert.equal(chat.members[0].game.inventory.gold, 900);
});

test('exact 21 keeps legacy x3 payout while best non-21 keeps x1.8', () => {
  const exact = makeChat(1_000);
  exact.game.pointsMiniApp = {
    phase: 'playing',
    roundEndsAt: 100_000,
    players: {
      bot: { bet: 0, usedItems: ['9 ♠', '8 ♠'], isPass: false },
      '1': { bet: 100, usedItems: ['10 ♠', 'Т ♠'], isPass: false },
    },
    usedItems: ['9 ♠', '8 ♠', '10 ♠', 'Т ♠'],
  };
  const exactResult = passPoint21(exact, 1, { now: 10, randomInt: firstAvailable });
  assert.equal(exactResult.point21.result.players.find(player => player.id === '1').delta, 300);
  assert.equal(exact.members[0].game.inventory.gold, 1_300);

  const best = makeChat(1_000);
  best.game.pointsMiniApp = {
    phase: 'playing',
    roundEndsAt: 100_000,
    players: {
      bot: { bet: 0, usedItems: ['9 ♠', '8 ♠'], isPass: false },
      '1': { bet: 100, usedItems: ['10 ♠', '10 ♣'], isPass: false },
    },
    usedItems: ['9 ♠', '8 ♠', '10 ♠', '10 ♣'],
  };
  const bestResult = passPoint21(best, 1, { now: 10, randomInt: firstAvailable });
  assert.equal(bestResult.point21.result.players.find(player => player.id === '1').delta, 180);
  assert.equal(best.members[0].game.inventory.gold, 1_180);
});

test('point21 caps the Mini App table at four human players', () => {
  const chat = makeChat();
  startPoint21(chat, 1, { now: 0 });
  assert.equal(joinPoint21(chat, 2, { now: 1 }).ok, true);
  assert.equal(joinPoint21(chat, 3, { now: 2 }).ok, true);
  assert.equal(joinPoint21(chat, 4, { now: 3 }).ok, true);
  assert.equal(joinPoint21(chat, 5, { now: 4 }).reason, 'full');
});
