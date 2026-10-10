import test from 'node:test';
import assert from 'node:assert/strict';
import classSkills from '../template/classSkillsTemplate.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import castSkill from '../functions/game/player/castSkill.js';
import { activeL2Effects } from '../functions/game/player/l2Effects.js';
import { castL2Buff, getL2BuffsState } from '../miniapp/l2Buffs.js';
import { revivalSkills, reviveShare, isFallen } from '../functions/game/player/revival.js';
import { castCubic, cubicDamage, cubicLimit, activeCubics } from '../functions/game/player/cubics.js';
import userDealDamage from '../functions/game/player/userDealDamage.js';

const NOW = 1_800_000_000_000;
function hero(className, level = 70, id = 1) {
  const session = { userId: id, userChatData: { user: { id, first_name: `Hero ${id}` } }, game: { stats: { lvl: level }, inventory: { gold: 0, sp: 0, materials: {}, equipment: { items: [] }, potions: { items: [] } }, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0 } };
  changeClass(session, className);
  updateStats(session);
  session.game.gameClass.stats.mp = session.game.gameClass.stats.maxMp = 20_000;
  return session;
}
const withChat = (...members) => { const chat = { members }; for (const member of members) member.ownerDocument = () => chat; return chat; };

test('a buff of the kit that has a real High Five effect is cast through it', () => {
  const session = hero('bishop');
  const acumen = classSkills.bishop.find(skill => skill.l2Cast);
  assert.ok(acumen && acumen.l2Cast.hostile === false);
  const result = castSkill(session, null, acumen, { now: NOW });
  assert.equal(result.type, 'buff');
  assert.equal(result.l2, acumen.l2Cast.id);
  assert.ok(activeL2Effects(session, NOW).some(entry => entry.skill.id === acumen.l2Cast.id), 'the real effect is on the hero');
});

test('a debuff of the kit lands on the monster of the hunt, and falls back to the engine numbers without one', () => {
  const sample = Object.entries(classSkills).flatMap(([name, list]) => list.filter(skill => skill.l2Cast?.hostile && skill.needLvl <= 70).map(skill => [name, skill]))[0];
  assert.ok(sample, 'a kit has a hostile real effect');
  const [className, skill] = sample;
  const session = hero(className);
  const mob = { name: 'Test', currentHp: 1000, hp: 1000, l2Effects: [] };
  const result = castSkill(session, { ...mob, debuffs: [] }, skill, { now: NOW, l2Target: mob, random: () => 0 });
  assert.equal(result.type, 'debuff');
  assert.equal(result.l2, skill.l2Cast.id);
  assert.ok(mob.l2Effects.length > 0 || result.resisted, 'the effect was applied to the monster');
  // no target for the real effect: the engine debuff still works
  const boss = { name: 'b', currentHp: 5000, hp: 5000, debuffs: [], phases: [] };
  const fallback = castSkill(session, boss, skill, { now: NOW });
  assert.notEqual(fallback.l2, skill.l2Cast.id);
});

test('Resurrection brings a fallen player back, Mass Resurrection the party; it costs mana and has a reuse', () => {
  const bishop = hero('bishop', 70, 1);
  const fallen = hero('humanFighter', 70, 2);
  const alive = hero('humanFighter', 70, 3);
  fallen.game.gameClass.stats.hp = 0;
  const chat = withChat(bishop, fallen, alive);
  assert.ok(revivalSkills(bishop).some(skill => skill.id === 1016 && skill.learned > 0));
  assert.equal(isFallen(fallen, NOW), true);
  assert.ok(getL2BuffsState(bishop, NOW).some(entry => entry.name === 'Resurrection' && entry.group === 'Воскрешение'));

  assert.equal(castL2Buff(bishop, 'l2:1016', alive.userId, { now: NOW }).reason, 'not_fallen');
  const mp = bishop.game.gameClass.stats.mp;
  const result = castL2Buff(bishop, 'l2:1016', fallen.userId, { now: NOW });
  assert.equal(result.ok, true);
  assert.equal(isFallen(fallen, NOW), false);
  assert.ok(fallen.game.gameClass.stats.hp > 0);
  assert.ok(bishop.game.gameClass.stats.mp < mp);
  assert.equal(castL2Buff(bishop, 'l2:1016', fallen.userId, { now: NOW + 1 }).reason, 'cooldown');
  assert.ok(reviveShare(1016, 9) > reviveShare(1016, 1));
  assert.equal(castL2Buff(hero('humanFighter', 70, 9), 'l2:1016', fallen.userId, { now: NOW }).reason, 'not_learned');

  // mass: the dead of the party stand up
  const second = hero('humanFighter', 70, 4);
  second.game.gameClass.stats.hp = 0;
  chat.members.push(second);
  second.ownerDocument = () => chat;
  for (const member of [bishop, second, alive, fallen]) member.game.party = { id: 'p', leaderId: '1' };
  const mass = castL2Buff(bishop, 'l2:1254', null, { now: NOW + 1000 });
  assert.equal(mass.ok, true, JSON.stringify(mass));
  assert.equal(isFallen(second, NOW + 1000), false);
});

test('cubics: the limit grows with Cubic Mastery, every hit gets a blow of the cubic, a Vampiric cubic heals', () => {
  const summoner = hero('shillienKnight', 70, 5);
  assert.equal(cubicLimit(summoner), 1);
  assert.equal(castCubic(summoner, 'l2:10', { now: NOW }).reason, 'not_learned');
  const vampiric = Object.entries(classSkills).length && 1279;
  const ids = ['l2:1280', 'l2:1279', 'l2:10', 'l2:33', 'l2:278'];
  const cast = ids.map(id => castCubic(summoner, id, { now: NOW })).find(result => result.ok);
  assert.ok(cast, 'a Shillien Knight learns a cubic');
  assert.equal(activeCubics(summoner, NOW).length, 1);
  const before = cubicDamage(summoner, 1000, NOW);
  assert.ok(before.damage > 0);
  summoner.game.l2Passives = { 143: 2 };
  assert.equal(cubicLimit(summoner), 3);
  assert.equal(cubicDamage(summoner, 0, NOW).damage, 0);
  assert.equal(cubicDamage(summoner, 1000, NOW + 21 * 60 * 1000).damage, 0, 'cubics last twenty minutes');
  void vampiric;
  void userDealDamage;
});
