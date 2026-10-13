import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateCharacterCurrency,migrateClanCurrency} from '../functions/game/player/currencyMigration.js';
import {claimBonus,getBonusState} from '../miniapp/bonus.js';
import {getGachaState,rollGacha} from '../miniapp/gacha.js';

test('retired currency merges once in wallet, warehouse and mail; grade crystals stay materials',()=>{
 const s={game:{inventory:{crystals:120,moonDew:30,materials:{crystal_D:40}},warehouse:{crystals:10,moonDew:5},mailbox:[{rewards:[{kind:'crystals',amount:7}]}]}};
 assert.equal(migrateCharacterCurrency(s),true);
 assert.deepEqual(s.game.inventory,{moonDew:150,materials:{crystal_D:40}});
 assert.deepEqual(s.game.warehouse,{moonDew:15});
 assert.equal(s.game.mailbox[0].rewards[0].kind,'moonDew');
 assert.equal(migrateCharacterCurrency(s),false);
 const clan={warehouse:{crystals:90,moonDew:10},investigations:{active:{progress:{crystals:3,moonDew:1}}}};
 migrateClanCurrency(clan);migrateClanCurrency(clan);
 assert.equal(clan.warehouse.moonDew,100);assert.equal(clan.investigations.active.progress.moonDew,4);
});
test('wheel routes all probability boundaries and credits only the chosen bounded reward',()=>{
 for(const [roll,name] of [[0,'gold'],[59,'gold'],[60,'moonDew'],[84,'moonDew'],[85,'ironOre'],[99,'ironOre']]){
  const s={game:{bonusChances:1,inventory:{gold:0,moonDew:0,ironOre:0}}};
  const prize=getBonusState(s).prizes.find(p=>p.name===name);let first=true;
  const result=claimBonus(s,{randomInt:(min,max)=>{if(first){first=false;return roll;}return max;}});
  assert.equal(result.prize.name,name);assert.equal(result.prize.amount,prize.maxAmount);
  assert.equal(s.game.inventory[name],prize.maxAmount);assert.equal(s.game.bonusChances,0);
  assert.equal(claimBonus(s).ok,false);
 }
});
test('paid S summons use S crystals and cannot bypass a missing material',()=>{
 const s={game:{stats:{lvl:100},inventory:{gold:1e7,gacha:{items:[]},equipment:{items:[]}},gacha:[{name:'royal',freeSpins:0}]}};
 s.game.gachaDaily={day:new Date().toISOString().slice(0,10),remaining:0};
 const state=getGachaState(s);assert.equal(state.spirals.find(p=>p.id==='royal').paymentMode,'resources_locked');
 assert.equal(rollGacha(s,'royal').ok,false);assert.equal(s.game.inventory.gold,1e7);
});
