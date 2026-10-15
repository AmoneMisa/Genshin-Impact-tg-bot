import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVATAR_COSTUME_RIGS} from '../webapp/art/avatar-costume-rigs.js';
import {AVATAR_COSTUME_VARIANTS} from '../webapp/art/avatar-costume-art.js';
import {deformCostumePoint} from '../webapp/avatar-costume-rig.js';
const read=file=>JSON.parse(readFileSync(new URL('../art-source/avatars/kamael-capes/'+file,import.meta.url)));

test('all costume and base Kamael paintings have individually reviewed wing-capes',()=>{
  const jobs=read('jobs.json'),reviews=read('motion.json');
  const rigs=Object.values(AVATAR_COSTUME_RIGS).filter(r=>r.wing);
  assert.equal(jobs.length,AVATAR_COSTUME_VARIANTS.filter(v=>v.race==='kamael').length);
  assert.equal(rigs.length,jobs.length+2);
  for(const job of jobs){
    assert.equal(job.status,'reviewed',job.key);assert.ok(reviews[job.key]);
  }
  for(const rig of rigs){
    const key=rig.poseReview.key,review=rig.capeReview;
    assert.ok(review,key+' cape review');
    const [a,b,c,d]=review.ornament,point=[(a+c)/2,(b+d)/2];
    for(const t of [0,1,2,3,4])assert.deepEqual(deformCostumePoint(...point,rig,t),point,key+' rigid fitting');
    const motion=review.reviewPoints.map(([x,y])=>{
      const values=Array.from({length:30},(_,i)=>deformCostumePoint(x,y,rig,i/4)[0]);
      return (Math.max(...values)-Math.min(...values))*320;
    });
    assert.ok(Math.max(...motion)>.5,key+' hanging cloth must move');
    for(const foot of rig.poseReview.feet)for(const t of [0,2,4])assert.deepEqual(deformCostumePoint(...foot,rig,t),foot,key+' planted foot');
    assert.equal(rig.wing.amplitude,.022,key+' original white wing motion');
  }
});
