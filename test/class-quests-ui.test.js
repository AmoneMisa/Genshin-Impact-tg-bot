import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { promotionCard, stepRow } from '../webapp/class-quests.js';
import { encounterPanel, encounterStatuses, hotbar, statusIcons, targetFrame, bossAttacksPanel } from '../webapp/boss-hud.js';
import { bossArtUrl, classArtUrl, skillFxForClass } from '../webapp/boss-stage.js';
import { menuArtFor } from '../webapp/menu-art.js';
import bosses from '../template/bossTemplate.js';
import { getClassQuestView, startClassQuest } from '../functions/game/classes/classQuests.js';
import changePlayerClass from '../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';

function view(level = 25) {
  const session = { game: { stats: { lvl: level }, inventory: { gold: 1e6, crystals: 1e3, sp: 0 }, gameClass: { stats: { name: 'noClass' } }, effects: [] } };
  changePlayerClass(session, 'warrior');
  updatePlayerStats(session);
  return { session, view: getClassQuestView(session) };
}

test('profession cards show the mentor, the checklist and the right buttons per status', () => {
  const { session, view: first } = view();
  const crusader = first.promotions.find(item => item.to === 'crusader');
  let html = promotionCard(crusader, 25);
  assert.match(html, /data-cq-action="start" data-cq-to="crusader"/);
  assert.match(html, /Командор Эльдрик/);
  assert.match(html, /cq-steps/);

  startClassQuest(session, 'crusader');
  const active = getClassQuestView(session).promotions.find(item => item.to === 'crusader');
  html = promotionCard(active, 25);
  assert.match(html, /data-cq-action="pay" disabled/, 'cannot pay before the other objectives are done');
  assert.match(html, /data-cq-action="abandon"/);

  const locked = view(10).view.promotions[0];
  html = promotionCard(locked, 10);
  assert.match(html, /🔒 Нужен 20 уровень/);
  assert.doesNotMatch(html, /data-cq-action/);
});

test('a step row shows a bar for objectives and the price for the hand-in', () => {
  assert.match(stepRow({ text: 'Победи', progress: 1, target: 4, done: false }), /width:25%/);
  assert.match(stepRow({ text: 'Оплата', progress: 0, target: 1, manual: true, gold: 20000, crystals: 0, done: false }), /20.000|20\s000/);
  assert.match(stepRow({ text: 'x', progress: 4, target: 4, done: true }), /cq-step done/);
  assert.match(stepRow({ text: '<b>', progress: 0, target: 1, done: false }), /&lt;b&gt;/, 'escaped');
});

test('the encounter panel lists minions as targets, flags required units and warns about a charging ultimate', () => {
  const boss = {
    name: 'tiamara', nameCall: 'Тиамару', hpPercent: 70, currentHp: 7000, requiredAlive: 2,
    attacks: [{ key: 'hydra_roar', name: 'Рёв гидры', ultimate: true }],
    charging: { key: 'hydra_roar', readyInMs: 3000 },
    minions: [
      { id: 'a', name: 'Огненная голова', icon: '🔥', kind: 'head', required: true, hpPercent: 80, currentHp: 800, alive: true, description: '' },
      { id: 'b', name: 'Змеёныш', icon: '🐍', kind: 'minion', hpPercent: 0, currentHp: 0, alive: false, description: '' },
    ],
    events: [{ icon: '🐍', text: 'Тиамара кладёт яйца', agoMs: 100 }],
  };
  const html = encounterPanel(boss, 'a');
  assert.match(html, /data-boss-target="boss"/);
  assert.match(html, /data-boss-target="a"[^>]*>/);
  assert.match(html, /boss-unit head selected/);
  assert.match(html, /boss-unit minion dead[^>]*data-boss-target="b"[^>]*disabled|data-boss-target="b"[^>]*disabled/);
  assert.match(html, /Рёв гидры/);
  assert.match(html, /Тиамара кладёт яйца/);
  assert.equal(encounterPanel({ minions: [], events: [], attacks: [] }), '');
});

test('boss statuses include enrage, minion shield, lock, stun and debuffs', () => {
  const list = encounterStatuses({ statuses: [{ id: 'reflect', label: 'Зеркало' }], enrage: 30, shielded: 50, locked: true, stunned: true, debuffs: [{ kind: 'armorBreak', amount: 0.3, remainMs: 4500 }, { kind: 'stun', amount: 0, remainMs: 1000 }] });
  assert.deepEqual(list.map(item => item.id), ['reflect', 'enrage', 'armored', 'locked', 'stun', 'armorBreak']);
  assert.match(statusIcons(list), /😡/);
  assert.match(targetFrame({ name: 'kivaha', level: 1, hp: 10, currentHp: 5, remainMs: 1000, aliveTime: 1, enrage: 20 }), /😡/);
});

test('locked skills show the unlock level and are disabled; profession skills are tier-marked', () => {
  const html = hotbar([
    { index: 3, name: 'Метеоритный дождь', description: '', isDamage: true, costMp: 330, canUse: false, locked: true, needLevel: 44, tier: 3, tags: ['Серия ×5'], cooldownMs: 0 },
    { index: 4, name: 'Клятва', description: '', isBuff: true, costMp: 90, canUse: true, tier: 2, cooldownMs: 0 },
  ]);
  assert.match(html, /🔒 ур\. 44/);
  assert.match(html, /mmo-skill boss-skill damage locked tier-3/);
  assert.match(html, /Серия ×5/);
  assert.match(html, /⬆/);
});

test('multi-target and charging attacks read well in the attack panel', () => {
  const html = bossAttacksPanel({ attacks: [{ key: 'k', name: 'Цепь', icon: '🔗', target: 'multi', count: 3, description: '' }], attackLog: [], damageList: [] });
  assert.match(html, /по 3/);
});

test('every new boss has art (borrowed until painted), every class a portrait family', () => {
  for (const boss of bosses) {
    assert.ok(fs.existsSync(`webapp${bossArtUrl(boss.name)}`), boss.name);
  }
  assert.equal(bossArtUrl('zephyrion'), '/art/bosses/avrora.webp');
  assert.equal(classArtUrl('titan', 'male'), '/art/classes/warrior-male.webp');
  assert.equal(classArtUrl('assassin', 'female'), '/art/classes/archer-female.webp');
  assert.equal(classArtUrl('saint', 'male'), '/art/classes/priest-male.webp');
  assert.equal(menuArtFor('profile', { className: 'archmage', gender: 'female' }), '/art/classes/mage-female.webp');
  assert.equal(skillFxForClass('hawkeye'), 'arrow');
  assert.equal(skillFxForClass('shadowBlade'), 'slash');
});

test('the profession screen is wired into the app, the menu and the stylesheet', () => {
  assert.match(fs.readFileSync('webapp/app.js', 'utf8'), /classQuests: openClassQuests/);
  assert.match(fs.readFileSync('webapp/nav.js', 'utf8'), /'classQuests'/);
  assert.match(fs.readFileSync('webapp/index.html', 'utf8'), /class-quests\.css/);
  assert.match(fs.readFileSync('miniapp/state.js', 'utf8'), /id: 'classQuests'/);
  assert.match(fs.readFileSync('miniapp/featureAccess.js', 'utf8'), /'GET \/api\/class-quests'/);
});
