import test from 'node:test';
import assert from 'node:assert/strict';
import getEquipStatByName from '../functions/game/player/getters/getEquipStatByName.js';
import getAttack from '../functions/game/player/getters/getAttack.js';

function weaponSlot(kind, slots, characteristics) {
  return { kind, slots, characteristics };
}

function session(equipmentStats) {
  return { game: { equipmentStats } };
}

test('power/defencePower are read as percentage points, not raw multiplier factors', () => {
  // A single one-handed sword with power:45 should be +45%, i.e. a 1.45 factor -
  // not 45x (the pre-fix bug).
  const s = session({
    rightHand: weaponSlot('oneHandedSword', ['rightHand'], { power: 45 }),
  });

  assert.equal(getEquipStatByName(s, 'power', true), 1.45);
});

test('a two-slot weapon (e.g. two-handed sword) is counted once, not once per slot', () => {
  const slots = ['leftHand', 'rightHand'];
  const s = session({
    leftHand: weaponSlot('twoHandedSword', slots, { power: 45, accuracy: 20 }),
    rightHand: weaponSlot('twoHandedSword', slots, { power: 45, accuracy: 20 }),
  });

  // Without dedup this would be 45*45 -> 1 + 0.45*0.45-ish compounding, or the
  // additive accuracy would double to 40.
  assert.equal(getEquipStatByName(s, 'power', true), 1.45);
  assert.equal(getEquipStatByName(s, 'accuracy'), 20);
});

test('two distinct one-handed weapons in different slots both contribute (dual wield)', () => {
  const s = session({
    leftHand: weaponSlot('dagger', ['leftHand'], { power: 30 }),
    rightHand: weaponSlot('oneHandedSword', ['rightHand'], { power: 45 }),
  });

  // 1.30 * 1.45
  assert.equal(getEquipStatByName(s, 'power', true), 1.3 * 1.45);
});

test('getAttack stays bounded for a fully-equipped weapon slot instead of exploding', () => {
  const s = session({
    rightHand: weaponSlot('oneHandedSword', ['rightHand'], { power: 45 }),
  });
  s.game.gameClass = { stats: { attack: 500 } };

  const attack = getAttack(s);
  // 500 * 1.45 (power) * 1 (attackMul, unpopulated) + 0 (flat attack) = 725
  assert.equal(attack, 725);
});

test('non-power multiplicative stats (already stored as ~1.x factors) are unaffected', () => {
  const s = session({
    up: weaponSlot('heavy', ['up'], { incomingDamageModifier: 1.05 }),
  });

  assert.equal(getEquipStatByName(s, 'incomingDamageModifier', true), 1.05);
});

test('rolled item.stats (gacha/crafted bonus rolls) are now actually applied, additive and multiplicative', () => {
  const slot = weaponSlot('heavy', ['up'], {});
  slot.stats = [
    { name: 'attack', value: 40 },
    { name: 'attackMul', value: 1.08 },
    { name: 'criticalChance', value: 5 },
  ];
  const s = session({ up: slot });

  assert.equal(getEquipStatByName(s, 'attack'), 40);
  assert.equal(getEquipStatByName(s, 'attackMul', true), 1.08);
  assert.equal(getEquipStatByName(s, 'criticalChance'), 5);
});

test('rolled item.stats stack additively across multiple equipped slots', () => {
  const helmet = weaponSlot('heavy', ['helmet'], {});
  helmet.stats = [{ name: 'defence', value: 20 }];
  const boots = weaponSlot('boots', ['boots'], {});
  boots.stats = [{ name: 'defence', value: 15 }];
  const s = session({ helmet, boots });

  assert.equal(getEquipStatByName(s, 'defence'), 35);
});
