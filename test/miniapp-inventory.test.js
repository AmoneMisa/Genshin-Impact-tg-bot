import test from 'node:test';
import assert from 'node:assert/strict';
import { discardInventoryItem, getInventoryState, useInventoryPotion } from '../miniapp/inventory.js';
import {performEquipmentAction} from '../miniapp/equipment.js';

function player() {
  return {
    game: {
      equipmentStats: {},
      gameClass: {
        stats: {
          name: 'warrior',
          hp: 1000,
          maxHp: 5000,
          mp: 100,
          maxMp: 400,
        },
        skills: [],
      },
      inventory: {
        gold: 1234,
        crystals: 56,
        ironOre: 78,
        arena: { name: 'Предметы арены', items: [{ tokens: 9 }, { pvpSign: 'bronze' }] },
        equipment: { name: 'Экипировка', items: [{ name: 'Sword' }] },
        gacha: { name: 'Предметы гачи', items: [{ shards: 1 }, { shards: 2 }] },
        potions: {
          name: 'Зелья',
          items: [
            { type: 'hp', bottleType: 'potion', count: 2, power: 1000, name: 'HP 1000', description: '' },
            { type: 'hp', bottleType: 'elixir', count: 1, power: 45, name: 'HP 45%', description: '' },
            { type: 'mp', bottleType: 'potion', count: 1, power: 180, name: 'MP 180', description: '' },
          ],
        },
      },
    },
  };
}

test('inventory state exposes resources, arena items and migrated category counts', () => {
  const session = player();
  const state = getInventoryState(session);

  assert.deepEqual(state.resources, { gold: 1234, ironOre: 78, luckCoins: 0 });
  assert.deepEqual(state.slots, { used: 4, capacity: 80 });
  assert.deepEqual(state.arena, { tokens: 9, pvpSign: 'bronze' });
  assert.deepEqual(state.counts, { equipment: 1, gacha: 2, potions: 4 });
  assert.equal(state.player.hp, 1000);
  assert.equal(state.player.maxHp, 5000);
  assert.equal(state.player.mp, 100);
  assert.equal(state.player.maxMp, 400);
});

test('grade crystals remain items, separate from building currency, including after crystallization',()=>{
  const session=player();
  session.game.inventory.materials={crystal_S:7};
  session.game.inventory.equipment.items=[{uid:'s-weapon',name:'Test S',grade:'S',mainType:'weapon',slots:['rightHand'],cost:10000,stats:[]}];
  const state=getInventoryState(session);
  assert.equal(state.materials.find(row=>row.key==='crystal_S').count,7);
  assert.equal(state.materials.find(row=>row.key==='crystal_S').id,1462);
  assert.equal('crystals' in state.resources,false);
  const result=performEquipmentAction(session,state.equipment[0].key,'crystallize');
  assert.equal(result.ok,true);
  assert.ok(session.game.inventory.materials.crystal_S>7);
  assert.equal(session.game.inventory.crystals,56);
});

test('discard validates quantity and ownership, pays nothing, and rejects stale or worn equipment',()=>{
  const session=player();session.game.inventory.materials={crystal_S:7};
  const initial=getInventoryState(session),potion=initial.potions[0];
  for(const count of [0,-1,1.5,100])assert.equal(discardInventoryItem(session,{kind:'potion',ref:potion.ref,count}).ok,false);
  assert.equal(discardInventoryItem(session,{kind:'material',ref:'gold',count:1}).ok,false);
  assert.equal(discardInventoryItem(session,{kind:'material',ref:'crystal_S',count:2}).ok,true);
  assert.equal(session.game.inventory.materials.crystal_S,5);
  assert.equal(discardInventoryItem(session,{kind:'potion',ref:potion.ref,count:1}).ok,true);
  assert.equal(session.game.inventory.potions.items[0].count,1);
  const item={uid:'test',name:'Test',grade:'D',mainType:'weapon',slots:['rightHand'],stats:[],isUsed:true,cost:999};
  session.game.inventory.equipment.items=[item];
  session.game.equipmentStats.rightHand={...item};
  let key=getInventoryState(session).equipment[0].key;
  assert.equal(discardInventoryItem(session,{kind:'equipment',ref:key}).reason,'item_equipped');
  item.isUsed=false;key=getInventoryState(session).equipment[0].key;
  session.game.equipmentStats={};key=getInventoryState(session).equipment[0].key;
  assert.equal(discardInventoryItem(session,{kind:'equipment',ref:key}).ok,true);
  assert.equal(discardInventoryItem(session,{kind:'equipment',ref:key}).ok,false);
  assert.equal(session.game.inventory.gold,1234);
  assert.equal(session.game.inventory.crystals,56);
});
test('empty potions are hidden without shifting the keys used to drink remaining stacks',()=>{
 const session=player();session.game.inventory.potions.items[0].count=0;
 assert.deepEqual(getInventoryState(session).potions.map(p=>p.key),['1','2']);
 const result=useInventoryPotion(session,'2');assert.equal(result.ok,true);
 assert.equal(session.game.inventory.potions.items[2].count,0);
 assert.deepEqual(result.inventory.potions.map(p=>p.key),['1']);
 session.game.inventory.potions.items[1].count=0;
 assert.deepEqual(getInventoryState(session).potions,[]);
});

test('HP potion queues 15-second healing and decrements only its own stack', () => {
  const session = player();
  const result = useInventoryPotion(session, '0');

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'hp');
  assert.equal(result.healing, 1000);
  assert.equal(session.game.gameClass.stats.hp, 1000);
  assert.equal(session.game.inventory.potions.items[0].count, 1);
});

test('HP elixir queues a percentage of max HP', () => {
  const session = player();
  const result = useInventoryPotion(session, '1');

  assert.equal(result.ok, true);
  assert.equal(result.healing, 2250);
  assert.equal(session.game.gameClass.stats.hp, 1000);
  assert.equal(session.game.inventory.potions.items[1].count, 0);
});

test('MP potion restores MP instead of HP', () => {
  const session = player();
  const result = useInventoryPotion(session, '2');

  assert.equal(result.ok, true);
  assert.equal(result.resource, 'mp');
  assert.equal(result.restored, 180);
  assert.equal(session.game.gameClass.stats.mp, 280);
  assert.equal(session.game.gameClass.stats.hp, 1000);
});

test('inventory rejects invalid, empty, dead and unnecessary potion use without consuming items', () => {
  const session = player();
  assert.equal(useInventoryPotion(session, '99').reason, 'potion_not_found');

  session.game.inventory.potions.items[0].count = 0;
  assert.equal(useInventoryPotion(session, '0').reason, 'potion_empty');

  session.game.inventory.potions.items[0].count = 1;
  session.game.gameClass.stats.hp = 0;
  assert.equal(useInventoryPotion(session, '0').reason, 'player_dead');
  assert.equal(session.game.inventory.potions.items[0].count, 1);

  session.game.gameClass.stats.hp = 5000;
  assert.equal(useInventoryPotion(session, '0').reason, 'hp_full');
  assert.equal(session.game.inventory.potions.items[0].count, 1);

  session.game.gameClass.stats.hp = 1000;
  session.game.gameClass.stats.mp = 400;
  assert.equal(useInventoryPotion(session, '2').reason, 'mp_full');
  assert.equal(session.game.inventory.potions.items[2].count, 1);
});

test('inventory provides appearance and identifies full-body equipment by uid in both slots',()=>{
 const session=player();session.gender='female';
 const robe={uid:'worn-robe',name:'Robe',grade:'D',mainType:'armor',category:'fullBody',kind:'robe',slots:['up','down'],stats:[],cost:1000};
 session.game.inventory.equipment.items=[robe,{...robe,uid:'spare-robe'}];
 session.game.equipmentStats={up:{...robe,isFilled:true},down:{...robe,isFilled:true}};
 const state=getInventoryState(session);
 assert.equal(state.player.className,'warrior');assert.equal(state.player.gender,'female');
 assert.equal(state.equippedSlots.up.uid,'worn-robe');assert.equal(state.equippedSlots.down.uid,'worn-robe');
 assert.equal(state.equipment.find(item=>item.uid==='worn-robe').isUsed,true);
 assert.equal(state.equipment.find(item=>item.uid==='spare-robe').isUsed,false);
});
