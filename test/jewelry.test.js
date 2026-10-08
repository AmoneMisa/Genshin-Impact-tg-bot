import test from 'node:test';
import assert from 'node:assert/strict';
import equipmentTemplate from '../template/equipmentTemplate.js';
import equipItem from '../functions/game/equipment/equipItem.js';
import unequipItem from '../functions/game/equipment/unequipItem.js';
import { normalizeLootKind, renderLootArt as renderLootArtForTest } from '../webapp/loot-renderer.js';
import { itemRotation, normalizeManifest, resolveModelEntry } from '../webapp/loot-gltf.js';
import { dollSlotFor, equippedItemForSlot } from '../webapp/equipment-paper-doll.js';
import fs from 'node:fs';
import { itemArtKey, itemArtSources } from '../webapp/art/items-art.js';

function jewel(type, name) {
  const kind = equipmentTemplate.itemType.find(t => t.name === 'jewelry').kind.find(k => k.type === type);
  return { name, grade: 'D', mainType: 'jewelry', kind: type, category: kind.category, slots: [...kind.slots], ...(kind.pairSlots ? { pairSlots: [...kind.pairSlots] } : {}), stats: [], isUsed: false };
}
const session = items => ({ game: { equipmentStats: {}, inventory: { equipment: { items } } } });

test('jewellery exists in the template for every class, with slots the paper doll shows', () => {
  const jewelry = equipmentTemplate.itemType.find(t => t.name === 'jewelry');
  assert.ok(jewelry, 'jewelry item type');
  assert.deepEqual(jewelry.kind.map(k => k.type).sort(), ['earring', 'necklace', 'ring']);
  for (const kind of jewelry.kind) {
    assert.equal(kind.classOwner.length, 5);
    assert.ok(Object.keys(kind.characteristics).length >= 1);
  }
});

test('a second ring goes to the free side, a third replaces the first side', () => {
  const a = jewel('ring', 'A'), b = jewel('ring', 'B'), c = jewel('ring', 'C');
  const s = session([a, b, c]);
  assert.equal(equipItem(s, a), 0);
  assert.equal(equipItem(s, b), 0);
  assert.deepEqual([a.slots, b.slots], [['leftRing'], ['rightRing']]);
  assert.equal(equipItem(s, c), 0);
  assert.deepEqual(c.slots, ['leftRing']);
  assert.equal(a.isUsed, false, 'displaced ring is unequipped');
  assert.equal(s.game.equipmentStats.leftRing.name, 'C');
  unequipItem(s, b);
  assert.equal(s.game.equipmentStats.rightRing, null);
});

test('earrings pair across both ears; the necklace has one slot', () => {
  const l = jewel('earring', 'L'), r = jewel('earring', 'R'), n = jewel('necklace', 'N');
  const s = session([l, r, n]);
  for (const item of [l, r, n]) assert.equal(equipItem(s, item), 0);
  assert.deepEqual(Object.keys(s.game.equipmentStats).sort(), ['leftEar', 'necklace', 'rightEar']);
});

test('previews map jewellery and robe helmets to their own kinds', () => {
  assert.equal(normalizeLootKind({ kind: 'earring', category: 'earring' }), 'earring');
  assert.equal(normalizeLootKind({ kind: 'necklace', category: 'necklace' }), 'amulet');
  assert.equal(normalizeLootKind({ kind: 'ring' }), 'ring');
  assert.equal(normalizeLootKind({ kind: 'robe', category: 'helmet' }), 'tiara');
  assert.equal(normalizeLootKind({ kind: 'heavy', category: 'helmet' }), 'helmet');
});

test('every jewellery kind has a distinct WebP painting', () => {
  for (const kind of ['ring', 'earring', 'amulet', 'tiara']) {
    assert.equal(itemArtKey(kind), kind);
    assert.equal(itemArtSources(kind).src, '/art/items/v1/'+kind+'-128.webp');
  }
});

test('front-facing ornaments sway instead of spinning edge-on', () => {
  for (const kind of ['tiara', 'amulet', 'earring', 'ring', 'bow', 'shield', 'armor']) {
    for (const t of [0, 3, 7.5, 30, 120]) assert.ok(Math.abs(itemRotation(kind, t)[1]) <= 0.6 + 1e-9, `${kind} at ${t}s`);
  }
  assert.ok(itemRotation('sword', 30)[1] > 6, 'weapons still spin');
});

test('the paper doll shows helmets, gloves and boots in head, hands and legs', () => {
  assert.equal(dollSlotFor('helmet'), 'head');
  assert.equal(dollSlotFor('gloves'), 'hands');
  assert.equal(dollSlotFor('boots'), 'legs');
  assert.equal(dollSlotFor('leftRing'), 'leftRing');
  const helm = { name: 'Helm', grade: 'D', mainType: 'armor', kind: 'heavy', slots: ['helmet'], isUsed: true };
  const state = { items: [helm], equippedSlots: { helmet: { name: 'Helm', grade: 'D', mainType: 'armor', kind: 'heavy' } } };
  assert.equal(equippedItemForSlot(state, 'head'), helm);
});

test('item type selects its own painting for robe slots and weapons', () => {
  assert.equal(itemArtKey('sword',{kind:'twoHandedSword',grade:'s84'}),'greatsword-solar');
  assert.equal(itemArtKey('sword',{kind:'oneHandedSword',grade:'s84'}),'sword-prismatic');
  for(const [kind,key] of [['armor','mantle'],['gloves','bracers'],['boots','anklets'],['greaves','leg-wraps']]) {
    assert.equal(itemArtKey(kind,{kind:'robe'}),key);
    assert.equal(itemArtKey(kind,{kind:'heavy'}),kind);
  }
  assert.equal(itemArtKey('shield',{kind:'sigill'}),'sigil');
  assert.equal(itemArtKey('../secret'), 'relic');
});

test('loot art exposes the raw item type for artwork lookup', () => {
  const html = renderLootArtForTest({ kind: 'robe', category: 'gloves', grade: 'A' });
  assert.match(html, /data-loot-type="robe"/);
});
