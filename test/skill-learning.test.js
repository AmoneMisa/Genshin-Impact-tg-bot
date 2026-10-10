import test from 'node:test';
import assert from 'node:assert/strict';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import isPlayerCanUseSkill from '../functions/game/player/isPlayerCanUseSkill.js';
import { isSkillLearned, learnSkill, skillLearnCost, grandfatherSkills } from '../functions/game/player/skillLearning.js';
import { getSkillsState, learnSkillForMiniApp } from '../miniapp/skills.js';
import { migrateSessionClass } from '../functions/game/classes/migrateClasses.js';

function hero(className = 'paladin', level = 60, sp = 1000) {
  const session = { game: { stats: { lvl: level }, inventory: { gold: 1e6, sp, materials: {}, crystals: 0, ironOre: 0 }, gameClass: { stats: { name: 'noClass' } }, effects: [], equipmentStats: {} } };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}
const professionSkill = session => session.game.gameClass.skills.find(skill => skill.l2Id && skill.needLvl <= session.game.stats.lvl);

test('the base kit needs no learning, a profession skill is learned for skill points before it can be used', () => {
  const session = hero();
  const base = session.game.gameClass.skills[0];
  assert.equal(isSkillLearned(session, base), true);
  assert.equal(skillLearnCost(base), null);

  const skill = professionSkill(session);
  assert.ok(skill, 'a paladin has profession skills');
  assert.equal(isSkillLearned(session, skill), false);
  assert.equal(isPlayerCanUseSkill(session, skill), 3, 'not learned = cannot be used');
  const cost = skillLearnCost(skill);
  assert.ok(cost.sp >= 1);

  const result = learnSkill(session, skill.slot);
  assert.equal(result.ok, true);
  assert.equal(session.game.inventory.sp, 1000 - cost.sp);
  assert.equal(isSkillLearned(session, skill), true);
  assert.notEqual(isPlayerCanUseSkill(session, skill), 3);
  assert.equal(learnSkill(session, skill.slot).reason, 'already_learned');
});

test('learning is refused below the skill level or without skill points, and changes nothing', () => {
  const low = hero('paladin', 25);
  const hard = low.game.gameClass.skills.find(skill => skill.l2Id && skill.needLvl > 25);
  assert.equal(learnSkill(low, hard.slot).reason, 'level_too_low');
  const poor = hero('paladin', 60, 0);
  const skill = professionSkill(poor);
  const before = JSON.stringify(poor.game);
  assert.equal(learnSkill(poor, skill.slot).reason, 'not_enough_sp');
  assert.equal(JSON.stringify(poor.game), before);
  assert.equal(learnSkill(poor, 999).reason, 'invalid_skill');
});

test('the Mini App shows what a skill costs to learn and the action works end to end', () => {
  const session = hero();
  const skill = professionSkill(session);
  const row = getSkillsState(session).skills.find(entry => entry.slot === skill.slot);
  assert.equal(row.learned, false);
  assert.equal(row.learn.canLearn, true);
  const result = learnSkillForMiniApp(session, skill.slot);
  assert.equal(result.ok, true);
  assert.equal(result.skills.skills.find(entry => entry.slot === skill.slot).learned, true);
  assert.equal(result.skills.skills.find(entry => entry.slot === skill.slot).learn, null);
  assert.equal(learnSkillForMiniApp(session, -1).reason, 'invalid_skill');
});

test('a character of the old tree keeps the skills it could already use', () => {
  const session = { game: { stats: { lvl: 60 }, inventory: { sp: 0, materials: {} }, gameClass: { stats: { name: 'phoenixKnight' }, skills: [] }, effects: [] } };
  // an old save: class name of the old tree, no class system version
  session.game.gameClass = { ...hero('phoenixKnight', 60).game.gameClass, stats: { ...hero('phoenixKnight', 60).game.gameClass.stats, name: 'crusader' } };
  migrateSessionClass(session);
  const usable = session.game.gameClass.skills.filter(skill => skill.l2Id && skill.needLvl <= 60);
  assert.ok(usable.length > 0);
  assert.ok(usable.every(skill => isSkillLearned(session, skill)));
  grandfatherSkills(session);
});
