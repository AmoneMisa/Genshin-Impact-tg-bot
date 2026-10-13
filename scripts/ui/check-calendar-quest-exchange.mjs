import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getLoginRewardsState,grantLoginTicket,claimLoginReward} from '../../functions/game/login/loginRewards.js';
import {getAcademyState} from '../../functions/game/academy/academy.js';
import {startSoulCrystalQuest} from '../../functions/game/equipment/soulCrystalQuest.js';
import {soulCrystalState,exchangeSeals} from '../../functions/game/equipment/soulCrystals.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE)),{chromium}=require('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/calendar-quest-exchange');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{for(const width of [320,390,820]){
 const now=Date.parse('2026-10-13T00:00:00Z'),hero={game:{stats:{lvl:47},gameClass:{stats:{name:'humanMystic'}},inventory:{gold:0,materials:{seal_red:3,seal_green:4,seal_blue:5},equipment:{items:[]},potions:{items:[]}}}};
 grantLoginTicket(hero,now);let calls=0;
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.pathname==='/preview')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><main></main></body>`});
  if(u.pathname==='/api/login-rewards')return route.fulfill({json:getLoginRewardsState(hero,now)});
  if(u.pathname==='/api/login-rewards/action'){const b=route.request().postDataJSON(),result=claimLoginReward(hero,now,{month:b.month,day:b.day},{ticket:b.action==='fill'});return route.fulfill({status:result.ok?200:409,json:{...result,loginRewards:getLoginRewardsState(hero,now)}});}
  if(u.pathname==='/api/academy')return route.fulfill({json:getAcademyState(hero,now)});
  if(u.pathname==='/api/academy/action'){calls++;const b=route.request().postDataJSON(),result=startSoulCrystalQuest(hero,b.color,now);return route.fulfill({status:result.ok?200:409,json:{...result,academy:getAcademyState(hero,now)}});}
  if(u.pathname==='/api/shop/exchange'){const result=route.request().method()==='POST'?exchangeSeals(hero,route.request().postDataJSON().counts):null;const {aa,seals}=soulCrystalState(hero);return route.fulfill({json:result?{...result,exchange:{aa,seals}}:{aa,seals}});}
  const bundle=assets.bundles.find(b=>b.path===u.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.join(root,u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({path:file});
 });
 await page.goto('http://quest.test/preview');await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();window.opts={api:(await import('/request-json.js')).requestJson,renderState:()=>{},haptic:()=>{}};});
 const check=async()=>{assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('.overlay-panel').last().evaluate(el=>el.scrollWidth>el.clientWidth+1),false);};
 await page.evaluate(async()=>{await(await import('/login-rewards.js')).openLoginRewards(window.opts);});
 assert.equal(await page.locator('[data-login-fill]').isDisabled(),true);await page.locator('[data-login-claim]').click();await page.locator('[data-login-tab="calendar"]').click();await page.locator('[data-login-fill]').click();await page.waitForFunction(()=>document.querySelectorAll('.login-day.is-claimed').length===2);assert.equal(hero.game.loginRewards.tickets.length,0);await check();await page.locator('.overlay-close,[data-dismiss]').click();
 await page.evaluate(async()=>{await(await import('/academy.js')).openAcademy(window.opts);});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.academy-window')).opacity==='1');assert.ok(await page.locator('.ui-quest-dot').count()>0);await check();await page.screenshot({path:path.join(out,`academy-${width}.png`)});await page.locator('[data-academy-soul]').click();await page.waitForFunction(()=>document.querySelector('.academy-window').textContent.includes('Квест активен.'));assert.equal(calls,1);assert.equal(await page.locator('[data-academy-soul]').count(),0);await page.locator('.overlay-close,[data-dismiss]').click();
 await page.evaluate(async()=>{await(await import('/seal-exchange.js')).openSealExchange(window.opts);});await check();await page.screenshot({path:path.join(out,`exchange-${width}.png`)});await page.locator('[data-seal-exchange]').click();await page.waitForFunction(()=>document.querySelector('[data-seal-feedback]').textContent.includes('65 AA'));assert.equal(hero.game.inventory.ancientAdena,65);assert.equal(await page.locator('[data-seal-exchange]').isDisabled(),true);await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();console.log(`PASS calendar tickets, Academy quest, shop exchange ${width}px`);
}}finally{await browser.close();}
