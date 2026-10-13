import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import defaults from '../../functions/getters/getLostFieldsInSession.js';
import {getEquipmentState,forgetEquipmentRecipe} from '../../miniapp/equipment.js';
import {getInventoryState,discardInventoryItem} from '../../miniapp/inventory.js';
const root=path.resolve('webapp'),out=path.resolve('.tmp/item-trash');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{for(const width of [320,390,820]){
 const hero={userId:1,game:{}};defaults(hero);hero.game.stats.lvl=80;hero.game.inventory.gold=1e7;hero.game.inventory.materials={l2_1869:10};hero.game.craft={level:100,recipes:['noGrade:weapon:dagger','D:weapon:dagger'],exp:0};let deletes=0;
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body><output id="status"></output></body>'});
  if(u==='/api/equipment')return route.fulfill({json:getEquipmentState(hero)});
  if(u==='/api/inventory')return route.fulfill({json:getInventoryState(hero)});
  if(u==='/api/equipment/recipe'){deletes++;return route.fulfill({json:forgetEquipmentRecipe(hero,route.request().postDataJSON().itemId)});}
  if(u==='/api/inventory/discard'){deletes++;return route.fulfill({json:discardInventoryItem(hero,route.request().postDataJSON())});}
  const bundle=assets.bundles.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://design.local/fixture');
 await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();(await import('/design/select.js')).observeSelects(document.body);window.opts={api:async(url,options)=>{const r=await fetch(url,options);return r.json();},renderState:()=>{},haptic:()=>{},statusElement:document.querySelector('#status')};await(await import('/craft.js')).openCraftGame(window.opts);});
 const recipe='[data-craft-select="noGrade:weapon:dagger"]';await page.locator(recipe).click();
 assert.equal(await page.locator('.craft-create-actions button').count(),1);assert.equal(await page.locator('[data-recipe-forget]').count(),0);
 const alignment=await page.locator('.craft-create-dialog .game-dialog-heading').evaluate(h=>{const title=h.querySelector('h2').getBoundingClientRect(),close=h.querySelector('[data-dismiss]').getBoundingClientRect();return Math.abs(title.y+title.height/2-close.y-close.height/2);});assert.ok(alignment<2);
 const controls=await page.locator('.craft-create-dialog .ui-button,.craft-create-dialog .game-dialog-heading button').evaluateAll(buttons=>buttons.map(b=>{const s=getComputedStyle(b);return {center:s.display==='grid'?s.alignItems==='center'&&s.justifyItems==='center':s.alignItems==='center'&&s.justifyContent==='center',padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].every(v=>parseFloat(v)>0)};}));assert.ok(controls.every(c=>c.center&&c.padding),'Buttons must center contents and retain padding on all four sides');
 await page.locator('.craft-create-dialog').screenshot({path:path.join(out,'create-'+width+'.png')});await page.locator('.craft-create-dialog [data-back]').click();
 async function points(source){await page.locator(source).scrollIntoViewIfNeeded();const a=await page.locator(source).boundingBox(),b=await page.locator('[data-item-trash]').boundingBox();return {a:{x:a.x+a.width/2,y:a.y+a.height/2},b:{x:b.x+b.width/2,y:b.y+b.height/2}};}
 async function drag(source){const {a,b}=await points(source);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});await page.mouse.up();}
 await drag(recipe);await page.locator('.game-confirm-dialog').waitFor();assert.equal(deletes,0);assert.ok(hero.game.craft.recipes.includes('noGrade:weapon:dagger'));assert.equal(await page.locator('.craft-create-dialog').count(),0);await page.locator('[data-cancel]').click();
 await drag(recipe);await page.locator('.game-confirm-dialog').waitFor();await page.locator('.game-confirm-dialog [type="submit"]').click();await page.waitForFunction(()=>!document.querySelector('[data-craft-select="noGrade:weapon:dagger"]'));assert.equal(deletes,1);assert.ok(!hero.game.craft.recipes.includes('noGrade:weapon:dagger'));
 await page.locator('.craft-overlay .overlay-close').click();
 await page.evaluate(async()=>{await(await import('/inventory.js')).openInventoryGame(window.opts);});
 const material='[data-inventory-bag] [data-inventory-material="l2_1869"]';
 await drag(material);await page.locator('.stock-quantity').waitFor();assert.equal(deletes,1);await page.locator('[data-quantity-cancel]').click();assert.equal(hero.game.inventory.materials.l2_1869,10);
 const {a,b}=await points(material),cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});await page.waitForTimeout(280);
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/8,y:a.y+(b.y-a.y)*i/8}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.locator('.stock-quantity').waitFor();assert.equal(deletes,1);await page.locator('.stock-quantity input').fill('2');await page.locator('.stock-quantity [type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-inventory-material="l2_1869"] em')?.textContent==='8');assert.equal(hero.game.inventory.materials.l2_1869,8);assert.equal(deletes,2);
 assert.equal(await page.locator('.item-drag-preview').count(),0);assert.equal(await page.locator('.inventory-item-dialog').count(),0);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,'inventory-'+width+'.png')});await page.close();console.log('PASS '+width+': aligned header, recipe drag/cancel/confirm, mouse and touch inventory drop/quantity');
}}finally{await browser.close();}
