import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { AVATAR_COSTUME_VARIANTS, avatarCostumeVariants, avatarCostumeArtUrl } from '../webapp/art/avatar-costume-art.js';
import { RACES } from '../webapp/class-race.js';

const referenceThemes = JSON.parse(readFileSync(new URL('../art-source/avatars/collections/remaining-reference-themes.json',import.meta.url)));
const completedThemes = referenceThemes.filter(t=>t.status==='reviewed');

test('each custom costume covers all six races of exactly its own gender', () => {
  assert.equal(AVATAR_COSTUME_VARIANTS.length,72+completedThemes.length*RACES.length);
  const ids = [...new Set(AVATAR_COSTUME_VARIANTS.map(v=>v.costumeId))];
  assert.equal(ids.length,12+completedThemes.length);
  const originals=JSON.parse(readFileSync(new URL('../art-source/avatars/jobs.json',import.meta.url)));
  for (const id of ids) {
    const group = AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id);
    const nextNames = { 'starfrost-court': 'Иней звёздного двора', 'opal-tide': 'Опаловый прилив', 'dusk-velvet-ball': 'Вельвет сумеречного бала', 'celestial-cartographer': 'Звёздный картограф' };
    const name = nextNames[id] || originals.find(j=>j.outfitId===id)?.name || referenceThemes.find(t=>t.costumeId===id)?.name;
    assert.ok(name, 'Every delivered theme has an explicit source brief');
    assert.ok(group.every(v=>v.name===name),'UTF-8 costume names match the original brief');
    assert.equal(new Set(group.map(v=>v.gender)).size,1);
    assert.deepEqual(group.map(v=>v.race).sort(), [...RACES].sort());
    for (const v of group) for (const width of [256,512,1024]) {
      const url = avatarCostumeArtUrl(id,v,width);
      assert.ok(existsSync(new URL('../webapp'+url,import.meta.url)),url);
      assert.equal(avatarCostumeArtUrl(id,{...v,gender:v.gender==='male'?'female':'male'},width),null);
    }
  }
});

test('catalogue follows actual class ancestry and rejects unknown costumes and widths', () => {
  const variants = avatarCostumeVariants({className:'arbalester',gender:'female'});
  assert.equal(variants.length,5+completedThemes.filter(t=>t.gender==='female').length);
  assert.ok(variants.every(v=>v.race==='kamael' && v.gender==='female'));
  assert.equal(avatarCostumeArtUrl('../../secret',{race:'human',gender:'male'}),null);
  assert.equal(avatarCostumeArtUrl('violet-courtier',{race:'human'},2048),null);
  assert.deepEqual(avatarCostumeVariants({className:'unknown'}),[]);
  const delivery = JSON.parse(readFileSync(new URL('../art-source/avatars/collections/delivery.json',import.meta.url)));
  const progress = JSON.parse(readFileSync(new URL('../art-source/avatars/collections/progress.json',import.meta.url)));
  assert.equal(delivery.complete,progress.allComplete);
  assert.equal(delivery.files.length,AVATAR_COSTUME_VARIANTS.length*3);
});
