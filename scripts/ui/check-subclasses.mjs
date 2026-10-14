import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getCharacterState} from '../../miniapp/character.js';
import {getPlayerProfileState,changePlayerClassForMiniApp,changePlayerGenderForMiniApp,changePlayerRaceForMiniApp,changePlayerSubclassForMiniApp} from '../../miniapp/playerProfile.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
const root=path.resolve('webapp');
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=assets.bundles.map(b=>`<link rel="stylesheet" href="${b.path}">`).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
fs.mkdirSync('docs/character-redesign/implementation',{recursive:true});
try{for(const width of [320,390,1100]){
 const hero={userId:1,gender:'male',changeClassTimer:Date.now()+7*86400000,game:{stats:{lvl:80,currentExp:0},inventory:{luckCoins:50,gold:1e6,materials:{},equipment:{items:[]},potions:{items:[]}},effects:[],equipmentStats:{},builds:{}}};
 changeClass(hero,'phoenixKnight');hero.game.inventory.sp=12345;let posts=0;
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  if(url.pathname==='/api/character')return route.fulfill({json:getCharacterState(hero)});
  if(url.pathname==='/api/profile')return route.fulfill({json:getPlayerProfileState(hero)});
  if(['/api/profile/gender','/api/profile/class','/api/profile/race','/api/profile/subclass'].includes(url.pathname)){
   posts++;const b=req.postDataJSON(),r=url.pathname.endsWith('race')?changePlayerRaceForMiniApp(hero,b.race):url.pathname.endsWith('subclass')?changePlayerSubclassForMiniApp(hero,b):url.pathname.endsWith('gender')?changePlayerGenderForMiniApp(hero,b.gender):changePlayerClassForMiniApp(hero,b.className);
   return route.fulfill({status:r.ok?200:409,json:r});
  }
  const bundle=assets.bundles.find(b=>b.path===url.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture');
 await page.evaluate(async()=>{
  const api=async(url,opts)=>{const r=await fetch(url,opts),json=await r.json();if(!r.ok)throw Object.assign(new Error(json.reason),{payload:json});return json;};
  await(await import('/character.js')).openCharacterPage({api,renderState:()=>{},haptic:()=>{}});
 });
 const positions=await page.locator('.character-panel>.game-dialog-heading').evaluate(el=>{
  const action=el.querySelector('[data-heading-action]').getBoundingClientRect(),title=el.querySelector('h2').getBoundingClientRect(),close=el.querySelector('[data-dismiss]').getBoundingClientRect();
  return {left:action.right<=title.left,right:title.right<=close.left,sizes:action.height===close.height};
 });
 assert.deepEqual(positions,{left:true,right:true,sizes:true});
 await page.locator('[data-heading-action="appearance"]').click();
 await page.locator('.profile-panel').waitFor();assert.match(await page.locator('.profile-hero-copy').textContent(),/20 CoL/);assert.match(await page.locator('.profile-hero-copy').textContent(),/7 CoL/);
 const raceDetails=page.locator('details').filter({has:page.locator('[data-profile-race-only]')});
 await raceDetails.locator('summary').click();
 await raceDetails.locator('.ds-select-trigger').click();
 await raceDetails.locator('[role="option"]').filter({hasText:'Тёмный эльф'}).click();
 await page.locator('[data-profile-race-change]').click();await page.locator('.game-confirm-dialog').waitFor();
 assert.match(await page.locator('.game-confirm-dialog').textContent(),/12 CoL/);
 await page.locator('.game-confirm-dialog [data-cancel]').click();assert.equal(posts,0);
 await raceDetails.locator('summary').click();
 await page.locator('[data-profile-race-change]').click();await page.locator('.game-confirm-dialog [type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('.profile-hero-copy').textContent.includes('38 CoL'));
 assert.equal(hero.game.gameClass.stats.name,'phoenixKnight');assert.equal(hero.game.race,'darkElf');assert.equal(hero.game.inventory.sp,12345);assert.equal(posts,1);
 const addDetails=page.locator('.profile-subclasses details');
 await addDetails.locator('summary').click();await addDetails.locator('.ds-select-trigger').click();
 assert.equal(await addDetails.locator('[role="option"]').filter({hasText:'Кузнец'}).count(),0);
 assert.equal(await addDetails.locator('[role="option"]').filter({hasText:'Повелитель'}).count(),0);
 await addDetails.locator('[role="option"]').filter({hasText:'Епископ'}).click();
 await page.locator('[data-profile-subclass-add]').click();await page.locator('.game-confirm-dialog [type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('.profile-hero-copy').textContent.includes('Епископ'));
 assert.equal(hero.game.stats.lvl,40);assert.equal(hero.game.inventory.sp,0);assert.equal(hero.game.inventory.luckCoins,38);assert.equal(posts,2);
 assert.equal(await page.locator('[data-profile-slot]').count(),2);
 assert.equal(await page.locator('[data-profile-slot="1"]').isDisabled(),true);
 assert.match(await page.locator('.profile-subclasses').textContent(),/75/);
 assert.equal(await page.locator('[data-profile-content]').evaluate(el=>el.scrollWidth>el.clientWidth),false);
 await page.locator('.profile-subclasses').evaluate(el=>el.scrollIntoView({block:'start'}));
 await page.screenshot({path:`docs/character-redesign/implementation/subclasses-${width}.png`});
 await page.locator('[data-profile-slot="0"]').click();
 await page.waitForFunction(()=>document.querySelector('.profile-hero-copy').textContent.includes('Рыцарь Феникса'));
 assert.equal(hero.game.stats.lvl,80);assert.equal(hero.game.inventory.sp,12345);assert.equal(hero.game.race,'darkElf');assert.equal(posts,3);
 await page.locator('[data-profile-slot="1"]').click();
 await page.waitForFunction(()=>document.querySelector('.profile-hero-copy').textContent.includes('Епископ'));
 assert.equal(hero.game.stats.lvl,40);assert.equal(hero.game.inventory.sp,0);assert.equal(posts,4);
 assert.equal(hero.game.inventory.luckCoins,38);
 await page.locator('.profile-overlay .overlay-close').click();await page.locator('.profile-overlay').waitFor({state:'detached'});
 await page.locator('.character-overlay .overlay-close').click();await page.locator('.character-overlay').waitFor({state:'detached'});
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS race-only quote, cancellation, subclass eligibility, isolated XP/SP, switching, overflow and dialogs ${width}px`);
}}finally{await browser.close();}
