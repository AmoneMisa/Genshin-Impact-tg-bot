import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { motionForKind, sceneRecipeForKind } from '../webapp/loot-webgl-v2.js';

const root=process.cwd();
const kinds=['sword','dagger','staff','bow','crossbow','hammer','helmet','armor','gloves','greaves','boots','shield','cloak','ring','amulet','relic'];

test('refined 3D loot recipes have real depth and distinct primitive layouts',()=>{
  const signatures=new Set();
  for(const kind of kinds){
    const recipe=sceneRecipeForKind(kind,{variant:2});
    assert.ok(recipe.length>0,`${kind} needs geometry`);
    assert.ok(recipe.some(part=>Number(part.scale?.[2])>.08),`${kind} needs non-zero Z depth`);
    signatures.add(recipe.map(part=>`${part.type}:${part.scale.join(',')}`).join('|'));
  }
  assert.ok(signatures.size>=14,'loot kinds should retain distinct refined 3D silhouettes');
});

test('blade shield and armor use shaped meshes instead of only box primitives',()=>{
  const sword=sceneRecipeForKind('sword',{variant:3});
  const shield=sceneRecipeForKind('shield',{variant:2});
  const armor=sceneRecipeForKind('armor',{variant:1});
  assert.ok(sword.some(part=>part.type==='wedge'),'sword needs a real point');
  assert.ok(sword.some(part=>part.type==='bevel'),'sword needs beveled blade volume');
  assert.ok(sword.some(part=>part.type==='cylinder'),'sword grip should be round');
  assert.ok(shield.some(part=>part.type==='bevel')&&shield.some(part=>part.type==='wedge'),'shield needs shaped face and lower point');
  assert.ok(armor.filter(part=>part.type==='bevel').length>=4,'armor should be segmented into plates');
});

test('round objects use low-poly cylindrical geometry',()=>{
  const staff=sceneRecipeForKind('staff',{variant:1});
  const bow=sceneRecipeForKind('bow',{variant:1});
  const ring=sceneRecipeForKind('ring',{variant:1});
  assert.ok(staff.some(part=>part.type==='cylinder'));
  assert.ok(bow.filter(part=>part.type==='cylinder').length>=6);
  assert.ok(ring.filter(part=>part.type==='cylinder').length>=10);
});

test('daily sword length changes actual refined blade geometry',()=>{
  const small=sceneRecipeForKind('sword',{swordLength:35});
  const large=sceneRecipeForKind('sword',{swordLength:180});
  assert.ok(large[0].scale[1]>small[0].scale[1]);
  assert.ok(large[1].position[1]>small[1].position[1]);
  assert.equal(small[0].scale[2],large[0].scale[2]);
});

test('3D motion presets preserve item weight semantics',()=>{
  assert.equal(motionForKind('sword'),'spin');
  assert.equal(motionForKind('shield'),'heavy-turn');
  assert.equal(motionForKind('helmet'),'wobble');
  assert.equal(motionForKind('armor'),'float');
  assert.equal(motionForKind('ring'),'orbit');
});

test('refined WebGL runtime uses depth PBR-like material controls and bounded mounting',()=>{
  const source=fs.readFileSync(path.join(root,'webapp/loot-webgl-v2.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/loot-webgl.css'),'utf8');
  const renderer=fs.readFileSync(path.join(root,'webapp/renderer.js'),'utf8');
  assert.ok(source.includes('gl.enable(gl.DEPTH_TEST)'));
  assert.ok(source.includes('uniform mat4 u_mvp'));
  assert.ok(source.includes('uniform float u_quality'));
  assert.ok(source.includes('uniform float u_wear'));
  assert.ok(source.includes('uniform float u_metallic'));
  assert.ok(source.includes('uniform float u_roughness'));
  assert.ok(source.includes("bevel:meshBuffer(gl,BEVEL)"));
  assert.ok(source.includes("wedge:meshBuffer(gl,WEDGE)"));
  assert.ok(source.includes("cylinder:meshBuffer(gl,CYLINDER)"));
  assert.ok(source.includes(".loot-art.is-reveal,.daily-sword-art"));
  assert.ok(source.includes("[data-paper-doll-stage]"));
  assert.ok(source.includes('Math.min(window.devicePixelRatio||1,1.6)'));
  assert.ok(source.includes("(prefers-reduced-motion: reduce)"));
  assert.ok(!source.includes(".equipment-loot-preview .loot-art"));
  assert.ok(css.includes('.loot-art.loot-webgl-ready>svg{opacity:0}'));
  assert.ok(css.includes('.paper-avatar-webgl-ready .paper-doll-avatar-gear{opacity:0}'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(renderer.startsWith("import { startLootWebGL } from './loot-webgl-v2.js';"));
  assert.ok(renderer.includes('startLootWebGL();'));
});