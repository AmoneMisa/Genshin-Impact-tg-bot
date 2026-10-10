import test from 'node:test';
import assert from 'node:assert/strict';
import classStats from '../template/classStatsTemplate.js';
import classSkills from '../template/classSkillsTemplate.js';
import classQuests from '../template/classQuestsTemplate.js';
import materials from '../template/materialsTemplate.js';
import bosses from '../template/bossTemplate.js';
import l2 from '../template/l2Classes.js';
import {L2_CLASS_META, START_CLASSES} from '../template/l2ClassMeta.js';
import { CLASS_FAMILY, familyOf } from '../webapp/class-family.js';
import getGameClass from '../functions/game/player/getters/getGameClassFromTemplate.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import {resolveClassName, legacyTarget} from '../functions/game/classes/legacyClasses.js';
import {migrateSessionClass} from '../functions/game/classes/migrateClasses.js';

const byName = name => classStats.find(item => item.name === name);
const professions = classStats.filter(item => item.tier > 1);
const real = classStats.filter(item => !item.legacy);

test('the tree is the real High Five one: eleven start classes (Kamael included) and every profession of it', () => {
  const starts = classStats.filter(item => item.tier === 1 && item.name !== 'noClass' && !item.legacy);
  assert.equal(starts.length, 11);
  assert.deepEqual(starts.map(item => item.l2Id).sort((a, b) => a - b), [...START_CLASSES].sort((a, b) => a - b));
  assert.equal(professions.length, Object.values(L2_CLASS_META).filter(meta => meta.level > 0).length);
  assert.equal(professions.length, 92);
  for (const name of ['trooper', 'warder', 'berserker', 'maleSoulBreaker', 'femaleSoulBreaker', 'arbalester', 'inspector', 'doombringer', 'judicator']) assert.ok(byName(name), name);
  for (const item of professions) {
    const parent = byName(item.parent);
    assert.ok(parent, `${item.name} has a parent`);
    assert.equal(item.tier, parent.tier + 1, item.name);
    assert.equal(item.promoteLvl, [0, 0, 20, 40, 76][item.tier], item.name);
    assert.equal(L2_CLASS_META[item.l2Id].parent, parent.l2Id);
    assert.ok(l2.classes[String(item.l2Id)], `${item.name} is a real class id`);
  }
  assert.deepEqual([...new Set(professions.map(item => item.tier))].sort(), [2, 3, 4]);
  assert.equal(classStats.filter(item => item.tier === 4).length, Object.values(L2_CLASS_META).filter(meta => meta.level === 3).length);
});

test('every class has a full stat block and a description', () => {
  for (const item of classStats) {
    for (const key of ['attack', 'defence', 'maxHp', 'maxMp', 'maxCp', 'speed', 'criticalChance', 'criticalDamage', 'incomingDamageModifier', 'additionalDamageMul', 'block', 'accuracy', 'evasion', 'translateName']) {
      assert.ok(item[key] !== undefined && item[key] !== null && item[key] !== '', `${item.name}.${key}`);
    }
    assert.equal(item.hp, item.maxHp, item.name);
    assert.equal(item.mp, item.maxMp, item.name);
    assert.equal(item.cp, item.maxCp, item.name);
    assert.ok(['noClass', 'warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk'].includes(item.family), item.name);
  }
});

test('professions keep their parent skills in the same slots and add two (four at the 3rd profession)', () => {
  for (const item of professions) {
    const own = classSkills[item.name];
    assert.ok(own, item.name);
    own.forEach((skill, index) => assert.equal(skill.slot, index, `${item.name} slot ${index}`));
    const parentSkills = classSkills[item.parent];
    // when the family changes (a rogue becomes an archer) the base kit is the new family's, the parent's profession skills stay
    if (byName(item.parent).family === item.family) parentSkills.forEach((skill, index) => assert.equal(own[index].name, skill.name, `${item.name} inherits ${skill.name}`));
    const added = own.filter(skill => skill.tier === item.tier && !skill.scryde);
    assert.equal(added.length, item.tier === 4 ? 4 : 2, `${item.name} learns ${added.length} skills`);
    for (const skill of added) assert.ok(skill.needLvl >= item.promoteLvl, `${item.name}/${skill.name} unlocks at ${skill.needLvl}`);
  }
});

test('3rd professions awaken two skills at levels 76 and 80 that want a boss essence', () => {
  for (const item of classStats.filter(entry => entry.tier === 4)) {
    const awakened = classSkills[item.name].filter(skill => skill.tier === 4 && !skill.scryde).slice(2);
    assert.equal(awakened.length, 2, item.name);
    assert.deepEqual(awakened.map(skill => skill.needLvl), [76, 80], item.name);
    assert.ok(awakened.every(skill => skill.enchantItem?.key), `${item.name} awakened skills want an essence`);
  }
});

test('every enchant item is a known material and every boss has an essence', () => {
  const keys = new Set(materials.map(item => item.key));
  for (const [className, skills] of Object.entries(classSkills)) {
    for (const skill of skills) {
      if (skill.enchantItem) assert.ok(keys.has(skill.enchantItem.key), `${className}/${skill.name}: ${skill.enchantItem.key}`);
    }
  }
  for (const boss of bosses) assert.ok(keys.has(`essence_${boss.name}`), boss.name);
  for (const boss of bosses) for (const unit of boss.minions) for (const drop of unit.drops || []) assert.ok(keys.has(drop.item), drop.item);
});

test('skills are real: each one a profession learns is a skill of the real tree, with its name', () => {
  for (const item of professions) {
    for (const skill of classSkills[item.name].filter(entry => entry.tier && !entry.scryde)) {
      const real = l2.skills[String(skill.l2Id)];
      assert.ok(real, `${item.name}/${skill.name}`);
      assert.equal(skill.name, real.name);
    }
  }
});

test('skills are well formed: one kind each, costs and effects consistent', () => {
  for (const [className, skills] of Object.entries(classSkills)) {
    for (const skill of skills) {
      const label = `${className}/${skill.name}`;
      assert.ok(skill.name && skill.description, label);
      if (skill.isDealDamage) assert.ok(skill.slot === 0 || skill.damageModifier > 0, label);
      if (skill.isHeal) assert.ok(skill.healPower > 0, label);
      if (skill.isShield) assert.ok(skill.shieldPower > 0, label);
      if (skill.isBuff) assert.ok(skill.buffs?.length, label);
      for (const buff of skill.buffs || []) {
        assert.ok(['damage', 'critChance', 'critDamage', 'guard', 'taunt', 'evade', 'haste'].includes(buff.kind), label);
        assert.ok(buff.charges || buff.seconds, label);
      }
      for (const debuff of [skill.debuff, ...(skill.debuffs || [])].filter(Boolean)) {
        assert.ok(['armorBreak', 'weaken', 'stun'].includes(debuff.kind) && debuff.seconds > 0, label);
      }
      if (skill.slot > 0 && !skill.restoreMp) assert.ok(skill.cost > 0 || skill.costHp > 0 || skill.costHpPct > 0, label);
    }
  }
});

test('each profession has a quest and each quest a profession', () => {
  assert.deepEqual(classQuests.map(quest => quest.to).sort(), professions.map(item => item.name).sort());
  for (const quest of classQuests) {
    const target = byName(quest.to);
    assert.equal(quest.from, target.parent, quest.to);
    assert.equal(quest.tier, target.tier, quest.to);
    assert.equal(quest.minLevel, target.promoteLvl, quest.to);
    assert.ok(quest.steps.some(step => step.type === 'pay'), `${quest.to} has a hand-in`);
    assert.equal(quest.steps.at(-1).type, 'pay', `${quest.to}: the hand-in comes last`);
  }
});

test('web class families match the server class tree, and the old names still resolve', () => {
  for (const item of classStats) {
    assert.equal(CLASS_FAMILY[item.name], item.family, item.name);
    assert.equal(familyOf(item.name), item.family);
  }
  for (const old of ['crusader', 'warden', 'bastion', 'elementalist', 'soulReaper', 'saint', 'inquisitor', 'ranger', 'sniper', 'phantomShot', 'shadowBlade', 'trickster', 'phantomDancer', 'slayer', 'ironclad', 'warbringer', 'warrior', 'mage', 'priest', 'archer', 'rogue', 'berserk']) {
    assert.ok(CLASS_FAMILY[old], old);
  }
});

test('old class names resolve and a saved character of the old tree moves to the nearest real class', () => {
  // the old base classes stay as legacy blocks until the character is migrated; the old professions resolve
  assert.equal(resolveClassName('warrior'), 'warrior');
  assert.equal(legacyTarget('warrior', 5), 'humanFighter');
  assert.equal(legacyTarget('mage', 5), 'humanMystic');
  assert.equal(resolveClassName('crusader'), 'humanKnight');
  assert.equal(resolveClassName('saint', 60), 'bishop');
  assert.equal(resolveClassName('nonsense'), 'noClass');
  assert.equal(resolveClassName('paladin'), 'paladin');
  assert.equal(legacyTarget('phoenixKnight', 60), 'paladin');
  assert.equal(legacyTarget('archer', 45), 'hawkeye');
  const session = {game: {stats: {lvl: 45}, inventory: {}, gameClass: {stats: {name: 'phoenixKnight'}, skills: [{slot: 0}, {slot: 1, enchantLevel: 3}]}}};
  assert.equal(migrateSessionClass(session), true);
  assert.equal(session.game.gameClass.stats.name, 'paladin');
  assert.equal(session.game.classSystem, 2);
  assert.equal(session.game.gameClass.skills[1].enchantLevel, 3, 'enchant levels follow the slot');
  assert.equal(migrateSessionClass(session), false, 'only once');
  const fresh = {game: {stats: {lvl: 10}, inventory: {}, gameClass: {stats: {name: 'warrior'}, skills: []}}};
  migrateSessionClass(fresh);
  assert.equal(fresh.game.gameClass.stats.name, 'humanFighter');
});

test('creating a player class never aliases or mutates the shared templates', () => {
  const template = byName('humanMystic');
  const before = structuredClone(template);
  const session = { game: { stats: { lvl: 30 }, gameClass: { stats: { name: 'noClass' } } } };
  changePlayerClass(session, template);
  updatePlayerStats(session);
  assert.deepEqual(template, before, 'template untouched');
  assert.notEqual(session.game.gameClass.stats, template);
  session.game.gameClass.skills[1].enchantLevel = 7;
  assert.equal(classSkills.humanMystic[1].enchantLevel, undefined, 'skills are copies too');
  assert.notEqual(getGameClass('humanMystic').skills, classSkills.humanMystic);
});
