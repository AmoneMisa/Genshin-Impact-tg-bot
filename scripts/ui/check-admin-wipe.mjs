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
  const calls=[];
  await page.evaluate(async()=>{
   await(await import('/feature-styles.js')).ensureFeatureStyles();
   (await import('/overlay-a11y.js')).installOverlayA11y();
   window.wipeCalls=[];
   const tools={players:[{userId:'1',name:'Первый'},{userId:'2',name:'Второй'}],playerTools:[{id:'wipe_character',label:'Вайп персонажа',destructive:true}],chatTools:[],globalTools:[]};
   await(await import('/admin.js')).openAdminGame({haptic:()=>{},api:async(url,options)=>{
    if(options?.method==='POST'){window.wipeCalls.push(JSON.parse(options.body));return {ok:true,message:'Персонаж сброшен.'};}
    return url==='/api/admin'?{promos:[],notices:[]}:tools;
   }});
  });
  await page.locator('[data-admin-tab="tools"]').click();await page.locator('[data-t-player]').waitFor({state:'attached'});
  assert.equal(await page.locator('[data-t-player-tool="wipe_character"]').count(),0);
  await page.locator('.admin-overlay details summary').click();
  const pick=page.getByRole('combobox',{name:'Игрок'});
  await pick.click();await page.locator('.admin-overlay').getByRole('option',{name:'Второй'}).click();
  await page.locator('[data-t-wipe]').click();
  const confirm=page.getByRole('button',{name:'Вайпнуть персонажа'});
  assert.equal(await confirm.isDisabled(),true);
  await page.getByRole('textbox',{name:'ID для подтверждения'}).fill('1');assert.equal(await confirm.isDisabled(),true);
  await page.getByRole('button',{name:'Отмена',exact:true}).click();assert.equal(await page.evaluate(()=>window.wipeCalls.length),0);
  await page.locator('[data-t-wipe]').click();await page.getByRole('textbox',{name:'ID для подтверждения'}).fill('2');
  await confirm.click();await page.waitForFunction(()=>window.wipeCalls.length===1);
  assert.deepEqual(await page.evaluate(()=>window.wipeCalls),[{scope:'player',userId:'2',action:'wipe_character',confirmUserId:'2'}]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await page.close();console.log(`PASS selected-player wipe, explicit ID, cancellation and layout ${width}px`);
 }
} finally {await browser.close();}
