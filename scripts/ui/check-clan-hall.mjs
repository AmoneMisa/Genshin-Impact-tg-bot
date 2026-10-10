import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {AUCTION_HALLS} from '../../functions/game/clans/hallAuction.js';
import {getClanHallState} from '../../functions/game/clans/clanHall.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const hall=getClanHallState({hall:{level:3,glory:5000},warehouse:{gold:2e6}});
const dashboard={clan:{id:'demo',name:'White’s Love',level:5,members:[{userId:1}],canManage:true,isOwner:true,myRole:'owner',warehouse:{gold:2e6}},quiz:null,
 progression:{hall:{...hall,coins:100,canManage:true},skills:{eggs:[],skills:[],canManage:true},hallAuctions:{minClanLevel:3,leaseDays:7,canManage:true,halls:AUCTION_HALLS.map((h,i)=>({...h,owner:i===5?{name:'Moonlight',until:Date.now()+7*864e5}:null,bid:i===2?{name:'Dragons',amount:630000}:null,minBid:h.minimum,remainingMs:864e5,canBid:i!==5,mine:false}))}}};
try {for(const width of [320,390,1100]){
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async dashboard=>{
  window.posts=[];window.demo=dashboard;
  const {openClanGame}=await import('/clan.js');
  await openClanGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{
   if(options?.method==='POST') {posts.push(JSON.parse(options.body));return {ok:true,dashboard:window.demo};}
   return window.demo;
  }});
 },dashboard);
 await page.locator('[data-clan-tab=hall]').click();
 await page.locator('.clan-hall-art').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
 assert.equal(await page.locator('.clan-hall-art').count(),1);
 await page.locator('.hall-service-icon img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
 assert.equal(await page.locator('.hall-service-icon img').count(),hall.skills.length);
 assert.equal(await page.locator('.clan-panel').evaluate(n=>getComputedStyle(n).scrollbarColor),'rgb(155, 123, 67) rgb(16, 13, 22)');
 await page.locator('[data-hall-section=development]').click();
 assert.equal(await page.locator('.clan-actions-row').evaluate(n=>getComputedStyle(n).gap),'12px');
 await page.locator('[data-hall-section=skills]').click();
 await page.locator('[data-hall-level="1"]').click();
 assert.equal(await page.locator('[data-hall-level="1"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-hall-level="3"]').click();
 await page.locator('[data-hall-skill=greed]').click();
 assert.ok(await page.evaluate(()=>posts.some(p=>p.action==='hall_skill_toggle'&&p.key==='greed'&&p.enabled===false)));
 assert.equal(await page.locator('.clan-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390||width===1100){
  // Capture the entire sections without the live overlay's scroll clipping.
  await page.addStyleTag({content:'.clan-overlay{position:static!important;height:auto!important;max-height:none!important}.clan-panel{position:static!important;height:auto!important;max-height:none!important;overflow:visible!important}.overlay-backdrop{display:none!important}body{overflow:visible!important}'});
  await page.locator('.clan-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  await page.locator('.clan-hall-settings').screenshot({path:width===390?'docs/clan-hall-390.png':'docs/clan-hall-desktop.png'});
 }
 await page.locator('[data-hall-tab=auction]').click();
 await page.locator('.clan-hall-art').evaluate(n=>{n.loading='eager';return n.decode();});
 assert.equal(await page.locator('[data-hall-bid]').count(),1);
 assert.equal(await page.locator('.clan-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390){
  await page.locator('.clan-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  await page.locator('.clan-hall-auction').screenshot({path:'docs/clan-hall-auction-390.png'});
 }
 await page.locator('[data-hall-bid=gludio] input').fill('300000');
 await page.locator('[data-hall-bid=gludio] button').click();
 assert.ok(await page.evaluate(()=>posts.some(p=>p.action==='hall_bid'&&p.hallId==='gludio'&&p.amount==='300000')));
 assert.deepEqual(errors,[]);await page.close();console.log(`Clan Hall images, auction layout and bidding verified at ${width}px`);
}}finally{await browser.close();}
