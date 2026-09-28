import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BOSS_ART, SKILL_FX, bossArtUrl, classArtUrl, hitEnvelope, lungeEnvelope, skillFxForClass,
} from '../webapp/boss-stage.js';
import { MENU_ART, menuArtFor } from '../webapp/menu-art.js';
import bossTemplate from '../template/bossTemplate.js';

test('every boss in the game has stage art and an element', () => {
  for (const boss of bossTemplate) {
    assert.ok(BOSS_ART[boss.name], `${boss.name} has no stage config`);
    assert.ok(fs.existsSync(`webapp${bossArtUrl(boss.name)}`), `${boss.name} art is not built (npm run art:build)`);
  }
  assert.equal(bossArtUrl('unknown'), null);
});

test('reaction envelopes start strong, settle to zero, and ignore the future', () => {
  assert.equal(hitEnvelope(0), 1);
  assert.equal(hitEnvelope(-0.1), 0, 'a hit scheduled for the impact frame has no effect before it');
  assert.equal(hitEnvelope(1), 0);
  assert.ok(hitEnvelope(0.1) > hitEnvelope(0.3));
  assert.equal(lungeEnvelope(0), 0);
  assert.ok(Math.abs(lungeEnvelope(0.21) - 1) < 1e-9, 'lunge peaks at 30% of its duration');
  assert.equal(lungeEnvelope(0.8), 0);
});

test('each class gets its own skill animation, with impact after the cast', () => {
  assert.equal(skillFxForClass('warrior'), 'slash');
  assert.equal(skillFxForClass('archer'), 'arrow');
  assert.equal(skillFxForClass('mage'), 'orb');
  assert.equal(skillFxForClass('priest'), 'beam');
  assert.equal(skillFxForClass('noClass'), 'punch');
  assert.equal(skillFxForClass('???'), 'punch');
  const ids = new Set(Object.values(SKILL_FX).map(fx => fx.id));
  assert.equal(ids.size, Object.keys(SKILL_FX).length);
  for (const fx of Object.values(SKILL_FX)) assert.ok(fx.impact > 0 && fx.impact < 0.6);
});

test('class portraits and menu cards point at built art', () => {
  for (const cls of ['noClass', 'warrior', 'archer', 'mage', 'priest']) {
    for (const gender of ['male', 'female']) assert.ok(fs.existsSync(`webapp${classArtUrl(cls, gender)}`), `${cls}-${gender}`);
  }
  assert.equal(classArtUrl('nope', 'x'), '/art/classes/noClass-male.webp');
  for (const id of MENU_ART) assert.ok(fs.existsSync(`webapp${menuArtFor(id)}`), id);
  assert.equal(menuArtFor('profile', { className: 'mage', gender: 'female' }), '/art/classes/mage-female.webp');
  assert.equal(menuArtFor('help'), null);
});

test('the boss screen keeps its stage outside re-rendered content and plays skills on impact', () => {
  const source = fs.readFileSync('webapp/boss.js', 'utf8');
  assert.ok(source.indexOf('data-boss-stage') < source.indexOf('<div data-boss-content>'));
  assert.ok(source.includes("stage?.playSkill('damage'"));
  assert.ok(source.includes('stage?.defeat()'));
  assert.ok(source.includes('stage?.destroy()'));
  const server = fs.readFileSync('miniapp/boss.js', 'utf8');
  assert.ok(server.includes('className: session?.game?.gameClass?.stats?.name'));
});
