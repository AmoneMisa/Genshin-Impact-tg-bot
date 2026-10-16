import {CP_POTIONS,useCpPotion} from '../functions/game/player/cpPotions.js';
import {potionBarDto} from './boss.js';
import {useInventoryPotion} from './inventory.js';
import getCurrentHp from '../functions/game/player/getters/getCurrentHp.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getCurrentMp from '../functions/game/player/getters/getCurrentMp.js';
import getMaxMp from '../functions/game/player/getters/getMaxMp.js';
import getCurrentCp from '../functions/game/player/getters/getCurrentCp.js';
import getMaxCp from '../functions/game/player/getters/getMaxCp.js';

const SLOTS=['cp-small','cp','hp','mp'];
export function huntSuppliesDto(session){
 const settings=session.game.huntSupplies||{},potions=potionBarDto(session);
 const rows=CP_POTIONS.map(p=>({...p,key:p.id,count:Number(session.game.inventory?.materials?.[p.id])||0}));
 for(const type of ['hp','mp']){
  const candidates=potions.filter(p=>p.type===type&&p.bottleType!=='elixir');
  const owned=candidates.filter(p=>p.count>0).sort((a,b)=>b.power-a.power);
  const p=owned[0]||candidates[0];
  if(p)rows.push({...p,slot:type});
 }
 return {enabled:settings.enabled===true,threshold:settings.threshold||70,rows:rows.map(p=>({...p,auto:settings.slots?.[p.slot]===true}))};
}
export function setHuntSupplies(session,body){
 if(body.enabled!==undefined&&typeof body.enabled!=='boolean'||body.active!==undefined&&typeof body.active!=='boolean')return {ok:false,reason:'invalid_supplies'};
 if(body.slot!==undefined&&!SLOTS.includes(body.slot))return {ok:false,reason:'invalid_supplies'};
 if(body.threshold!==undefined&&(!Number.isInteger(body.threshold)||body.threshold<1||body.threshold>99))return {ok:false,reason:'invalid_supplies'};
 const settings=session.game.huntSupplies||={enabled:false,threshold:70,slots:{}};
 if(body.enabled!==undefined)settings.enabled=body.enabled;
 if(body.threshold!==undefined)settings.threshold=body.threshold;
 if(body.slot!==undefined)(settings.slots||={})[body.slot]=body.active===true;
 return {ok:true};
}
export function advanceAutoSupplies(session,now=Date.now()){
 const field=session.game.hunt?.field,settings=session.game.huntSupplies;
 if(!settings?.enabled||!field||now-(field.seenAt||0)>5000||getCurrentHp(session)<=0)return false;
 const values={hp:[getCurrentHp(session),getMaxHp(session)],mp:[getCurrentMp(session),getMaxMp(session)],cp:[getCurrentCp(session),getMaxCp(session)]};
 let changed=false;
 for(const row of huntSuppliesDto(session).rows){
  const [value,max]=values[row.type];
  if(!row.auto||!row.count||max<=0||value/max*100>=settings.threshold)continue;
  if(row.type==='hp'&&session.game.hpPotion)continue;
  if((settings.readyAt?.[row.slot]||0)>now)continue;
  const result=row.type==='cp'?useCpPotion(session,row.id,now):useInventoryPotion(session,row.key);
  if(result.ok){(settings.readyAt||={})[row.slot]=now+(row.reuseMs||1000);changed=true;
   values[row.type][0]=row.type==='cp'?getCurrentCp(session):row.type==='mp'?getCurrentMp(session):getCurrentHp(session);
  }
 }
 return changed;
}
