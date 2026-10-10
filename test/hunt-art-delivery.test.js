import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zones from '../template/huntingTemplate.js';
import {HUNT_MOB_ART,huntMobUrl,huntZoneUrl} from '../webapp/art/hunt-art.js';
import {materialIcon,materialIconInfo} from '../webapp/material-icons.js';
import {shotIcon,paintedIconHtml} from '../webapp/art/painted-icon-art.js';
test('every real hunting enemy and zone resolves to published mobile paintings',()=>{
 const ids=new Set();
 for(const zone of zones){assert.ok(fs.existsSync('webapp'+huntZoneUrl(zone)));for(const mob of zone.mobs){ids.add(mob.id);for(const size of [128,256])assert.ok(fs.existsSync('webapp'+huntMobUrl(mob,size)),mob.name);}}
 assert.equal(ids.size,200);assert.equal(HUNT_MOB_ART.length,12);
 assert.equal(huntMobUrl({id:'../../unknown'}),null);
 const insect=JSON.parse(fs.readFileSync('art-source/hunt-ui/jobs.json')).find(j=>j.key==='mob-insect');
 assert.match(insect.prompt,/beetle/);assert.match(insect.prompt,/no spider/);
 assert.equal(fs.existsSync('webapp/art/hunt/mobs/spider-128.webp'),false);
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
