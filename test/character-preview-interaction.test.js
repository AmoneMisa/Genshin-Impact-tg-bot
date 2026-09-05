import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  characterDragRotation,
  characterFocusForSlot,
  characterReturnRotation,
} from '../webapp/loot-webgl-v4.js';

const root=process.cwd();

test('equipment slots map to deterministic 3D camera focus presets',()=>{
  const head=characterFocusForSlot('head');
  const torso=characterFocusForSlot('up');
  const leftHand=characterFocusForSlot('leftHand');
  const rightHand=characterFocusForSlot('rightHand');
  const legs=characterFocusForSlot('legs');
  const fallback=characterFocusForSlot('unknown-slot');
  assert.ok(head.camera<torso.camera,'head focus should zoom closer than torso');
  assert.ok(head.position[1]<torso.position[1],'head focus should pan character downward');
  assert.ok(leftHand.position[0]>0&&rightHand.position[0]<0,'hand focus should center the selected side');
  assert.ok(leftHand.yaw>0&&rightHand.yaw<0,'hand focus should turn toward the selected side');
  assert.ok(legs.position[1]>0,'leg focus should pan lower body upward');
  assert.deepEqual(fallback,{position:[0,0,0],camera:6.25,yaw:0});
});

test('drag rotation is bounded and touch keeps vertical scrolling free',()=>{
  const mouse=characterDragRotation({yaw:0,pitch:0},100,40,'mouse');
  assert.ok(mouse.yaw>0);
  assert.ok(mouse.pitch>0);
  const touch=characterDragRotation({yaw:0,pitch:.12},80,80,'touch');
  assert.equal(touch.pitch,.12,'touch drag must not consume vertical pitch while pan-y is available');
  const bounded=characterDragRotation({yaw:1.4,pitch:.19},500,500,'mouse');
  assert.equal(bounded.yaw,1.45);
  assert.equal(bounded.pitch,.20);
});

test('manual orbit decays toward the focused stance after inactivity',()=>{
  const start={yaw:.9,pitch:-.2};
  const next=characterReturnRotation(start,.1);
  assert.ok(Math.abs(next.yaw)<Math.abs(start.yaw));
  assert.ok(Math.abs(next.pitch)<Math.abs(start.pitch));
  assert.deepEqual(characterReturnRotation({yaw:0,pitch:0},.5),{yaw:0,pitch:0});
});

test('interactive runtime uses real WebGL root transforms and cleans listeners',()=>{
  const source=fs.readFileSync(path.join(root,'webapp/loot-webgl-v4.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/loot-webgl.css'),'utf8');
  const renderer=fs.readFileSync(path.join(root,'webapp/renderer.js'),'utf8');
  assert.ok(source.startsWith("import { motionForKind, sceneRecipeForKind } from './loot-webgl-v2.js';"));
  assert.ok(source.includes("import { characterIdleTransform, characterPoseForLoadout } from './loot-webgl-v3.js';"));
  assert.ok(source.includes("figure?.addEventListener('pointerdown',down)"));
  assert.ok(source.includes("figure?.addEventListener('pointermove',move)"));
  assert.ok(source.includes("stage.addEventListener('click',click)"));
  assert.ok(source.includes("interaction.currentFocus.camera"));
  assert.ok(source.includes("interaction.currentFocus.yaw+interaction.manual.yaw"));
  assert.ok(source.includes("scene.destroy?.()"));
  assert.ok(source.includes("(prefers-reduced-motion: reduce)"));
  assert.ok(!source.includes(".equipment-loot-preview .loot-art"));
  assert.ok(css.includes('pointer-events:auto;cursor:grab;touch-action:pan-y'));
  assert.ok(css.includes('.paper-doll-slot.preview-focused'));
  assert.ok(renderer.startsWith("import { startLootWebGL } from './loot-webgl-v4.js';"));
});
