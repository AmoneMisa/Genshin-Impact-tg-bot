import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
const root=path.resolve('webapp'),out=path.resolve('.tmp/custom-item-icons');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const samples=['epic-weapon-astral-sword','armor-nightweave','ring-winged','catalog-a-armor-heavy-body','staff-sun','amulet-butterfly','boots-nightweave','gloves-nightweave','helmet-obsidian'];
try{for(const width of [320,390,820]){
 const page=await browser.newPage({viewport:{width,height:950},deviceScaleFactor:2,hasTouch:true,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<style>body{margin:0;padding:12px;background:#10130f}.samples{max-width:620px;margin:auto;display:grid;gap:12px}.large{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.large img{width:100%;height:auto}.item-grid{--item-grid-columns:repeat(9,minmax(0,1fr))}</style><main class="samples"></main>'});
  const bundle=assets.bundles.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://design.local/fixture');
 await page.evaluate(async samples=>{
  await(await import('/feature-styles.js')).ensureFeatureStyles();
  const {itemArtSources,itemArtKey}=await import('/art/items-art.js'),{CATALOG_ITEM_ART}=await import('/art/catalog-item-art.js'),{normalizeLootKind}=await import('/loot-renderer.js'),{itemGridHtml}=await import('/item-grid.js');
  const picture=(key,reveal)=>{const definition=CATALOG_ITEM_ART.find(r=>r.key===key);if(definition&&itemArtKey(normalizeLootKind(definition),definition)!==key)throw Error('Custom identity mismatch: '+key);const s=itemArtSources(key,reveal);return `<img class="loot-item-image" src="${s.src}" srcset="${s.srcset}" sizes="${reveal?'(max-width:390px) 96px, 200px':'32px'}" alt="">`;};
  document.querySelector('main').innerHTML=itemGridHtml(samples.map(key=>`<button class="item-grid-cell loot-art-2d" data-key="${key}">${picture(key,false)}</button>`),{min:27,label:'Кастомные предметы'})+'<div class="large">'+samples.map(key=>`<div class="loot-art-2d">${picture(key,true)}</div>`).join('')+'</div>';
  await Promise.all([...document.images].map(i=>i.decode()));
 },samples);
 assert.equal(await page.locator('canvas').count(),0);assert.ok(await page.locator('.item-grid').evaluate(g=>g.getBoundingClientRect().height<240),'Grid must show compact complete rows');
 assert.ok(await page.locator('img').evaluateAll(images=>images.every(i=>i.naturalWidth>0&&/-128\.webp$|-256\.webp$|-512\.webp$/.test(i.currentSrc)&&getComputedStyle(i).imageRendering==='auto'&&getComputedStyle(i).animationName==='none')));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('.item-grid-cell').first().focus();
 await page.locator('.item-grid-cell').first().evaluate(b=>b.classList.add('selected'));
 assert.deepEqual(errors,[]);await page.locator('main').screenshot({path:path.join(out,width+'.png')});
 await page.close();console.log(`PASS ${width}: full-detail custom icons, shared grid, focus, reduced motion, no overflow`);
}}finally{await browser.close();}
