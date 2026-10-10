import test from 'node:test';
import assert from 'node:assert/strict';
import equipmentTemplate from '../template/equipmentTemplate.js';
import customSets from '../template/customSets.js';
import classStats from '../template/classStatsTemplate.js';
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import {getCatalog, findCatalogItem, instantiate, customSetBonus} from '../functions/game/equipment/catalog.js';
import {activeSets, setBonusValues} from '../functions/game/equipment/itemBonuses.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import generateRandomEquipment from '../functions/game/equipment/generateRandomEquipment.js';
import craftItem, {craftOptions, getRecipe, learnRecipe, visibleRecipes, ensureCraft} from '../functions/game/equipment/craftItem.js';
import {addMaterial} from '../functions/game/player/materials.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';

craftOptions.real = true;
const GRADES = equipmentTemplate.grades.map(grade => grade.name);
const TYPES = ['heavy', 'light', 'robe'];
const customItems = () => getCatalog().filter(item => item.custom);
const setOf = (grade, type) => customItems().filter(item => item.setId === `custom:${grade}:${type}`);
const l2Set = (grade, type) => getCatalog().filter(item => item.setId === `${grade}:${type}`);
const sum = (items, key) => items.reduce((total, item) => total + item.characteristics[key], 0);

function wearer(className, level, ids) {
  const base = scaleClassStats(classStats.find(entry => entry.name === className), level);
  const session = {game: {stats: {lvl: level}, gameClass: {stats: {...base, name: className}}, equipmentStats: {}, inventory: {equipment: {items: []}}}};
  for (const id of ids) {
    const item = instantiate(findCatalogItem(id));
    session.game.inventory.equipment.items.push(item);
    assert.equal(equipItem(session, item), 0, id);
  }
  return session;
}

test('there is one custom set for every grade and armor type, with every part of the real set', () => {
  assert.equal(customItems().length, 104);
  assert.equal(new Set(customItems().map(item => item.id)).size, 104);
  for (const grade of GRADES) {
    for (const type of TYPES) {
      const own = setOf(grade, type), real = l2Set(grade, type);
      assert.deepEqual(own.map(item => item.category).sort(), real.map(item => item.category).sort(), `${grade} ${type}`);
      assert.ok(own.every(item => item.grade === grade && item.kind === type && item.mainType === 'armor'));
      assert.equal(new Set(own.map(item => item.name)).size, own.length);
    }
  }
  assert.ok(customItems().every(item => !item.epic && item.setName.startsWith('Комплект')));
  assert.equal(getCatalog().filter(item => item.custom && item.mainType !== 'armor').length, 0, 'the line has no weapons');
});

test('a custom set is worth 90-100 % of the real set of its grade and type, and the bonuses climb with the grade', () => {
  for (const type of TYPES) {
    let previous = null;
    GRADES.forEach((grade, index) => {
      const own = sum(setOf(grade, type), 'defence'), real = sum(l2Set(grade, type), 'defence');
      assert.ok(Math.abs(own / real - customSets.defenceFactor) < 0.02, `${grade} ${type} defence ${own} / ${real}`);
      const l2Bonus = equipmentTemplate.lineage.armor[type][index].bonus;
      const ownBonus = customSetBonus(`custom:${grade}:${type}`);
      assert.deepEqual(setBonusValues(grade, type, `custom:${grade}:${type}`), ownBonus);
      const effective = bonus => (bonus.defenceMul || 1) * (bonus.maxHpMul || 1) * (bonus.attackMul || 1) * (bonus.maxMpMul || 1);
      const ratio = own * (ownBonus.defenceMul || 1) / (real * (l2Bonus.defenceMul || 1));
      assert.ok(ratio > 0.85 && ratio <= 1.02, `${grade} ${type} defence with bonus ${ratio.toFixed(3)}`);
      assert.ok(effective(ownBonus) >= (previous ?? 0), `${grade} ${type} bonus grows`);
      previous = effective(ownBonus);
    });
  }
});

test('a full custom set gives its bonus, a partial one does not; the real sets are unchanged', () => {
  const pieces = setOf('S', 'heavy').map(item => item.id);
  const partial = wearer('warrior', 78, pieces.slice(0, 4));
  assert.equal(activeSets(partial.game.equipmentStats)[0].complete, false);
  const full = wearer('warrior', 78, pieces);
  const [set] = activeSets(full.game.equipmentStats);
  assert.equal(set.complete, true);
  assert.equal(set.name, 'Комплект «Обсидиановый бастион»');
  assert.deepEqual(set.bonus, customSets.sets.heavy[5].bonus);
  assert.ok(getEquipStatByName(full, 'maxHpMul', true) > getEquipStatByName(partial, 'maxHpMul', true));
  assert.equal(setBonusValues('S', 'heavy').defenceMul, 1.08, 'Imperial Crusader keeps its real bonus');
  assert.equal(customSetBonus('S:heavy'), null);
});

test('custom armor never rolls from a chest, a drop or a gacha', () => {
  for (const grade of GRADES) {
    for (let i = 0; i < 120; i++) assert.equal(generateRandomEquipment(80, grade, {exact: true, mainType: 'armor'}).custom, undefined);
  }
});

test('the line is crafted from the grade materials, dearer than the generated formula, and weapons are not offered', () => {
  craftOptions.real = false;
  const generated = getRecipe('B:armor:heavy:body');
  craftOptions.real = true;
  const own = getRecipe('custom:B:heavy:body');
  assert.ok(own);
  for (const [key, need] of Object.entries(generated.materials)) assert.equal(own.materials[key], Math.round(need * customSets.craftFactor));
  assert.equal(own.ironOre, Math.round(generated.ironOre * customSets.craftFactor));

  const session = {game: {stats: {lvl: 70}, gameClass: {stats: {name: 'warrior'}}, inventory: {gold: 5e7, ironOre: 1e6, equipment: {name: 'x', items: []}}}};
  ensureCraft(session).level = 8;
  assert.ok(visibleRecipes(session).some(recipe => recipe.id === 'custom:A:heavy:helmet'));
  assert.equal(learnRecipe(session, 'custom:A:heavy:helmet').ok, true);
  const recipe = getRecipe('custom:A:heavy:helmet');
  for (const [key, need] of Object.entries(recipe.materials)) addMaterial(session, key, need);
  const made = craftItem(session, 'custom:A:heavy:helmet', {random: () => 0});
  assert.equal(made.ok && made.success, true);
  assert.equal(made.item.id, 'custom:A:heavy:helmet');
  assert.equal(made.item.custom, true);
});
