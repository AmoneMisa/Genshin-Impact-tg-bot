import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateChats,persistChat,sharedOf,hashOf} from '../functions/general/characterSync.js';
import {atomicChatSave} from '../functions/general/atomicChatSave.js';
import {transferGoldInChat} from '../functions/game/gold/transferGold.js';
const clone = structuredClone;
const member=(id,gold)=>({userId:id,game:{inventory:{gold}}});
function store(rows) { return {
  async find(ids){return ids.map(id=>clone(rows.get(id))).filter(Boolean);},
  async insert(row){if(rows.has(row.userId))return null;rows.set(row.userId,clone(row));return clone(row);},
  async update(id,rev,data,hash){const old=rows.get(id);if(old?.rev!==rev)return null;const row={userId:id,rev:rev+1,data:clone(data),hash};rows.set(id,row);return clone(row);},
}; }
for(const amounts of [[80,70],[80,80]])test(`cross-chat transfers ${amounts} conserve gold, including identical resulting balances`,async()=>{
  const rows=new Map([member(1,100),member(2,0),member(3,0)].map(m=>{const data=sharedOf(m);return [m.userId,{userId:m.userId,rev:1,data,hash:hashOf(data)}];}));
  const a={members:[member(2,0),member(1,100)],$session(){}},b={members:[member(3,0),member(1,100)],$session(){}};
  await hydrateChats([a,b],store(rows));
  assert.ok(transferGoldInChat(a,1,2,amounts[0]).ok);assert.ok(transferGoldInChat(b,1,3,amounts[1]).ok);
  let aborted=0;
  const startSession=async()=>{
    const working=clone(rows);let active=false;
    return {store:store(working),startTransaction(){active=true;},inTransaction(){return active;},async commitTransaction(){rows.clear();for(const [id,row]of working)rows.set(id,row);active=false;},async abortTransaction(){aborted++;active=false;},async endSession(){}};
  };
  const save=async function({session}){await persistChat(this,session.store);return this;};
  await atomicChatSave(a,{},save,startSession);
  await assert.rejects(atomicChatSave(b,{},save,startSession),{reason:'character_conflict'});
  assert.equal(aborted,1);
  assert.equal(rows.get(3).data.game.inventory.gold,0,'earlier recipient write is rolled back');
  assert.equal([...rows.values()].reduce((total,row)=>total+row.data.game.inventory.gold,0),100);
});
test('unchanged stale members adopt the new record instead of blocking other characters',async()=>{
  const rows=new Map(),s=store(rows),a={members:[member(1,100)]},b={members:[member(1,100)]};
  await persistChat(a,s);await hydrateChats([b],s);a.members[0].game.inventory.gold=40;await persistChat(a,s);
  await persistChat(b,s);assert.equal(b.members[0].game.inventory.gold,40);
});
test('a caller transaction is reused and never committed by an inner Chat save',async()=>{
  const transaction={inTransaction:()=>true},chat={members:[],$session:()=>transaction};let called=0;
  await atomicChatSave(chat,{session:transaction},async options=>{assert.equal(options.session,transaction);called++;},()=>{throw Error('nested transaction');});
  assert.equal(called,1);
});
test('an explicit session without a transaction still saves atomically and remains owned by the caller',async()=>{
  let active=false,committed=0;
  const session={inTransaction:()=>active,startTransaction(){active=true;},async commitTransaction(){active=false;committed++;},async endSession(){assert.fail('caller session must stay open');}};
  const chat={members:[],$session:()=>null};
  await atomicChatSave(chat,{session},async options=>{assert.ok(active);assert.equal(options.session,session);},()=>assert.fail('session is supplied'));
  assert.equal(committed,1);
});
