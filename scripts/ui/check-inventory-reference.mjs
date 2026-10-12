import {getCatalog} from '../../functions/game/equipment/catalog.js';
import {assertItemGrid} from './assert-item-grid.mjs';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {discardInventoryItem,getInventoryState,useInventoryPotion} from '../../miniapp/inventory.js';
import {getEquipmentState,performEquipmentAction} from '../../miniapp/equipment.js';
import {sellableItems} from '../../miniapp/auction.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');

fs.mkdirSync('docs/inventory-live',{recursive:true});
const raw=(uid,name,kind,slots,extra={})=>({...structuredClone(getCatalog().find(item=>item.name===name)||{name,grade:'S',mainType:'shield',kind:'sigill',category:'sigill',classOwner:['mage'],stats:[],cost:10000}),uid,slots,...extra});
try { for(const width of [320,390,820,1100]) {
 const gear=[raw('robe','Major Arcana Robe','robe',['up','down']),raw('mace','Arcana Mace','mace',['rightHand'],{enchant:6}),raw('hat','Major Arcana Circlet','helmet',['helmet']),raw('gloves','Major Arcana Gloves','gloves',['gloves']),raw('boots','Major Arcana Boots','boots',['boots']),raw('sigil','Arcana Sigil','shield',['leftHand'])];
 const session={gender:'male',game:{stats:{lvl:80},gameClass:{stats:{name:'humanWizard',hp:1000,maxHp:5000,mp:100,maxMp:400},skills:[]},equipmentStats:{},inventory:{gold:163308,crystals:3000,equipment:{items:gear},materials:{soulshot_S:800,spiritshot_S:900,crystal_S:20,scroll_return:12},potions:{items:[]}}}};
 for(const item of gear)for(const slot of item.slots)session.game.equipmentStats[slot]={...item,isFilled:true};
 const page=await browser.newPage({viewport:{width,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/api/inventory')return route.fulfill({json:getInventoryState(session)});
  if(url.pathname==='/api/equipment/action'){const b=route.request().postDataJSON();return route.fulfill({json:performEquipmentAction(session,b.key,b.action)});}
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{const {openInventoryGame}=await import('/inventory.js');await openInventoryGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>(await fetch(url,{headers:{'Content-Type':'application/json'},...options})).json()});});
 await page.waitForFunction(()=>Math.abs(document.querySelector('[data-gear-slot]').getBoundingClientRect().width-44)<.01);
 await assertItemGrid(page);
 assert.equal(await page.locator('[data-gear-slot]').count(),18);
 assert.equal(await page.locator('[data-inventory-tattoo]').count(),3);
 assert.equal(await page.locator('.inventory-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 assert.equal(await page.locator('[data-inventory-content] .inv-detail').count(),0);
 assert.equal(await page.locator('[data-inventory-equipment]').count(),0,'equipped items must not appear in bag');
 assert.equal(await page.locator('.inventory-tools button').count(),3);
 assert.deepEqual(await page.locator('.inventory-tools button,.inventory-discard').evaluateAll(n=>n.map(b=>b.textContent.trim())),['','','','']);
 assert.equal(await page.locator('.inventory-col').count(),0);
 assert.equal(await page.locator('[data-gear-slot="down"]').getAttribute('aria-label'),'Низ: Занят цельной бронёй');
 const boxes=await page.evaluate(()=>Object.fromEntries(['leftHand','rightHand','up','down','shirt','belt'].map(id=>{const b=document.querySelector('[data-gear-slot="'+id+'"]').getBoundingClientRect();return [id,{x:b.x,y:b.y,w:b.width,h:b.height}]})));
 assert.equal(boxes.leftHand.y,boxes.rightHand.y);assert.ok(boxes.down.y>boxes.up.y&&boxes.down.y-boxes.up.y<48);
 assert.ok(Math.abs(boxes.shirt.w-44)<.01);assert.ok(Math.abs(boxes.shirt.h-44)<.01);
 await page.locator('.inventory-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
 // Capture the full panel as an artifact, preserving its width and all normal control styles.
 await page.addStyleTag({content:'.inventory-overlay{position:static;height:auto;max-height:none}.inventory-reference{position:static;max-height:none;overflow:visible;margin:auto}.overlay-backdrop{display:none}body{overflow:auto}'});
 await page.locator('.inventory-panel').screenshot({path:'docs/inventory-live/inventory-'+width+'.png',animations:'disabled'});
 await page.locator('[data-gear-slot="rightHand"]').click();assert.equal(await page.locator('.inventory-item-dialog').isVisible(),true);
 if(width===390)await page.locator('.inventory-item-dialog').screenshot({path:'docs/inventory-live/item-popup-390.png'});
 await page.locator('[data-inventory-equip]').click();
 await page.locator('[data-inventory-equipment]').waitFor();assert.equal(Boolean(session.game.equipmentStats.rightHand?.isFilled),false);
 await page.locator('[data-inventory-equipment]').click();await page.locator('[data-inventory-equip]').click();
 await page.waitForFunction(()=>document.querySelector('[data-gear-slot="rightHand"]').getAttribute('aria-label').includes('Arcana Mace'));
 assert.equal(await page.locator('[data-inventory-equipment]').count(),0);
 await page.locator('[data-gear-slot="belt"]').click();assert.match(await page.locator('.inventory-item-dialog').textContent(),/нет предметов/);await page.locator('[data-item-close]').click();
 await page.locator('[data-inventory-search]').fill(getInventoryState(session).materials.find(item=>item.key==='soulshot_S').name);assert.equal(await page.locator('[data-inventory-material]').count(),1);
 await page.locator('[data-inventory-search]').fill('');
 await page.locator('[data-inventory-filter="equip"]').click();assert.equal(await page.locator('[data-inventory-material]').count(),0);await page.locator('[data-inventory-filter="all"]').click();
 assert.deepEqual(errors,[]);await page.close();console.log('PASS inventory reference, equipment slots, popup, equip/unequip, search and folder tabs '+width+'px');
}} finally {await browser.close();}
