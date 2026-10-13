import {SOUL_COLORS,soulCrystalKey,SOUL_MAX_STAGE} from '../../../template/soulCrystalData.js';
import {getMaterialCount,addMaterial} from '../player/materials.js';
import {hasInventoryRoom} from '../builds/palaceCapacity.js';

// Q00350 Enhance Your Weapon (High Five). Academy is the agreed quest giver.
export function soulCrystalQuestState(session) {
    const active=Boolean(session?.game?.soulCrystalQuest?.startedAt);
    return {id:350,title:'Улучшение оружия',active,minLevel:40,canStart:!active&&Number(session?.game?.stats?.lvl)>=40};
}
export function soulCrystalCount(session) {
    return Object.keys(SOUL_COLORS).reduce((sum,color)=>sum+Array.from({length:SOUL_MAX_STAGE+1},(_,stage)=>getMaterialCount(session,soulCrystalKey(color,stage))).reduce((a,b)=>a+b,0),0);
}
export function startSoulCrystalQuest(session,color='red',now=Date.now()) {
    const quest=soulCrystalQuestState(session);
    if(quest.active)return {ok:false,reason:'already_active'};
    if(!quest.canStart)return {ok:false,reason:'soul_level'};
    if(!Object.hasOwn(SOUL_COLORS,color))return {ok:false,reason:'no_soul_crystal'};
    const starter=soulCrystalCount(session)===0;
    if(starter&&!hasInventoryRoom(session,1))return {ok:false,reason:'inventory_full'};
    session.game.soulCrystalQuest={startedAt:now,questId:350};
    if(starter){addMaterial(session,soulCrystalKey(color,0),1);session.game.soulCrystal={color,stage:0};}
    return {ok:true,quest:soulCrystalQuestState(session)};
}
export function activeSoulCrystalQuestSummary(session) {
    if(!soulCrystalQuestState(session).active)return null;
    return {title:'Улучшение оружия',kind:'soul',goal:'Прокачивайте единственный кристалл души на подходящих монстрах',progress:'',navigation:{feature:'hunt'}};
}
