import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getPlayerCard} from '../../miniapp/social.js';
import {actTrade,tradeState} from '../../miniapp/trade.js';
import {createParty,invitePlayer,acceptInvite,transferPartyLeadership,disbandParty} from '../../functions/game/party/party.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const weapon={uid:'demo-mace',name:'Arcana Mace',mainType:'weapon',kind:'mace',grade:'S',slots:['rightHand'],isUsed:true,enchant:7};
const chat={game:{},members:[{userId:1,game:{inventory:{gold:33000}}},{userId:2,gender:'female',userChatData:{user:{first_name:'Moonlight',username:'moonlight_demo'}},game:{lastSeenAt:Date.now(),stats:{lvl:78},gameClass:{stats:{name:'mage',translateName:'Маг',maxHp:12500,maxMp:8500,maxCp:6300,damage:1250,defense:780}},equipmentStats:{rightHand:weapon},inventory:{gold:54000,equipment:{items:[weapon]}}}}]};
try{for(const width of [320,390,1100]){
 chat.game.trades=[];
 chat.members.forEach(m=>{m.game.party=null;m.game.partyInvites=[];});
 const viewerClan={members:[{userId:1,role:'owner'}]};let targetClan=null;
 const partyDto=()=>({max:9,costStep:.15,lootModes:['finders','random','turn'],invites:[],candidates:[],party:chat.members[0].game.party?{id:chat.members[0].game.party.id,leaderId:chat.members[0].game.party.leaderId,amLeader:chat.members[0].game.party.leaderId==='1',loot:'finders',members:chat.members.filter(m=>m.game.party?.id===chat.members[0].game.party.id).map(m=>({userId:String(m.userId),name:m.userChatData?.user?.first_name||'White Amorality',level:78,className:'mage',gender:'female',classTitle:'Маг',cp:6300,maxCp:6300,hp:12500,maxHp:12500,mp:8500,maxMp:8500,me:m.userId===1,leader:String(m.userId)===m.game.party.leaderId}))}:null});
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/player')return route.fulfill({json:getPlayerCard(chat,2,1,{clanName:targetClan,viewerClan})});
  if(url.pathname==='/api/clan/activity'){viewerClan.members.push({userId:2,role:'member'});targetClan='White’s Love';return route.fulfill({json:{ok:true,message:'Игрок добавлен в клан.'}});}
  if(url.pathname==='/api/party')return route.fulfill({json:partyDto()});
  if(url.pathname==='/api/party/action'){
   const body=route.request().postDataJSON();let result;
   if(body.action==='invite'){if(!chat.members[0].game.party)createParty(chat,chat.members[0]);result=invitePlayer(chat,chat.members[0],body.userId);}
   if(body.action==='transfer')result=transferPartyLeadership(chat,chat.members[0],body.userId);
   if(body.action==='disband')result=disbandParty(chat,chat.members[0]);
   return route.fulfill({json:{...result,party:partyDto()}});
  }
  if(url.pathname==='/api/trade')return route.fulfill({json:tradeState(chat,1)});
  if(url.pathname==='/api/trade/action'){const result=actTrade(chat,1,route.request().postDataJSON());return route.fulfill({json:{...result,tradeState:tradeState(chat,1)}});}
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{
  const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();
  const {openPlayerCard}=await import('/friends.js');
  window.demoApi=async(url,options)=>{const response=await fetch(url,{headers:{'Content-Type':'application/json'},...options});return response.json();};
  await openPlayerCard({api:demoApi,userId:2});
 });
 assert.equal(await page.locator('[data-pc-trade]').textContent(),'Обмен');
 assert.equal(await page.locator('[data-pc-chat]').textContent(),'Написать');
 assert.equal(await page.locator('[data-pc-friend]').textContent(),'Добавить в друзья');
 assert.equal(await page.locator('[data-pc-tab]').count(),0);
 assert.equal(await page.locator('.fr-stats').count(),0);
 assert.equal(await page.locator('[data-pc-clan]').count(),1);
 assert.equal(await page.locator('[data-pc-party]').count(),1);
 assert.equal(await page.locator('.player-card-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390){
  await page.addStyleTag({content:'.player-card-overlay{position:static!important;height:auto!important;max-height:none!important}.player-card-panel{position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}.overlay-backdrop{display:none!important}body{overflow:visible!important}'});
  await page.locator('.player-card-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  await page.locator('.player-card-panel').screenshot({path:'docs/player-interaction-390.png'});
 }
 chat.members[0].game.gameClass={stats:{name:'mage'}};
 await page.locator('[data-pc-clan]').click();await page.locator('[data-pc-clan]').waitFor({state:'detached'});
 assert.equal(await page.locator('[data-pc-duel]').count(),1);
 if(width===390)await page.locator('.player-card-panel').screenshot({path:'docs/player-clan-interaction-390.png'});
 await page.locator('[data-pc-party]').click();await page.waitForFunction(()=>document.querySelector('[data-pc-feedback]').textContent==='Приглашение в группу отправлено.');
 assert.equal(chat.members[1].game.partyInvites.length,1);
 await page.locator('[data-pc-trade]').click();
 await page.locator('[data-trade-cancel]').waitFor();
 assert.equal(chat.game.trades[0].to,'2');assert.equal(chat.game.trades[0].status,'invited');
 if(width===390)await page.locator('.trade-panel').screenshot({path:'docs/player-trade-invitation-390.png'});
 await page.locator('.trade-panel .overlay-close').click();
 acceptInvite(chat,chat.members[1],chat.members[0].game.party.id);
 await page.evaluate(async()=>{const {openPartyGame}=await import('/party.js');await openPartyGame({api:demoApi,haptic:()=>{},statusElement:document.createElement('span')});});
 assert.equal(await page.locator('[data-party-action=disband]').count(),1);
 assert.equal(await page.locator('[data-party-transfer="2"]').count(),1);
 assert.equal(await page.locator('.party-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390)await page.locator('.party-panel').screenshot({path:'docs/party-leader-390.png'});
 await page.locator('[data-party-transfer="2"]').click();await page.locator('[data-party-action=disband]').waitFor({state:'detached'});
 assert.equal(chat.members[0].game.party.leaderId,'2');
 assert.deepEqual(errors,[]);await page.close();console.log(`Player card and exchange invitation verified at ${width}px`);
}}finally{await browser.close();}
