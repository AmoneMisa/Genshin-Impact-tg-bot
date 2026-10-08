import test from 'node:test';
import assert from 'node:assert/strict';
import classStats from '../template/classStatsTemplate.js';
import classSkills from '../template/classSkillsTemplate.js';
import classQuests from '../template/classQuestsTemplate.js';
import materials from '../template/materialsTemplate.js';
import bosses from '../template/bossTemplate.js';
import { CLASS_FAMILY, familyOf } from '../webapp/class-family.js';
import { CLASS_TREE } from '../template/classTree.js';
import getGameClass from '../functions/game/player/getters/getGameClassFromTemplate.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';

const byName = name => classStats.find(item => item.name === name);
const professions = classStats.filter(item => item.tier > 1);

test('six base classes, each with two 2nd professions and one 3rd profession per branch', () => {
  const bases = classStats.filter(item => item.name !== 'noClass' && item.tier === 1).map(item => item.name);
  assert.deepEqual(bases.sort(), ['archer', 'berserk', 'mage', 'priest', 'rogue', 'warrior']);
  assert.equal(professions.length, 24);
  for (const base of bases) {
    const seconds = classStats.filter(item => item.parent === base);
    assert.equal(seconds.length, 2, base);
    for (const second of seconds) {
      assert.equal(second.tier, 2);
      assert.equal(second.promoteLvl, 20);
      const thirds = classStats.filter(item => item.parent === second.name);
      assert.equal(thirds.length, 1, second.name);
      assert.equal(thirds[0].tier, 3);
      assert.equal(thirds[0].promoteLvl, 40);
    }
  }
});

test('every class has a full stat block and a description', () => {
  for (const item of classStats) {
    for (const key of ['attack', 'defence', 'maxHp', 'maxMp', 'maxCp', 'speed', 'criticalChance', 'criticalDamage', 'incomingDamageModifier', 'additionalDamageMul', 'block', 'accuracy', 'evasion', 'translateName', 'description']) {
      assert.ok(item[key] !== undefined && item[key] !== null && item[key] !== '', `${item.name}.${key}`);
    }
    assert.equal(item.hp, item.maxHp, item.name);
    assert.equal(item.mp, item.maxMp, item.name);
    assert.equal(item.cp, item.maxCp, item.name);
  }
});

test('professions keep their parent skills in the same slots and add two (four at the 3rd class)', () => {
  for (const item of professions) {
    const parentSkills = classSkills[item.parent];
    const own = classSkills[item.name];
    assert.ok(own, item.name);
    own.forEach((skill, index) => assert.equal(skill.slot, index, `${item.name} slot ${index}`));
    parentSkills.forEach((skill, index) => assert.equal(own[index].name, skill.name, `${item.name} inherits ${skill.name}`));
    const added = own.length - parentSkills.length;
    assert.equal(added, item.tier === 2 ? 2 : 4, `${item.name} learns ${added} skills`);
    for (const skill of own.slice(parentSkills.length)) {
      assert.equal(skill.tier, item.tier, `${item.name}/${skill.name}`);
      assert.ok(skill.needLvl >= item.promoteLvl, `${skill.name} unlocks at ${skill.needLvl}`);
    }
  }
});

test('3rd professions get two awakened skills at levels 60 and 75', () => {
  for (const item of classStats.filter(entry => entry.tier === 3)) {
    const skills = classSkills[item.name];
    assert.equal(skills.length, 9, item.name);
    assert.deepEqual(skills.slice(7).map(skill => skill.needLvl), [60, 75], item.name);
    assert.ok(skills.slice(7).every(skill => skill.enchantItem?.key), `${item.name} awakened skills want an essence`);
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
      // A skill pays in mp, hp, or hp-percent - and professions never cost nothing at all unless free by design.
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

test('web class families match the server class tree', () => {
  for (const item of classStats) {
    let root = item;
    while (root.parent) root = byName(root.parent);
    assert.equal(CLASS_FAMILY[item.name], root.name, item.name);
    assert.equal(familyOf(item.name), root.name);
  }
  assert.deepEqual(Object.keys(CLASS_FAMILY).sort(), classStats.map(item => item.name).sort());
  assert.deepEqual(Object.keys(CLASS_TREE).sort(), ['archer', 'berserk', 'mage', 'priest', 'rogue', 'warrior']);
});

test('creating a player class never aliases or mutates the shared templates', () => {
  const template = byName('mage');
  const before = structuredClone(template);
  const session = { game: { stats: { lvl: 30 }, gameClass: { stats: { name: 'noClass' } } } };
  changePlayerClass(session, template);
  updatePlayerStats(session);
  assert.deepEqual(template, before, 'template untouched');
  assert.notEqual(session.game.gameClass.stats, template);
  session.game.gameClass.skills[1].enchantLevel = 7;
  assert.equal(classSkills.mage[1].enchantLevel, undefined, 'skills are copies too');
  assert.notEqual(getGameClass('mage').skills, classSkills.mage);
});
