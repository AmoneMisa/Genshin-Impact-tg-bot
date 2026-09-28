import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { avatarItemsForState } from '../webapp/equipment-paper-doll.js';
import { avatarVisualProfile, renderPaperDollAvatar } from '../webapp/equipment-paper-doll-avatar.js';
import { lootConditionProfile, lootTone, lootVisualProfile } from '../webapp/loot-renderer.js';
import { forgeVisualProfile } from '../webapp/loot-forge.js';

const root=process.cwd();

function equippedItem(overrides={}){
  return {
    key:'0:gear',name:'Ascendant Blade',translatedName:'Вознесённый клинок',grade:'S',mainType:'weapon',category:'sword',kind:'twoHandedSword',rarity:'rare',cost:92000,isUsed:true,slots:['leftHand','rightHand'],forgeLevel:10,maxForgeLevel:10,
    quality:{current:95,max:100},persistence:{current:86,max:100},
    ...overrides,
  };
}

function snapshot(item){
  return {name:item.name,translatedName:item.translatedName,grade:item.grade,mainType:item.mainType,kind:item.kind,forgeLevel:item.forgeLevel};
}

test('avatar gear reuses loot identity, condition and forge presentation',()=>{
  const item=equippedItem();
  const profile=avatarVisualProfile(item);
  assert.equal(profile.tone,lootTone(item));
  assert.equal(profile.material,lootVisualProfile(item).material);
  assert.equal(profile.ornament,lootVisualProfile(item).ornament);
  assert.equal(profile.wear,lootConditionProfile(item).wear);
  assert.equal(profile.quality,lootConditionProfile(item).quality);
  assert.equal(profile.forgeTier,forgeVisualProfile(item).tier);
  assert.equal(profile.forgeLevel,10);
});

test('paper doll avatar receives full equipped items but ignores tiny jewelry layers',()=>{
  const helmet=equippedItem({key:'1:helm',name:'Moon Crown',grade:'A',mainType:'armor',category:'helmet',kind:'helmet',slots:['head'],forgeLevel:5});
  const armor=equippedItem({key:'2:armor',name:'Moon Plate',grade:'SS',mainType:'armor',category:'armor',kind:'armor',slots:['up'],forgeLevel:7});
  const ring=equippedItem({key:'3:ring',name:'Moon Ring',grade:'SSS',mainType:'accessories',category:'ring',kind:'ring',slots:['leftRing'],forgeLevel:10});
  const state={
    equippedSlots:{head:snapshot(helmet),up:snapshot(armor),leftRing:snapshot(ring)},
    items:[helmet,armor,ring],
  };
  const avatarItems=avatarItemsForState(state);
  assert.equal(avatarItems.head,helmet);
  assert.equal(avatarItems.up,armor);
  assert.equal(Object.hasOwn(avatarItems,'leftRing'),false);
  const markup=renderPaperDollAvatar(avatarItems);
  assert.match(markup,/data-avatar-role="helmet"/);
  assert.match(markup,/data-avatar-role="torso"/);
  assert.doesNotMatch(markup,/avatar-kind-ring/);
});

test('two-handed gear is drawn once while dual wield keeps both weapons',()=>{
  const twoHand=equippedItem();
  const shared=renderPaperDollAvatar({leftHand:twoHand,rightHand:twoHand});
  assert.equal([...shared.matchAll(/data-avatar-role="weapon"/g)].length,1);
  assert.match(shared,/avatar-two-hand/);

  const left=equippedItem({key:'4:left',name:'Left Fang',kind:'oneHandedSword',slots:['leftHand'],forgeLevel:3});
  const right=equippedItem({key:'5:right',name:'Right Fang',kind:'dagger',category:'dagger',slots:['rightHand'],forgeLevel:4});
  const dual=renderPaperDollAvatar({leftHand:left,rightHand:right});
  assert.equal([...dual.matchAll(/data-avatar-role="weapon"/g)].length,2);
  assert.match(dual,/data-avatar-side="left"/);
  assert.match(dual,/data-avatar-side="right"/);
});

test('reactive avatar stylesheet is layered with paper doll and remains motion safe',()=>{
  const index=fs.readFileSync(path.join(root,'webapp/index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/equipment-paper-doll-avatar.css'),'utf8');
  const doll=fs.readFileSync(path.join(root,'webapp/equipment-paper-doll.js'),'utf8');
  const stylesheets=[...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match=>match[1]);
  assert.ok(doll.includes("import { renderPaperDollAvatar } from './equipment-paper-doll-avatar.js'"));
  assert.ok(doll.includes('renderPaperDollAvatar(avatarItems)'));
  assert.ok(stylesheets.indexOf('equipment-paper-doll.css')<stylesheets.indexOf('equipment-paper-doll-avatar.css'));
  assert.ok(stylesheets.indexOf('equipment-paper-doll-avatar.css')<stylesheets.indexOf('equipment-transfer.css'));
  assert.ok(css.includes('.paper-doll-avatar-gear'));
  assert.ok(css.includes('.avatar-wear-critical'));
  assert.ok(css.includes('.avatar-forge-ascendant'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
