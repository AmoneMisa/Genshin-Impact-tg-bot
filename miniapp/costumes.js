import {randomInt} from 'node:crypto';
import {COSTUME_CATALOG} from '../template/costumeCatalog.js';
import {playerRace} from '../functions/game/player/playerRace.js';
import {hasInventoryRoom} from '../functions/game/builds/palaceCapacity.js';
import {makeCostumeItem, costumeDefinition, activeCostume} from '../functions/game/equipment/costumeItems.js';
export {activeCostume};
export const COSTUME_DAY_MS=86400000;
const genderOf=session=>session?.gender === 'female' ? 'female' : 'male';
export function costumePlayer(session,now=Date.now()) {
  return {race:playerRace(session),gender:genderOf(session),costume:activeCostume(session,now)};
}
function give(session,item) {
  session.game ||= {};
  session.game.inventory ||= {};
  session.game.inventory.equipment ||= {items:[]};
  session.game.inventory.equipment.items ||= [];
  session.game.inventory.equipment.items.push(item);
}
export function buyCostume(session,id,now=Date.now()) {
  const c=costumeDefinition(id), inventory=session?.game?.inventory;
  if(!c)return {ok:false,reason:'unknown_item'};
  if(c.gender!==genderOf(session))return {ok:false,reason:'costume_gender'};
  if(!inventory)return {ok:false,reason:'inventory_missing'};
  const coins=Number(inventory.luckCoins??0);
  if(!Number.isSafeInteger(coins)||coins<c.cost)return {ok:false,reason:'not_enough_coins'};
  if(!hasInventoryRoom(session))return {ok:false,reason:'inventory_full'};
  const item=makeCostumeItem(id,{now});
  give(session,item);inventory.luckCoins=coins-c.cost;
  return {ok:true,item:{...c,currency:'luckCoins'},message:`Куплено: ${c.name}. Предмет добавлен в инвентарь.`};
}
export const costumeRewardPool=session=>COSTUME_CATALOG.filter(c=>c.reward&&c.gender===genderOf(session));
export function grantRandomCostume(session,{now=Date.now(),random=randomInt,source='bonus'}={}) {
  if(!hasInventoryRoom(session))return {ok:false,reason:'inventory_full'};
  const pool=costumeRewardPool(session), index=random(0,pool.length), days=random(1,8);
  if(!Number.isInteger(index)||!pool[index]||!Number.isInteger(days)||days<1||days>7)throw new Error('Invalid costume RNG');
  const c=pool[index], item=makeCostumeItem(c.id,{now,days,source});give(session,item);
  return {ok:true,costumeId:c.id,label:c.name,gender:c.gender,amount:1,days,expiresAt:item.expiresAt,uid:item.uid};
}
