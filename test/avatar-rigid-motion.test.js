import test from 'node:test';
import assert from 'node:assert/strict';
import {AVATAR_COSTUME_RIGS} from '../webapp/art/avatar-costume-rigs.js';
import {deformCostumePoint,rigidArmWeight,wingWeight} from '../webapp/avatar-costume-rig.js';

for(const key of ['/art/avatars/races/v3/dwarf-female','/art/avatars/races/v2/elf-female']){
  const rig=AVATAR_COSTUME_RIGS[key];
  test(key+' preserves arm shape and holds knees and feet still',()=>{
    assert.equal(rig.regions,undefined);
    for(const arm of rig.arms){
      const [px,py,hx,hy]=arm;
      const a=[px+(hx-px)*.65,py+(hy-py)*.65],b=[hx,hy];
      assert.equal(rigidArmWeight(...a,arm),1);assert.equal(rigidArmWeight(...b,arm),1);
      const length=Math.hypot(a[0]-b[0],(a[1]-b[1])*1.5);
      for(const time of [0,1.5,3,4.5]){
        const x=deformCostumePoint(...a,rig,time),y=deformCostumePoint(...b,rig,time);
        assert.ok(Math.abs(Math.hypot(x[0]-y[0],(x[1]-y[1])*1.5)-length)<1e-7);
      }
    }
    const [x0,y0,x1,y1]=rig.fixedAreas[0];
    for(const point of [[(x0+x1)/2,(y0+y1)/2],[(x0+x1)/2,.93]])for(const t of [0,1.5,3,4.5])assert.deepEqual(deformCostumePoint(...point,rig,t),point);
  });
}

test('elf waist, fitted bodice and costume attachment points stay stable',()=>{
  const rig=AVATAR_COSTUME_RIGS['/art/avatars/races/v2/elf-female'];
  for(const point of [[.45,.31],[.50,.34],[.55,.39],[.46,.44],[.57,.48]]){
    for(let i=0;i<72;i++)assert.deepEqual(deformCostumePoint(...point,rig,i/12),point);
  }
  const hem=[.80,.71];
  const positions=Array.from({length:72},(_,i)=>deformCostumePoint(...hem,rig,i/12));
  assert.ok(Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0]))>.01,'Loose hem should still move');
});

test('all costumes keep the fitted chest stable and have quiet breathing',()=>{
  for(const [key,rig]of Object.entries(AVATAR_COSTUME_RIGS)){
    assert.equal(rig.breathStrength,.7,key);
    const [cx,cy]=rig.face;
    const point=key.endsWith('dwarf-female')?[cx,.45]:[cx,cy+.22];
    for(let i=0;i<48;i++){
      const moved=deformCostumePoint(...point,rig,i/8);
      assert.ok(Math.hypot((moved[0]-point[0])*320,(moved[1]-point[1])*480)<.5,key+' chest must stay within half a display pixel');
    }
  }
});

test('all 39 Kamael wings rotate at the root and other races have no wing',()=>{
  let count=0;
  for(const [key,rig]of Object.entries(AVATAR_COSTUME_RIGS)){
    assert.equal(Boolean(rig.wing),key.includes('kamael'),key);
    if(!rig.wing)continue;
    count++;
    const wing=rig.wing,[px,py]=wing.pivot;
    assert.equal(wingWeight(px,py,wing),0);
    const a=[.90,py+.17],b=[.92,py+.20];
    assert.equal(wingWeight(...a,wing),1);assert.equal(wingWeight(...b,wing),1);
    const first=deformCostumePoint(...a,rig,0),second=deformCostumePoint(...a,rig,wing.period/4);
    assert.ok(Math.hypot((first[0]-second[0])*320,(first[1]-second[1])*480)>1.5,key+' wing must visibly move');
    const length=Math.hypot(a[0]-b[0],(a[1]-b[1])*1.5);
    const ra=deformCostumePoint(...a,rig,2),rb=deformCostumePoint(...b,rig,2);
    assert.ok(Math.abs(Math.hypot(ra[0]-rb[0],(ra[1]-rb[1])*1.5)-length)<1e-7,key+' wing should preserve shape');
  }
  assert.equal(count,39);
});

test('every painting has individual pose data, planted feet and rigid free forearms',()=>{
  let count=0,arms=0;
  for(const [key,rig]of Object.entries(AVATAR_COSTUME_RIGS)){
    assert.ok(rig.poseReview.key,key);
    if(key.includes('/collections/'))assert.equal(rig.poseReview.key,key.split('/').at(-1),key);
    assert.equal(rig.poseReview.index,count++);
    for(const point of rig.poseReview.feet)for(const t of [0,1.5,3,4.5])assert.deepEqual(deformCostumePoint(...point,rig,t),point,key);
    for(const arm of rig.arms){
      arms++;
      const [px,py,hx,hy]=arm;
      const a=[px+(hx-px)*.65,py+(hy-py)*.65],b=[hx,hy];
      const length=Math.hypot(a[0]-b[0],(a[1]-b[1])*1.5);
      for(const t of [0,1.5,3,4.5]){
        const x=deformCostumePoint(...a,rig,t),y=deformCostumePoint(...b,rig,t);
        assert.ok(Math.abs(Math.hypot(x[0]-y[0],(x[1]-y[1])*1.5)-length)<.0001,key);
      }
    }
    for(const [x0,y0,x1,y1]of rig.poseReview.accessoryAreas){
      const point=[(x0+x1)/2,(y0+y1)/2];
      for(const t of [0,1.5,3,4.5])assert.deepEqual(deformCostumePoint(...point,rig,t),point,key+' accessory');
    }
  }
  assert.equal(count,234);assert.equal(arms,291);
});
