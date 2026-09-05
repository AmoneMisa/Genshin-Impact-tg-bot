import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { combineRects, matchingLoadoutSlots } from '../webapp/equipment-transfer.js';

const root = process.cwd();

test('equipment transfer resolves actual occupied slots from server state', () => {
  const item = {
    name: 'Moon Guard',
    grade: 'S',
    mainType: 'shield',
    kind: 'shield',
    slots: ['leftHand', 'rightHand'],
  };
  const equipment = {
    equippedSlots: {
      leftHand: { name: 'Other', grade: 'A', mainType: 'weapon', kind: 'sword' },
      rightHand: { name: 'Moon Guard', grade: 'S', mainType: 'shield', kind: 'shield' },
    },
  };
  assert.deepEqual(matchingLoadoutSlots(equipment, item), ['rightHand']);
});

test('multi-slot transfer target uses the combined visual center', () => {
  assert.deepEqual(combineRects([
    { left: 10, top: 20, width: 40, height: 30 },
    { left: 70, top: 30, width: 30, height: 50 },
  ]), {
    left: 10,
    top: 20,
    width: 90,
    height: 60,
    centerX: 55,
    centerY: 50,
  });
  assert.equal(combineRects([]), null);
});

test('equipment UI only plays transfer after successful action state is rendered', () => {
  const equipmentJs = fs.readFileSync(path.join(root, 'webapp/equipment.js'), 'utf8');
  assert.ok(equipmentJs.includes("import { captureEquipmentTransfer, playEquipmentTransfer } from './equipment-transfer.js'"));
  assert.ok(equipmentJs.includes('data-slot="${escapeHtml(slot)}"'));
  assert.ok(equipmentJs.includes("captureEquipmentTransfer(action,item,{list,loadout,equipment})"));
  assert.ok(equipmentJs.includes('equipment=payload.equipment'));
  assert.ok(equipmentJs.includes('renderAll();if(transfer&&payload.item)requestAnimationFrame(()=>playEquipmentTransfer'));
  assert.ok(!equipmentJs.includes('playEquipmentTransfer(transfer,{equipment,list,loadout,item:item}'));
});

test('transfer layer is viewport anchored, non-interactive and reduced-motion safe', () => {
  const css = fs.readFileSync(path.join(root, 'webapp/equipment-transfer.css'), 'utf8');
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^\"]+\.css)"/g)].map((match) => match[1]);
  assert.ok(css.includes('.equipment-transfer-layer{position:fixed'));
  assert.ok(css.includes('pointer-events:none'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(stylesheets.includes('equipment-transfer.css'));
  assert.ok(stylesheets.indexOf('loot-equipment.css') < stylesheets.indexOf('equipment-transfer.css'));
  assert.ok(stylesheets.indexOf('equipment-transfer.css') < stylesheets.indexOf('vfx.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
});
