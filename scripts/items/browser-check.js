// Optional visual QA: PLAYWRIGHT_MODULE can point to a local Playwright install.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BASE_ITEM_ART_KEYS, ITEM_ART_KEYS, ITEM_ART_VARIANTS, EPIC_ITEM_ART_KEYS } from '../../webapp/art/items-art.js';
import { CATALOG_ITEM_ART } from '../../webapp/art/catalog-item-art.js';
import epicWeapons from '../../template/epicWeapons.js';
import { SPECIAL_ITEM_ART } from '../../webapp/art/special-item-art.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const modulePath=process.env.PLAYWRIGHT_MODULE;
const {chromium}=await import(modulePath?pathToFileURL(modulePath).href:'playwright');
const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/loot-renderer.css"><link rel="stylesheet" href="/loot-forge.css"><link rel="stylesheet" href="/item-art.css">
<style>body{margin:0;padding:16px;background:#111723;color:#eee;font:14px system-ui}h1{font-size:20px}main{max-width:700px;margin:auto}.hero{padding:8px;border-radius:20px;background:radial-gradient(ellipse,#302650,#171e2a);text-align:center}.hero .loot-art{height:270px;width:220px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:16px}article{border:1px solid #ffffff15;border-radius:16px;background:#1a2230;padding:10px;text-align:center;min-width:0}article .loot-art{width:96px;height:144px}article p{margin:6px;text-transform:capitalize}</style></head>
<body><main><h1>Celestial equipment</h1><div class="hero" id="hero"></div><div class="grid" id="grid"></div></main>
<script type="module">import {renderLootArt} from '/loot-renderer.js';import {startItemArt} from '/item-art-runtime.js';
startItemArt();document.querySelector('#hero').innerHTML=renderLootArt({kind:'staff',grade:'S84'},{reveal:true});
const keys=${JSON.stringify(BASE_ITEM_ART_KEYS)};const variants=${JSON.stringify(ITEM_ART_VARIANTS)};const robe={mantle:'armor',bracers:'gloves','leg-wraps':'greaves',anklets:'boots'};
const items=keys.map(key=>({key,item:{...(robe[key]?{kind:'robe',category:robe[key]}:key==='greatsword'?{kind:'twoHandedSword'}:key==='sigil'?{kind:'sigill'}:{kind:key}),grade:'D'}}));
items.push(...variants.map(v=>({key:v.key,item:{kind:v.type||v.kind,category:v.kind,grade:v.grades.at(-1)}})));
items.push(...${JSON.stringify(EPIC_ITEM_ART_KEYS)}.map(key=>({key,item:{epicBoss:key.slice(5),kind:'ring',grade:'S'}})));
items.push(...${JSON.stringify(CATALOG_ITEM_ART)}.map(item=>({key:item.key,item})));
items.push(...${JSON.stringify(epicWeapons.filter(w=>SPECIAL_ITEM_ART.includes(w.artKey)))}.map(w=>({key:w.artKey,item:{epicWeapon:w.id,kind:w.kind,grade:'S84'}})));
document.querySelector('#grid').innerHTML=items.map(({key,item})=>'<article data-expected-art="'+key+'">'+renderLootArt(item)+'<p>'+key+'</p></article>').join('');
</script></body></html>`;
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/preview'){res.setHeader('content-type','text/html');res.end(html);return;}
  const file=path.resolve(root,'webapp','.'+url.pathname);
  if(!file.startsWith(path.join(root,'webapp')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({headless:true,...(process.env.ITEM_ART_BROWSER ? {executablePath:process.env.ITEM_ART_BROWSER} : {})});
  const results=[];
  for(const width of [390,320]){
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:width===390?2:3,isMobile:true,hasTouch:true});
    const page=await context.newPage(),requests=[],errors=[];
    page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/preview`);
    await page.waitForFunction(count=>document.querySelectorAll('article').length===count,ITEM_ART_KEYS.length);
    for(const image of await page.locator('.loot-item-image').all()){
      await image.evaluate(img=>img.scrollIntoView({block:'center'}));
      await image.evaluate(img=>img.decode());
    }
    assert.equal(await page.locator('canvas').count(),0);
    assert.ok(!requests.some(url=>/\.glb|\/models\/|loot-webgl|generated_images/.test(url)));
    assert.deepEqual(errors,[]);
    const mismatches=await page.locator('article').evaluateAll(cards=>cards.map(card=>({expected:card.dataset.expectedArt,actual:card.querySelector('.loot-art').dataset.artKey})).filter(item=>item.expected!==item.actual));
    assert.deepEqual(mismatches,[],'each variant uses its own painting');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false);
    const sources=await page.locator('article img').evaluateAll(images=>images.map(img=>img.currentSrc));
    assert.ok(sources.every(src=>src.endsWith('-256.webp')),'thumbnails cap at 256 px even at DPR 3');
    await page.locator('#hero').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#hero .loot-art').classList.contains('is-art-visible'));
    assert.equal(await page.locator('#hero img').evaluate(img=>getComputedStyle(img).animationPlayState),'running');
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.locator('#hero img').evaluate(img=>getComputedStyle(img).animationName),'none');
    fs.mkdirSync(path.join(root,'docs'),{recursive:true});
    if(width===390)await page.screenshot({path:path.join(root,'docs/item-art-mobile.png')});
    await page.locator('article img').first().evaluate(img=>{img.removeAttribute('srcset');img.src='/art/items/v1/missing.webp';});
    await page.waitForSelector('.art-unavailable',{state:'attached'});
    results.push({width,paintings:ITEM_ART_KEYS.length,modelRequests:0,overflow:false});
    await context.close();
  }
  console.log(JSON.stringify(results));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
