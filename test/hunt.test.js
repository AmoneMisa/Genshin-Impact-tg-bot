import test from 'node:test';
import assert from 'node:assert/strict';
import zones from '../template/huntingTemplate.js';
import materials from '../template/materialsTemplate.js';
import shopTemplate from '../template/shopTemplate.js';
import { SHOT_GRADES, SHOT_KINDS, shotKey } from '../template/shotsData.js';
import { CHAMPIONS, HUNT } from '../functions/game/hunt/huntConfig.js';
import { buildMob, getZone, referenceHit, rollChampion } from '../functions/game/hunt/huntMobs.js';
import { dropGapFactor, expGapFactor, grantKillRewards } from '../functions/game/hunt/huntRewards.js';
import { IDLE_MS, advanceHunt, ensureHunt, fleeHunt, mobDto, startHunt, useHuntSkill } from '../functions/game/hunt/huntFight.js';
import { armShots, clearShots, getShotsState, setAutoShots, shotBoost } from '../functions/game/shots/shots.js';
import { getMaterialCount } from '../functions/game/player/materials.js';
import changePlayerGameClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';

const NOW = 1_800_000_000_000;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

function hero(level = 30, className = 'warrior', extra = {}) {
  const session = {
    userId: 1, userChatData: { user: { id: 1 } },
    game: { stats: { lvl: level, currentExp: 0, needExp: 1 }, inventory: { gold: 0, sp: 0, materials: {}, potions: { items: [] }, equipment: { items: [] } }, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0, ...extra },
  };
  changePlayerGameClass(session, className);
  updatePlayerStats(session);
  return session;
}

test('the hunting template is built from real High Five zones and maps onto our materials', () => {
  assert.ok(zones.length >= 30);
  const keys = new Set(materials.map(material => material.key));
  for (const zone of zones) {
    assert.ok(zone.mobs.length >= 3 && zone.min <= zone.level && zone.level <= zone.max, zone.id);
    for (const mob of zone.mobs) {
      assert.ok(mob.name && mob.level >= 1 && mob.expShare > 0 && mob.hp > 0, `${zone.id}/${mob.name}`);
      for (const drop of mob.drops) assert.ok(keys.has(drop.key), `${mob.name} drops unknown ${drop.key}`);
    }
  }
  // every level from 1 to 85 has a zone it earns experience in (less than 11 levels apart)
  for (let level = 1; level <= 85; level += 1) assert.ok(zones.some(zone => Math.abs(zone.level - level) < HUNT.expMaxGap), `level ${level}`);
});

test('experience and drops follow the High Five level-gap rules', () => {
  assert.equal(expGapFactor(40, 40), 1);
  assert.equal(expGapFactor(50, 40), 1, '10 levels above still pays');
  assert.equal(expGapFactor(51, 40), 0, '11 levels above pays nothing');
  assert.equal(expGapFactor(30, 41), 0, 'so does 11 levels below');
  assert.equal(expGapFactor(85, 88), 0.97, 'a mob 3 levels above a level-85 hero');
  assert.equal(expGapFactor(85, 95), 0.03);
  assert.equal(expGapFactor(85, 80), 1);
  assert.equal(expGapFactor(60, 55), 1, 'the penalty table is for level 85 only');

  const items = HUNT.itemGap;
  assert.equal(dropGapFactor(40, 40, items), 1);
  assert.equal(dropGapFactor(45, 40, items), 1);
  near(dropGapFactor(47.5, 40, items), 0.55);
  assert.equal(dropGapFactor(60, 40, items), items.floor);
});

test('champions: red is rarer and 8x tougher, blue 3x, none below level 20', () => {
  assert.equal(rollChampion(40, () => 0), 'red');
  assert.equal(rollChampion(40, () => CHAMPIONS.red.chance + 0.001), 'blue');
  assert.equal(rollChampion(40, () => 0.5), null);
  assert.equal(rollChampion(19, () => 0), null);

  const zone = getZone('plains-of-dion');
  const mobDef = zone.mobs[0];
  const normal = buildMob(zone, mobDef, { now: NOW, champion: null });
  const blue = buildMob(zone, mobDef, { now: NOW, champion: 'blue' });
  const red = buildMob(zone, mobDef, { now: NOW, champion: 'red' });
  assert.ok(Math.abs(blue.hp / normal.hp - 3) < 0.01 && Math.abs(red.hp / normal.hp - 8) < 0.01);
  assert.ok(red.hunt.atk > blue.hunt.atk && blue.hunt.atk > normal.hunt.atk);
  assert.equal(normal.champion, null);
  assert.ok(referenceHit(40, 'mage') > 0 && referenceHit(40, 'mage') !== referenceHit(40, 'warrior'));
});

test('a hunt: the hero kills a mob in real time, rewards are credited and the experience is x5', () => {
  const session = hero(26);
  assert.equal(startHunt(session, 'no-such-zone').reason, 'unknown_zone');
  const started = startHunt(session, 'plains-of-dion', { now: NOW, champion: null, random: () => 0.1 });
  assert.equal(started.ok, true);
  assert.equal(startHunt(session, 'plains-of-dion', { now: NOW }).reason, 'already_fighting');
  assert.equal(mobDto(ensureHunt(session).mob, NOW).champion, null);

  let now = NOW;
  let outcome = null;
  for (let step = 0; step < 200 && !outcome?.killed; step += 1) {
    now += 1000;
    // keep the hero alive: this test is about the kill
    session.game.gameClass.stats.hp = getMaxHp(session, session.game.gameClass);
    outcome = useHuntSkill(session, 0, { now, random: () => 0.5 });
    assert.ok(outcome.ok || outcome.reason === 'cooldown', outcome.reason);
  }
  assert.equal(outcome.killed, true);
  assert.ok(outcome.rewards.exp > 0 && outcome.rewards.sp > 0);
  assert.equal(outcome.rewards.bonus, 3, 'a fresh character has a full Vitality bar');
  assert.equal(ensureHunt(session).mob, null);
  assert.equal(ensureHunt(session).kills, 1);
  assert.equal(session.game.inventory.sp, outcome.rewards.sp);
  assert.ok(session.game.stats.currentExp > 0 || session.game.stats.lvl > 26);
});

test('the mob swings on its own clock; the hero can die; a forgotten mob leaves', () => {
  const session = hero(30);
  startHunt(session, 'plains-of-dion', { now: NOW, champion: 'red', random: () => 0.1 });
  const mob = ensureHunt(session).mob;
  const hpBefore = session.game.gameClass.stats.hp;
  advanceHunt(session, NOW + mob.attackMs - 1, () => 0.5);
  assert.equal(session.game.gameClass.stats.hp, hpBefore, 'no swing before it is due');
  const written = advanceHunt(session, NOW + mob.attackMs * 2 + 5, () => 0.5);
  assert.ok(written.length >= 2 && session.game.gameClass.stats.hp < hpBefore);

  // a very long pause is not a stack of hits: at most maxCatchUp swings land
  const lonely = hero(30);
  startHunt(lonely, 'plains-of-dion', { now: NOW, champion: null, random: () => 0.1 });
  lonely.game.hunt.lastActionAt = NOW + 10 * 60 * 1000;
  const swings = advanceHunt(lonely, NOW + 5 * 60 * 1000, () => 0.5);
  assert.ok(swings.length <= HUNT.maxCatchUp);

  // death
  const weak = hero(30);
  startHunt(weak, 'plains-of-dion', { now: NOW, champion: 'red', random: () => 0.1 });
  weak.game.gameClass.stats.hp = 1;
  advanceHunt(weak, NOW + 5000, () => 0.5);
  assert.equal(ensureHunt(weak).mob, null);
  assert.ok(weak.game.respawnTime > NOW);
  assert.equal(startHunt(weak, 'plains-of-dion', { now: NOW + 5001 }).reason, 'dead');

  // idle
  const idle = hero(30);
  startHunt(idle, 'plains-of-dion', { now: NOW, champion: null, random: () => 0.1 });
  advanceHunt(idle, NOW + IDLE_MS + 1);
  assert.equal(ensureHunt(idle).mob, null);
  assert.equal(fleeHunt(idle).reason, 'no_mob');
});

test('rewards: a red champion pays x8 experience, drops the stones of its element, nothing at a level gap of 11', () => {
  const zone = getZone('fields-of-massacre');
  const mobDef = zone.mobs[2];
  const level = mobDef.level;
  const pay = (champion, heroLevel) => {
    const session = hero(heroLevel);
    const mob = buildMob(zone, mobDef, { now: NOW, champion });
    return { session, rewards: grantKillRewards(session, mob, mobDef, { random: () => 0, now: NOW }) };
  };
  const normal = pay(null, level);
  const red = pay('red', level);
  assert.ok(Math.abs(red.rewards.exp / normal.rewards.exp - 8) < 0.01);
  assert.ok(red.rewards.items.some(item => item.item.startsWith('attr_stone_')), 'a red champion always drops a stone');
  assert.ok(red.rewards.items.length > normal.rewards.items.length);
  const tooHigh = pay(null, level + 11);
  assert.equal(tooHigh.rewards.exp, 0);
  assert.equal(tooHigh.rewards.sp, 0);
});

test('shots: soulshots for fighters, blessed spiritshots for mages, burnt per damage skill when auto is on', () => {
  for (const kind of SHOT_KINDS) for (const grade of SHOT_GRADES) assert.ok(materials.some(item => item.key === shotKey(kind.id, grade)), `${kind.id} ${grade}`);

  const weapon = { name: 'Sword', mainType: 'weapon', grade: 'A', slots: ['rightHand'], kind: 'oneHandedSword', uid: 's1' };
  const fighter = hero(65, 'warrior', { equipmentStats: { rightHand: weapon } });
  fighter.game.inventory.materials[shotKey('soulshot', 'A')] = 10;
  const damage = { isDealDamage: true };
  assert.equal(armShots(fighter, damage), null, 'auto is off');
  setAutoShots(fighter, true);
  assert.equal(getShotsState(fighter).kinds[0].count, 10);
  const used = armShots(fighter, damage);
  assert.equal(used.spent, 4);
  assert.equal(shotBoost(fighter), 1.5);
  assert.equal(getMaterialCount(fighter, shotKey('soulshot', 'A')), 6);
  clearShots(fighter);
  assert.equal(shotBoost(fighter), 1);
  assert.equal(armShots(fighter, { isHeal: true }), null, 'only damage skills burn shots');
  fighter.game.inventory.materials[shotKey('soulshot', 'A')] = 3;
  assert.equal(armShots(fighter, damage), null, 'not enough charges');

  const mage = hero(65, 'mage', { equipmentStats: { rightHand: { ...weapon, uid: 's2' } }, autoShots: true });
  mage.game.inventory.materials[shotKey('spiritshot', 'A')] = 10;
  mage.game.inventory.materials[shotKey('blessed', 'A')] = 10;
  assert.equal(armShots(mage, damage).kind, 'blessed');
  assert.equal(shotBoost(mage), 1.8);
  clearShots(mage);
});

test('shots are sold by the pack in the gold shop, any number a day', () => {
  const packs = shopTemplate.filter(item => item.category === 'shots');
  assert.equal(packs.length, SHOT_KINDS.length * SHOT_GRADES.length);
  for (const pack of packs) {
    assert.equal(pack.repeatable, true);
    assert.equal(pack.material.amount, 100);
    assert.ok(materials.some(item => item.key === pack.material.key));
  }
  const soul = packs.find(pack => pack.command === 'shot-soulshot-S');
  const blessed = packs.find(pack => pack.command === 'shot-blessed-S');
  assert.equal(blessed.cost, soul.cost * 3);
});
