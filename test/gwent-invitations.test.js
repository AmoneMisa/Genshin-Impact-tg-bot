import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultLoadout } from '../webapp/gwent-builder.js';
import { gwentState, gwentAction, INVITE_TTL } from '../miniapp/gwent.js';
import { gwentEntry, parseGwentEntry, gwentAppLink } from '../webapp/gwent-links.js';
const setup=()=>({game:{},members:[1,2,3].map(userId=>({userId,game:{friends:[1,2,3].filter(i=>i!==userId).map(String)}}))});
const deck=defaultLoadout();
const action=(chat,id,body,time=100_000)=>gwentAction(chat,id,body,time,()=>.4);
const invite=(chat,to=2)=>action(chat,1,{action:'invite',targetId:to,loadout:deck}).invitation;

test('targeted invitation protects recipient, preserves deck snapshot and can be accepted only once',()=>{
 const chat=setup(), i=invite(chat);
 assert.equal(gwentState(chat,3,100_001,{invite:i.id}).ok,false);
 assert.equal(action(chat,3,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
 assert.equal(action(chat,1,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
 assert.equal(action(chat,1,{action:'invite',targetId:2,loadout:deck}).invitation.id,i.id);
 assert.equal(gwentState(chat,2,100_001).incoming.length,1);
 assert.equal(gwentState(chat,2,100_001).incoming[0].loadout,undefined);
 const accepted=action(chat,2,{action:'accept_invite',inviteId:i.id,loadout:defaultLoadout('nilfgaard')});
 assert.equal(accepted.match.enemyFaction,deck.faction);
 assert.equal(action(chat,2,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
 assert.equal(chat.game.gwent.matches.length,1);
});
test('bearer invitation, decline, cancellation, expiration and unfriend are enforced',()=>{
 for(const end of ['cancel_invite','decline_invite']){
  const c=setup(),i=invite(c);assert.equal(action(c,end==='cancel_invite'?2:1,{action:end,inviteId:i.id}).ok,false);
  assert.equal(action(c,end==='cancel_invite'?1:2,{action:end,inviteId:i.id}).ok,true);
  assert.equal(action(c,2,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
 }
 const c=setup(),i=invite(c,null);
 assert.equal(action(c,3,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,true);
 const expired=setup(),e=invite(expired);
 assert.equal(action(expired,2,{action:'accept_invite',inviteId:e.id,loadout:deck},100_000+INVITE_TTL).ok,false);
 const unfriend=setup(),u=invite(unfriend);unfriend.members[1].game.friends=[];
 assert.equal(action(unfriend,2,{action:'accept_invite',inviteId:u.id,loadout:deck}).ok,false);
});
test('matchmaking races cannot create a second match; push is explicit, targeted and throttled',()=>{
 const c=setup(),i=invite(c);
 assert.equal(action(c,3,{action:'push_invite',inviteId:i.id}).ok,false);
 assert.equal(action(c,1,{action:'push_invite',inviteId:i.id}).notifyInvite.userId,'2');
 assert.equal(action(c,1,{action:'push_invite',inviteId:i.id},100_001).ok,false);
 assert.equal(action(c,1,{action:'push_invite',inviteId:i.id},160_000).ok,true);
 action(c,1,{action:'join',loadout:deck});
 assert.equal(action(c,2,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
 action(c,3,{action:'join',loadout:deck});assert.equal(c.game.gwent.matches.length,1);
 assert.equal(action(c,2,{action:'accept_invite',inviteId:i.id,loadout:deck}).ok,false);
});
test('spectators receive live public state, no hands, deck order, choices or ability reveals',()=>{
 const c=setup(),i=invite(c);action(c,2,{action:'accept_invite',inviteId:i.id,loadout:deck});
 const m=c.game.gwent.matches[0];m.state.pending={side:'player',kind:'drawAny',options:[{id:'secret',card:m.state.sides.player.deck[0]}],private:'secret'};
 m.state.reveals.player=[m.state.sides.ai.hand[0]];
 const view=gwentState(c,3,100_001,{watch:m.id}).spectating;
 assert.equal(view.spectator,true);assert.equal(view.state.rngState,undefined);
 for(const side of ['player','ai']){assert.equal(view.state.sides[side].hand.length,0);assert.equal(view.state.sides[side].deck.length,0);assert.equal(view.state.reveals[side].length,0);assert.equal(view.state.sides[side].handCount,10);}
 assert.deepEqual(view.state.pending,{side:'player',kind:'waiting',options:[]});
 assert.equal(m.state.sides.player.hand.length,10);
 assert.equal(action(c,3,{action:'surrender',matchId:m.id,revision:0}).ok,false);
 action(c,1,{action:'surrender',matchId:m.id,revision:0});
 assert.equal(gwentState(c,3,100_002,{watch:m.id}).spectating.state.phase,'matchOver');
 assert.equal(gwentState(setup(),3,100_002,{watch:m.id}).ok,false);
});
test('deep links validate format and Telegram base',()=>{
 const token='12345678-1234-1234-1234-123456789abc';
 assert.deepEqual(parseGwentEntry(gwentEntry(-100123,'invite',token)),{chatId:-100123,kind:'invite',token});
 const url=gwentAppLink('https://t.me/test_bot/game',-100123,'watch',token);
 assert.equal(parseGwentEntry(new URL(url).searchParams.get('startapp')).kind,'watch');
 assert.equal(gwentAppLink('https://evil.test/game',1,'invite',token),null);
 assert.equal(parseGwentEntry('gwent_1_i_guess'),null);
});

test('invalid decks, missing members and invitation limit are rejected',()=>{
 const c=setup();c.members.push(...[4,5,6,7].map(userId=>({userId,game:{friends:['1']}})));c.members[0].game.friends.push('4','5','6','7');
 assert.equal(action(c,99,{action:'invite',loadout:deck}).ok,false);
 assert.equal(action(c,1,{action:'invite',loadout:{...deck,counts:{}}}).ok,false);
 for(const targetId of [2,3,4,5,6])assert.equal(action(c,1,{action:'invite',targetId,loadout:deck}).ok,true);
 assert.equal(action(c,1,{action:'invite',targetId:7,loadout:deck}).ok,false);
 const i=c.game.gwent.invites[0];
 assert.equal(action(c,2,{action:'accept_invite',inviteId:i.id,loadout:{...deck,counts:{}}}).ok,false);
 assert.equal(i.status,'pending');
});
