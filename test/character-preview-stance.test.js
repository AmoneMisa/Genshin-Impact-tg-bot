import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { characterIdleTransform, characterPoseForLoadout } from '../webapp/loot-webgl-v3.js';

const root=process.cwd();

test('character preview selects stance from equipped weapon kinds',()=>{
  assert.equal(characterPoseForLoadout({}),'neutral');
  assert.equal(characterPoseForLoadout({rightKind:'sword'}),'one-hand');
  assert.equal(characterPoseForLoadout({leftKind:'shield',rightKind:'sword'}),'guard');
  assert.equal(characterPoseForLoadout({leftKind:'dagger',rightKind:'sword'}),'dual');
  assert.equal(characterPoseForLoadout({leftKind:'bow',rightKind:'bow',twoHanded:true}),'ranged');
  assert.equal(characterPoseForLoadout({leftKind:'crossbow'}),'ranged');
  assert.equal(characterPoseForLoadout({rightKind:'staff'}),'caster');
  assert.equal(characterPoseForLoadout({leftKind:'sword',rightKind:'sword',twoHanded:true}),'two-hand');
});

test('idle motion is subtle bounded breathing and weight shift',()=>{
  for(const pose of ['neutral','one-hand','guard','dual','ranged','caster','two-hand']){
    const a=characterIdleTransform(pose,0);
    const b=characterIdleTransform(pose,1.25);
    assert.equal(a.position.length,3);
    assert.equal(a.rotation.length,3);
    assert.equal(a.scale.length,3);
    assert.ok(Math.abs(b.position[0])<.02);
    assert.ok(Math.abs(b.position[1])<.01);
    assert.ok(b.scale[0]>.99&&b.scale[0]<1.01);
    assert.ok(b.scale[1]>.98&&b.scale[1]<1.02);
  }
  assert.notDeepEqual(characterIdleTransform('guard',1),characterIdleTransform('ranged',1));
});

test('stance-aware runtime keeps one bounded paper-doll scene and existing fallbacks',()=>{
  const source=fs.readFileSync(path.join(root,'webapp/loot-webgl-v3.js'),'utf8');
  const renderer=fs.readFileSync(path.join(root,'webapp/renderer.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/loot-webgl.css'),'utf8');
  assert.ok(source.startsWith("import { motionForKind, sceneRecipeForKind } from './loot-webgl-v2.js';"));
  assert.ok(source.includes(".paper-avatar-piece[data-avatar-role=\"weapon\"]"));
  assert.ok(source.includes('stage.dataset.avatarPose=avatar.pose'));
  assert.ok(source.includes('rootScale=idle.scale')||source.includes('rootScale:idle.scale'));
  assert.ok(source.includes(".loot-art.is-reveal,.daily-sword-art"));
  assert.ok(source.includes("[data-paper-doll-stage]"));
  assert.ok(!source.includes(".equipment-loot-preview .loot-art"));
  assert.ok(source.includes("(prefers-reduced-motion: reduce)"));
  assert.ok(renderer.startsWith("import { startLootWebGL } from './loot-webgl-v4.js';"));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});

test('character body is articulated into torso waist pelvis limbs and feet',()=>{
  const source=fs.readFileSync(path.join(root,'webapp/loot-webgl-v3.js'),'utf8');
  assert.ok(source.includes("function armRecipe(side,stance,profile)"));
  assert.ok(source.includes("primitive('cylinder',[-.25,-.67,.01]"));
  assert.ok(source.includes("primitive('bevel',[-.28,-1.72,.25]"));
  assert.ok(source.includes("stance.pose==='ranged'"));
  assert.ok(source.includes("stance.pose==='guard'"));
  assert.ok(source.includes("stance.pose==='dual'"));
  assert.ok(source.includes("stance.pose==='two-hand'"));
});