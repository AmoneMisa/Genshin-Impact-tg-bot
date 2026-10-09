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
test('materials keep quality and element tinting and shots cannot become scroll art',()=>{
 assert.deepEqual(materialIconInfo('lifestone_top_S84'),{icon:'lifestone',grade:'S84',quality:'top'});
 assert.match(materialIcon('lifestone_top_S84'),/quality-tint-top/);
 for(const element of ['fire','water','wind','earth','holy','dark'])assert.match(materialIcon('attr_jewel_'+element),new RegExp('element-tint-'+element));
 assert.match(shotIcon('blessed','S84'),/blessed-spiritshot-128.webp/);
 const fallback=paintedIconHtml('../../unknown');
 assert.match(fallback,/<img[^>]+\.webp/);
 assert.doesNotMatch(fallback,/\.\.\/|✦|<svg/);
 assert.equal(materialIconInfo('attr_jewel_invalid'),null);
});
