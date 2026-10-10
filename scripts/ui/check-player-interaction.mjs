import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {getPlayerCard} from '../../miniapp/social.js';
import {actTrade,tradeState} from '../../miniapp/trade.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const weapon={uid:'demo-mace',name:'Arcana Mace',mainType:'weapon',kind:'mace',grade:'S',slots:['rightHand'],isUsed:true,enchant:7};
const chat={game:{},members:[{userId:1,game:{inventory:{gold:33000}}},{userId:2,gender:'female',userChatData:{user:{first_name:'Moonlight',username:'moonlight_demo'}},game:{lastSeenAt:Date.now(),stats:{lvl:78},gameClass:{stats:{name:'mage',translateName:'Маг',maxHp:12500,maxMp:8500,maxCp:6300,damage:1250,defense:780}},equipmentStats:{rightHand:weapon},inventory:{gold:54000,equipment:{items:[weapon]}}}}]};
try{for(const width of [320,390,1100]){
 chat.game.trades=[];
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/player')return route.fulfill({json:getPlayerCard(chat,2,1,{clanName:'White’s Love'})});
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
 assert.equal(await page.locator('.player-card-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390){
  await page.addStyleTag({content:'.player-card-overlay{position:static!important;height:auto!important;max-height:none!important}.player-card-panel{position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}.overlay-backdrop{display:none!important}body{overflow:visible!important}'});
  await page.locator('.player-card-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  await page.locator('.player-card-panel').screenshot({path:'docs/player-interaction-390.png'});
 }
 await page.locator('[data-pc-tab=stats]').click();
 assert.equal(await page.locator('.fr-stats').count(),1);
 if(width===390)await page.locator('.player-card-panel').screenshot({path:'docs/player-interaction-stats-390.png'});
 await page.locator('[data-pc-trade]').click();
 await page.locator('[data-trade-cancel]').waitFor();
 assert.equal(chat.game.trades[0].to,'2');assert.equal(chat.game.trades[0].status,'invited');
 if(width===390)await page.locator('.trade-panel').screenshot({path:'docs/player-trade-invitation-390.png'});
 assert.deepEqual(errors,[]);await page.close();console.log(`Player card and exchange invitation verified at ${width}px`);
}}finally{await browser.close();}
