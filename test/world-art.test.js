import test from 'node:test';
import assert from 'node:assert/strict';
import { worldArtUrl, fullBodyHeroUrl, worldIconHtml } from '../webapp/art/world-art.js';

test('world art exposes reviewed sizes and rejects unknown or inherited keys',()=>{
  assert.equal(worldArtUrl('__proto__'),null);
  assert.equal(worldArtUrl('constructor'),null);
  assert.equal(worldArtUrl('../private'),null);
  assert.equal(worldArtUrl('stars/pouch',1024),null);
  assert.equal(worldArtUrl('stars/pouch'),'/art/world/v1/stars/pouch-256.webp');
  assert.match(worldIconHtml('chests/reward-gold'),/reward-gold-128.webp/);
});

test('full-body heroes use class families and do not replace compact HUD portraits',()=>{
  assert.equal(fullBodyHeroUrl({className:'warrior',gender:'female'}),'/art/world/v1/heroes/warrior-female-512.webp');
  assert.equal(fullBodyHeroUrl({className:'unknown',gender:'other'}),'/art/world/v1/heroes/noClass-male-512.webp');
});
