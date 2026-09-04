import test from 'node:test';
import assert from 'node:assert/strict';
import {
  drawElement,
  getElementsState,
  joinElements,
  setElementsBet,
  startElements,
  syncElements,
} from '../miniapp/elements.js';

function makeChat(gold = 10_000) {
  return {
    game: {},
    members: Array.from({ length: 7 }, (_, index) => ({
      userId: index + 1,
      userChatData: { user: { id: index + 1, username: `u${index + 1}` } },
      game: { inventory: { gold } },
    })),
  };
}

const zero = () => 0;

test('elements preserves 15s join and 25s betting windows', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: 0 });
  assert.equal(getElementsState(chat, 1, { now: 0 }).phase, 'join');
  assert.equal(getElementsState(chat, 1, { now: 0 }).remainingMs, 15_000);

  const betting = syncElements(chat, { now: 15_000, randomInt: zero });
  assert.equal(betting.event, 'betting');
  assert.equal(getElementsState(chat, 1, { now: 15_000 }).phase, 'betting');
  assert.equal(getElementsState(chat, 1, { now: 15_000 }).remainingMs, 25_000);
});

test('elements freezes joins after join phase and validates exact bets', () => {
  const chat = makeChat(500);
  startElements(chat, 1, { now: 0 });

  assert.equal(joinElements(chat, 2, { now: 1 }).ok, true);
  syncElements(chat, { now: 15_000, randomInt: zero });
  assert.equal(joinElements(chat, 3, { now: 15_001 }).reason, 'not_join_phase');
  assert.equal(setElementsBet(chat, 1, 500, { now: 15_002 }).ok, true);
  assert.equal(setElementsBet(chat, 1, 501, { now: 15_003 }).reason, 'not_enough_gold');
  assert.equal(setElementsBet(chat, 1, 1.5, { now: 15_004 }).reason, 'invalid_bet');
});

test('elements deals one human element and four bot elements at game start', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: 0 });
  joinElements(chat, 2, { now: 1 });
  syncElements(chat, { now: 40_000, randomInt: zero });

  const state = getElementsState(chat, 1, { now: 40_000 });
  assert.equal(state.phase, 'playing');
  assert.equal(state.round, 1);
  assert.equal(state.players.find(player => player.id === '1').elements.length, 1);
  assert.equal(state.players.find(player => player.id === '2').elements.length, 1);
  assert.equal(state.players.find(player => player.isBot).elements.length, 4);
});

test('each player can draw only once per round', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: 0 });
  syncElements(chat, { now: 40_000, randomInt: zero });

  const first = drawElement(chat, 1, { now: 40_001, randomInt: zero });
  assert.equal(first.ok, true);
  assert.equal(first.elements.round, 2);
  assert.equal(first.elements.me.elements.length, 2);

  const second = drawElement(chat, 1, { now: 40_002, randomInt: zero });
  assert.equal(second.ok, true);
  assert.equal(second.elements.round, 3);

  const third = drawElement(chat, 1, { now: 40_003, randomInt: zero });
  assert.equal(third.ok, true);
  assert.equal(third.elements.phase, 'finished');
  assert.equal(third.elements.me.elements.length, 4);
});

test('elements preserves legacy x1.75 winner payout and loser bet loss', () => {
  const chat = makeChat(1_000);
  chat.game.elementsMiniApp = {
    phase: 'playing',
    currentRound: 3,
    turnEndsAt: 100_000,
    players: {
      bot: { id: 'bot', bet: 0, usedItems: ['🗿 Гео', '🌿 Дендро', '💨 Анемо', '💧 Гидро'], points: 0, draws: 3 },
      '1': { id: '1', bet: 100, usedItems: ['🔥 Пиро', '🔥 Пиро', '🔥 Пиро'], points: 0, draws: 2 },
      '2': { id: '2', bet: 200, usedItems: ['🔥 Пиро', '❄️ Крио', '💨 Анемо'], points: 0, draws: 2 },
    },
  };

  const winner = drawElement(chat, 1, { now: 10, randomInt: zero });
  assert.equal(winner.ok, true);
  const finished = drawElement(chat, 2, { now: 11, randomInt: () => 1 });
  assert.equal(finished.elements.phase, 'finished');

  const one = finished.elements.result.players.find(player => player.id === '1');
  const two = finished.elements.result.players.find(player => player.id === '2');
  assert.equal(one.won, true);
  assert.equal(one.delta, 175);
  assert.equal(two.won, false);
  assert.equal(two.delta, -200);
  assert.equal(chat.members[0].game.inventory.gold, 1_175);
  assert.equal(chat.members[1].game.inventory.gold, 800);
});

test('elements table caps participants at six humans plus bot', () => {
  const chat = makeChat();
  startElements(chat, 1, { now: 0 });
  for (let id = 2; id <= 6; id += 1) assert.equal(joinElements(chat, id, { now: id }).ok, true);
  assert.equal(joinElements(chat, 7, { now: 10 }).reason, 'full');
});
