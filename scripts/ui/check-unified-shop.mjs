import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {getShopState,buyShopItem} from '../../miniapp/shop.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const root=path.resolve('webapp'),out=path.resolve('docs/unified-shop-2026-10-12');
fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try {
 for(const width of [320,390,1100]) {
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const hero={game:{stats:{lvl:84},gameClass:{stats:{name:'humanWizard'},skills:[]},inventory:{gold:1000000,luckCoins:1000,equipment:{items:[]},potions:{items:[]}}}};
  await page.exposeFunction('shopApi',async(url,options)=>url==='/api/shop/buy' ? buyShopItem(hero,JSON.parse(options.body).command) : getShopState(hero));
  await page.route('**/*',async route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4321/fixture.html');
  await page.evaluate(async()=>{(await import('/design/select.js')).observeSelects(document.body);});
  await page.evaluate(async()=>{await(await import('/shop.js')).openShopGame({api:window.shopApi,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')});});
  assert.equal(await page.locator('[data-store-category="catalog"], [data-store-category="exchange"]').count(),0);
  assert.match(await page.locator('[data-store-category="mammon"] img').getAttribute('src'),/ancient_adena/);
  assert.match(await page.locator('[data-store-category="fishing"] img').getAttribute('src'),/weapon_fishing_rod/);
  await page.locator('.l2-store-panel').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
  assert.equal(await page.locator('.l2-store-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  await page.locator('.l2-store-panel').screenshot({path:path.join(out,`categories-${width}.png`)});
  await page.locator('[data-dismiss]').click();
  await page.evaluate(async()=>{await(await import('/shop.js')).openShopGoods({api:window.shopApi,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),initialCategory:'epic'});});
  assert.ok(await page.locator('.store-grid').evaluate(n=>new Set([...n.querySelectorAll('img')].map(i=>i.src)).size)>=8);
  await page.locator('[data-store-slot="col:timed:epic:freyaExtreme"]').click();
  assert.match(await page.locator('.store-info').textContent(),/7 дней · \+8/);
  assert.match(await page.locator('.store-icon img').getAttribute('src'),/queen_of_ice_necklace/);
  assert.ok(await page.locator('.shop-item-stats li').count());
  assert.equal(await page.locator('.store-slot.selected').evaluate(n=>getComputedStyle(n).borderColor),'rgb(241, 139, 199)');
  await page.locator('.shop-panel').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
  assert.equal(await page.locator('.shop-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  await page.locator('.shop-panel').screenshot({path:path.join(out,`epic-${width}.png`)});
  await page.locator('[data-store-confirm]').click();
  await page.waitForFunction(()=>document.querySelector('[data-shop-feedback]').textContent.includes('Куплено'));
  assert.equal(hero.game.inventory.equipment.items[0].enchant,8);
  assert.equal(hero.game.inventory.equipment.items[0].shadow,true);
  await page.locator('[data-shop-categories] .ds-select-trigger').click();
  await page.getByRole('option',{name:'Квест',exact:true}).click();
  assert.equal(await page.locator('[data-store-slot]').count(),7);
  await page.locator('[data-store-slot="col:pass-valakas"]').click();
  assert.match(await page.locator('.store-icon img').getAttribute('src'),/vacualite_glowing_white/);
  await page.locator('[data-dismiss]').click();
  await page.evaluate(async()=>{
   window.merchantQueries=[];
   const state={merchant:'mammon',merchants:[{id:'mammon',title:'Маммон',subtitle:'Самоцветы и рецепты'}],gold:100000,aa:0,items:[],facets:{grades:[],groups:[{id:'recipe',label:'Рецепты'},{id:'material',label:'Материалы'}]},page:1,pages:1,total:0,convert:[]};
   await(await import('/merchants.js')).openMerchantsGame({initialMerchant:'mammon',haptic:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{merchantQueries.push(JSON.parse(options.body));return structuredClone(state);}});
  });
  assert.equal(await page.locator('[data-tab]').count(),0);
  const trigger=page.locator('.ds-select-trigger');await trigger.click();
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  await trigger.press('ArrowDown');await trigger.press('Enter');
  await page.waitForFunction(()=>window.merchantQueries.at(-1).group==='recipe');
  assert.equal(await page.locator('.ds-select-trigger').textContent(),'Рецепты');
  await page.locator('.ds-select-trigger').click();await page.locator('.ds-select-trigger').press('Escape');
  assert.equal(await page.locator('.ds-select-trigger').getAttribute('aria-expanded'),'false');
  await page.locator('.ds-select-trigger').click();
  await page.locator('.merchants-panel').screenshot({path:path.join(out,`dropdown-${width}.png`)});
  await page.evaluate(()=>{
   const fixture=document.createElement('section');fixture.className='game-overlay';fixture.style.display='none';
   fixture.innerHTML=`<div class="overlay-panel"><button class="equipment-filter active">D</button><button class="ds-round">×</button><button class="mmo-round" disabled>×</button><div class="forms-tabs"><button class="active">Настройки</button></div><div class="auction-register-field"><input type="number"></div><div class="forms-field"><input type="text"></div><textarea></textarea><div class="paper-doll-stage has-portrait"><button class="paper-doll-slot"></button></div></div>`;document.body.append(fixture);
  });
  const wrong=await page.evaluate(()=>[...document.querySelectorAll('button,input:not([type=checkbox]):not([type=radio]):not([type=range]),textarea')].filter(n=>getComputedStyle(n).borderRadius!=='6px').map(n=>({tag:n.tagName,classes:n.className,radius:getComputedStyle(n).borderRadius})));
  assert.deepEqual(wrong,[]);
  assert.equal(await page.locator('.merchants-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS ${width}px: common shop, epic purchase +8, quest art, themed dropdown, keyboard and consistent control radii`);
 }
} finally {await browser.close();}
