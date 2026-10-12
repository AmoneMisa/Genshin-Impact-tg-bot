import test from 'node:test';
import assert from 'node:assert/strict';
import {resetCharacter,wipeCharacter} from '../miniapp/characterWipe.js';
import mongoose from 'mongoose';
import Chat from '../db/models/Chat.js';
import AuctionLot from '../db/models/AuctionLot.js';
import ArenaRating from '../db/models/ArenaRating.js';
import RtaFighter from '../db/models/RtaFighter.js';
import {runPlayerTool} from '../miniapp/adminTools.js';
import {persistChat,hydrateChats,sharedOf} from '../functions/general/characterSync.js';

const hero=()=>({userId:1,gender:'female',userChatData:{user:{id:1,first_name:'Hero'}},user:{name:'Hero'},horoscope:{sign:'aries'},
 game:{stats:{lvl:80,currentExp:999999},gameClass:{stats:{name:'archmage',hp:0}},inventory:{gold:999999,crystals:500,moonDew:400,equipment:{items:[{uid:'gear'}]}},
 warehouse:{items:[{uid:'stored'}]},classQuest:{active:'third',completed:['second']},effects:[{name:'buff'}],world:{mode:'siege'},respawnTime:9999999999999},sword:500,timerSwordCallback:100});

test('wipe resets gameplay to new-player defaults and retains identity and preferences',()=>{
 const member=hero(),profile=structuredClone({user:member.user,userChatData:member.userChatData,horoscope:member.horoscope});
 resetCharacter(member);
 assert.equal(member.game.stats.lvl,1);assert.equal(member.game.stats.currentExp,0);
 assert.equal(member.game.inventory.gold,0);assert.equal(member.game.inventory.moonDew,0);
 assert.deepEqual(member.game.inventory.equipment.items,[]);assert.equal(member.game.warehouse,undefined);
 assert.deepEqual(member.game.effects,[]);assert.deepEqual(member.game.classQuest,{active:null,completed:[]});
 assert.equal(member.game.respawnTime,0);assert.ok(member.game.gameClass.stats.hp>0);
 assert.equal(member.sword,0);assert.equal(member.timerSwordCallback,0);assert.equal(member.gender,'female');
 assert.deepEqual({user:member.user,userChatData:member.userChatData,horoscope:member.horoscope},profile);
});

test('unconfirmed and mismatched wipes fail before loading or mutating any player',async()=>{
 for(const confirmation of [undefined,'2',1,''])assert.deepEqual(await runPlayerTool(-1,'1','wipe_character',undefined,confirmation),{ok:false,reason:'confirmation_required'});
 assert.equal((await runPlayerTool(-1,'oops','wipe_character',undefined,'oops')).reason,'confirmation_required');
});

test('wipe propagates through shared character revisions and rejects stale writes without touching another hero',async()=>{
 const rows=new Map(),clone=structuredClone;
 const store={find:async ids=>ids.map(id=>clone(rows.get(id))).filter(Boolean),insert:async row=>{rows.set(row.userId,clone(row));return clone(row);},
 update:async(id,rev,data,hash)=>{const row=rows.get(id);if(row.rev!==rev)return null;const next={userId:id,rev:rev+1,data:clone(data),hash};rows.set(id,next);return clone(next);}};
 const other={userId:2,game:{stats:{lvl:20},inventory:{gold:300}}},chat={members:[hero(),other]};
 await persistChat(chat,store);const beforeOther=sharedOf(other);
 const stale={members:[hero()]};await hydrateChats([stale],store);
 resetCharacter(chat.members[0]);await persistChat(chat,store);
 assert.equal(rows.get(1).data.game.stats.lvl,1);assert.equal(rows.get(1).rev,2);
 assert.deepEqual(rows.get(2).data,beforeOther);
 const fresh={members:[hero()]};await hydrateChats([fresh],store);assert.equal(fresh.members[0].game.inventory.gold,0);
 stale.members[0].game.inventory.gold++;await assert.rejects(()=>persistChat(stale,store),{reason:'character_conflict'});
});

test('wipe, escrow cleanup and ratings use one transaction scoped to the selected user',async t=>{
 const operations=[],member=hero(),chat={members:[member],game:{},save:async options=>{operations.push(['save',options]);}};
 const session={withTransaction:async run=>run(),endSession:async()=>operations.push(['end'])};
 t.mock.method(mongoose,'startSession',async()=>session);
 for(const method of ['findOne','find'])t.mock.method(Chat,method,()=>({session:s=>{assert.equal(s,session);return Promise.resolve(method==='find'?[chat]:chat);}}));
 t.mock.method(Chat,'updateMany',async(...args)=>{operations.push(['chat',...args]);});
 t.mock.method(AuctionLot,'updateMany',async(...args)=>{operations.push(['lots',...args]);});
 for(const model of [ArenaRating,RtaFighter])t.mock.method(model,'deleteMany',async(...args)=>{operations.push(['rating',...args]);});
 assert.equal((await wipeCharacter(-1,'1')).ok,true);
 assert.equal(member.game.stats.lvl,1);
 assert.deepEqual(operations.find(row=>row[0]==='lots')[1],{sellerId:1,status:'active'});
 assert.equal(operations.find(row=>row[0]==='lots')[2].$set.returned,true);
 for(const row of operations.filter(row=>row[0]==='rating'))assert.deepEqual(row[1],{userId:1});
 for(const row of operations.filter(row=>row[0]!=='end'))assert.equal(row.at(-1).session,session);
 for(const row of operations.filter(row=>row[0]==='chat'))assert.equal(row[2].$inc.__v,1,'stale chat saves must be invalidated');
 assert.equal(operations.at(-1)[0],'end');
});

test('unknown players and live wagers prevent all wipe mutations',async t=>{
 const member=hero(),chat={members:[member],game:{}};
 let saves=0,ended=0;
 chat.save=async()=>{saves++;};
 t.mock.method(mongoose,'startSession',async()=>({withTransaction:async run=>run(),endSession:async()=>{ended++;}}));
 t.mock.method(Chat,'findOne',()=>({session:async()=>chat}));
 t.mock.method(Chat,'find',()=>({session:async()=>[chat]}));
 assert.equal((await wipeCharacter(-1,'2')).reason,'unknown_player');
 chat.game.points={players:{'1':{}},gameSessionLastUpdateAt:Date.now()};
 assert.equal((await wipeCharacter(-1,'1')).reason,'wipe_in_table_game');
 assert.equal(member.game.stats.lvl,80);assert.equal(saves,0);assert.equal(ended,2);
});
