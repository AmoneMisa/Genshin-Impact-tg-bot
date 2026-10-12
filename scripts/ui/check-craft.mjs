import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getBonusState,claimBonus} from '../../miniapp/bonus.js';
import {getGachaState} from '../../miniapp/gacha.js';
import {generateGachaReward} from '../../functions/game/equipment/gachaRewards.js';
import {getCatalog,instantiate} from '../../functions/game/equipment/catalog.js';
import defaults from '../../functions/getters/getLostFieldsInSession.js';
import {getEquipmentState,forgetEquipmentRecipe,performEquipmentAction,craftEquipmentItem,craftNpcEquipment} from '../../miniapp/equipment.js';
const root=path.resolve('webapp');
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
fs.mkdirSync('docs/craft-reference',{recursive:true});
try {
 for(const width of [320,390,820]) {
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const book={userId:1,userChatData:{user:{id:1}},game:{}};defaults(book);
 book.game.stats.lvl=80;book.game.inventory.gold=10000000;
 book.game.craft={level:100,exp:0,recipes:['noGrade:weapon:dagger','D:weapon:dagger','A:armor:heavy:body']};
 book.game.inventory.materials={l2_5287:1,scroll_D:2,attr_stone_fire:1};
 book.game.inventory.equipment.items=[instantiate(getCatalog().find(i=>i.id==='D:weapon:dagger')),instantiate(getCatalog().find(i=>i.id==='C:weapon:dagger')),instantiate(getCatalog().find(i=>i.id==='S:weapon:dagger'))];
 for(const recipe of getEquipmentState(book).craft.recipeBook)for(const mat of recipe.materials)book.game.inventory.materials[mat.key]=Math.max(mat.need*3,book.game.inventory.materials[mat.key]||0);
 await page.route('**/*',route=>{
 const url=new URL(route.request().url());
 if(url.pathname==='/api/equipment')return route.fulfill({json:getEquipmentState(book)});
 if(url.pathname==='/api/equipment/action'){const body=route.request().postDataJSON();return route.fulfill({json:performEquipmentAction(book,body.key,body.action,body)});}
 if(url.pathname==='/api/equipment/npc-craft'){const body=route.request().postDataJSON();return route.fulfill({json:craftNpcEquipment(book,body.itemId)});}
 if(url.pathname==='/api/equipment/craft'){const body=route.request().postDataJSON();return route.fulfill({json:craftEquipmentItem(book,body.itemId)});}
 if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body><output id="status"></output></body>'});
 const bundle=assets.bundles.find(b=>b.path===url.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
 return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{
 await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();
 window.opts={renderState:()=>{},haptic:()=>{},statusElement:document.querySelector('#status'),api:async(url,options)=>{const p=await(await fetch(url,options)).json();if(p.ok===false)throw Object.assign(new Error(p.reason),{payload:p});return p;}};
 });
 const check=async()=>{assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);};
 await page.evaluate(async()=>{await(await import('/craft.js')).openCraftGame(window.opts);});
 await page.locator('[data-craft-select]').first().waitFor();
 await check();await page.locator('.craft-book-panel').screenshot({path:'docs/craft-reference/book-'+width+'.png'});
 const bookClose=await page.locator('.craft-overlay .overlay-close').evaluate(el=>{const s=getComputedStyle(el);return [s.width,s.height,s.backgroundColor,s.borderWidth,s.padding];});
 await page.locator('[data-craft-select]').first().click();
 const modalClose=await page.locator('.craft-create-dialog [data-dismiss]').evaluate(el=>{const s=getComputedStyle(el);return [s.width,s.height,s.backgroundColor,s.borderWidth,s.padding];});assert.deepEqual(modalClose,bookClose);
 assert.equal(await page.locator('.craft-create-dialog').evaluate(el=>getComputedStyle(el).rowGap),'12px');
 assert.ok(await page.locator('[data-create]').evaluate(el=>getComputedStyle(el).backgroundImage.includes('linear-gradient')));
 await page.locator('dialog.craft-create-dialog').screenshot({path:'docs/craft-reference/create-'+width+'.png'});
 await page.locator('[data-ingredient]').first().click();assert.ok(await page.locator('.craft-material-detail').innerText());
 await check();await page.locator('[data-create]').click();await page.waitForFunction(()=>document.querySelector('.craft-result')?.textContent.length>0);
 await page.locator('[data-craft-close]').click();
 await page.locator('[data-recipe-search]').fill('Dagger');assert.ok(await page.locator('[data-craft-select]').count());
 await page.locator('.craft-overlay .overlay-close').click();
 await page.evaluate(async()=>{await(await import('/enchant.js')).openEnchantGame({...window.opts,scrollKey:'scroll_D'});});
 assert.equal(await page.locator('[data-target]').count(),1);await page.locator('[data-target]').click();
 await page.locator('.enchant-dialog').screenshot({path:'docs/craft-reference/enchant-'+width+'.png'});await check();
 await page.locator('[data-enchant]').click();await page.waitForFunction(()=>document.querySelector('.enchant-dialog')?.textContent.includes('Предмет заточен до +1'));
 assert.equal(book.game.inventory.materials.scroll_D,1);await page.locator('.enchant-dialog [data-dismiss]').click();
 await page.evaluate(async()=>{await(await import('/forge.js')).openForgeGame(window.opts);});
 await page.locator('[data-forge-mode="unseal"]').click();await page.locator('[data-forge-select]').first().click();
 await page.locator('.forge-service-dialog').screenshot({path:'docs/craft-reference/unseal-'+width+'.png'});
 await page.locator('[data-unseal]').click();await page.locator('.game-confirm-dialog [data-cancel]').click();
 assert.equal(book.game.inventory.materials.l2_5287,1);
 await page.locator('[data-unseal]').click();await page.locator('.game-confirm-dialog button[type="submit"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-forge-body]')?.textContent.includes('Доспехи распечатаны'));
 assert.equal(book.game.inventory.materials.l2_5287,0);
 await page.locator('[data-forge-mode="ls"]').click();await page.locator('[data-forge-select]').first().click();
 await page.locator('.forge-service-dialog').screenshot({path:'docs/craft-reference/ls-'+width+'.png'});
 await check();await page.locator('.forge-service-dialog [data-dismiss]').click();
 await page.locator('.equipment-overlay .overlay-close').click();await check();
 await page.evaluate(async()=>{await(await import('/forge.js')).openForgeGame({...window.opts,materialKey:'attr_stone_fire'});});
 assert.equal(await page.locator('[data-forge-mode]').count(),0);
 await page.locator('[data-forge-select]').first().click();assert.equal(await page.locator('[data-attr-key]').count(),1);
 await page.locator('[data-attr-key]').click();await page.locator('.game-confirm-dialog button[type="submit"]').click();
 await page.waitForFunction(()=>!document.querySelector('.forge-service-dialog'));
 assert.equal(book.game.inventory.materials.attr_stone_fire,0);await page.locator('.equipment-overlay .overlay-close').click();await check();
 book.game.inventory.materials.l2_2137=1;book.game.inventory.materials.l2_1865=5;book.game.inventory.materials.l2_1869=5;
 const goldBeforeNpc=book.game.inventory.gold,personalRecipes=[...book.game.craft.recipes];
 await page.evaluate(async()=>{await(await import('/forge.js')).openForgeGame(window.opts);});
 await page.locator('[data-forge-mode="craft"]').click();await page.locator('.craft-overlay').waitFor();
 assert.equal(await page.locator('[data-craft-select]').count(),25);
 assert.equal(await page.locator('.craft-capacity').count(),0);
 await page.locator('[data-craft-select="npc:1880"]').click();
 assert.equal(await page.locator('.craft-create-dialog .mmo-bar').count(),0);
 assert.equal(await page.locator('[data-recipe-forget]').count(),0);
 await page.locator('.craft-create-dialog').screenshot({path:'docs/craft-reference/npc-create-'+width+'.png'});
 await page.locator('[data-create]').click();await page.waitForFunction(()=>document.querySelector('.craft-result')?.textContent.includes('Steel'));
 assert.equal(book.game.inventory.gold,goldBeforeNpc-2000);assert.equal(book.game.inventory.materials.l2_2137,1);assert.deepEqual(book.game.craft.recipes,personalRecipes);
 await page.locator('[data-craft-close]').click();await page.locator('.craft-overlay .overlay-close').click();await page.locator('.equipment-overlay .overlay-close').click();await check();
 await page.close();console.log(width+' craft/enchant/unseal/LS passed');
 }
}finally{await browser.close();}
