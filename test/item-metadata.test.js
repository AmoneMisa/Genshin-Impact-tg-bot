import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {materialInfo} from '../functions/game/player/materials.js';
import {materialIcon} from '../webapp/material-icons.js';
import {l2SlotBackground} from '../webapp/l2-slot-background.js';
test('travel and resurrection scrolls resolve names, descriptions and their real icons',()=>{
 for(const key of ['scroll_escape','scroll_resurrection','bound_scroll_escape']){
  const info=materialInfo(key);assert.ok(info.name&&!info.name.includes('scroll_'));assert.ok(info.description);
  const html=materialIcon(key);assert.match(html,/l2-extra\/icon-etc_scroll_of_(return|resurrection)_i00/);assert.doesNotMatch(html,/sparkle/);
 }
 assert.equal(materialInfo('l2_14222').name,'Forgotten Scroll - Lucky Strike');assert.match(materialInfo('l2_14222').description,/Fortune Seekers/);
});
test('slot textures retain the actual native atlas pixel size and provenance',()=>{
 const source=JSON.parse(fs.readFileSync('webapp/art/l2ui/slots/source.json','utf8'));
 assert.equal(source.length,13);
 for(const row of source){assert.deepEqual(row.region.slice(2),[32,32]);assert.ok(fs.existsSync(`webapp/art/l2ui/slots/${row.name}.webp`));assert.equal(row.pixelSHA256.length,64);}
 for(const slot of ['head','up','down','hands','legs','cloak','shirt','belt','rightHand','leftHand','leftEar','rightEar','necklace','leftRing','rightRing'])assert.match(l2SlotBackground(slot),/\/art\/l2ui\/slots\//);
});
