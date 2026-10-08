import test from 'node:test';
import assert from 'node:assert/strict';
import classQuests from '../template/classQuestsTemplate.js';
import {
  abandonClassQuest, getClassQuestView, payQuestStep, promoteClass, recordQuestEvent, skillKinds, startClassQuest,
} from '../functions/game/classes/classQuests.js';
import { startClassQuestForMiniApp, getClassQuestsState } from '../miniapp/classQuests.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import { getMaterialCount } from '../functions/game/player/materials.js';

function player(className = 'warrior', lvl = 25) {
  const session = {
    game: {
      stats: { lvl },
      inventory: { gold: 1_000_000, crystals: 1_000, ironOre: 0, sp: 0 },
      gameClass: { stats: { name: 'noClass' } },
      effects: [],
    },
  };
  changePlayerClass(session, className);
  updatePlayerStats(session);
  return session;
}

const kill = (session, boss = { name: 'kivaha', tier: 1, element: 'lightning' }, random = () => 0) =>
  recordQuestEvent(session, { type: 'boss_kill', boss }, { random });
const damageSkill = { isDealDamage: true };

function finish(session) {
  // Plays every objective of the active quest to completion.
  const quest = classQuests.find(item => item.to === session.game.classQuest.active.to);
  for (const step of quest.steps) {
    for (let i = 0; i < step.target + 3; i++) {
      if (step.type === 'skillUses') recordQuestEvent(session, { type: 'skill', skill: { isDealDamage: true, isHeal: true, isShield: true, isBuff: true } });
      if (step.type === 'bossKills' || step.type === 'collect') kill(session, { name: 'veraxis', tier: 3, element: 'dark' });
      if (step.type === 'minionKills') recordQuestEvent(session, { type: 'minion_kill', count: 1 });
    }
  }
  while (payQuestStep(session).ok);
}

test('a quest needs the right class and level', () => {
  assert.equal(startClassQuest(player('warrior', 19), 'crusader').reason, 'level_too_low');
  assert.equal(startClassQuest(player('mage', 25), 'crusader').reason, 'wrong_class');
  assert.equal(startClassQuest(player('warrior', 25), 'nonsense').reason, 'unknown_quest');
  assert.equal(startClassQuest(player('warrior', 25), 'phoenixKnight').reason, 'wrong_class', 'a 3rd profession needs the 2nd first');
  assert.equal(startClassQuest(player('warrior', 25), 'crusader').ok, true);
});

test('only one quest at a time; it can be abandoned', () => {
  const session = player();
  assert.equal(startClassQuest(session, 'crusader').ok, true);
  assert.equal(startClassQuest(session, 'crusader').reason, 'already_active');
  assert.equal(startClassQuest(session, 'warden').reason, 'other_quest_active');
  assert.equal(abandonClassQuest(session).ok, true);
  assert.equal(abandonClassQuest(session).reason, 'no_quest');
  assert.equal(startClassQuest(session, 'warden').ok, true);
});

test('events only count while a quest is active', () => {
  const session = player();
  assert.deepEqual(kill(session), { gains: [], ready: false });
  startClassQuest(session, 'crusader');
  assert.ok(kill(session).gains.length > 0);
});

test('skills count by kind; boss kills and quest items need the boss to match', () => {
  assert.deepEqual(skillKinds({ isDealDamage: true, debuff: { kind: 'stun' } }).sort(), ['any', 'damage', 'debuff']);
  assert.ok(skillKinds({ isBuff: true }).includes('buff'));

  const session = player('mage');
  startClassQuest(session, 'elementalist'); // asks for shield skills
  recordQuestEvent(session, { type: 'skill', skill: damageSkill });
  assert.equal(session.game.classQuest.active.progress[0] || 0, 0, 'damage does not count as shield');
  recordQuestEvent(session, { type: 'skill', skill: { isShield: true } });
  assert.equal(session.game.classQuest.active.progress[0], 1);
});

test('quest items drop by chance, capped at the target', () => {
  const session = player();
  startClassQuest(session, 'crusader');
  const lucky = kill(session, undefined, () => 0);
  assert.ok(lucky.gains.some(gain => gain.item === 'Искра грозы'));
  const unlucky = kill(session, undefined, () => 0.99);
  assert.ok(!unlucky.gains.some(gain => gain.item));
  for (let i = 0; i < 20; i++) kill(session);
  assert.equal(session.game.classQuest.active.progress[2], 5);
});

test('3rd profession quests ask for strong bosses and ignore weak ones', () => {
  const session = player('crusader', 45);
  assert.equal(startClassQuest(session, 'phoenixKnight').ok, true);
  assert.deepEqual(kill(session, { name: 'kivaha', tier: 1 }).gains, []);
  assert.ok(kill(session, { name: 'terrax', tier: 2, element: 'earth' }).gains.length > 0);
});

test('the hand-in checks gold and crystals and takes them', () => {
  const session = player();
  startClassQuest(session, 'crusader');
  session.game.inventory.gold = 100;
  assert.equal(payQuestStep(session).reason, 'not_enough_gold');
  session.game.inventory.gold = 50_000;
  assert.equal(payQuestStep(session).ok, true);
  assert.equal(session.game.inventory.gold, 30_000);
  assert.equal(payQuestStep(session).reason, 'nothing_to_pay');
});

test('promotion needs a finished quest, then swaps class, keeps enchants and pays the reward', () => {
  const session = player();
  session.game.gameClass.skills[1].enchantLevel = 4;
  const hpBefore = session.game.gameClass.stats.maxHp;

  assert.equal(promoteClass(session, 'crusader').reason, 'quest_not_started');
  startClassQuest(session, 'crusader');
  assert.equal(promoteClass(session, 'crusader').reason, 'quest_not_complete');
  finish(session);

  const sp = session.game.inventory.sp;
  const result = promoteClass(session, 'crusader');
  assert.equal(result.ok, true);
  assert.equal(session.game.gameClass.stats.name, 'crusader');
  assert.equal(session.game.gameClass.stats.tier, 2);
  assert.equal(session.game.gameClass.skills.length, 5);
  assert.equal(session.game.gameClass.skills[1].enchantLevel, 4, 'inherited skill keeps its level');
  assert.equal(session.game.gameClass.skills[3].enchantLevel, undefined);
  assert.notEqual(session.game.gameClass.stats.maxHp, hpBefore);
  assert.equal(session.game.inventory.sp, sp + 150);
  assert.equal(getMaterialCount(session, 'skill_scroll'), 3);
  assert.equal(session.game.classQuest.active, null);
  assert.deepEqual(session.game.classQuest.completed, ['crusader']);
  assert.equal(session.game.classHistory.at(-1).to, 'crusader');
});

test('the full line works: base -> 2nd -> 3rd, with the 3rd class learning four more skills', () => {
  const session = player('mage', 45);
  startClassQuest(session, 'warlock');
  finish(session);
  assert.equal(promoteClass(session, 'warlock').ok, true);
  startClassQuest(session, 'soulReaper');
  finish(session);
  assert.equal(promoteClass(session, 'soulReaper').ok, true);
  assert.equal(session.game.gameClass.skills.length, 9);
  assert.equal(getClassQuestView(session).maxTier, true);
  assert.deepEqual(session.game.classQuest.completed, ['warlock', 'soulReaper']);
});

test('an earned profession can be taken back for a fee, without the reward twice', () => {
  const session = player();
  startClassQuest(session, 'crusader');
  finish(session);
  promoteClass(session, 'crusader');
  Object.assign(session.game.gameClass.stats, { name: 'warrior' });
  changePlayerClass(session, 'warrior');
  updatePlayerStats(session);
  assert.equal(startClassQuest(session, 'crusader').reason, 'already_mastered');

  const gold = session.game.inventory.gold;
  const sp = session.game.inventory.sp;
  assert.equal(promoteClass(session, 'crusader').ok, true);
  assert.equal(session.game.inventory.gold, gold - 20_000);
  assert.equal(session.game.inventory.sp, sp, 'no second reward');
});

test('the screen state lists the current class\'s professions with progress and status', () => {
  const session = player('warrior', 19);
  let view = getClassQuestView(session);
  assert.deepEqual(view.promotions.map(item => item.to).sort(), ['crusader', 'warden']);
  assert.ok(view.promotions.every(item => item.status === 'locked'));

  session.game.stats.lvl = 25;
  startClassQuest(session, 'crusader');
  view = getClassQuestView(session);
  assert.equal(view.promotions.find(item => item.to === 'crusader').status, 'active');
  assert.equal(view.promotions.find(item => item.to === 'warden').status, 'blocked');
  finish(session);
  view = getClassQuestView(session);
  assert.equal(view.promotions.find(item => item.to === 'crusader').status, 'ready');
  assert.ok(view.promotions.find(item => item.to === 'crusader').steps.every(step => step.done));

  const result = startClassQuestForMiniApp(player(), 'warden');
  assert.equal(result.ok, true);
  assert.equal(result.quest, undefined, 'the raw template stays on the server');
  assert.equal(getClassQuestsState(player('noClass')).needsBaseClass, true);
});
