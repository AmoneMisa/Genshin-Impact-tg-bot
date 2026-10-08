import test from 'node:test';
import assert from 'node:assert/strict';
import bosses from '../template/bossTemplate.js';
import bossAttacks from '../template/bossAttacksTemplate.js';
import materials from '../template/materialsTemplate.js';
import equipmentTemplate from '../template/equipmentTemplate.js';
import {
  epicList, epicStatus, epicTemplates, getEpicTemplate, markEpicKilled, respawnDelayMs, rollEpicJewel,
} from '../functions/game/boss/epicBosses.js';
import { findCatalogItem, findEpicItem, getCatalog, instantiate } from '../functions/game/equipment/catalog.js';
import generateRandomEquipment from '../functions/game/equipment/generateRandomEquipment.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getRandomBoss from '../functions/game/boss/getters/getRandomBoss.js';
import withSeed from './helpers/seededRandom.js';

const HOUR = 3_600_000;

test('every epic raid boss has a plan, attacks, an essence and a unique piece of epic jewellery', () => {
  const epics = epicTemplates();
  assert.deepEqual(epics.map(boss => boss.name), ['queenAnt', 'core', 'orfen', 'zaken', 'baium', 'frintezza', 'antharas', 'valakas']);
  for (const boss of epics) {
    assert.equal(boss.weight, 0);
    assert.ok(boss.phases.length >= 3 && boss.minions.length >= 2, boss.name);
    for (const key of [...boss.initial, ...boss.phases.flatMap(phase => phase.summon || [])]) {
      assert.ok(boss.minions.some(unit => unit.key === key), `${boss.name} summons unknown ${key}`);
    }
    const attacks = bossAttacks[boss.name];
    assert.equal(attacks.length, 4, boss.name);
    assert.equal(attacks.filter(attack => attack.ultimate).length, 1);
    assert.ok(materials.some(material => material.key === `essence_${boss.name}`), `${boss.name} essence`);
    assert.ok(boss.drops.items.some(drop => drop.item === `essence_${boss.name}`));
    const jewel = findEpicItem(boss.name);
    assert.ok(jewel, `${boss.name} has jewellery`);
    assert.equal(jewel.mainType, 'jewelry');
    assert.equal(jewel.epic, true);
    assert.ok(boss.epic.minLevel >= equipmentTemplate.grades.find(grade => grade.name === jewel.grade).lvl.from - 30);
  }
});

test('the epic jewellery are the real Lineage 2 pieces with real M.Def', () => {
  const expected = {
    queenAnt: ['Ring of Queen Ant', 'B', 48], core: ['Ring of Core', 'A', 48], orfen: ['Earring of Orfen', 'A', 71],
    zaken: ["Zaken's Earring", 'S', 71], baium: ['Ring of Baium', 'S', 48], antharas: ['Earring of Antharas', 'S', 71],
    valakas: ['Necklace of Valakas', 'S', 95], frintezza: ["Frintezza's Necklace", 'S', 95],
  };
  for (const [boss, [name, grade, mDef]] of Object.entries(expected)) {
    const item = findEpicItem(boss);
    assert.equal(item.name, name);
    assert.equal(item.grade, grade);
    assert.equal(item.lineage.mDef, mDef);
    assert.equal(item.id, `epic:${boss}`);
  }
  // an epic piece is better than the ordinary jewellery of its grade in the same slot
  const ordinary = findCatalogItem('S:jewelry:necklace');
  const epic = findEpicItem('valakas');
  assert.ok(epic.cost > ordinary.cost * 2);
  assert.ok(Object.keys(epic.characteristics).length > Object.keys(ordinary.characteristics).length);
});

test('epic jewellery never comes from random drops or the forge, and ordinary summons never pick an epic boss', () => {
  withSeed(5, () => {
    for (let i = 0; i < 1500; i++) {
      for (const grade of ['A', 'S']) assert.notEqual(generateRandomEquipment(80, grade, { exact: true, mainType: 'jewelry' }).epic, true);
    }
  });
  withSeed(6, () => {
    for (let i = 0; i < 500; i++) assert.equal(Boolean(getRandomBoss(Math.random).epic), false);
  });
  assert.equal(getCatalog().filter(item => item.epicBoss).length, 8);
});

test('wearing an epic piece raises the stats it promises', () => {
  const session = {
    game: {
      stats: { lvl: 80 },
      gameClass: { stats: { name: 'warrior', attack: 1000, maxHp: 10_000, defence: 100 } },
      equipmentStats: {},
      inventory: { equipment: { items: [] } },
    },
  };
  const attack = getAttack(session);
  const hp = getMaxHp(session);
  const necklace = instantiate(findEpicItem('valakas'));
  session.game.inventory.equipment.items.push(necklace);
  assert.equal(equipItem(session, necklace), 0);
  assert.ok(getAttack(session) > attack * 1.039);
  assert.ok(getMaxHp(session) > hp * 1.03);
});

test('respawn windows follow the real epic order: a day and a half, two days, five, eight, eleven', () => {
  const hours = name => getEpicTemplate(name).epic.respawnHours;
  assert.ok(hours('queenAnt') === hours('core') && hours('core') <= hours('orfen'));
  assert.ok(hours('orfen') < hours('zaken') && hours('zaken') === hours('frintezza'));
  assert.ok(hours('frintezza') < hours('baium') && hours('baium') < hours('antharas') && hours('antharas') < hours('valakas'));
  assert.equal(hours('baium'), 5 * 24);
  assert.equal(hours('valakas'), 11 * 24);

  const valakas = getEpicTemplate('valakas');
  assert.equal(respawnDelayMs(valakas, () => 0), 264 * HOUR);
  assert.equal(respawnDelayMs(valakas, () => 1), 288 * HOUR);
  assert.ok(respawnDelayMs(valakas, () => 0.5) > 264 * HOUR);
});

test('a kill starts the chat respawn timer; the boss is unavailable until it runs out', () => {
  const chat = { epicBosses: {}, markModified(path) { this.modified = path; } };
  const now = 1_000_000;
  assert.equal(epicStatus(chat, 'baium', now).available, true);

  const record = markEpicKilled(chat, 'baium', { now, random: () => 0 });
  assert.equal(record.respawnAt, now + 120 * HOUR);
  assert.equal(chat.modified, 'epicBosses');

  const during = epicStatus(chat, 'baium', now + 100 * HOUR);
  assert.equal(during.available, false);
  assert.equal(during.remainMs, 20 * HOUR);
  assert.equal(epicStatus(chat, 'baium', now + 120 * HOUR).available, true);
  assert.equal(epicStatus(chat, 'zaken', now + HOUR).available, true, 'other bosses are unaffected');

  markEpicKilled(chat, 'baium', { now: now + 130 * HOUR, random: () => 1 });
  assert.equal(chat.epicBosses.baium.kills, 2);
  assert.equal(markEpicKilled(chat, 'kivaha'), null, 'ordinary bosses have no timer');

  const list = epicList(chat, now + 100 * HOUR);
  assert.equal(list.length, 8);
  assert.equal(list.find(entry => entry.name === 'baium').jewel.name, 'Ring of Baium');
});

test('the jewel drops by chance to a fighter in proportion to the damage they dealt', () => {
  const template = getEpicTemplate('zaken');
  const fighters = [{ id: 1, damage: 900 }, { id: 2, damage: 100 }, { id: 3, damage: 0 }];

  assert.equal(rollEpicJewel(template, fighters, () => template.epic.jewelChance), null, 'a roll at the chance misses');
  assert.equal(rollEpicJewel(template, [], () => 0), null);
  assert.equal(rollEpicJewel({ name: 'kivaha' }, fighters, () => 0), null, 'ordinary bosses drop no epic jewellery');

  const wins = { 1: 0, 2: 0 };
  let state = 3;
  const random = () => ((state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296);
  let drops = 0;
  const trials = 8000;
  for (let i = 0; i < trials; i++) {
    const result = rollEpicJewel(template, fighters, random);
    if (!result) continue;
    drops++;
    wins[result.id]++;
    assert.equal(result.item.name, "Zaken's Earring");
    assert.equal(result.item.enchant, 0);
  }
  assert.ok(Math.abs(drops / trials - template.epic.jewelChance) < 0.03, `${drops / trials}`);
  assert.ok(Math.abs(wins[1] / drops - 0.9) < 0.04, `${wins[1] / drops}`);
  assert.equal(wins[3], undefined);
});

test('every dropped jewel is its own item', () => {
  const template = getEpicTemplate('core');
  const a = rollEpicJewel(template, [{ id: 1, damage: 5 }], () => 0).item;
  const b = rollEpicJewel(template, [{ id: 1, damage: 5 }], () => 0).item;
  assert.notEqual(a.uid, b.uid);
});

test('epic bosses are plain single bosses in the boss template', () => {
  assert.equal(bosses.filter(boss => boss.epic).every(boss => !boss.pair), true);
});
