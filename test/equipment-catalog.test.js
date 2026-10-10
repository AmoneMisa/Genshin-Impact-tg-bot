import test from 'node:test';
import assert from 'node:assert/strict';
import equipmentTemplate from '../template/equipmentTemplate.js';
import classStats from '../template/classStatsTemplate.js';
import scaleClassStats from '../functions/game/player/scaleClassStats.js';
import {
  ARMOR_TYPES, buildCatalog, canClassUse, classOwnerToken, findCatalogItem, getCatalog, gradeIndex, instantiate,
} from '../functions/game/equipment/catalog.js';
import {
  activeSets, enchantExtras, enchantFraction, safeEnchantLevel, setBonusValues,
} from '../functions/game/equipment/itemBonuses.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import generateRandomEquipment from '../functions/game/equipment/generateRandomEquipment.js';
import { enchantGradeForLevel, rollEnchantDrops } from '../functions/game/equipment/enchantDrops.js';
import { crystalYield, enchantChance, enchantItem, scrollPrice } from '../functions/game/equipment/enchantItem.js';
import { migrateItem, migrateSessionEquipment } from '../functions/game/equipment/migrateEquipment.js';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import getAttack from '../functions/game/player/getters/getAttack.js';
import getDefence from '../functions/game/player/getters/getDefence.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getLostFieldsInSession from '../functions/getters/getLostFieldsInSession.js';
import { addMaterial, getMaterialCount } from '../functions/game/player/materials.js';
import withSeed from './helpers/seededRandom.js';

const GRADES = equipmentTemplate.grades.map((grade) => grade.name);
const L2_GRADES = ['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84'];

function wearer(className, level, items = []) {
  const base = scaleClassStats(classStats.find((entry) => entry.name === className), level);
  const session = {
    game: {
      stats: { lvl: level },
      gameClass: { stats: { ...base, name: className } },
      equipmentStats: {},
      inventory: { equipment: { items: [] } },
    },
  };
  for (const definition of items) {
    const item = typeof definition === 'string' ? instantiate(findCatalogItem(definition)) : definition;
    session.game.inventory.equipment.items.push(item);
    assert.equal(equipItem(session, item), 0, item.name);
  }
  return session;
}

function fullSet(grade, type) {
  const pieces = getCatalog().filter((item) => item.setId === `${grade}:${type}`);
  return pieces.filter((item) => item.category !== 'fullBody').map((item) => item.id);
}

test('the grades are the Lineage 2 ones with contiguous level bands up to the level cap', () => {
  assert.deepEqual(GRADES, L2_GRADES);
  assert.deepEqual(equipmentTemplate.grades.map((grade) => grade.lvl.from), [1, 20, 40, 52, 61, 76, 80, 84]);
  equipmentTemplate.grades.forEach((grade, index) => {
    if (index) assert.equal(grade.lvl.from, equipmentTemplate.grades[index - 1].lvl.to + 1, `${grade.name} follows the previous band`);
    assert.ok(equipmentTemplate.gradeRarity[grade.name], `${grade.name} has a colour tier`);
    assert.ok(equipmentTemplate.rarity.some((rarity) => rarity.name === equipmentTemplate.gradeRarity[grade.name]));
  });
  assert.equal(equipmentTemplate.grades.at(-1).lvl.to, 85);
});

test('every grade has the same complete catalog with unique ids and real names', () => {
  const catalog = getCatalog().filter(item => !item.epic);
  const perGrade = catalog.length / GRADES.length;
  assert.equal(perGrade, Math.floor(perGrade));
  assert.equal(new Set(catalog.map((item) => item.id)).size, catalog.length, 'ids are unique');
  for (const grade of GRADES) {
    const items = catalog.filter((item) => item.grade === grade);
    assert.equal(items.length, perGrade, grade);
    assert.equal(new Set(items.map((item) => item.name)).size, items.length, `${grade}: names are unique`);
    for (const item of items) {
      assert.match(item.name, /\S/, item.id);
      assert.ok(!/undefined/.test(item.name), item.name);
      assert.ok(item.slots.length >= 1 && item.classOwner.length >= 1, item.id);
      assert.equal(item.stats.length, 0, `${item.id}: new weapons require a Soul Crystal for their special ability`);
    }
  }
  const weapons = catalog.filter((item) => item.grade === 'S84' && item.mainType === 'weapon').map((item) => item.name);
  assert.ok(weapons.every((name) => /Vesper/.test(name)), weapons.join());
});

test('weapon power rises with every grade; defence is rescaled by grade at read time', () => {
  for (const weapon of getCatalog().filter((item) => item.grade === 'noGrade' && item.mainType === 'weapon')) {
    let previous = 0;
    for (const grade of GRADES) {
      const power = findCatalogItem(`${grade}:weapon:${weapon.kind}`).characteristics.power;
      assert.ok(power > previous, `${weapon.kind} ${grade}`);
      previous = power;
    }
  }
  const sword = grade => findCatalogItem(`${grade}:weapon:oneHandedSword`).characteristics.power;
  assert.ok(sword('noGrade') >= 8 && sword('noGrade') <= 14, 'the first weapon is a small bonus');
  assert.equal(sword('S84'), equipmentTemplate.lineage.topWeaponPower, 'S84 is the top weapon power');
});

test('a catalog item is a fresh copy with its own uid, nothing random', () => {
  const definition = findCatalogItem('A:weapon:bow');
  const a = instantiate(definition);
  const b = instantiate(definition);
  assert.notEqual(a.uid, b.uid);
  assert.equal(a.enchant, 0);
  a.characteristics.power = 1;
  assert.notEqual(findCatalogItem('A:weapon:bow').characteristics.power, 1, 'the catalog is not mutated through an instance');
  assert.deepEqual(buildCatalog(), getCatalog());
});

test('each class line can fully dress itself at every grade', () => {
  for (const name of classStats.map((entry) => entry.name)) {
    for (const grade of GRADES) {
      const usable = getCatalog().filter((item) => item.grade === grade && canClassUse(name, item));
      assert.ok(usable.some((item) => item.mainType === 'weapon'), `${name} ${grade}: weapon`);
      const setIds = new Set(usable.filter((item) => item.setId).map((item) => item.setId));
      const complete = [...setIds].filter((setId) => {
        const parts = new Set(usable.filter((item) => item.setId === setId).map((item) => item.category));
        return parts.has('helmet') && parts.has('gloves') && parts.has('boots') && (parts.has('fullBody') || (parts.has('body') && parts.has('greaves')));
      });
      assert.ok(complete.length >= 1, `${name} ${grade}: a complete armor set`);
      assert.ok(usable.some((item) => item.mainType === 'jewelry'), `${name} ${grade}: jewellery`);
    }
  }
});

test('class lines map onto the item owner tokens (rogue = assassin, berserk = warrior)', () => {
  assert.equal(classOwnerToken('rogue'), 'assassin');
  assert.equal(classOwnerToken('berserk'), 'warrior');
  assert.equal(classOwnerToken('mage'), 'mage');
  const robe = findCatalogItem('B:armor:robe:fullBody');
  assert.equal(canClassUse('priest', robe), true);
  assert.equal(canClassUse('warrior', robe), false);
  assert.equal(canClassUse('noClass', robe), true, 'no class yet = anything goes');
  assert.equal(canClassUse(undefined, robe), true);
  // Promotions inherit their base class line.
  const profession = classStats.find((entry) => entry.family === 'mage' && entry.name !== 'mage');
  assert.equal(canClassUse(profession.name, robe), true);
});

test('a full armor set grants its bonus; a partial set or a missing part does not', () => {
  const heavy = fullSet('B', 'heavy');
  assert.equal(heavy.length, 5);
  const partial = wearer('warrior', 56, heavy.slice(0, 4));
  assert.equal(activeSets(partial.game.equipmentStats)[0].complete, false);
  assert.equal(getEquipStatByName(partial, 'maxHpMul', true) < 1.1, true);

  const full = wearer('warrior', 56, heavy);
  const [set] = activeSets(full.game.equipmentStats);
  assert.equal(set.complete, true);
  assert.deepEqual(set.bonus, setBonusValues('B', 'heavy'));
  const without = getEquipStatByName(partial, 'maxHpMul', true);
  const withSet = getEquipStatByName(full, 'maxHpMul', true);
  assert.ok(withSet > without * (set.bonus.maxHpMul - 0.005), 'the set multiplier is applied');
  assert.ok(Math.abs(getEquipStatByName(full, 'block') - getEquipStatByName(partial, 'block') - set.bonus.block) < 6, 'flat block of the set');
});

test('a full-body piece covers chest and legs for the set', () => {
  const ids = ['helmet', 'gloves', 'boots', 'fullBody'].map((part) => `C:armor:robe:${part}`);
  const session = wearer('mage', 46, ids);
  assert.equal(activeSets(session.game.equipmentStats)[0].complete, true);
});

test('set bonuses are the converted real ones: none for no-grade armor, real figures where the set is known', () => {
  assert.deepEqual(setBonusValues('noGrade', 'heavy'), {});
  // Imperial Crusader: +8% P.Def, +445 HP; Vesper heavy: +5.57% P.Atk / P.Def
  assert.equal(setBonusValues('S', 'heavy').defenceMul, 1.08);
  assert.equal(setBonusValues('S84', 'heavy').attackMul, 1.0557);
  assert.equal(setBonusValues('S', 'robe').attackMul, 1.08, 'Major Arcana: +8% M.Atk');
  assert.equal(setBonusValues('S', 'light').attackMul, 1.04, 'Draconic Leather: +4% P.Atk');
  for (const type of ARMOR_TYPES) {
    for (const grade of GRADES.slice(1)) {
      const bonus = setBonusValues(grade, type);
      assert.ok(Object.keys(bonus).length >= 1, `${type} ${grade}`);
      for (const value of Object.values(bonus)) assert.ok(Number.isFinite(value) && value > 0, `${type} ${grade}`);
    }
  }
});

test('the catalog carries the real High Five numbers', () => {
  const real = id => findCatalogItem(id).lineage;
  assert.deepEqual(real('S84:weapon:twoHandedSword'), { pAtk: 482, mAtk: 176 });
  assert.equal(findCatalogItem('S84:weapon:mace').name, 'Vesper Caster');
  assert.equal(real('S84:weapon:bow').pAtk, 724);
  assert.equal(real('S80:armor:heavy:body').pDef, 226);
  assert.equal(real('S84:armor:heavy:greaves').pDef, 156);
  assert.equal(real('S84:shield:bigShield').pDef, 371);
  assert.equal(real('S84:jewelry:necklace').mDef, 125);
  assert.equal(findCatalogItem('S:armor:heavy:body').name, 'Imperial Crusader Breastplate');
  // real values only ever grow with the grade
  for (const kind of ['oneHandedSword', 'twoHandedSword', 'dagger', 'bow', 'crossbow', 'blunt', 'fists', 'mace']) {
    let previous = 0;
    for (const grade of GRADES) {
      const stat = findCatalogItem(`${grade}:weapon:${kind}`).lineage[kind === 'mace' ? 'mAtk' : 'pAtk'];
      assert.ok(stat > previous, `${kind} ${grade}`);
      previous = stat;
    }
  }
  // the weapon power keeps the real proportions between grades of one type
  const power = grade => findCatalogItem(`${grade}:weapon:bow`).characteristics.power;
  const curve = equipmentTemplate.lineage.curve;
  assert.ok(Math.abs(power('A') / power('S84') - Math.pow(528 / 724, curve)) < 0.01);
  // Lineage 2 has no medium armor, and light / robe armor is one full-body piece
  assert.equal(getCatalog().some(item => item.kind === 'medium'), false);
  assert.ok(findCatalogItem('A:armor:light:fullBody') && !findCatalogItem('A:armor:light:body'));
  assert.ok(findCatalogItem('A:armor:heavy:body') && findCatalogItem('A:armor:heavy:greaves') && !findCatalogItem('A:armor:heavy:fullBody'));
});

test('enchanting adds power to weapons and defence to everything else, doubling above the safe level', () => {
  const sword = instantiate(findCatalogItem('B:weapon:oneHandedSword'));
  const base = sword.characteristics.power;
  assert.deepEqual(enchantExtras(sword), {});
  sword.enchant = 3;
  assert.ok(Math.abs(enchantExtras(sword).power - base * 3 * 0.035) < 1e-9);
  sword.enchant = 4;
  assert.ok(Math.abs(enchantExtras(sword).power - base * (3 * 0.035 + 0.07)) < 1e-9);
  sword.enchant = 16;
  assert.ok(enchantExtras(sword).power > base * 0.95 && enchantExtras(sword).power < base * 1.2, '+16 about doubles the weapon');

  const helmet = instantiate(findCatalogItem('B:armor:heavy:helmet'), 5);
  assert.ok(Math.abs(enchantExtras(helmet).defence - helmet.characteristics.defence * enchantFraction(5, 3)) < 1e-9);
  assert.equal(enchantExtras(helmet).power, undefined);

  assert.equal(safeEnchantLevel(helmet), 3);
  assert.equal(safeEnchantLevel(instantiate(findCatalogItem('B:armor:robe:fullBody'))), 4);
});

test('enchant bonus reaches combat: attack and defence grow with the level', () => {
  const plain = wearer('warrior', 56, ['B:weapon:oneHandedSword', 'B:armor:heavy:body']);
  const sharp = wearer('warrior', 56, [
    Object.assign(instantiate(findCatalogItem('B:weapon:oneHandedSword')), { enchant: 10 }),
    Object.assign(instantiate(findCatalogItem('B:armor:heavy:body')), { enchant: 10 }),
  ]);
  assert.ok(getAttack(sharp) > getAttack(plain) * 1.1);
  assert.ok(getDefence(sharp) > getDefence(plain));
});

test('enchant chance is certain up to the safe level and 66% above it', () => {
  const sword = instantiate(findCatalogItem('A:weapon:bow'));
  for (let level = 0; level < 3; level++) { sword.enchant = level; assert.equal(enchantChance(sword), 1); }
  sword.enchant = 3;
  assert.equal(enchantChance(sword), 0.66);
});

test('the enchant success rate above the safe level matches the chance', () => {
  let successes = 0;
  const trials = 4000;
  withSeed(11, () => {
    for (let i = 0; i < trials; i++) {
      const session = { game: { inventory: { equipment: { items: [] }, materials: { blessed_A: 1 } }, equipmentStats: {} } };
      const item = instantiate(findCatalogItem('A:weapon:bow'), 6);
      session.game.inventory.equipment.items.push(item);
      if (enchantItem(session, item, { blessed: true }).outcome === 'success') successes++;
    }
  });
  assert.ok(Math.abs(successes / trials - 0.66) < 0.03, `${successes / trials}`);
});

test('crystal yield scales with the grade and what the piece is', () => {
  assert.equal(crystalYield(findCatalogItem('noGrade:weapon:bow')), 0);
  assert.equal(crystalYield(findCatalogItem('D:weapon:bow')), 20);
  assert.equal(crystalYield(findCatalogItem('S84:weapon:bow')), 720);
  assert.ok(crystalYield(findCatalogItem('S:armor:light:fullBody')) > crystalYield(findCatalogItem('S:armor:light:boots')));
  assert.equal(scrollPrice('noGrade'), null);
  assert.deepEqual(scrollPrice('D'), { gold: 2000, crystals: 0 });
  assert.deepEqual(scrollPrice('D', { blessed: true }), { gold: 4000, crystals: 12 });
});

test('gear adds a flat amount and a percentage to max HP / MP (it used to multiply by the flat amount)', () => {
  const session = wearer('warrior', 50);
  const base = getMaxHp(session);
  session.game.equipmentStats.up = { kind: 'x', slots: ['up'], grade: 'D', characteristics: { maxHp: 1000, maxHpMul: 1.1 }, stats: [] };
  const flat = 1000 * (getEquipStatByName(session, 'maxHp') / 1000);
  assert.ok(Math.abs(getMaxHp(session) - Math.round((session.game.gameClass.stats.maxHp + flat) * 1.1)) <= 1);
  assert.ok(getMaxHp(session) > base && getMaxHp(session) < base * 3, 'no more million-point hit point rolls');

  const mage = wearer('mage', 50, ['C:weapon:mace']);
  assert.ok(getMaxMp(mage) > mage.game.gameClass.stats.maxMp * 1.1, 'a staff raises max MP by its percentage');
});

test('random drops pick the grade of the level and prefer items the class can use', () => {
  withSeed(3, () => {
    assert.equal(generateRandomEquipment(25, undefined, { exact: true }).grade, 'D');
    assert.equal(generateRandomEquipment(95, undefined, { exact: true }).grade, 'S84');
    assert.equal(generateRandomEquipment(1, undefined, { exact: true }).grade, 'noGrade');
    let usable = 0;
    const draws = 600;
    for (let i = 0; i < draws; i++) if (canClassUse('mage', generateRandomEquipment(60, 'B', { exact: true, forClass: 'mage' }))) usable++;
    assert.ok(usable / draws > 0.85, `${usable / draws}`);
    let blind = 0;
    for (let i = 0; i < draws; i++) if (canClassUse('mage', generateRandomEquipment(60, 'B', { exact: true }))) blind++;
    assert.ok(blind < usable, 'without a class hint some drops are useless');
  });
  assert.throws(() => generateRandomEquipment(10, 'SSS'), /грейд/);
});

test('only the lucky upgrade roll can bump a drop one grade, and never past S84', () => {
  const realRandom = Math.random;
  Math.random = () => 0.01;
  try {
    assert.equal(generateRandomEquipment(25).grade, 'C');
    assert.equal(generateRandomEquipment(95).grade, 'S84');
    assert.equal(generateRandomEquipment(25, 'D', { exact: true }).grade, 'D');
  } finally {
    Math.random = realRandom;
  }
});

test('boss drops give scrolls and crystals of the fighter grade, more from harder bosses', () => {
  assert.equal(enchantGradeForLevel(10), null);
  assert.equal(enchantGradeForLevel(25), 'D');
  assert.equal(enchantGradeForLevel(99), 'S84');
  const member = { game: { stats: { lvl: 82 }, inventory: {} } };
  const drops = rollEnchantDrops(member, { tier: 1, place: 1, random: () => 0 });
  assert.deepEqual(drops.map((drop) => drop.item), ['scroll_S80', 'blessed_S80', 'crystal_S80', 'lifestone_S80', 'lifestone_mid_S80', 'lifestone_high_S80', 'lifestone_top_S80']);
  assert.ok(getMaterialCount(member, 'scroll_S80') >= 1);
  const hard = { game: { stats: { lvl: 82 }, inventory: {} } };
  rollEnchantDrops(hard, { tier: 3, place: 1, random: () => 0 });
  assert.ok(getMaterialCount(hard, 'scroll_S80') >= 3 && getMaterialCount(hard, 'scroll_S80') <= 6);
  assert.deepEqual(rollEnchantDrops({ game: { stats: { lvl: 5 }, inventory: {} } }, { random: () => 0 }), []);
  assert.deepEqual(rollEnchantDrops(member, { random: () => 0.999 }), []);
});

test('old items become catalog items: SS/SSS turn into S80/S84, the forge level into the enchant level', () => {
  const legacy = {
    name: '(SS - Grade, Редкое) Меч странный', grade: 'SS', mainType: 'weapon', kind: 'oneHandedSword', slots: ['rightHand'],
    classOwner: ['warrior'], quality: { current: 5, max: 100 }, persistence: { current: 5, max: 100 },
    stats: [{ name: 'attack', value: 9999 }], forgeLevel: 7, cost: 1234, isUsed: false,
  };
  const migrated = migrateItem(legacy);
  assert.equal(migrated.grade, 'S80');
  assert.equal(migrated.name, 'Dynasty Sword');
  assert.equal(migrated.enchant, 7);
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.stats, [], 'random rolls are removed; new SA requires a crystal');
  assert.equal(migrateItem(migrated), migrated, 'already migrated');
  assert.equal(migrateItem({ ...legacy, grade: 'SSS', mainType: 'armor', kind: 'robe', category: 'helmet', slots: ['helmet'], forgeLevel: 99 }).enchant, 10);
  assert.equal(migrateItem({ ...legacy, kind: 'no-such-kind', slots: ['nowhere'] }), null);
});

test('a session is migrated once: worn gear keeps its slot and the stored stats follow the catalog', () => {
  const sword = { name: 'Old blade', grade: 'D', mainType: 'weapon', kind: 'oneHandedSword', slots: ['rightHand'], classOwner: ['warrior'], stats: [{ name: 'attack', value: 50000 }], cost: 3000, isUsed: true, forgeLevel: 2 };
  const ring = { name: 'Old ring', grade: 'C', mainType: 'jewelry', kind: 'ring', slots: ['rightRing'], classOwner: ['warrior'], stats: [], cost: 900, isUsed: false };
  const broken = { name: 'Unknown', grade: 'D', mainType: 'mystery', kind: 'x', slots: ['head'], cost: 1, isUsed: false };
  const session = {
    game: {
      stats: { lvl: 30 },
      equipmentStats: { rightHand: { ...sword, minLvl: 21, isFilled: true } },
      inventory: { equipment: { items: [sword, ring, broken] } },
      gachaTempItem: { ...ring, grade: 'SSS' },
    },
  };

  assert.equal(migrateSessionEquipment(session), true);
  const items = session.game.inventory.equipment.items;
  assert.equal(items.length, 2, 'an item that fits no catalog entry is dropped');
  assert.equal(items[0].version, 2);
  assert.equal(items[0].isUsed, true);
  assert.equal(items[0].enchant, 2);
  assert.equal(session.game.equipmentStats.rightHand.uid, items[0].uid);
  assert.equal(session.game.equipmentStats.rightHand.minLvl, 20);
  assert.equal(items[1].slots[0], 'rightRing', 'a ring keeps the side it was worn on');
  assert.equal(session.game.gachaTempItem.grade, 'S84');
  assert.equal(getEquipStatByName(session, 'attack'), 0, 'the 50000 attack roll is gone');
  assert.equal(migrateSessionEquipment(session), false, 'nothing left to migrate');
});

test('loading a player (getLostFieldsInSession) migrates gear and a fresh player has none to migrate', () => {
  const legacy = { name: 'Old', grade: 'SSS', mainType: 'armor', kind: 'heavy', category: 'boots', slots: ['boots'], classOwner: ['warrior'], stats: [], cost: 1, isUsed: false };
  const session = { game: { inventory: { equipment: { items: [legacy] } } } };
  getLostFieldsInSession(session);
  assert.equal(session.game.inventory.equipment.items[0].grade, 'S84');
  assert.equal(getLostFieldsInSession({ game: {} }) , undefined);
});

test('gear is a believable share of a character at every grade (warrior, sword and heavy set)', () => {
  const shares = [];
  for (const grade of GRADES) {
    const level = Math.round(equipmentTemplate.grades.find((entry) => entry.name === grade).lvl.from * 0.5
      + equipmentTemplate.grades.find((entry) => entry.name === grade).lvl.to * 0.5);
    const bare = wearer('warrior', level);
    const geared = wearer('warrior', level, [`${grade}:weapon:oneHandedSword`, ...fullSet(grade, 'heavy')]);
    shares.push({
      grade,
      attack: getAttack(geared) / getAttack(bare),
      defence: getDefence(geared) / getDefence(bare),
      hp: getMaxHp(geared) / getMaxHp(bare),
    });
  }
  for (const entry of shares) {
    assert.ok(entry.attack > 1.05 && entry.attack < 2.1, `${entry.grade} attack x${entry.attack.toFixed(2)}`);
    assert.ok(entry.defence > 1.1 && entry.defence < 2.2, `${entry.grade} defence x${entry.defence.toFixed(2)}`);
    assert.ok(entry.hp >= 1.05 && entry.hp < 1.35, `${entry.grade} hp x${entry.hp.toFixed(2)}`);
  }
  for (let i = 1; i < shares.length; i++) {
    assert.ok(shares[i].attack > shares[i - 1].attack, `${shares[i].grade} hits harder than ${shares[i - 1].grade}`);
  }
  assert.ok(gradeIndex('S84') === 7);
});

test('old medium armor and split chest / legs pieces map onto the Lineage 2 layout', () => {
  const old = { grade: 'B', mainType: 'armor', classOwner: ['archer'], stats: [], cost: 1, isUsed: false };
  const medium = migrateItem({ ...old, name: 'M', kind: 'medium', category: 'body', slots: ['up'] });
  assert.equal(medium.kind, 'light');
  assert.equal(medium.category, 'fullBody');
  assert.deepEqual(medium.slots, ['up', 'down']);
  assert.equal(migrateItem({ ...old, name: 'R', kind: 'robe', category: 'greaves', slots: ['down'] }).category, 'fullBody');
  assert.equal(migrateItem({ ...old, name: 'H', kind: 'heavy', category: 'fullBody', slots: ['up', 'down'] }).category, 'body');

  // chest + legs worn together become two full-body items: only one stays worn
  const chest = { ...old, name: 'C', kind: 'medium', category: 'body', slots: ['up'], isUsed: true };
  const legs = { ...old, name: 'L', kind: 'medium', category: 'greaves', slots: ['down'], isUsed: true };
  const session = { game: { stats: { lvl: 60 }, equipmentStats: { up: { ...chest }, down: { ...legs } }, inventory: { equipment: { items: [chest, legs] } } } };
  migrateSessionEquipment(session);
  const worn = session.game.inventory.equipment.items.filter(item => item.isUsed);
  assert.equal(worn.length, 1);
  assert.ok(session.game.equipmentStats.up && session.game.equipmentStats.down);
});
