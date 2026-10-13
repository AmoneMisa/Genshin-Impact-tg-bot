import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getBonusState,claimBonus} from '../../miniapp/bonus.js';
import {getGachaState} from '../../miniapp/gacha.js';
import {generateGachaReward} from '../../functions/game/equipment/gachaRewards.js';
import defaults from '../../functions/getters/getLostFieldsInSession.js';
import {getEquipmentState,forgetEquipmentRecipe} from '../../miniapp/equipment.js';
const root=path.resolve('webapp');
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
fs.mkdirSync('docs/minigames-refresh',{recursive:true});
try {
 for(const width of [320,390,820]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s={game:{bonusChances:1,stats:{lvl:80},inventory:{gold:1000000,moonDew:100,gacha:{items:[]},equipment:{items:[]}},gacha:[]}};
  const gacha=getGachaState(s);gacha.pending={item:{...generateGachaReward(s,'S',{random:()=>.87}),rewardLabel:'Рецепты'}};
  const book={userId:1,userChatData:{user:{id:1}},game:{}};defaults(book);
  book.game.stats.lvl=80;book.game.craft={level:100,exp:0,recipes:['noGrade:weapon:dagger','D:weapon:dagger']};
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/equipment')return route.fulfill({json:getEquipmentState(book)});
   if(url.pathname==='/api/equipment/recipe'){
    const body=route.request().postDataJSON();assert.equal(body.action,'forget');
    return route.fulfill({json:forgetEquipmentRecipe(book,body.itemId)});
   }
   if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><output id="status"></output></body>`});
   const bundle=assets.bundles.find(b=>b.path===url.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4321/fixture.html');
  await page.evaluate(async({bonus,gacha})=>{
   await(await import('/feature-styles.js')).ensureFeatureStyles();
   (await import('/overlay-a11y.js')).installOverlayA11y();
   window.fixture={bonus,gacha,calls:0};window.opts={renderState:()=>{},haptic:()=>{},statusElement:document.querySelector('#status'),playerLevel:80,api:async(url)=>{
    if(url==='/api/sword')return {length:12,canRoll:true,ranking:[]};
    if(url==='/api/sword/roll'){window.fixture.calls++;return {delta:5,sword:{length:17,canRoll:false,remainMs:3600000,resetAt:Date.now()+3600000,ranking:[]}};}
    if(url==='/api/bonus')return window.fixture.bonus;
    if(url==='/api/bonus/claim'){window.fixture.calls++;return {prize:{name:'moonDew',icon:'💧',label:'лунной росы',amount:5},bonus:{...bonus,chances:0}};}
    if(url==='/api/gacha')return window.fixture.gacha;
    if(url==='/api/gacha/resolve'){window.fixture.calls++;window.fixture.gacha={...gacha,pending:null};return {gacha:window.fixture.gacha};}
   }};
  },{bonus:getBonusState(s),gacha});
  for(const [module,fn,panel] of [['sword','openSwordGame','.sword-panel'],['bonus','openBonusGame','.bonus-panel'],['gacha','openGachaGame','.gacha-summon-scene']]){
   await page.evaluate(async({module,fn})=>{await(await import('/'+module+'.js'))[fn](window.opts);},{module,fn});
   await page.locator(panel).waitFor({state:'visible'});await page.waitForTimeout(220);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,module+' overflow');
   await page.locator(panel).screenshot({path:`docs/minigames-refresh/${module}-${width}.png`});
   if(module==='sword'){await page.locator('[data-sword-roll]').click();await page.waitForFunction(()=>document.querySelector('.sword-length')?.textContent.includes('17'));assert.ok((await page.locator('[data-light-animation]').getAttribute('src')).endsWith('forge-idle.webp'));}
   if(module==='bonus'){
    const rows=await page.locator('.bonus-prize').evaluateAll(rows=>rows.map(row=>{const rect=row.getBoundingClientRect(),first=row.firstElementChild.getBoundingClientRect(),last=row.lastElementChild.getBoundingClientRect(),css=getComputedStyle(row);return {left:first.left-rect.left,right:rect.right-last.right,top:parseFloat(css.paddingTop),bottom:parseFloat(css.paddingBottom)};}));
    for(const row of rows)for(const inset of Object.values(row))assert.ok(inset>=8,'reward contents touch frame');
    await page.locator('[data-bonus-claim]').click();await page.waitForFunction(()=>document.querySelector('.bonus-win'));assert.ok((await page.locator('[data-light-animation]').getAttribute('src')).endsWith('wheel-moonDew-result.webp'));}
   if(module==='gacha'){assert.equal(await page.locator('dialog:modal').count(),1);assert.ok((await page.locator(panel).innerText()).includes('×1'));assert.ok(!(await page.locator(panel).innerText()).includes('incomingDamageModifier'));await page.locator('[data-action="save"]').click();await page.locator('dialog:modal').waitFor({state:'hidden'});}
   await page.locator('.game-overlay .overlay-close').last().click();await page.locator('.game-overlay').waitFor({state:'detached'});
  }
  assert.equal(await page.evaluate(()=>window.fixture.calls),3);
  await page.evaluate(async()=>{await(await import('/craft.js')).openCraftGame({...window.opts,api:async(url,options)=>{const response=await fetch(url,options);return response.json();}});});
  await page.locator('[data-craft-select]').first().click();
  assert.ok((await page.locator('.craft-capacity').innerText()).includes('2 / 40'));
  await page.locator('.craft-create-dialog [data-back]').click();await page.locator('[data-recipe-trash]').click();
  await page.locator('.game-confirm-dialog').getByRole('button',{name:'Удалить',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.craft-capacity')?.textContent.includes('1 / 40'));
  assert.equal(book.game.craft.recipes.length,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'recipe book overflow');
  await page.locator('.craft-overlay .overlay-close').click();await page.locator('.game-overlay').waitFor({state:'detached'});
  if(width===390){
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(async()=>{window.fixture.bonus.chances=1;await(await import('/bonus.js')).openBonusGame(window.opts);});
   const status=await page.locator('#status').innerText();
   await page.locator('[data-bonus-claim]').click();
   await page.waitForFunction(()=>document.querySelector('[data-light-animation]')?.src.endsWith('wheel-moonDew.webp'));
   await page.locator('.overlay-close').click();
   await page.locator('.game-overlay').waitFor({state:'detached'});
   await page.waitForTimeout(1750);assert.equal(await page.locator('#status').innerText(),status);
  }
  assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS WebP scenes, reward, summon popup, reduced motion and layout ${width}px`);
 }
} finally {await browser.close();}
