import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AVATAR_OUTFITS} from '../webapp/art/avatar-art.js';
import {avatarPortraitUrl,AVATAR_PORTRAIT_KEYS} from '../webapp/art/avatar-portrait-art.js';
import {menuArtFor} from '../webapp/menu-art.js';
import {classArtUrl,skillFxForClass} from '../webapp/boss-stage.js';
import {classArt} from '../webapp/profile.js';

test('all twelve race/gender portraits are reviewed and delivered at compact widths',()=>{
  const reviewed=JSON.parse(fs.readFileSync('art-source/avatars/portraits/reviewed.json','utf8'));
  assert.deepEqual(new Set(AVATAR_PORTRAIT_KEYS),new Set(reviewed));
  for(const outfit of AVATAR_OUTFITS){
    const player={race:outfit.race,gender:outfit.gender};
    for(const width of [128,256,512]){
      const url=avatarPortraitUrl(player,width);
      assert.ok(fs.existsSync('webapp'+url),url);
      assert.ok(fs.statSync('webapp'+url).size<=width*160,'compact delivery budget');
    }
  }
});
test('HUD, menu, profile and boss portraits agree across professions of one race',()=>{
  for(const className of ['elvenMystic','mysticMuse']){
    const url=avatarPortraitUrl({race:'elf',gender:'female'});
    assert.equal(menuArtFor('profile',{className,gender:'female'}),url);
    assert.equal(classArtUrl(className,'female'),url);
    assert.equal(classArt(className,'female'),url);
  }
  assert.notEqual(classArt('mysticMuse','female'),classArt('archmage','female'));
  assert.equal(skillFxForClass('archmage'),'orb');
  assert.equal(menuArtFor('profile',{race:'dwarf',gender:'male'},128),avatarPortraitUrl({race:'dwarf',gender:'male'},128));
});
test('unknown race, invalid width and hostile input never become arbitrary asset paths',()=>{
  assert.equal(avatarPortraitUrl({race:'../../file'}),null);
  assert.equal(avatarPortraitUrl({race:'elf'},1024),null);
  assert.equal(menuArtFor('profile',{className:'unknown',gender:'unknown'}),'/art/classes/noClass-male.webp');
});
