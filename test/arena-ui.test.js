import test from 'node:test';
import assert from 'node:assert/strict';
import { pickOpponent, rankEmblem, rankTier } from '../webapp/arena.js';
import { arenaLadder } from '../miniapp/arena.js';

test('rank names map to a metal tier and division pips', () => {
  assert.deepEqual(rankTier('Серебро III'), { tier: 'silver', division: 3 });
  assert.deepEqual(rankTier('Бронза I'), { tier: 'bronze', division: 1 });
  assert.deepEqual(rankTier('Рубин'), { tier: 'ruby', division: 0 });
  assert.deepEqual(rankTier('Без ранга'), { tier: 'iron', division: 0 });
  assert.match(rankEmblem('Золото II', 'large'), /arena-emblem gold large[\s\S]*◆◆</);
});

test('matchmaking prefers players near your rating and can skip the current one', () => {
  const defenders = [
    { id: 'bot:1', kind: 'bot', rating: 1000 },
    { id: 'player:2', kind: 'player', rating: 1300 },
    { id: 'player:3', kind: 'player', rating: 1010 },
  ];
  assert.equal(pickOpponent(defenders, 1000, null, () => 0).id, 'player:3');
  assert.equal(pickOpponent(defenders, 1000, 'player:3', () => 0).id, 'player:2');
  assert.equal(pickOpponent([{ id: 'bot:1', kind: 'bot', rating: 900 }], 1000, 'bot:1').id, 'bot:1');
  assert.equal(pickOpponent([], 1000), null);
});

test('season ladder marks the current rank, its weekly reward and the next rank', () => {
  const ladder = arenaLadder('Серебро III');
  assert.equal(ladder.ranks.length, 14);
  assert.equal(ladder.ranks.find(r => r.current).rank, 'Серебро III');
  assert.equal(ladder.weeklyReward, 120);
  assert.equal(ladder.nextRank, 'Золото I');
  assert.equal(arenaLadder('Рубин').nextRank, null);
  assert.equal(arenaLadder('???').weeklyReward, 0);
});
