import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LAB_RUNE_KINDS, LAB_RUNE_TIERS, MAX_RATE_RUNE, runeValue, labRuneBonus, runeRate, teleportPrice,
  brewLabRune, brewPrice, brewCap, getLabState, brewOdds, activeLabRunes, defenseRuneFactor,
} from '../functions/game/runes/labRunes.js';

const hero = (extra = {}) => ({game: {
  inventory: {gold: 1e6, moonDew: 1e5}, builds: {palace: {currentLvl: 9}, alchemyLab: {currentLvl: 9}}, ...extra,
}});
const now = Date.UTC(2026, 9, 14, 12);

test('no rate rune exceeds +35% and values follow the three strengths', () => {
  for (const kind of Object.keys(LAB_RUNE_KINDS)) for (const tier of LAB_RUNE_TIERS) {
    const v = runeValue(kind, tier.id);
    assert.ok(v > 0);
    if (['exp', 'sp', 'drop', 'adena', 'quest', 'teleport'].includes(kind)) assert.ok(v <= MAX_RATE_RUNE);
  }
  assert.deepEqual([1, 2, 3].map(t => runeValue('attack', t)), [0.05, 0.07, 0.1]);
  assert.deepEqual([1, 2, 3].map(t => LAB_RUNE_TIERS[t - 1].hours), [2, 6, 12]);
});

test('runes of one kind coexist but only the strongest applies; different kinds combine', () => {
  const s = hero({labRunes: [
    {kind: 'exp', tier: 1, until: now + 3600000}, {kind: 'exp', tier: 3, until: now + 7200000},
    {kind: 'drop', tier: 2, until: now + 3600000}, {kind: 'exp', tier: 2, until: now - 1},
  ]});
  assert.equal(labRuneBonus(s, 'exp', now), 0.35);
  assert.equal(labRuneBonus(s, 'drop', now), 0.25);
  assert.equal(labRuneBonus(s, 'adena', now), 0);
  assert.equal(activeLabRunes(s, now).length, 3);
});

test('the calendar rune stays +50% and the strongest of the two applies', () => {
  const s = hero({labRunes: [{kind: 'exp', tier: 3, until: now + 3600000}], loginRewards: {runes: {exp: now + 3600000}}});
  assert.equal(runeRate(s, 'exp', now), 0.5);
  const lab = hero({labRunes: [{kind: 'exp', tier: 3, until: now + 3600000}]});
  assert.equal(runeRate(lab, 'exp', now), 0.35);
});

test('teleport and defense runes lower costs and incoming damage', () => {
  const s = hero({labRunes: [{kind: 'teleport', tier: 3, until: now + 1000}, {kind: 'defense', tier: 3, until: now + 1000}]});
  assert.equal(teleportPrice(s, 20000, now), 13000);
  assert.equal(teleportPrice(hero(), 20000, now), 20000);
  assert.equal(defenseRuneFactor(s, now), 0.95);
});

test('brewing: attempt price doubles in dew, cap grows with level, fizzle still costs', () => {
  assert.deepEqual(brewPrice(1), {moonDew: 300, gold: 2000});
  assert.deepEqual(brewPrice(3), {moonDew: 1200, gold: 6000});
  assert.equal(brewCap(hero()), 5);
  const s = hero({builds: {palace: {currentLvl: 9}, alchemyLab: {currentLvl: 1}}});
  assert.equal(brewCap(s), 1);
  const fizzle = brewLabRune(s, {now, random: () => 0});
  assert.equal(fizzle.ok, true);
  assert.equal(fizzle.fizzled, true);
  assert.equal(s.game.inventory.moonDew, 1e5 - 300);
  assert.equal(brewLabRune(s, {now, random: () => 0}).reason, 'no_attempts');
  const nextDay = brewLabRune(s, {now: now + 86400000, random: () => 0});
  assert.equal(nextDay.ok, true);
});

test('a successful brew adds a timed rune; locked palace and low funds are refused without a charge', () => {
  const s = hero();
  const result = brewLabRune(s, {now, random: (() => { const v = [0.9, 0, 0.99]; let i = 0; return () => v[i++] ?? 0; })()});
  assert.equal(result.ok, true);
  assert.equal(result.fizzled, false);
  assert.equal(s.game.labRunes.length, 1);
  assert.ok(s.game.labRunes[0].until > now);
  const locked = hero({builds: {palace: {currentLvl: 7}, alchemyLab: {currentLvl: 5}}});
  assert.equal(brewLabRune(locked, {now}).reason, 'lab_locked');
  const poor = hero(); poor.game.inventory.moonDew = 10;
  assert.equal(brewLabRune(poor, {now}).reason, 'not_enough_moon_dew');
  assert.equal(poor.game.inventory.moonDew, 10);
  assert.equal(getLabState(poor, now).used, 0);
});

test('the odds shown add up to 100%', () => {
  const odds = brewOdds();
  const total = odds.fizzle + odds.kinds.reduce((sum, kind) => sum + kind.tiers.reduce((s, t) => s + t.chance, 0), 0);
  assert.ok(Math.abs(total - 100) < 1e-9);
});
