import test from 'node:test';
import assert from 'node:assert/strict';
import {addGwentLinks,pushGwentInvite,gwentBaseForBot} from '../miniapp/gwent-sharing.js';
const id='12345678-1234-1234-1234-123456789abc';
test('invite links use actual configured Telegram app, with safe absent configuration',()=>{
 const state={incoming:[{id}],outgoing:[{id}],invitation:{id}};
 addGwentLinks(state,'https://t.me/test_bot/game',-100123);
 for(const row of [...state.incoming,...state.outgoing,state.invitation])assert.match(row.url,/startapp=gwent_-100123_i_/);
 assert.equal(addGwentLinks({invitation:{id}},null,1).invitation.url,null);
});
test('explicit push sends translated text and inline invite link via injected transport only',async()=>{
 let delivered;
 const result=await pushGwentInvite({userId:'42',fromName:'Friend'},'https://t.me/test_bot/game',{
 translate:async(id,text)=>text,
 push:async(id,text,options)=>{await options.send(id,text);return true;},
 send:async(...args)=>{delivered=args;}
 });
 assert.equal(result,true);assert.equal(delivered[0],'42');assert.match(delivered[1],/Friend/);
 assert.equal(delivered[2].reply_markup.inline_keyboard[0][0].url,'https://t.me/test_bot/game');
 assert.equal(await pushGwentInvite({userId:'42',fromName:'Friend'},null,{translate:async(id,text)=>text,push:async()=>false}),false);
});


test('main Mini App invitation works without short name and named apps keep their path',()=>{
 const bot={username:'Genshin_DB_bot',has_main_web_app:true};
 const base=gwentBaseForBot(bot);
 assert.equal(base,'https://t.me/Genshin_DB_bot');
 const link=addGwentLinks({invitation:{id}},base,-100123).invitation.url;
 assert.equal(new URL(link).pathname,'/Genshin_DB_bot');
 assert.equal(new URL(link).searchParams.get('startapp'),`gwent_-100123_i_${id}`);
 assert.equal(gwentBaseForBot(bot,'game'),'https://t.me/Genshin_DB_bot/game');
 assert.equal(gwentBaseForBot({username:'Genshin_DB_test_bot'}),null);
 assert.equal(gwentBaseForBot(bot,'bad/path'),null);
 assert.equal(gwentBaseForBot({username:'bad/name',has_main_web_app:true}),null);
});
