import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {l2StyleProfile} from '../scripts/items/l2-style-profile.mjs';
import {CATALOG_ITEM_ART} from '../webapp/art/catalog-item-art.js';
import {L2_HF_ARMOR_SETS,L2_HF_CLOAKS,l2IconUrl} from '../webapp/art/l2-icon-art.js';
test('painted armour uses green backgrounds and every shield uses red, independently of grade',()=>{
 for(const row of CATALOG_ITEM_ART){
  const profile=l2StyleProfile(row.key,row);
  if(row.id.includes(':armor:'))assert.equal(profile.background,'armor',row.id);
  if(row.id.includes(':shield:')||row.id.includes(':weapon:'))assert.equal(profile.background,'weapon',row.id);
 }
 for(const key of ['shield','shield-dragon','shield-seraph','sigil','sigil-nebula'])assert.equal(l2StyleProfile(key).background,'weapon',key);
 for(const key of ['cloak','cloak-dusk','cloak-starfield'])assert.equal(l2StyleProfile(key).group,'Плащи',key);
});
test('High Five gallery includes all imported sets, every part and six raid cloak variants',()=>{
 assert.equal(L2_HF_ARMOR_SETS.length,217);
 for(const name of ['Moirai','Vorpal','Elegia','Dynasty','Vesper'])assert.ok(L2_HF_ARMOR_SETS.some(row=>row.name.includes(name)),name);
 for(const row of L2_HF_ARMOR_SETS){
  assert.ok(row.parts.some(part=>part.slot==='chest'),row.id);
  for(const part of row.parts){assert.ok(l2IconUrl(part.art),`${row.id} ${part.id}`);assert.ok(fs.existsSync(`webapp/art/l2/${part.art}-32.webp`));}
 }
 for(const id of [21716,21717,21718,21719,21720,21721])assert.ok(L2_HF_CLOAKS.some(row=>row.id===id&&l2IconUrl(row.art)),id);
});
