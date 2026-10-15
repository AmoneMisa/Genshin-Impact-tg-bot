import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVATAR_COSTUME_VARIANTS} from '../webapp/art/avatar-costume-art.js';
import {AVATAR_COSTUME_RIGS} from '../webapp/art/avatar-costume-rigs.js';
import {avatarCostumeIconUrl} from '../webapp/art/avatar-costume-icons.js';
import {deformCostumePoint} from '../webapp/avatar-costume-rig.js';
const ids=JSON.parse(readFileSync(new URL('../art-source/avatars/collections/city-halloween-theme-ids.json',import.meta.url)));
const hidden=new Set(['last-bell-reaper','hollow-lantern-rider']);

test('all nine city and Halloween designs have six races, English names, icons and individual motion',()=>{
  assert.equal(ids.length,9);
  for(const id of ids){
    const variants=AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id);
    assert.equal(variants.length,6,id);assert.equal(new Set(variants.map(v=>v.race)).size,6,id);
    assert.ok(avatarCostumeIconUrl(id));
    for(const variant of variants){
      assert.match(variant.name,/^[A-Za-z -]+$/);
      const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+variant.key];
      assert.equal(rig.poseReview.key,variant.key);
      assert.equal(rig.eyes.length,hidden.has(id)?0:2,variant.key);
      if(hidden.has(id))assert.ok(rig.noVisibleEyes,variant.key+' explicitly reviewed concealed face');
      if(id==='hollow-lantern-rider')assert.deepEqual(rig.hair,[],variant.key+' headless costume must not invent hair');
      assert.equal(Boolean(rig.wing),variant.race==='kamael');
      for(const foot of rig.poseReview.feet)for(const t of [0,2,4])assert.deepEqual(deformCostumePoint(...foot,rig,t),foot);
    }
  }
});

test('pumpkin headpieces and steampunk notebooks stay rigid during body and wing motion',()=>{
  for(const id of ['hollow-lantern-rider','brass-meridian']){
    for(const variant of AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id)){
      const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+variant.key];
      const prop=rig.poseReview.accessoryAreas[0];assert.ok(prop,variant.key);
      const point=[(prop[0]+prop[2])/2,(prop[1]+prop[3])/2];
      for(const t of [0,1,2,3,4])assert.deepEqual(deformCostumePoint(...point,rig,t),point,variant.key);
    }
  }
});
