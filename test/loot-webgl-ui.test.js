import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { motionForKind, sceneRecipeForKind } from '../webapp/loot-webgl.js';

const root=process.cwd();
const kinds=['sword','dagger','staff','bow','crossbow','hammer','helmet','armor','gloves','greaves','boots','shield','cloak','ring','amulet','relic'];

test('3D loot recipes have real depth and distinct primitive layouts',()=>{
  const signatures=new Set();
  for(const kind of kinds){
    const recipe=sceneRecipeForKind(kind,{variant:2});
    assert.ok(recipe.length>0,`${kind} needs geometry`);
    assert.ok(recipe.some(part=>Number(part.scale?.[2])>.08),`${kind} needs non-zero Z depth`);
    signatures.add(recipe.map(part=>`${part.type}:${part.scale.join(',')}`).join('|'));
  }
  assert.ok(signatures.size>=12,'loot kinds should not collapse into one 3D mesh');
});

test('daily sword length changes actual 3D blade geometry',()=>{
  const small=sceneRecipeForKind('sword',{swordLength:35});
  const large=sceneRecipeForKind('sword',{swordLength:180});
  assert.ok(large[0].scale[1]>small[0].scale[1]);
  assert.equal(small[0].scale[2],large[0].scale[2]);
});

test('3D motion presets preserve item weight semantics',()=>{
  assert.equal(motionForKind('sword'),'spin');
  assert.equal(motionForKind('shield'),'heavy-turn');
  assert.equal(motionForKind('helmet'),'wobble');
  assert.equal(motionForKind('armor'),'float');
  assert.equal(motionForKind('ring'),'orbit');
});

test('WebGL loot runtime uses depth, lighting and bounded scene mounting',()=>{
  const source=fs.readFileSync(path.join(root,'webapp/loot-webgl.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/loot-webgl.css'),'utf8');
  const renderer=fs.readFileSync(path.join(root,'webapp/renderer.js'),'utf8');
  assert.ok(source.includes('gl.enable(gl.DEPTH_TEST)'));
  assert.ok(source.includes('uniform mat4 u_mvp'));
  assert.ok(source.includes('uniform float u_quality'));
  assert.ok(source.includes('uniform float u_wear'));
  assert.ok(source.includes(".loot-art.is-reveal,.daily-sword-art"));
  assert.ok(source.includes("[data-paper-doll-stage]"));
  assert.ok(source.includes('Math.min(window.devicePixelRatio||1,1.6)'));
  assert.ok(source.includes("(prefers-reduced-motion: reduce)"));
  assert.ok(!source.includes(".equipment-loot-preview .loot-art"));
  assert.ok(css.includes('.loot-art.loot-webgl-ready>svg{opacity:0}'));
  assert.ok(css.includes('.paper-avatar-webgl-ready .paper-doll-avatar-gear{opacity:0}'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(renderer.startsWith("import { startLootWebGL } from './loot-webgl.js';"));
  assert.ok(renderer.includes('startLootWebGL();'));
});
