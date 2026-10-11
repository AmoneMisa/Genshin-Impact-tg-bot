import test from 'node:test';
import assert from 'node:assert/strict';
import {getCraftState,craftEquipmentItem} from '../miniapp/equipment.js';
import {getRecipe} from '../functions/game/equipment/craftItem.js';
import {recipeCard} from '../webapp/equipment.js';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
const makeHero=()=>{
 const s={game:{stats:{lvl:47},effects:[],equipmentStats:{},gameClass:{stats:{}},builds:{palace:{currentLvl:30}},craft:{level:8,exp:0,recipes:[]},inventory:{gold:100000,ironOre:1000,materials:{},equipment:{items:[]},potions:{items:[]}}}};
 changeClass(s,'humanMystic');updateStats(s);return s;
};
test('missing materials offer quick craft only for a learned and currently affordable recipe',()=>{
 const s=makeHero(),sub=getRecipe('recipe:2137');
 Object.assign(s.game.inventory.materials,sub.materials);
 s.game.craft.recipes.push(sub.id);
 let target=getCraftState(s).recipes.find(r=>r.id==='D:weapon:mace');
 const row=target.materials.find(m=>m.key==='l2_1880');assert.equal(row.quickCraft.id,sub.id);
 assert.match(recipeCard(target),/data-recipe-craft="recipe:2137"/);
 const result=craftEquipmentItem(s,sub.id);assert.equal(result.ok,true);assert.ok(result.product);
 for(const key of Object.keys(sub.materials))s.game.inventory.materials[key]=0;
 target=getCraftState(s).recipes.find(r=>r.id==='D:weapon:mace');assert.equal(target.materials.find(m=>m.key==='l2_1880').quickCraft,null);
 const unlearned=makeHero();Object.assign(unlearned.game.inventory.materials,sub.materials);
 assert.equal(getCraftState(unlearned).recipes.find(r=>r.id==='D:weapon:mace').materials.find(m=>m.key==='l2_1880').quickCraft,null);
});
