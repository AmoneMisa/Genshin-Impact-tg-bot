import test from 'node:test';
import assert from 'node:assert/strict';
import defaults from '../functions/getters/getLostFieldsInSession.js';
import {npcCraftRecipes,craftAtNpc} from '../functions/game/equipment/npcCraft.js';
import {craftNpcEquipment} from '../miniapp/equipment.js';
function session(){const s={userId:1,game:{}};defaults(s);s.game.inventory.gold=1000000;s.game.inventory.materials={};s.game.craft={level:1,exp:0,recipes:[]};return s;}
function stock(s,id){const row=npcCraftRecipes(s).find(r=>r.id===id);for(const m of row.materials)s.game.inventory.materials[m.key]=m.need;return row;}
test('NPC offers the 25 High Five recipes with verified fees and output bundles',()=>{
 const s=session(),rows=npcCraftRecipes(s);assert.equal(rows.length,25);
 assert.equal(rows.find(r=>r.id==='npc:1880').gold,2000);
 assert.equal(rows.find(r=>r.id==='npc:1890').gold,13100);
 assert.equal(rows.find(r=>r.id==='npc:1884').amount,20);
 assert.equal(rows.find(r=>r.id==='npc:1895').amount,20);
 assert.equal(rows.filter(r=>r.materials.some(m=>m.maintain)).length,21);
 assert.ok(rows.filter(r=>!r.materials.some(m=>m.maintain)).every(r=>['npc:5551','npc:5552','npc:5553','npc:5554'].includes(r.id)));
});
test('NPC consumes exact ingredients and fee, preserves carried recipe and personal skill/MP',()=>{
 const s=session(),row=stock(s,'npc:1880'),before=structuredClone(s.game);
 const p=craftNpcEquipment(s,row.id);assert.equal(p.ok,true);assert.equal(p.equipment.npcCraft.length,25);
 assert.equal(s.game.inventory.gold,before.inventory.gold-2000);assert.equal(s.game.inventory.materials.l2_1880,1);
 for(const m of row.materials)assert.equal(s.game.inventory.materials[m.key],m.maintain?m.need:0);
 assert.deepEqual(s.game.craft,before.craft);assert.deepEqual(s.game.gameClass,before.gameClass);
 assert.equal(craftAtNpc(s,row.id).reason,'not_enough_materials');
});
test('learned personal recipe does not replace carried NPC recipe; failures are atomic',()=>{
 const s=session(),row=stock(s,'npc:1880');s.game.craft={level:100,exp:0,recipes:['recipe:2137']};delete s.game.inventory.materials.l2_2137;
 let before=structuredClone(s);assert.equal(craftAtNpc(s,row.id).reason,'not_enough_materials');assert.deepEqual(s,before);
 stock(s,row.id);s.game.inventory.gold=1999;before=structuredClone(s);assert.equal(craftAtNpc(s,row.id).reason,'not_enough_gold');assert.deepEqual(s,before);
 assert.equal(craftAtNpc(s,'A:weapon:dagger').reason,'unknown_recipe');assert.deepEqual(s,before);
});
test('full inventory permits replacement of an exhausted ingredient; existing output needs no new slot',()=>{
 const s=session(),row=stock(s,'npc:1884');
 s.game.inventory.materials=Object.fromEntries([...Object.entries(s.game.inventory.materials),...Array.from({length:78},(_,i)=>['dummy'+i,1])]);
 // Make a full bag after accounting for the three ingredient stacks.
 s.game.inventory.materials=Object.fromEntries(Object.entries(s.game.inventory.materials).slice(0,80));
 assert.equal(craftAtNpc(s,row.id).ok,true);assert.equal(s.game.inventory.materials.l2_1884,20);
});
