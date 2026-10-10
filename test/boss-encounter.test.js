import test from 'node:test';
import withSeed from './helpers/seededRandom.js';
import assert from 'node:assert/strict';
import bosses from '../template/bossTemplate.js';
import bossCastAttack, { minionCasts, RESPAWN_MS } from '../functions/game/boss/bossCastAttack.js';
import calcBossHit from '../functions/game/boss/bossHit.js';
import computeBossHp, { HP_PER_MEMBER, MAX_MEMBERS, MIN_MEMBERS } from '../functions/game/boss/bossHp.js';
import { advanceBossPhases } from '../functions/game/boss/bossPhases.js';
import { applyBossDebuff, bossDebuffAmount, isBossStunned, STUN_IMMUNITY_MS } from '../functions/game/boss/bossDebuffs.js';
import { aliveRequiredUnits, armorShield, damageUnit, spawnMinions } from '../functions/game/boss/bossUnits.js';
import getRandomBoss from '../functions/game/boss/getters/getRandomBoss.js';
import userDealDamage from '../functions/game/player/userDealDamage.js';
import castSkill from '../functions/game/player/castSkill.js';
import classSkills from '../template/classSkillsTemplate.js';
import { bossAttacksDto, playerEffectsDto } from '../miniapp/bossEffects.js';
import getLoot from '../functions/game/boss/getters/getBossLoot.js';

const template = name => bosses.find(boss => boss.name === name);

function makeBoss(name, extra = {}) {
  const boss = {
    name, hp: 100_000, currentHp: 100_000, stats: { lvl: 1, criticalChance: 0, criticalDamage: 1.5, defence: template(name).stats.defence },
    skill: { effect: 'life' }, listOfDamage: [], minions: [], enrage: 0, phaseIndex: 0, debuffs: [], eventLog: [], attackLog: [],
    markModified() {}, ...extra,
  };
  return boss;
}

function fighter(id, extra = {}) {
  return {
    userId: id,
    userChatData: { user: { id, username: `u${id}` } },
    game: {
      stats: { lvl: 40, currentExp: 0 },
      gameClass: { stats: { name: 'warrior', attack: 100, defence: 80, maxHp: 10_000, hp: 10_000, mp: 1_000, maxMp: 1_000, speed: 100, criticalChance: 0, criticalDamage: 1.5, additionalDamageMul: 1, incomingDamageModifier: 1 }, skills: [] },
      effects: [], inventory: {}, equipmentStats: {},
      ...extra,
    },
  };
}

const flat = () => 1_000;

test('the roster: 11 ordinary and 8 epic bosses, two pairs, two hydra heads, every boss with a plan', () => {
  assert.equal(bosses.filter(boss => !boss.epic).length, 11);
  assert.equal(bosses.filter(boss => boss.epic).length, 8);
  assert.equal(bosses.filter(boss => boss.pair).length, 2);
  for (const boss of bosses) {
    assert.ok(boss.combat.dangerPct > 0 && boss.combat.hpMul > 0, boss.name);
    assert.ok(boss.phases.length >= 1, `${boss.name} has phases`);
    assert.ok(boss.minions.length >= 1, `${boss.name} has minions`);
    assert.ok(boss.drops.sp.length === 2 && boss.drops.items.length >= 2, boss.name);
    for (const key of [...boss.initial, ...boss.phases.flatMap(phase => phase.summon || [])]) {
      assert.ok(boss.minions.some(unit => unit.key === key), `${boss.name} summons unknown ${key}`);
    }
  }
  assert.deepEqual(bosses.find(boss => boss.name === 'tiamara').minions.filter(unit => unit.required).map(unit => unit.key), ['head_fire', 'head_venom']);
  for (const pair of ['ignar', 'selene']) {
    const partner = template(pair).minions.find(unit => unit.kind === 'partner');
    assert.ok(partner.required && partner.onDeath.enrage > 0, pair);
  }
});

test('harder bosses turn up less often (weighted pick)', () => {
  const counts = {};
  for (let i = 0; i < 2000; i++) {
    const boss = getRandomBoss(() => i / 2000);
    counts[boss.name] = (counts[boss.name] || 0) + 1;
  }
  assert.ok(counts.kivaha > counts.veraxis * 1.4, JSON.stringify(counts));
  assert.equal(Object.keys(counts).length, 11, 'epic bosses are never summoned at random');
});

test('boss hp scales with chat size (clamped) and the boss multiplier', () => {
  const mid = () => 0.5;
  const base = computeBossHp({ members: 10, template: { combat: { hpMul: 1 } }, random: mid });
  assert.equal(base, Math.round(10 * HP_PER_MEMBER * 2.4));
  assert.equal(computeBossHp({ members: 10, template: { combat: { hpMul: 2 } }, random: mid }), base * 2);
  assert.equal(computeBossHp({ members: 1, template: {}, random: mid }), computeBossHp({ members: MIN_MEMBERS, template: {}, random: mid }));
  assert.equal(computeBossHp({ members: 5000, template: {}, random: mid }), computeBossHp({ members: MAX_MEMBERS, template: {}, random: mid }));
  assert.equal(computeBossHp({ members: 10, template: {}, skillEffect: 'rage', random: mid }), Math.round(10 * HP_PER_MEMBER * 2.4 / 2));
});

test('a boss hit is a share of the target\'s max hp, softened by defence, grown by enrage, cut by weaken', () => {
  const boss = makeBoss('kivaha');
  const hit = member => calcBossHit(boss, member, { random: () => 0.5, now: 0 });
  const plain = hit(fighter(1));
  assert.ok(plain > 10_000 * 0.03 * 0.5 && plain < 10_000 * 0.03 * 1.05, `got ${plain}`);

  const tank = fighter(2);
  tank.game.gameClass.stats.defence = 5_000;
  assert.ok(hit(tank) < plain, 'defence mitigates');
  assert.ok(hit(tank) > plain * 0.5, 'but never more than half');

  boss.enrage = 0.5;
  assert.ok(Math.abs(hit(fighter(1)) / plain - 1.5) < 0.01);
  boss.enrage = 0;
  boss.debuffs = [{ kind: 'weaken', amount: 0.25, until: 10 }];
  assert.ok(Math.abs(calcBossHit(boss, fighter(1), { random: () => 0.5, now: 5 }) / plain - 0.75) < 0.01);
  boss.stats.lvl = 6;
  boss.debuffs = [];
  assert.ok(hit(fighter(1)) > plain * 1.5, 'higher boss level hits harder');

  const big = fighter(3);
  big.game.gameClass.stats.maxHp = 100_000;
  assert.ok(hit(big) > plain * 9, 'scales with the target\'s hp, so low and high levels are both threatened');
});

test('minions spawn from the template, scale with boss hp and attack on their own timers', () => {
  const boss = makeBoss('kivaha');
  const [spark] = spawnMinions(boss, ['spark'], 1_000);
  assert.equal(spark.hp, Math.round(100_000 * 0.07));
  assert.equal(spark.kind, 'minion');
  assert.deepEqual(spawnMinions(boss, ['nope'], 1_000), []);

  const members = [fighter(1)];
  boss.listOfDamage = [{ id: 1, damage: 5 }];
  assert.deepEqual(minionCasts(members, boss, { now: 1_100, damage: flat }), [], 'not due yet');
  const records = minionCasts(members, boss, { now: 20_000, damage: flat, random: () => 0.5 });
  assert.equal(records.length, 1);
  assert.equal(records[0].key, 'swarm');
  assert.ok(records[0].hits[0].dmg > 0);
  assert.ok(boss.minionClock[spark.id] > 20_000, 'timer lives apart from unit hp');
  assert.deepEqual(minionCasts(members, boss, { now: 20_001, damage: flat }), [], 'and rearms');
});

test('minions shield the boss; killing them removes the shield', () => {
  const boss = makeBoss('terrax');
  assert.equal(armorShield(boss), 0);
  spawnMinions(boss, ['shard', 'shard'], 0);
  assert.equal(armorShield(boss), 0.5);
  for (const unit of boss.minions) damageUnit(boss, unit, unit.hp);
  assert.equal(armorShield(boss), 0);
});

test('hydra heads lock the body at 1 hp until both are dead; the lock takes the damage, not the player', () => {
  const boss = makeBoss('tiamara');
  spawnMinions(boss, ['head_fire', 'head_venom'], 0);
  assert.equal(aliveRequiredUnits(boss).length, 2);

  const session = fighter(1);
  session.game.gameClass.stats.attack = 1e9; // one-shots anything
  const skill = { slot: 1, isDealDamage: true, damageModifier: 1 };
  const result = userDealDamage(session, boss, skill);
  assert.equal(boss.currentHp, 1);
  assert.equal(result.locked, true);
  const credited = boss.listOfDamage[0].damage;
  assert.equal(credited, 99_999, 'credited only what really landed');
  userDealDamage(session, boss, skill);
  assert.equal(boss.listOfDamage[0].damage, credited, 'a locked boss takes nothing more');

  for (const unit of boss.minions) damageUnit(boss, unit, unit.hp);
  assert.equal(aliveRequiredUnits(boss).length, 0);
  userDealDamage(session, boss, skill);
  assert.equal(boss.currentHp, 0);
});

test('a fallen twin enrages (and may heal) the survivor', () => {
  const boss = makeBoss('selene', { currentHp: 40_000 });
  const [umbra] = spawnMinions(boss, ['umbra'], 0);
  const result = damageUnit(boss, umbra, umbra.hp);
  assert.equal(result.killed, true);
  assert.equal(boss.enrage, 0.4);
  assert.equal(boss.currentHp, 50_000);
  assert.match(result.reaction.say, /Селена/);
});

test('players can aim at a minion: its hp drops, the boss does not, and the kill pays out', () => {
  const boss = makeBoss('kivaha');
  const [spark] = spawnMinions(boss, ['spark'], 0);
  const session = fighter(7);
  session.game.gameClass.stats.attack = 1e9;
  const result = castSkill(session, boss, { slot: 1, isDealDamage: true, damageModifier: 1, name: 'x' }, { targetId: spark.id });
  assert.equal(result.type, 'damage');
  assert.equal(boss.currentHp, 100_000);
  assert.equal(spark.currentHp, 0);
  assert.equal(result.unitKilled.name, 'Грозовая искра');
  assert.ok(result.unitKilled.sp >= 2 && result.unitKilled.sp <= 4);
  assert.equal(boss.listOfDamage[0].damage, spark.hp);
});

test('phases fire once, even when one big hit skips several', () => {
  const boss = makeBoss('zephyrion', { currentHp: 15_000 }); // 15% -> past 70%, 40% and 20%
  const events = advanceBossPhases(boss, 5_000);
  assert.equal(events.length, 3);
  assert.equal(boss.phaseIndex, 3);
  assert.equal(boss.minions.length, 4);
  assert.ok(Math.abs(boss.enrage - 0.4) < 1e-9);
  assert.deepEqual(advanceBossPhases(boss, 6_000), []);
  assert.equal(boss.eventLog.length, 3);
});

test('phases unlock extra attacks', () => {
  const boss = makeBoss('kivaha');
  const members = [fighter(1), fighter(2), fighter(3)];
  boss.listOfDamage = [{ id: 1, damage: 10 }];
  const keys = new Set();
  for (let i = 0; i < 200; i++) {
    const record = bossCastAttack(members, boss, { now: i, random: Math.random, damage: () => 1 });
    if (record && !record.charging) keys.add(record.key);
    boss.castCount = 0;
  }
  assert.ok(!keys.has('chain_lightning'), 'locked in phase 0');
  boss.phaseIndex = 1;
  keys.clear();
  for (let i = 0; i < 200; i++) {
    const record = bossCastAttack(members, boss, { now: i, random: Math.random, damage: () => 1 });
    if (record && !record.charging) keys.add(record.key);
    boss.castCount = 0;
  }
  assert.ok(keys.has('chain_lightning'));
});

test('multi-target attacks hit exactly `count` distinct fighters', () => {
  const boss = makeBoss('kivaha', { phaseIndex: 1 });
  const members = [1, 2, 3, 4, 5].map(id => fighter(id));
  let seen = null;
  for (let i = 0; i < 300 && !seen; i++) {
    const record = bossCastAttack(members, boss, { now: 0, damage: () => 1 });
    if (record.key === 'chain_lightning') seen = record;
  }
  assert.equal(seen.hits.length, 2);
  assert.equal(new Set(seen.hits.map(hit => hit.userId)).size, 2);
});

test('an ultimate is announced one cast ahead, then fires; a stun interrupts it', () => {
  const boss = makeBoss('kivaha', { castCount: 6 });
  const members = [fighter(1), fighter(2)];
  boss.listOfDamage = [{ id: 1, damage: 10 }];

  const warning = bossCastAttack(members, boss, { now: 1_000, damage: flat });
  assert.equal(warning.charging, true);
  assert.deepEqual(warning.hits, []);
  assert.equal(boss.charging.key, 'thunderclap');
  assert.equal(members[0].game.gameClass.stats.hp, 10_000, 'nobody is hurt by the warning');

  const stun = applyBossDebuff(boss, { kind: 'stun', seconds: 3 }, 2_000);
  assert.equal(stun.interrupted, true);
  assert.equal(boss.charging, null);
  assert.equal(isBossStunned(boss, 3_000), true);
  assert.equal(isBossStunned(boss, 6_000), false);

  boss.castCount = 6;
  bossCastAttack(members, boss, { now: 7_000, damage: flat });
  const strike = bossCastAttack(members, boss, { now: 12_000, damage: flat });
  assert.equal(strike.key, 'thunderclap');
  assert.equal(strike.target, 'all');
  assert.equal(strike.hits.length, 2);
  assert.equal(boss.castCount, 0);
});

test('stun is not chainable: a stunned boss resists another for a while', () => {
  const boss = makeBoss('kivaha');
  assert.equal(applyBossDebuff(boss, { kind: 'stun', seconds: 3 }, 0).applied, true);
  assert.equal(applyBossDebuff(boss, { kind: 'stun', seconds: 3 }, 4_000).resisted, true);
  assert.equal(applyBossDebuff(boss, { kind: 'stun', seconds: 3 }, 3_000 + STUN_IMMUNITY_MS + 1).applied, true);
});

test('armor break makes the player hit harder, and expires', () => {
  const session = fighter(1);
  const skill = { slot: 1, isDealDamage: true, damageModifier: 1 };
  const boss = makeBoss('kivaha');
  // the same dice for both hits: a crit on one of them would hide the 30%
  const hit = now => withSeed(11, () => userDealDamage(session, boss, skill, { now }).dmg);
  const before = hit(0);
  applyBossDebuff(boss, { kind: 'armorBreak', amount: 30, seconds: 10 }, 0);
  assert.equal(bossDebuffAmount(boss, 'armorBreak', 5_000), 0.3);
  const during = hit(5_000);
  assert.ok(during > before * 1.3, `${before} -> ${during}`);
  assert.equal(bossDebuffAmount(boss, 'armorBreak', 11_000), 0);
});

test('guard, evade and taunt change who gets hurt and how much', () => {
  const boss = makeBoss('kivaha');
  const guarded = fighter(1, { effects: [{ name: 'guard', amount: 0.5, until: 1e12 }] });
  const plain = fighter(2);
  boss.listOfDamage = [{ id: 2, damage: 9_999 }];
  const record = bossCastAttack([guarded, plain], boss, { now: 5, random: () => 0.99, damage: flat });
  const byUser = Object.fromEntries(record.hits.map(hit => [hit.userId, hit.dmg]));
  assert.ok(byUser['1'] <= byUser['2'] / 2 + 1 || record.target !== 'all', JSON.stringify(byUser));

  const taunter = fighter(3, { effects: [{ name: 'taunt', amount: 1, until: 1e12 }] });
  boss.listOfDamage = [{ id: 4, damage: 9_999 }];
  for (let i = 0; i < 30; i++) {
    const hit = bossCastAttack([taunter, fighter(4), fighter(5)], boss, { now: 5, random: Math.random, damage: () => 1 });
    if (hit.target === 'single') assert.deepEqual(hit.hits.map(row => row.userId), ['3']);
  }

  const dodger = fighter(6, { effects: [{ name: 'evade', amount: 0.99, until: 1e12 }] });
  const miss = bossCastAttack([dodger], boss, { now: 5, random: () => 0.5, damage: flat });
  assert.equal(miss.hits[0].evaded, true);
  assert.equal(miss.hits[0].dmg, 0);
  assert.equal(dodger.game.gameClass.stats.hp, 10_000);
});

test('a fight is survivable but dangerous: a top damager loses most of their hp over a few minutes', () => {
  const boss = makeBoss('kivaha');
  const top = fighter(1);
  const others = [fighter(2), fighter(3), fighter(4)];
  boss.listOfDamage = [{ id: 1, damage: 100 }];
  let casts = 0;
  // seeded: with free dice a lucky boss can kill everyone and the comparison below ties
  withSeed(7, () => {
    for (let now = 0; now < 3 * 60 * 1000; now += 6_500) {
      bossCastAttack([top, ...others], boss, { now, random: Math.random });
      casts++;
    }
  });
  const lost = 1 - top.game.gameClass.stats.hp / 10_000;
  const sideLost = 1 - others[0].game.gameClass.stats.hp / 10_000;
  assert.ok(casts >= 25);
  assert.ok(lost > 0.4, `top lost ${(lost * 100).toFixed(0)}%`);
  assert.ok(sideLost < lost, 'bystanders lose less than the target');
  assert.ok(RESPAWN_MS > 0);
});

test('Mini App DTOs know the new attack shapes and timed effects', () => {
  const attacks = bossAttacksDto('veraxis');
  assert.ok(attacks.some(attack => attack.target === 'multi' && attack.count === 3));
  assert.equal(attacks.at(-1).ultimate, true);
  const list = playerEffectsDto([{ name: 'guard', amount: 0.3, until: 20_000 }, { name: 'evade', amount: 0.4, until: 500 }], 0, 10_000);
  assert.deepEqual(list.map(item => item.id), ['guard']);
  assert.equal(list[0].count, 10);
});

test('boss loot works for every boss, including the new ones', () => {
  for (const boss of bosses) {
    const loot = getLoot({ name: boss.name, stats: { lvl: 2 } });
    assert.ok(loot.gold[0].value.minAmount > 0, boss.name);
  }
});

// Engine skills of every effect kind (the class kits are generated from the real class trees, so the engine
// tests keep their own fixtures instead of pointing at a slot of a generated class).
const KIT = {
  oath: {"name":"Клятва света","description":"Клятва придаёт силы: +35% к урону по боссу на следующие 4 атаки.","effect":"buff","cooldown":60,"isSelf":true,"isDealDamage":false,"isHeal":false,"isShield":false,"isBuff":true,"costHp":0,"cost":90,"tier":2,"needLvl":28,"buffs":[{"kind":"damage","amount":35,"charges":4}]},
  taunt: {"name":"Вызов","description":"Босс сосредотачивается на тебе на 12 секунд, а получаемый урон падает на 30%.","effect":"buff","cooldown":45,"isSelf":true,"isDealDamage":false,"isHeal":false,"isShield":false,"isBuff":true,"costHp":0,"cost":60,"tier":2,"needLvl":28,"buffs":[{"kind":"taunt","seconds":12},{"kind":"guard","amount":30,"seconds":12}]},
  curse: {"name":"Проклятие слабости","description":"Проклятие на 15 секунд: босс наносит на 25% меньше урона.","effect":"debuff","cooldown":40,"isSelf":false,"isDealDamage":false,"isHeal":false,"isShield":false,"isBuff":false,"costHp":0,"cost":70,"tier":2,"needLvl":28,"debuff":{"kind":"weaken","amount":25,"seconds":15}},
  spring: {"name":"Источник маны","description":"Возвращает 35% максимальной маны.","effect":"restore","cooldown":90,"isSelf":true,"isDealDamage":false,"isHeal":false,"isShield":false,"isBuff":false,"costHp":0,"cost":0,"tier":2,"needLvl":28,"restoreMp":0.35},
  wall: {"name":"Несокрушимый","description":"На 15 секунд получаемый урон падает на 60%, плюс щит на 50% здоровья.","effect":"buff","cooldown":120,"isSelf":true,"isDealDamage":false,"isHeal":false,"isShield":false,"isBuff":true,"costHp":0,"cost":150,"tier":3,"needLvl":52,"buffs":[{"kind":"guard","amount":60,"seconds":15}],"shieldPower":0.5,"enchantItem":{"key":"essence_terrax","perLevel":1}},
  volley: {"name":"Град стрел","description":"Пять стрел, каждая по 80% урона.","effect":"multi_hit","cooldown":20,"isSelf":false,"isDealDamage":true,"isHeal":false,"isShield":false,"isBuff":false,"costHp":0,"cost":90,"tier":2,"needLvl":22,"hits":5,"damageModifier":0.8},
  reap: {"name":"Жатва душ","description":"550% урона, а по боссу с запасом здоровья ниже 35% — вдвое больше.","effect":"execute","cooldown":45,"isSelf":false,"isDealDamage":true,"isHeal":false,"isShield":false,"isBuff":false,"costHp":0,"cost":200,"tier":3,"needLvl":44,"damageModifier":5.5,"executeBelow":0.35,"executeBonus":1},
  drain: {"name":"Похищение жизни","description":"240% урона. Возвращает 20% нанесённого урона здоровьем.","effect":"vampire","cooldown":20,"isSelf":false,"isDealDamage":true,"isHeal":false,"isShield":false,"isBuff":false,"costHp":0,"cost":80,"tier":2,"needLvl":22,"damageModifier":2.4,"vampirePower":0.2}
};

test('profession skills resolve through the shared engine: buffs, debuffs, mana, shields', () => {
  const boss = makeBoss('kivaha');
  const session = fighter(1);
  session.game.gameClass.stats.mp = 100;

  const oath = KIT.oath;
  const buff = castSkill(session, boss, oath);
  assert.equal(buff.type, 'buff');
  assert.deepEqual(session.game.effects.find(effect => effect.name === 'addDamageToBoss'), { name: 'addDamageToBoss', amount: 35, count: 4 });

  const taunt = castSkill(session, boss, KIT.taunt, { now: 1_000 });
  assert.equal(taunt.type, 'buff');
  assert.equal(session.game.effects.find(effect => effect.name === 'taunt').until, 13_000);
  assert.equal(session.game.effects.find(effect => effect.name === 'guard').amount, 0.3);

  const curse = castSkill(session, boss, KIT.curse, { now: 0 });
  assert.equal(curse.type, 'debuff');
  assert.equal(bossDebuffAmount(boss, 'weaken', 1_000), 0.25);

  const spring = castSkill(session, boss, KIT.spring);
  assert.equal(spring.type, 'restore');
  assert.equal(session.game.gameClass.stats.mp, 450);

  const wall = castSkill(session, boss, KIT.wall);
  assert.equal(wall.shield, 5_000);
  assert.equal(session.game.effects.find(effect => effect.name === 'shield').value, 5_000);
});

test('multi-hit skills roll every hit; execute skills hit harder on a wounded boss; vampirism heals', () => withSeed(3, () => {
  const session = fighter(1);
  session.game.gameClass.stats.hp = 5_000;
  const boss = makeBoss('kivaha');
  const volley = KIT.volley;
  const result = userDealDamage(session, boss, volley);
  assert.equal(result.hits.length, 5);
  assert.equal(result.dmg, result.hits.reduce((sum, hit) => sum + hit.dmg, 0));

  const reap = KIT.reap;
  const healthy = userDealDamage(session, makeBoss('kivaha'), reap).dmg;
  const wounded = userDealDamage(session, makeBoss('kivaha', { currentHp: 20_000 }), reap).dmg;
  assert.ok(wounded > healthy * 1.7, `${healthy} -> ${wounded}`);

  const drain = KIT.drain;
  const hpBefore = session.game.gameClass.stats.hp;
  const drained = userDealDamage(session, makeBoss('kivaha'), drain);
  assert.ok(drained.vampire > 0 && session.game.gameClass.stats.hp > hpBefore);
}));

import { equipmentRewardCount, EQUIPMENT_TIER_MULTIPLIER } from '../functions/game/boss/bossSendLoot.js';
import bossLootTemplate from '../template/bossLootTemplate.js';

test('equipment drops: the table survives level scaling (it used to turn into NaN, so nothing ever dropped)', () => {
  const loot = getLoot({ name: 'kivaha', stats: { lvl: 5 } });
  assert.deepEqual(loot.equipment, bossLootTemplate.equipment);
  assert.ok(loot.equipment.every(row => Number.isFinite(row.value) && row.value > 0 && row.value < 1));
});

test('equipment drops are modest on average and grow with boss rank', () => {
  const expected = bossLootTemplate.equipment.reduce((sum, row) => sum + row.value * row.chance, 0);
  assert.ok(expected > 0.05 && expected < 0.12, `average share ${expected.toFixed(3)}`);
  assert.deepEqual(Object.values(EQUIPMENT_TIER_MULTIPLIER), [1, 1.3, 1.6]);

  const average = (fighters, tier) => {
    let total = 0;
    for (let i = 0; i < 4000; i++) total += equipmentRewardCount(fighters, expected, tier, () => (i + 0.5) / 4000);
    return total / 4000;
  };
  assert.ok(Math.abs(average(20, 1) - 20 * expected) < 0.05);
  assert.ok(average(20, 3) > average(20, 1) * 1.5);
  assert.ok(average(3, 1) > 0, 'small raids still get an occasional drop');
  assert.equal(equipmentRewardCount(2, 5, 3), 2, 'never more items than fighters');
  assert.equal(equipmentRewardCount(0, 0.5), 0);
});

import getIncomingDamageModifier, { MIN_INCOMING_DAMAGE_MODIFIER } from '../functions/game/player/getters/getIncomingDamageModifier.js';
import setSkillCooldown, { MIN_COOLDOWN_SHARE } from '../functions/game/player/setSkillCooldown.js';
import { getSkillCooldownMultiplier } from '../functions/game/player/skillEnchant.js';

test('damage reduction stacks to a floor: gear and class modifiers cannot make a tank near-immune', () => {
  const tank = fighter(1);
  tank.game.gameClass.stats.incomingDamageModifier = 0.8;
  tank.game.equipmentStats = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(slot => [slot, { kind: slot, slots: [slot], characteristics: {}, stats: [{ name: 'incomingDamageModifier', value: 0.94 }] }]));
  assert.equal(getIncomingDamageModifier(tank), MIN_INCOMING_DAMAGE_MODIFIER);

  // Worst legal stack against a boss hit: defence (-50%) x the floor x a maxed guard (-80%).
  const boss = makeBoss('kivaha');
  tank.game.gameClass.stats.defence = 1e9;
  tank.game.effects = [{ name: 'guard', amount: 0.8, until: 1e12 }];
  const hit = calcBossHit(boss, tank, { random: () => 0.5, now: 0 });
  const fresh = calcBossHit(boss, fighter(2), { random: () => 0.5, now: 0 });
  assert.ok(hit / fresh > 0.25 && hit / fresh < 0.4, `defence + gear alone leave ${(hit / fresh).toFixed(2)} of a plain hit`);
  const withGuard = Math.max(1, Math.ceil(hit * 1 * (1 - 0.8)));
  assert.ok(withGuard / fresh > 0.05 && withGuard / fresh < 0.1, `the absolute worst stack leaves ${(withGuard / fresh).toFixed(3)}`);
});

test('skill cooldowns have a floor however much haste, gear, speed and levels stack', () => {
  const session = fighter(1);
  session.game.gameClass.stats.speed = 1000;
  session.game.effects = [{ name: 'haste', amount: 0.5, until: 1e12 }];
  const skill = { cooldown: 60, enchantLevel: 10, routeKind: 'time', routeLevel: 5 };
  assert.ok(getSkillCooldownMultiplier(skill) < 0.7);
  const before = Date.now();
  setSkillCooldown(skill, session);
  const remainMs = skill.cooldownReceive - before;
  assert.ok(remainMs >= 60_000 * MIN_COOLDOWN_SHARE - 50, `${remainMs}`);
  assert.ok(remainMs < 60_000 * MIN_COOLDOWN_SHARE + 500);
});
