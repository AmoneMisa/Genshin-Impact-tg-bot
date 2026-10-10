import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import { castL2Buff, getL2BuffsState } from '../miniapp/l2Buffs.js';
import { l2RawStat, activeL2Effects, applyL2Effect } from '../functions/game/player/l2Effects.js';
import { bufferEntries, scrydeModifiers, peaceReason } from '../functions/game/player/scrydeBuffer.js';
import { SPELL_TABLE, SYMPHONIES, MANA_REFRESH, CLASS_SKILLS } from '../template/scrydeSpells.js';
import classSkills from '../template/classSkillsTemplate.js';
import { L2_EFFECT_SKILLS } from '../template/l2EffectSkills.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';

const NOW = 1_800_000_000_000;
function hero(className, level = 85, id = 1) {
  const session = { userId: id, userChatData: { user: { id } }, game: { stats: { lvl: level, inFightTimer: 0 }, inventory: { gold: 0, materials: {}, equipment: { items: [] }, potions: { items: [] } }, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0 } };
  changeClass(session, className);
  updateStats(session);
  session.game.gameClass.stats.mp = session.game.gameClass.stats.maxMp = 9000;
  return session;
}

test('the spell table is made of real High Five buffs with the levels of the server', () => {
  for (const entry of SPELL_TABLE) {
    assert.ok(L2_EFFECT_SKILLS[entry.id], `${entry.name} is a real skill`);
    assert.ok(entry.level >= 20);
  }
  assert.deepEqual(SPELL_TABLE.filter(entry => entry.group === 'Песни и танцы').map(entry => entry.scale), Array(9).fill(0.5));
  for (const symphony of SYMPHONIES) for (const part of symphony.parts) for (const id of part) assert.ok(L2_EFFECT_SKILLS[id], `${symphony.name}: ${id}`);
});

test('the buffer lists the table by level, buffs only in peace and gives the real effect', () => {
  const low = hero('humanFighter', 25);
  const rows = bufferEntries(low, NOW);
  assert.ok(rows.find(row => row.name === 'Wind Walk').level === 1);
  assert.ok(rows.find(row => row.name === 'Might').level === 0, 'Might opens at 40');
  assert.equal(castL2Buff(low, 'scryde:might', null, { now: NOW }).reason, 'level_too_low');

  const session = hero('humanFighter', 60);
  const base = l2RawStat(session, 'pAtk', true, NOW);
  assert.equal(castL2Buff(session, 'scryde:might', null, { now: NOW }).ok, true);
  assert.ok(Math.abs(l2RawStat(session, 'pAtk', true, NOW + 1000) / base - 1.15) < 0.01, 'Might is +15% P.Atk');
  assert.ok(activeL2Effects(session, NOW + 1000).length === 1);

  // not in the middle of a battle
  session.game.hunt = { field: { x: 0, y: 0 } };
  assert.equal(castL2Buff(session, 'scryde:haste', null, { now: NOW }).reason, 'not_peaceful');
  session.game.hunt = null;
  session.game.stats.inFightTimer = Date.now() + 60_000;
  assert.equal(peaceReason(session, Date.now()), 'in_combat');
});

test('songs and dances of the buffer give half of the real power', () => {
  const session = hero('humanFighter', 60);
  const full = hero('humanFighter', 60, 2);
  assert.equal(castL2Buff(session, 'scryde:dance-of-the-warrior', null, { now: NOW }).ok, true);
  applyL2Effect(full, full, 271, 99, { now: NOW });
  const half = l2RawStat(session, 'pAtk', true, NOW + 1000) - 1;
  const whole = l2RawStat(full, 'pAtk', true, NOW + 1000) - 1;
  assert.ok(whole > 0 && Math.abs(half / whole - 0.5) < 0.05, `${half} / ${whole}`);
});

test('Mana Refresh adds mana regeneration for an hour, by the level of the hero', () => {
  const session = hero('humanMystic', 85);
  assert.deepEqual(scrydeModifiers(session, NOW), {});
  assert.equal(castL2Buff(session, 'scryde:mana-refresh', null, { now: NOW }).ok, true);
  assert.equal(scrydeModifiers(session, NOW + 1000).mpRestoreSpeed, 20);
  assert.equal(scrydeModifiers(session, NOW + 61 * 60 * 1000).mpRestoreSpeed, undefined);
  const low = hero('humanMystic', 45);
  castL2Buff(low, 'scryde:mana-refresh', null, { now: NOW });
  assert.equal(scrydeModifiers(low, NOW + 1000).mpRestoreSpeed, 10);
  assert.ok(getEquipStatByName(session, 'mpRestoreSpeed') >= 20);
  assert.equal(MANA_REFRESH.levels.length, 4);
});

test('the Symphonies are only for the bards, replace the songs and last five minutes', () => {
  const fighter = hero('humanFighter', 85);
  assert.ok(!bufferEntries(fighter, NOW).some(row => row.name.endsWith('Symphony')));
  assert.equal(castL2Buff(fighter, 'scryde:wind-symphony', null, { now: NOW }).reason, 'not_learned');

  const bard = hero('swordMuse', 85);
  const result = castL2Buff(bard, 'scryde:warrior-symphony', null, { now: NOW });
  assert.equal(result.ok, true);
  assert.equal(result.until - NOW, 5 * 60 * 1000);
  assert.ok(activeL2Effects(bard, NOW + 1000).length >= 2, 'both songs of the symphony are on');
  bard.game.gameClass.stats.mp = 0;
  assert.equal(castL2Buff(bard, 'scryde:critical-symphony', null, { now: NOW }).reason, 'not_enough_mp');
});

test('Chant of Victory costs 40 Spirit Ore and Mass Buff reaches the party of an Elder or a Prophet', () => {
  const session = hero('prophet', 85, 1);
  assert.equal(castL2Buff(session, 'scryde:chant-of-victory', null, { now: NOW }).reason, 'not_enough_items');
  session.game.inventory.materials.l2_3031 = 40;
  assert.equal(castL2Buff(session, 'scryde:chant-of-victory', null, { now: NOW }).ok, true);
  assert.equal(session.game.inventory.materials.l2_3031, 0);

  const friend = hero('humanFighter', 85, 2);
  const chat = { members: [session, friend] };
  for (const member of chat.members) { member.ownerDocument = () => chat; member.game.party = { id: 'p', leaderId: '1' }; }
  const mass = castL2Buff(session, 'scryde:might', 'party', { now: NOW + 1000 });
  assert.equal(mass.ok, true);
  assert.ok(l2RawStat(friend, 'pAtk', true, NOW + 2000) > 1);
  assert.equal(castL2Buff(hero('humanFighter', 85, 3), 'scryde:might', 'party', { now: NOW }).reason, 'self_only');
});

test('the class balance skills of the server reach the kits of their classes', () => {
  assert.ok(classSkills.swordSinger.some(skill => skill.name === 'Deadly Smash' && skill.scryde));
  assert.ok(classSkills.swordMuse.some(skill => skill.name === 'Song of Spirit' && skill.needLvl >= 83));
  assert.ok(!classSkills.swordSinger.some(skill => skill.name === 'Song of Spirit'));
  assert.ok(classSkills.cardinal.some(skill => skill.name === 'Might of Heaven'));
  assert.ok(classSkills.judicator.some(skill => skill.name === 'Appetite Destruction'));
  assert.ok(classSkills.prophet.some(skill => skill.name === 'Vampiric Rage' && skill.scryde));
  assert.ok(CLASS_SKILLS.every(entry => entry.classes.every(name => classSkills[name])));
  assert.ok(getL2BuffsState(hero('swordMuse', 85), NOW).some(row => row.group.includes('Симфонии')));
});
