import test from 'node:test';
import assert from 'node:assert/strict';
import bossCastAttack, { bossAttackMessage, LIVE_DAMAGE_SCALE, nextAttackDelay, ATTACK_MIN_MS, ATTACK_MAX_MS, RESPAWN_MS } from '../functions/game/boss/bossCastAttack.js';
import { getBossAttacks } from '../template/bossAttacksTemplate.js';
import bossesTemplate from '../template/bossTemplate.js';
import { attackLogDto, bossAttacksDto } from '../miniapp/bossEffects.js';

function fighter(id, hp = 5_000, extra = {}) {
  return {
    userId: id,
    userChatData: { user: { id, username: `u${id}` } },
    game: { gameClass: { stats: { hp, maxHp: 10_000 } }, stats: { lvl: 10 }, effects: [], ...extra },
  };
}
const flat = () => 1_000;
const seq = values => { let i = 0; return () => values[i++ % values.length]; };

test('every boss has its own single-target and group attacks', () => {
  for (const boss of bossesTemplate) {
    const attacks = getBossAttacks(boss.name);
    assert.ok(attacks.some(attack => attack.target === 'single'), boss.name);
    assert.ok(attacks.some(attack => attack.target === 'all'), boss.name);
  }
  assert.ok(getBossAttacks('unknown').length);
});

test('a group attack hits every living fighter with scaled damage and is logged', () => {
  const boss = { name: 'kivaha', listOfDamage: [] };
  const members = [fighter(1), fighter(2), fighter(3, 0)];
  // random: 0.99 → last attack by weight (group)
  const record = bossCastAttack(members, boss, { now: 10, random: () => 0.99, damage: flat });
  assert.equal(record.target, 'all');
  assert.equal(record.hits.length, 2);
  const expected = Math.ceil(1_000 * getBossAttacks('kivaha')[1].power * LIVE_DAMAGE_SCALE);
  assert.equal(record.hits[0].dmg, expected);
  assert.equal(members[0].game.gameClass.stats.hp, 5_000 - expected);
  assert.equal(boss.lastAttack, record);
  assert.equal(boss.attackLog.length, 1);
});

test('single attacks prefer the top damage dealer; shields absorb first; kills start respawn', () => {
  const boss = { name: 'fjorina', listOfDamage: [{ id: 1, damage: 10 }, { id: 2, damage: 900 }] };
  const members = [fighter(1), fighter(2, 50, { effects: [{ name: 'shield', value: 20 }] })];
  const record = bossCastAttack(members, boss, { now: 1_000, random: seq([0, 0]), damage: flat });
  assert.equal(record.target, 'single');
  assert.deepEqual(record.hits.map(hit => hit.userId), ['2']);
  assert.equal(record.hits[0].absorbed, 20);
  assert.equal(record.hits[0].killed, true);
  assert.equal(members[1].game.effects[0].value, 0);
  assert.equal(members[1].game.respawnTime, 1_000 + RESPAWN_MS);
  assert.match(bossAttackMessage({ nameCall: 'Фйорину' }, record), /«Огненное копьё»[\s\S]*u2 — \d+ урона \(щит поглотил 20\) · повержен/);
});

test('nobody to hit: no cast; the log keeps the five latest', () => {
  const boss = { name: 'kivaha', attackLog: Array.from({ length: 5 }, (_, i) => ({ at: i })) };
  assert.equal(bossCastAttack([fighter(1, 0)], boss, { damage: flat }), null);
  bossCastAttack([fighter(1)], boss, { now: 99, damage: flat });
  assert.equal(boss.attackLog.length, 5);
  assert.equal(boss.attackLog[0].at, 99);
});

test('casts come every few seconds', () => {
  assert.equal(nextAttackDelay(() => 0), ATTACK_MIN_MS);
  assert.equal(nextAttackDelay(() => 1), ATTACK_MAX_MS);
  assert.ok(ATTACK_MAX_MS <= 10_000);
});

test('Mini App DTOs list the attacks and mark your hits', () => {
  assert.ok(bossAttacksDto('kivaha').every(attack => attack.name && attack.icon));
  const [row] = attackLogDto([{ key: 'k', name: 'Удар', icon: '⚡', target: 'single', at: 1_000, hits: [{ userId: '7', name: 'x', dmg: 5 }] }], 7, 4_000);
  assert.equal(row.agoMs, 3_000);
  assert.equal(row.hits[0].you, true);
  assert.deepEqual(attackLogDto(null, 1), []);
});
