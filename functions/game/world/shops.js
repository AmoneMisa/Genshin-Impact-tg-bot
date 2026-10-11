import {spendMaterials,addMaterial,getMaterialCount} from '../player/materials.js';
import {normalizeArenaInventory,spendArenaTokens} from '../arena/arenaInventory.js';
import {PVP_CONVERSIONS} from '../../../template/l2PvpConversions.js';
import {saDefinition} from '../equipment/soulCrystals.js';
import {isActuallyEquipped,syncEquippedSnapshot} from '../equipment/snapshots.js';
import {enchantSkill,getSkillEnchantCost,getSkillEnchantLevel} from '../player/skillEnchant.js';
import {getCatalog,instantiate} from '../equipment/catalog.js';
import {hasInventoryRoom} from '../builds/palaceCapacity.js';
const ARENA_SHOP=[{id:'scroll_S',name:'Свиток заточки S',tokens:10,key:'scroll_S'},{id:'blessed_S',name:'Благословенный свиток S',tokens:80,key:'blessed_S'},{id:'mastery',name:"Giant’s Codex — Mastery",tokens:100,key:'l2_9627'}];
const itemName=item=>item.mainType==='weapon'&&item.sa?`${item.name} - ${saDefinition(item)?.label||''}`:item.name;
export function pvpConversion(item){return PVP_CONVERSIONS.find(p=>p.name===itemName(item))||null;}
export function worldShopState(session){const inventory=session.game.inventory;return {arena:ARENA_SHOP,tokens:normalizeArenaInventory(session.game).tokens,epaulets:getMaterialCount(session,'l2_9912'),fame:Number(inventory.fame)||0,mastery:{epaulets:1800,gold:1800000},cloaks:getCatalog().filter(i=>i.cloak&&getMaterialCount(session,'l2_'+i.lineage.itemId)>0).map(i=>({id:i.lineage.itemId,name:i.name})),pvpOwned:(inventory.equipment?.items||[]).filter(i=>i.pvp).map(i=>({uid:i.uid,name:i.name})),pvp:(inventory.equipment?.items||[]).filter(i=>!i.pvp&&pvpConversion(i)).map(i=>({uid:i.uid,name:i.name,...pvpConversion(i)})),safeSkills:(session.game.gameClass?.skills||[]).filter(s=>getSkillEnchantCost(s)).map(s=>({slot:s.slot,name:s.name,level:getSkillEnchantLevel(s)}))};}
export function worldShopAction(session,body,now=Date.now(),{random=Math.random}={}){
    const inv=session.game.inventory;
    if(body.action==='shop_mastery'){
        if((inv.gold||0)<1800000)return {ok:false,reason:'not_enough_gold'};
        if(!spendMaterials(session,{l2_9912:1800}))return {ok:false,reason:'no_epaulets'};
        inv.gold-=1800000;addMaterial(session,'l2_9627',1);return {ok:true};
    }
    if(body.action==='shop_arena'){
        const row=ARENA_SHOP.find(r=>r.id===body.item);if(!row)return {ok:false,reason:'unknown_item'};
        if(!spendArenaTokens(session.game,row.tokens))return {ok:false,reason:'not_enough_tokens'};addMaterial(session,row.key,1);return {ok:true};
    }
    if(body.action==='shop_pvp'){
        const item=inv.equipment?.items?.find(i=>i.uid===body.uid),conversion=item&&pvpConversion(item);
        if(!item||!conversion||item.pvp||item.timed||item.sealed||item.augment||isActuallyEquipped(session,item))return {ok:false,reason:'pvp_item_ineligible'};
        if((Number(inv.fame)||0)<conversion.fame||(inv.gold||0)<conversion.gold)return {ok:false,reason:'no_fame_or_gold'};
        inv.fame-=conversion.fame;inv.gold-=conversion.gold;item.pvp={from:conversion.from,to:conversion.to,skills:conversion.skills,previousTrade:{noTrade:item.noTrade,tradeable:item.tradeable}};item.noTrade=true;item.tradeable=false;syncEquippedSnapshot(session,item);return {ok:true};
    }
    if(body.action==='shop_pvp_remove'){
        const item=inv.equipment?.items?.find(i=>i.uid===body.uid);if(!item?.pvp||isActuallyEquipped(session,item))return {ok:false,reason:'pvp_item_ineligible'};
        const previous=item.pvp.previousTrade;delete item.pvp;if(previous){item.noTrade=previous.noTrade;item.tradeable=previous.tradeable;}else{delete item.noTrade;item.tradeable=true;}return {ok:true};
    }
    if(body.action==='shop_safe_skill'){
        const skill=session.game.gameClass?.skills?.find(s=>s.slot===Number(body.slot));
        if(!skill||!getSkillEnchantCost(skill))return {ok:false,reason:'invalid_skill'};
        if(getMaterialCount(session,'l2_9627')<1)return {ok:false,reason:'no_mastery'};
        return enchantSkill(skill,inv,{safe:true,random});
    }
    if(body.action==='shop_cloak'){
        const definition=getCatalog().find(i=>i.cloak&&i.lineage.itemId===Number(body.item));
        if(!definition)return {ok:false,reason:'unknown_item'};
        if(!hasInventoryRoom(session))return {ok:false,reason:'inventory_full'};
        if(!spendMaterials(session,{['l2_'+definition.lineage.itemId]:1}))return {ok:false,reason:'not_enough_items'};
        inv.equipment||={};inv.equipment.items||=[];inv.equipment.items.push(instantiate(definition));return {ok:true};
    }
    return {ok:false,reason:'invalid_action'};
}
