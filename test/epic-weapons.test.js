import test from 'node:test';
import assert from 'node:assert/strict';
import {getCatalog,canClassUse} from '../functions/game/equipment/catalog.js';
import {rollEpicWeapon,getEpicTemplate} from '../functions/game/boss/epicBosses.js';
import {itemArtKey} from '../webapp/art/items-art.js';
import {SPECIAL_ITEM_ART} from '../webapp/art/special-item-art.js';

test('fourteen epic weapons cover eight existing kinds without increasing S84 power',()=>{
 const catalogue=getCatalog(),weapons=catalogue.filter(i=>i.epicWeapon);
 assert.equal(weapons.length,14);assert.equal(new Set(weapons.map(i=>i.kind)).size,8);
 for(const weapon of weapons){
  const base=catalogue.find(i=>i.id===`S84:weapon:${weapon.kind}`);
  assert.deepEqual(weapon.stats,base.stats);
  assert.deepEqual(weapon.classOwner,base.classOwner);
  if(SPECIAL_ITEM_ART.includes('epic-weapon-'+weapon.epicWeapon))assert.equal(itemArtKey('sword',weapon),'epic-weapon-'+weapon.epicWeapon);
 }
});
test('epic weapon roll excludes low-level, inactive and incompatible participants',()=>{
 const boss=getEpicTemplate('queenAnt');
 const item=getCatalog().find(i=>i.epicWeapon&&i.raidBoss===boss.name);
 const className=['warrior','mage','assassin','archer','paladin'].find(name=>canClassUse(name,item));
 const fighter={id:7,damage:100,level:84,className};
 assert.equal(rollEpicWeapon(boss,[{...fighter,level:83}],()=>0),null);
 assert.equal(rollEpicWeapon(boss,[{...fighter,damage:0}],()=>0),null);
 assert.equal(rollEpicWeapon(boss,[fighter],()=>0.1),null);
 const win=rollEpicWeapon(boss,[fighter],()=>0);
 assert.equal(win.id,7);assert.equal(win.item.epicWeapon,item.epicWeapon);
 const incompatible=['warrior','mage','assassin','archer','paladin'].find(name=>getCatalog().filter(i=>i.epicWeapon&&i.raidBoss===boss.name).every(i=>!canClassUse(name,i)));
 assert.equal(rollEpicWeapon(boss,[{...fighter,className:incompatible}],()=>0),null);
});
