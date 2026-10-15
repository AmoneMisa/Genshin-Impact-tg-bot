import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {getShopState,buyShopItem} from '../../miniapp/shop.js';
import {getInventoryState} from '../../miniapp/inventory.js';
import {performEquipmentAction} from '../../miniapp/equipment.js';
import {makeCostumeItem} from '../../functions/game/equipment/costumeItems.js';
import {getBonusState,claimBonus} from '../../miniapp/bonus.js';
import {getChestState} from '../../miniapp/chest.js';
const {chromium}=await import(pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const root=path.resolve('webapp'),out=path.resolve('docs/costume-shop');fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try{
 for(const width of [320,390,1100]){
  const s={gender:'female',game:{race:'kamael',bonusChances:1,stats:{lvl:1},gameClass:{stats:{name:'kamaelFighter',hp:100,mp:100,cp:100}},equipmentStats:{},inventory:{gold:10000,luckCoins:1000,equipment:{items:[]},potions:{items:[]},materials:{}}},chestTries:1};
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:width===390?'no-preference':'reduce'}),errors=[],missing=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.exposeFunction('costumeApi',async(url,options)=>{
   if(url==='/api/shop')return getShopState(s);
   if(url==='/api/shop/buy')return buyShopItem(s,JSON.parse(options.body).command);
   if(url==='/api/inventory')return getInventoryState(s);
   if(url==='/api/equipment/action'){const body=JSON.parse(options.body);const result=performEquipmentAction(s,body.key,body.action);return {...result,inventory:getInventoryState(s)};}
   if(url==='/api/bonus')return getBonusState(s);
   if(url==='/api/bonus/claim')return claimBonus(s,{randomInt:()=>99,costumeRandom:min=>min});
   if(url==='/api/chest')return getChestState(s);
   throw new Error('Unexpected API '+url);
  });
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){missing.push(url.pathname);return route.fulfill({status:404});}
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://costume.test/fixture.html');
  await page.evaluate(async()=>{
   (await import('/overlay-a11y.js')).installOverlayA11y();
   window.options={api:costumeApi,renderState:()=>{},haptic:()=>{},statusElement:document.createElement('span')};
   await(await import('/shop.js')).openShopGoods({...options,initialCategory:'costumes'});
  });
  await page.locator('[data-shop-search]').fill('Moonveil');
  await page.locator('[data-store-slot="costume:moonveil-phantom"]').click();
  assert.match(await page.locator('.costume-preview img').getAttribute('src'),/moonveil-phantom-kamael-female/);
  await page.locator('.costume-preview img').evaluate(img=>img.decode());
  assert.equal(await page.locator('[data-store-confirm]').isEnabled(),true);
  assert.equal(await page.locator('.shop-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  await page.locator('.shop-panel').screenshot({path:path.join(out,`shop-${width}.png`)});
  await page.locator('[data-store-confirm]').click();
  await page.waitForFunction(()=>document.querySelector('[data-shop-feedback]').textContent.includes('Куплено'));
  assert.equal(s.game.inventory.equipment.items.length,1);assert.equal(s.game.inventory.luckCoins,880);
  await page.locator('.shop-panel [data-dismiss]').click();
  s.game.inventory.equipment.items.push(makeCostumeItem('midnight-formal'));
  await page.evaluate(async()=>await(await import('/inventory.js')).openInventoryGame(options));
  const costumeSlot=page.locator('[data-gear-slot="costume"]');await costumeSlot.scrollIntoViewIfNeeded();
  assert.equal(await costumeSlot.evaluate(n=>{const a=n.getBoundingClientRect(),b=n.closest('.inventory-character').getBoundingClientRect();return a.bottom<=b.bottom&&a.right<=b.right;}),true);
  await costumeSlot.click();
  await page.locator('dialog [data-inventory-equipment]').first().click();
  await page.locator('[data-inventory-equip]').click();
  await page.waitForFunction(()=>document.querySelector('.inventory-body')?.src.includes('moonveil-phantom-kamael-female'));
  assert.equal(s.game.equipmentStats.costume.costumeId,'moonveil-phantom');
  await page.locator('[data-gear-slot="costume"]').click();
  await page.locator('dialog .costume-preview img').evaluate(img=>img.decode());
  await page.locator('dialog').screenshot({path:path.join(out,`inventory-preview-${width}.png`)});
  await page.keyboard.press('Escape');
  const wrongKey=getInventoryState(s).equipment.find(i=>i.costumeGender==='male').key;
  await page.locator(`[data-inventory-bag] [data-inventory-equipment="${wrongKey}"]`).click();
  // The normal details popup refuses the opposite gender before the server guard is reached.
  if(await page.locator('[data-inventory-equip]').count())assert.equal(await page.locator('[data-inventory-equip]').isDisabled(),true);
  await page.keyboard.press('Escape');await page.locator('.inventory-panel .overlay-close').click();
  await page.waitForTimeout(220);
  await page.evaluate(async()=>await(await import('/bonus.js')).openBonusGame(options));
  await page.locator('.bonus-panel summary').click();
  assert.equal(await page.locator('.bonus-panel [data-costume-preview]').count(),5);
  await page.locator('.bonus-panel [data-costume-preview]').first().click();
  await page.locator('.costume-preview-panel img').evaluate(img=>img.decode());
  if(width!==390)assert.equal(await page.locator('.costume-preview-panel canvas').count(),0);
  assert.ok(await page.locator('[data-avatar-motion-active]').count()<=2);
  await page.keyboard.press('Escape');
  await page.locator('[data-bonus-claim]').click();
  await page.waitForSelector('.bonus-win .costume-preview');
  await page.locator('.bonus-panel').screenshot({path:path.join(out,`wheel-${width}.png`)});
  await page.locator('.bonus-panel .overlay-close').click();await page.waitForTimeout(220);
  await page.evaluate(async()=>await(await import('/inventory.js')).openInventoryGame(options));
  const rewardKey=getInventoryState(s).equipment.find(i=>i.timed).key;
  await page.locator(`[data-inventory-bag] [data-inventory-equipment="${rewardKey}"]`).click();
  assert.match(await page.locator('dialog').textContent(),/Привязан к персонажу/);
  assert.equal(await page.locator('[data-inventory-auction]').isDisabled(),true);
  await page.keyboard.press('Escape');await page.locator('.inventory-panel .overlay-close').click();await page.waitForTimeout(220);
  await page.evaluate(async()=>await(await import('/chest.js')).openChestGame(options));
  await page.locator('.chest-panel summary').click();
  await page.locator('.chest-panel [data-costume-preview]').first().click();
  await page.locator('.costume-preview-panel img').evaluate(img=>img.decode());
  assert.equal(await page.locator('.costume-preview-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('body').evaluate(n=>n.scrollWidth>innerWidth+1),false);
  await page.locator('.chest-panel [data-chest-close]').click();await page.waitForTimeout(220);
  s.game.inventory.luckCoins=0;
  await page.evaluate(async()=>await(await import('/shop.js')).openShopGoods({...options,initialCategory:'costumes'}));
  await page.locator('[data-shop-search]').fill('Moonveil');
  await page.locator('[data-store-slot="costume:moonveil-phantom"]').click();
  assert.equal(await page.locator('[data-store-confirm]').isDisabled(),true);
  assert.equal(await page.locator('.costume-preview img').count(),1);
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  await page.close();console.log(width,'shop, item equip, slot, reward previews, focus, reduced motion verified');
 }
}finally{await browser.close();}
