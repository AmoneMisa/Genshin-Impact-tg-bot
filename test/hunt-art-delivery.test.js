import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getZones} from '../functions/game/hunt/huntMobs.js';
import {huntMobUrl,huntZoneUrl} from '../webapp/art/hunt-art.js';
import sources from '../webapp/art/npcs/l2/source.js';
import {materialIcon,materialIconInfo} from '../webapp/material-icons.js';
import {shotIcon,paintedIconHtml} from '../webapp/art/painted-icon-art.js';
test('hunting NPCs resolve by exact source ID to original mobile screenshots or an explicit missing entry',()=>{
 const ids=new Set();
 const missing=new Set(sources.missing.map(m=>m.id));
 for(const zone of getZones()){assert.ok(fs.existsSync('webapp'+huntZoneUrl(zone)));for(const mob of zone.mobs){
  ids.add(mob.id);const asset=sources.assets[mob.id];
  if(!asset){assert.ok(missing.has(mob.id),mob.name);assert.equal(huntMobUrl(mob),null);continue;}
  assert.equal(asset.name,mob.name);assert.match(asset.sha256,/^[a-f0-9]{64}$/);
  for(const size of [128,256]){const url=huntMobUrl(mob,size);assert.equal(url,`/art/npcs/l2/${mob.id}-${size}.webp`);assert.ok(fs.existsSync('webapp'+url),mob.name);assert.equal(huntMobUrl({mobId:mob.id},size),url);}
 }}
 assert.ok(ids.size>1000);
 assert.equal(huntMobUrl({id:'../../unknown'}),null);
 assert.equal(huntMobUrl({id:'unavailable',role:'Воин'}),null,'no approximate role portrait for a missing NPC');
 assert.equal(huntMobUrl({id:'20006',name:'Different display name'}),huntMobUrl({id:'20006'}),'names cannot change identity');
});
test('materials keep original quality and element art and shots cannot become scroll art',()=>{
 assert.deepEqual(materialIconInfo('lifestone_top_S84'),{icon:'lifestone',grade:'S84',quality:'top'});
 assert.match(materialIcon('lifestone_top_S84'),/etc_mineral_unique_i03-128.webp/);
 const jewels=['fire','water','wind','earth','holy','dark'].map(element=>materialIcon('attr_jewel_'+element));
 assert.equal(new Set(jewels).size,6);
 for(const jewel of jewels){assert.match(jewel,/art\/l2\//);assert.doesNotMatch(jewel,/hue-rotate|element-tint/);}
 assert.match(shotIcon('blessed','S84'),/etc_spell_shot_gold_i01-128.webp/);
 const fallback=paintedIconHtml('../../unknown');
 assert.match(fallback,/<img[^>]+\.webp/);
 assert.doesNotMatch(fallback,/\.\.\/|✦|<svg/);
 assert.equal(materialIconInfo('attr_jewel_invalid'),null);
});
