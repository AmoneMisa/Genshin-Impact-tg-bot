import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {avatarArtUrl,avatarOutfit,AVATAR_OUTFITS} from '../webapp/art/avatar-art.js';
import {fullBodyHeroUrl} from '../webapp/art/world-art.js';
import {L2_CLASS_META,raceOf} from '../template/l2ClassMeta.js';
test('all real classes get a race/gender outfit; professions within one race share it',()=>{
 for(const [id,meta] of Object.entries(L2_CLASS_META))for(const gender of ['male','female']){
  const p={className:meta.key,gender},outfit=avatarOutfit(p);
  assert.equal(outfit.race,raceOf(Number(id)));
  assert.equal(outfit.gender,gender);
  assert.equal(fullBodyHeroUrl(p),avatarArtUrl({race:outfit.race,gender}));
 }
 assert.equal(avatarArtUrl({className:'humanFighter'}),avatarArtUrl({className:'archmage'}));
 assert.notEqual(avatarArtUrl({className:'archmage'}),avatarArtUrl({className:'mysticMuse'}));
 assert.equal(avatarArtUrl({className:'__proto__'}),null);
 assert.equal(avatarArtUrl({race:'elf'},999),null);
 assert.equal(new Set(AVATAR_OUTFITS.map(o=>o.id)).size,12);
 assert.equal(fullBodyHeroUrl({className:'unknown',gender:'other'}),'/art/world/v1/heroes/noClass-male-512.webp');
 for(const outfit of AVATAR_OUTFITS)for(const width of [256,512,1024])
  assert.ok(fs.existsSync(new URL('../webapp'+outfit.artPath+'-'+width+'.webp',import.meta.url)),outfit.key);
});
