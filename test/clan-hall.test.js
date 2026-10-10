import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HALL_LEVELS, HALL_SKILLS, ensureHall, getClanHallState, upgradeHall, depositGlory, giveGloryCoins, hallModifiers, hallPerks, hallPoints, hallSkillLevel, EPIC_GLORY_COINS, setHallSkillEnabled,
} from '../functions/game/clans/clanHall.js';
import { syncClanPerks, clanPerkModifiers } from '../functions/game/clans/clanPerks.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import { statTotal } from '../functions/game/player/baseStats.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';

function hero(className = 'duelist') {
  const session = { userId: 1, userChatData: { user: { id: 1 } }, game: { stats: { lvl: 80 }, inventory: { gold: 0, materials: {}, equipment: { items: [] } }, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0 } };
  changeClass(session, className);
  updateStats(session);
  return session;
}
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);
test('Hall switches remove and restore the actual perk while retaining its learned level',()=>{
 const clan={hall:{level:3},warehouse:{gold:0}};
 assert.equal(hallPerks(clan)['hall:greed'],3);
 assert.equal(setHallSkillEnabled(clan,'greed',false).ok,true);
 assert.equal(hallPerks(clan)['hall:greed'],undefined);
 const dto=getClanHallState(clan).skills.find(s=>s.key==='greed');
 assert.equal(dto.enabled,false);assert.equal(dto.level,3);assert.equal(dto.levels.length,4);
 assert.equal(setHallSkillEnabled(clan,'greed',true).ok,true);
 assert.equal(hallPerks(clan)['hall:greed'],3);
 const before=JSON.stringify(clan);
 assert.equal(setHallSkillEnabled(clan,'mental-crush',false).ok,false);
 assert.equal(setHallSkillEnabled(clan,'greed','false').ok,false);
 assert.equal(JSON.stringify(clan),before);
});

test('the hall has five levels; a level needs the Glory of the clan and gold of the warehouse', () => {
  assert.equal(HALL_LEVELS.length, 5);
  const clan = { warehouse: { gold: 0 }, hall: {} };
  assert.equal(ensureHall(clan, 1000).level, 1);
  assert.equal(upgradeHall(clan, 1000).reason, 'hall_not_enough_glory');
  clan.hall.glory = 1000;
  assert.equal(upgradeHall(clan, 1000).reason, 'warehouse_insufficient');
  clan.warehouse.gold = 400_000;
  assert.equal(upgradeHall(clan, 1000).ok, true);
  assert.equal(clan.hall.level, 2);
  assert.equal(clan.warehouse.gold, 100_000, 'the gold is paid from the warehouse');
  clan.hall.level = 5;
  assert.equal(upgradeHall(clan).reason, 'hall_max_level');
});

test('Glory Coins become Glory points of the clan, one for one; the farm premises add some every hour', () => {
  const clan = { warehouse: {}, hall: { level: 3, glory: 10, lastTickAt: 0 } };
  const session = hero();
  assert.equal(depositGlory(clan, session).reason, 'no_glory_coins');
  assert.equal(giveGloryCoins(session, EPIC_GLORY_COINS.valakas), 50);
  assert.equal(giveGloryCoins(session, 0), 0);
  const result = depositGlory(clan, session, 5000);
  assert.equal(result.ok, true);
  assert.equal(result.coins, 50);
  assert.equal(session.game.inventory.gloryCoins, 0);
  assert.equal(clan.hall.glory, 60 + 0, 'no whole hour has passed yet');
  const later = ensureHall(clan, 5000 + 3 * 3_600_000);
  assert.equal(later.glory, 60 + 3 * HALL_LEVELS[2].farmGloryPerHour);
});

test('the hall level opens the levels of its skills and the clan copy reaches the members', () => {
  const clan = { level: 8, skills: {}, hall: { level: 2 } };
  assert.equal(hallSkillLevel(clan, 'greed'), 2);
  assert.equal(hallSkillLevel({ hall: { level: 5 } }, 'clarity'), 3, 'a skill stops at its own last level');
  assert.equal(HALL_SKILLS.length, 18);
  const state = getClanHallState(clan);
  assert.equal(state.skills.find(skill => skill.key === 'greed').current, 'Адена, дроп, спойл и эполеты +6%');
  assert.equal(state.skills.find(skill => skill.key === 'savage').next, 'Урон в PvP +3%');
  assert.deepEqual(state.teleports.slice(0, 1), ['Город клана']);

  const session = hero();
  const base = getEquipStatByName(session, 'dropRateMul', true);
  syncClanPerks(session, clan);
  near(getEquipStatByName(session, 'dropRateMul', true) / base, 1.06);
  assert.equal(session.game.clanPerks['hall:greed'], 2);
  syncClanPerks(session, null);
  assert.equal(getEquipStatByName(session, 'dropRateMul', true), base);
  assert.deepEqual(hallPerks(null), {});
});

test('the effects of the skills reach the stats they name', () => {
  const session = hero('gladiator');
  session.game.clanPerks = { 'hall:hunter': 3, 'hall:savage': 4, 'hall:renewal': 3, 'hall:clarity': 2, 'hall:guidance': 3, 'hall:excellence': 2, 'hall:murder': 1 };
  const mods = hallModifiers(session);
  near(mods.attackMul, 0.07);
  near(mods.defenceMul, 0.07);
  near(mods.pvpDamageMul, 0.04);
  near(mods.skillCooltimeMul, -0.05);
  near(mods.skillMpCostMul, -0.07);
  assert.equal(mods.mpRestoreSpeed, 7);
  assert.equal(mods.accuracy, 5);
  assert.equal(mods.criticalDamage, undefined, 'Murder needs a dagger in hand');
  assert.equal(hallPoints(session, 'MEN'), 1);
  assert.equal(hallPoints(session, 'STR'), 0, 'Excellence 2 does not give STR');
  session.game.clanPerks['hall:excellence'] = 3;
  assert.equal(hallPoints(session, 'STR'), 1);
  const before = statTotal(hero('gladiator'), 'MEN');
  assert.equal(statTotal(session, 'MEN'), before + 1);

  session.game.equipmentStats = { leftHand: { mainType: 'weapon', kind: 'dagger', slots: ['leftHand'], characteristics: {}, stats: [] } };
  near(hallModifiers(session).criticalDamage, 0.1);
  near(clanPerkModifiers(session).attackMul, 0.07);

  // Courage is for melee classes only
  const mage = hero('archmage');
  mage.game.clanPerks = { 'hall:courage': 4 };
  assert.equal(hallModifiers(mage).pvpDefence, undefined);
  session.game.clanPerks = { 'hall:courage': 4 };
  near(hallModifiers(session).pvpDefence, 0.1);
});
