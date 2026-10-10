import test from 'node:test';
import assert from 'node:assert/strict';
import {actMail,mailState,expirePlayerMail,MAIL_LIFETIME,MAIL_POSTAGE} from '../miniapp/mail.js';
const player=id=>({userId:id,game:{inventory:{gold:1000,materials:{iron:10},equipment:{items:[]},potions:{items:[]}}}});
const chat=()=>({game:{},members:[player(1),player(2),player(3)]});
const send=(c,extra={})=>actMail(c,1,{action:'send',to:'2',title:'Припасы',text:'Для рейда',type:'regular',items:[{kind:'material',ref:'iron',count:4}],...extra},1000);
test('mail escrows attachments and delivers exactly once, with participant privacy',()=>{
 const c=chat(),result=send(c);assert.equal(result.ok,true);
 assert.equal(c.members[0].game.inventory.gold,1000-MAIL_POSTAGE);assert.equal(c.members[0].game.inventory.materials.iron,6);
 assert.equal(mailState(c,3,1000).letters.length,0);assert.equal(mailState(c,3,1000).sent.length,0);
 assert.equal(actMail(c,3,{action:'claim',id:result.id},1001).ok,false);
 assert.equal(actMail(c,1,{action:'claim',id:result.id},1001).ok,false);
 assert.equal(actMail(c,2,{action:'claim',id:result.id},1001).ok,true);
 assert.equal(c.members[1].game.inventory.materials.iron,14);
 assert.equal(actMail(c,2,{action:'claim',id:result.id},1002).ok,false);
 assert.equal(c.members[1].game.inventory.materials.iron,14);
});
test('COD exchanges payment and augmented equipment together, insufficient funds changes nothing',()=>{
 const c=chat(),item={uid:'mace',name:'Arcana Mace',grade:'S',mainType:'weapon',enchant:7,augmentation:{skill:'Heal'},sa:{type:'Acumen'},attribute:{fire:150}};
 c.members[0].game.inventory.equipment.items.push(item);
 const result=send(c,{type:'payment',price:1500,items:[{kind:'equipment',ref:'mace',count:1}]});assert.equal(result.ok,true);
 const before=structuredClone(c);assert.equal(actMail(c,2,{action:'claim',id:result.id},1001).reason,'mail_payment');assert.deepEqual(c,before);
 c.members[1].game.inventory.gold=2000;assert.equal(actMail(c,2,{action:'claim',id:result.id},1001).ok,true);
 assert.equal(c.members[1].game.inventory.gold,500);assert.equal(c.members[0].game.inventory.gold,2400);assert.deepEqual(c.members[1].game.inventory.equipment.items[0],item);
});
test('failed send is atomic and rejects duplicate, equipped, and excessive attachments',()=>{
 const c=chat();const before=structuredClone(c);
 assert.equal(send(c,{items:[{kind:'material',ref:'iron',count:4},{kind:'material',ref:'iron',count:1}]}).ok,false);assert.deepEqual(c,before);
 assert.equal(send(c,{items:[{kind:'material',ref:'iron',count:11}]}).ok,false);assert.deepEqual(c,before);
 assert.equal(send(c,{items:Array(13).fill({kind:'material',ref:'iron',count:1})}).ok,false);
 c.members[0].game.inventory.equipment.items.push({uid:'worn',name:'Sword',isUsed:true});assert.equal(send(c,{items:[{kind:'equipment',ref:'worn',count:1}]}).ok,false);
});
test('deleting incoming mail returns attachments; deleting sent mail does not recall delivery',()=>{
 const c=chat(),result=send(c);assert.equal(actMail(c,1,{action:'delete',id:result.id},1001).ok,true);
 assert.equal(mailState(c,1,1001).sent.length,0);assert.equal(mailState(c,2,1001).letters.length,1);
 assert.equal(actMail(c,2,{action:'delete',id:result.id},1002).ok,true);assert.equal(c.members[0].game.inventory.materials.iron,10);
 assert.equal(c.game.playerMail[0].status,'returned');assert.equal(mailState(c,2,1002).letters.length,0);
});
test('expired attachments return once, system rewards remain claimable',()=>{
 const c=chat();send(c);assert.equal(expirePlayerMail(c,1000+MAIL_LIFETIME),true);assert.equal(expirePlayerMail(c,1000+MAIL_LIFETIME+1),false);assert.equal(c.members[0].game.inventory.materials.iron,10);
 c.members[1].game.mailbox=[{id:'reward',status:'pending',title:'Награда',text:'',rewards:[{kind:'gold',amount:25}],createdAt:1000,expiresAt:9000}];
 assert.equal(actMail(c,2,{action:'delete',id:'reward'},2000).reason,'mail_claim_first');
 assert.equal(actMail(c,2,{action:'claim',id:'reward'},2000).ok,true);assert.equal(c.members[1].game.inventory.gold,1025);
 assert.equal(actMail(c,2,{action:'delete',id:'reward'},2001).ok,true);
});
test('gold pledged in a table game cannot fund postage or COD',()=>{
 const c=chat();c.members[0].game.dice={bet:100,isStart:true,startedAt:1000};assert.equal(send(c).reason,'in_table_game');
 delete c.members[0].game.dice;const result=send(c,{type:'payment',price:100});c.members[1].game.dice={bet:100,isStart:true,startedAt:1000};assert.equal(actMail(c,2,{action:'claim',id:result.id},1001).reason,'in_table_game');
});
