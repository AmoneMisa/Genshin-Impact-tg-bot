import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';

const root=path.resolve('webapp');
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try {
 for(const width of [320,390,820]) {
  const page=await browser.newPage({viewport:{width,height:950}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><main style="padding:16px">
    <section class="storage-panel"><div class="storage-actions"><button>Основное действие</button><button id="storage-action">Действие</button></div><input aria-label="Поиск" placeholder="Поиск"></section>
    <section class="buffs-overlay"><div class="party-actions"><button id="buff-action">Действие</button></div><label class="feedback-field"><input id="buff-check" type="checkbox"> Бафф игроку</label></section>
    <label class="merchant-filter"><input id="shop-check" type="checkbox"> Подходит мне</label>
    <label><input id="radio" type="radio" name="mode"> Режим</label>
    <select aria-label="Раздел"><option value="a">Первый</option><option value="b">Второй</option><option disabled>Недоступный</option></select>
    <nav class="ui-folder-tabs" aria-label="Фильтры"><button class="active">Все</button><button>Экипировка</button></nav>
   </main></body>`});
   const bundle=assets.bundles.find(b=>b.path===url.pathname);
   if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
   const file=path.resolve(root,'.'+url.pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4321/fixture.html');
  await page.evaluate(async()=>{
   await(await import('/feature-styles.js')).ensureFeatureStyles();
   (await import('/design/select.js')).observeSelects(document.body);
  });
  const skin=selector=>page.locator(selector).evaluate(el=>{const c=getComputedStyle(el);return {background:c.background,border:c.border,borderRadius:c.borderRadius,color:c.color,height:c.height};});
  assert.deepEqual(await skin('#shop-check'),await skin('#buff-check'),'checkbox skins must match across features');
  assert.deepEqual(await skin('#storage-action'),await skin('#buff-action'),'equivalent action skins must match');
  await page.locator('#shop-check').check();await page.locator('#buff-check').check();
  assert.deepEqual(await skin('#shop-check'),await skin('#buff-check'),'checked state must be shared');
  await page.locator('#radio').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#radio').isChecked(),true);
  const select=page.getByRole('combobox',{name:'Раздел'});
  await select.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  assert.equal(await page.locator('select').inputValue(),'b');
  await page.locator('select').evaluate(el=>{el.disabled=true;});await page.waitForFunction(()=>document.querySelector('.ds-select-trigger').disabled);
  await page.evaluate(()=>document.querySelector('main').insertAdjacentHTML('beforeend','<select aria-label="Новый"><option>Динамический</option></select>'));
  await page.getByRole('combobox',{name:'Новый'}).waitFor();
  await page.evaluate(async()=>{
   const {dialogHeading}=await import('/dialog-heading.js');
   const dialog=document.createElement('dialog');dialog.className='game-dialog-panel';dialog.innerHTML=dialogHeading('Предмет')+'<button>Использовать</button>';
   dialog.querySelector('[data-dismiss]').onclick=()=>{dialog.close();dialog.remove();};document.body.append(dialog);dialog.showModal();
  });
  await page.getByRole('button',{name:'Закрыть'}).click();assert.equal(await page.locator('dialog').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS shared controls, deferred CSS, native states, dynamic selects and popup ${width}px`);
 }
} finally {await browser.close();}
