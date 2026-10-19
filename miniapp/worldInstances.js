import WorldInstance from '../db/models/WorldInstance.js';
import {attachPartyPeers} from './party.js';
// The party's instance outlives its originating chat; members can reopen it from any chat.
export async function loadWorldInstances(session,{store=WorldInstance,attach=attachPartyPeers,joinAssembly=null}={}){
    const chat=session.ownerDocument(),w=session.game.world,id=w?.instanceId||joinAssembly||w?.seedAssembly||(w?.location?.startsWith('seed-')?w.seedVoyage:null)||(w?.location==='devils-isle'?w.zakenVoyage:null);
    if(!id)return;
    const record=await store.findById(id);
    if(!record)return;
    if(!record.data.members.includes(String(session.userId))&&!(joinAssembly===id&&record.data.kind==='seed-assembly'&&record.data.location===session.game.world?.location&&record.data.until>Date.now()))return;
    await attach(session,record.data.members);
    chat.game.worldInstances||={};chat.game.worldInstances[id]=record.data;
}
export async function saveWorldInstances(session,{store=WorldInstance}={}){
    for(const instance of Object.values(session.ownerDocument().game.worldInstances||{})){
        if(!instance.members.includes(String(session.userId)))continue;
        await store.updateOne({_id:instance.id},{$set:{data:JSON.parse(JSON.stringify(instance)),expiresAt:new Date(instance.until)}},{upsert:true});
    }
}
