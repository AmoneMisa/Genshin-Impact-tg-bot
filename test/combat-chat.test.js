import test from 'node:test';
import assert from 'node:assert/strict';
import {combatChatScope,readCombatChat,sendCombatChat,CHAT_HISTORY} from '../miniapp/combatChat.js';
import {combatPartyRows} from '../webapp/combat-social.js';

function fixture(){
  const records=new Map(),session={userId:1,userChatData:{user:{first_name:'Hero'}},ownerDocument:()=>({chatId:-100}),game:{hunt:{zone:'forest',field:{room:'entry'}},party:{id:'p1',joinedAt:1000}}};
  const store={findById:id=>({lean:async()=>records.get(id)}),updateOne:async(query,update)=>{const previous=records.get(query._id)?.messages||[];records.set(query._id,{messages:[...previous,...update.$push.messages.$each].slice(-CHAT_HISTORY)});}};
  return {session,store,records};
}
test('chat scopes follow authenticated room, instance and party; caller cannot choose recipients',async()=>{
  const {session,store}=fixture();
  const local=combatChatScope(session,'local');
  assert.equal((await sendCombatChat(session,{channel:'local',scope:'party:secret',text:'Hello'},store,10000)).ok,true);
  assert.equal((await readCombatChat(session,'local',store)).messages.length,1);
  session.game.hunt.field.room='other';assert.notEqual(combatChatScope(session,'local'),local);
  assert.equal((await readCombatChat(session,'local',store)).messages.length,0);
  session.game.world={instanceId:'private'};assert.notEqual(combatChatScope(session,'local'),local);
  session.game.party=null;assert.equal((await sendCombatChat(session,{channel:'party',text:'Hidden'},store,12000)).reason,'no_party');
  assert.equal(combatChatScope(session,'global'),null);
});
test('chat validates length and rate, bounds history and hides messages before joining',async()=>{
  const {session,store}=fixture();
  assert.equal((await sendCombatChat(session,{channel:'party',text:' '.repeat(10)},store,10000)).reason,'chat_text');
  assert.equal((await sendCombatChat(session,{channel:'party',text:'a'.repeat(201)},store,10000)).reason,'chat_text');
  await sendCombatChat(session,{channel:'party',text:'one\nline'},store,10000);
  assert.equal((await sendCombatChat(session,{channel:'party',text:'spam'},store,10001)).reason,'chat_rate');
  assert.equal((await readCombatChat(session,'party',store)).messages[0].text,'one line');
  session.game.party.joinedAt=11000;assert.equal((await readCombatChat(session,'party',store)).messages.length,0);
  for(let i=0;i<90;i++)await sendCombatChat(session,{channel:'party',text:String(i)},store,12000+i*1000);
  assert.equal((await readCombatChat(session,'party',store)).messages.length,CHAT_HISTORY);
  session.game.party.id='another';assert.equal((await readCombatChat(session,'party',store)).messages.length,0);
});
test('combat roster supports a nine-person party without duplicating self, selection and escaped names',()=>{
  const party={members:Array.from({length:9},(_,i)=>({userId:i,name:i===8?'<script>':`Hero ${i}`,classTitle:'Class',leader:i===0,me:i===1,cp:20,maxCp:40,hp:50,maxHp:100,mp:30,maxMp:60}))};
  const html=combatPartyRows(party,'8');
  assert.equal((html.match(/data-party-target=/g)||[]).length,8);
  assert.equal((html.match(/ui-resource-l2/g)||[]).length,24);
  assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
  assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
