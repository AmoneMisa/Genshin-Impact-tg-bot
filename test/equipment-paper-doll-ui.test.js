import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PAPER_DOLL_SLOTS, equippedItemForSlot, renderEquipmentPaperDoll } from '../webapp/equipment-paper-doll.js';

const root=process.cwd();

const canonicalSlots=['head','hands','leftHand','rightHand','legs','leftEar','rightEar','leftRing','rightRing','necklace','up','down','cloak'];

test('paper doll exposes every canonical equipment slot exactly once',()=>{
  const slots=PAPER_DOLL_SLOTS.map(([slot])=>slot);
  assert.equal(slots.length,canonicalSlots.length);
  assert.deepEqual([...slots].sort(),[...canonicalSlots].sort());
  assert.equal(new Set(slots).size,slots.length);
});

test('paper doll resolves occupied slot to the full inventory item visual identity',()=>{
  const full={
    key:'3:abc',name:'Moon Guard',translatedName:'Лунный страж',grade:'S',mainType:'weapon',category:'sword',kind:'twoHandedSword',rarity:'rare',cost:88000,isUsed:true,slots:['leftHand','rightHand'],forgeLevel:7,
    quality:{current:91,max:100},persistence:{current:160,max:190},
  };
  const state={
    equippedSlots:{leftHand:{name:'Moon Guard',translatedName:'Лунный страж',grade:'S',mainType:'weapon',kind:'twoHandedSword',forgeLevel:7},rightHand:{name:'Moon Guard',translatedName:'Лунный страж',grade:'S',mainType:'weapon',kind:'twoHandedSword',forgeLevel:7}},
    items:[{...full,key:'wrong',name:'Other',isUsed:true},full],
  };
  assert.equal(equippedItemForSlot(state,'leftHand'),full);
  assert.equal(equippedItemForSlot(state,'rightHand'),full);
  assert.equal(equippedItemForSlot(state,'head'),null);
});

test('paper doll renders persistent slot targets, empty placeholders and real loot art',()=>{
  const item={key:'0:moon',name:'Moon Crown',translatedName:'Лунная корона',grade:'A',mainType:'armor',category:'helmet',kind:'helmet',rarity:'royal',cost:42000,isUsed:true,slots:['head'],forgeLevel:5,quality:{current:96,max:100},persistence:{current:88,max:90}};
  const state={equippedSlots:{head:{name:item.name,translatedName:item.translatedName,grade:item.grade,mainType:item.mainType,kind:item.kind,forgeLevel:item.forgeLevel}},items:[item]};
  const container={className:'loadout-grid',innerHTML:''};
  renderEquipmentPaperDoll(container,state);
  assert.equal(container.className,'loadout-grid paper-doll-loadout');
  assert.match(container.innerHTML,/data-paper-doll-stage/);
  assert.match(container.innerHTML,/paper-doll-figure/);
  assert.match(container.innerHTML,/data-slot="head"/);
  assert.match(container.innerHTML,/data-item-key="0:moon"/);
  assert.match(container.innerHTML,/forge-etched/);
  assert.match(container.innerHTML,/paper-doll-empty-rune/);
  const slotTargets=[...container.innerHTML.matchAll(/data-slot="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(slotTargets.length,13);
});

test('paper doll is wired before transfer VFX and remains mobile/reduced-motion safe',()=>{
  const index=fs.readFileSync(path.join(root,'webapp/index.html'),'utf8');
  const css=fs.readFileSync(path.join(root,'webapp/equipment-paper-doll.css'),'utf8');
  const equipment=fs.readFileSync(path.join(root,'webapp/equipment.js'),'utf8');
  const transfer=fs.readFileSync(path.join(root,'webapp/equipment-transfer.js'),'utf8');
  const stylesheets=[...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match=>match[1]);
  assert.ok(stylesheets.includes('equipment-paper-doll.css'));
  assert.ok(stylesheets.indexOf('loot-equipment.css')<stylesheets.indexOf('equipment-paper-doll.css'));
  assert.ok(stylesheets.indexOf('equipment-paper-doll.css')<stylesheets.indexOf('equipment-transfer.css'));
  assert.ok(stylesheets.indexOf('equipment-transfer.css')<stylesheets.indexOf('vfx.css'));
  assert.ok(equipment.includes("import { renderEquipmentPaperDoll } from './equipment-paper-doll.js'"));
  assert.ok(equipment.includes('function renderSlots(container,state){renderEquipmentPaperDoll(container,state);}'));
  assert.ok(transfer.includes("querySelectorAll?.('[data-slot]')"));
  assert.ok(css.includes('.paper-doll-stage'));
  assert.ok(css.includes('.paper-doll-figure'));
  assert.ok(css.includes('.paper-doll-slot.equipment-transfer-target'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(max-width:340px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
