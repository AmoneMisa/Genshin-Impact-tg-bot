import test from 'node:test';
import assert from 'node:assert/strict';
import {AVATAR_COSTUME_VARIANTS} from '../webapp/art/avatar-costume-art.js';
import {AVATAR_COSTUME_RIGS} from '../webapp/art/avatar-costume-rigs.js';
import {deformCostumePoint} from '../webapp/avatar-costume-rig.js';

const ids=['coral-bay-breeze','high-tide-rider'];
test('both beach outfits have six individually fitted animated race variants',()=>{
  for(const id of ids){
    const variants=AVATAR_COSTUME_VARIANTS.filter(v=>v.costumeId===id);
    assert.equal(variants.length,6,id);
    for(const variant of variants){
      const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+variant.key];
      assert.equal(rig.poseReview.key,variant.key);
      assert.equal(rig.eyes.length,2);
      for(const area of rig.poseReview.accessoryAreas){
        const point=[(area[0]+area[2])/2,(area[1]+area[3])/2];
        for(const t of [0,1,2,3,4])assert.deepEqual(deformCostumePoint(...point,rig,t),point,variant.key+' rigid prop');
      }
      // Bare legs remain planted rather than receiving clothing wave fields.
      for(const foot of rig.poseReview.feet)assert.deepEqual(deformCostumePoint(...foot,rig,2),foot);
    }
  }
});
test('the ring in front of Kamael feathers stays rigid while the free wing moves',()=>{
  const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/coral-bay-breeze-kamael-female'];
  for(const point of [[.73,.53],[.80,.65]])for(const t of [0,1,2,3,4])assert.deepEqual(deformCostumePoint(...point,rig,t),point);
  const [x,y]=rig.wing.reviewPoints[0];
  const samples=Array.from({length:30},(_,i)=>deformCostumePoint(x,y,rig,i/4)[0]);
  assert.ok((Math.max(...samples)-Math.min(...samples))*320>1);
});
test('the adult petite dwarf uses adult eyelid proportions',()=>{
  const rig=AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/coral-bay-breeze-dwarf-female'];
  assert.ok(rig.eyes.every(eye=>eye[3]===.0065));
});
