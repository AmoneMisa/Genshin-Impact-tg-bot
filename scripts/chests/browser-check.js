import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/chest.css"><style>:root{--safe-bottom:0px}body{margin:0;background:#080b12}</style><script type="module">
import {openChestGame} from '/chest.js';
window.launch=async(options={})=>{
let n=0, failed=false;window.calls=0;window.rendered=0;
await openChestGame({haptic:()=>{},renderState:()=>window.rendered++,statusElement:document.createElement('p'),api:async(url)=>{
if(url==='/api/chest')return {available:!options.unavailable,opened:options.history?[1]:[],selectionsLeft:options.unavailable?0:3};
window.calls++;if(options.delay)await new Promise(r=>setTimeout(r,options.delay));
if(options.fail&&!failed){failed=true;throw new Error('Попробуй ещё раз');}
n++;return {tries:n===3?0:1,selectionsLeft:3-n,opened:Array.from({length:n},(_,i)=>i+1),completed:n===3,state:{},prize:n===2?{type:'nothing',label:'Пусто',amount:0}:{type:'gold',label:'Золото',amount:12000}};
}});};await window.launch();</script>`;
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/preview'){res.setHeader('content-type','text/html');res.end(html);return;}
  const file=path.resolve(root,'webapp','.'+url.pathname);
  if(!file.startsWith(path.join(root,'webapp')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
  for(const width of [320,390]){
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page=await context.newPage(), requests=[],errors=[];
    page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/preview`);
    await page.waitForSelector('.chest-tile');
    await page.locator('.chest-art-closed').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
    assert.equal(await page.locator('canvas').count(),0);
    assert.ok(!requests.some(u=>/\.glb|three|loot-gltf/.test(u)));
    assert.ok((await page.locator('.chest-art-image').evaluateAll(imgs=>imgs.map(i=>i.currentSrc))).every(u=>u.endsWith('-256.webp')));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.waitForTimeout(900);
    if(width===390)await page.screenshot({path:path.join(root,'docs/chests-mobile.png')});
    for(let n=1;n<=3;n++){
      await page.locator('[data-chest-id="'+n+'"]').click();
      await page.waitForSelector('.chest-reveal.visible');
      await page.locator('.chest-reveal .chest-art-open').evaluate(i=>i.decode());
      assert.equal(await page.locator('.chest-reveal .has-treasure').count(),n===2?0:1);
      if(width===390&&n===1){await page.waitForTimeout(1100);await page.screenshot({path:path.join(root,'docs/chests-open-mobile.png')});}
      await page.locator('[data-chest-claim]').click();
      await page.waitForSelector('.chest-reveal[hidden]',{state:'attached'});
    }
    await page.waitForSelector('.chest-summary-host.visible');
    assert.equal(await page.locator('.chest-tile:disabled').count(),9);
    assert.equal(await page.locator('.chest-art.depleted').count(),9);
    assert.equal(await page.evaluate(()=>window.calls),3);
    await page.locator('.chest-head [data-chest-close]').click();await page.waitForSelector('.chest-overlay',{state:'detached'});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>window.launch({fail:true}));
    await page.locator('[data-chest-id="1"]').click();
    await page.waitForFunction(()=>document.querySelector('.chest-result').textContent.includes('ещё'));
    assert.equal(await page.locator('.chest-tile:enabled').count(),9);
    await page.locator('[data-chest-id="1"]').click();await page.waitForSelector('.chest-reveal.visible');
    assert.equal(await page.locator('.chest-art-image').first().evaluate(i=>getComputedStyle(i).transitionDuration),'0s');
    await page.locator('.chest-head [data-chest-close]').click();await page.waitForSelector('.chest-overlay',{state:'detached'});
    await page.evaluate(()=>window.launch({history:true}));assert.equal(await page.locator('.historical .depleted').count(),1);
    await page.locator('.chest-art-closed').nth(1).evaluate(i=>{i.removeAttribute('srcset');i.src='/missing.webp';});
    await page.waitForSelector('.chest-art-image.failed',{state:'attached'});
    assert.equal(await page.locator('.chest-art-fallback').nth(1).evaluate(i=>getComputedStyle(i).display),'grid');
    await page.locator('.chest-head [data-chest-close]').click();await page.waitForSelector('.chest-overlay',{state:'detached'});
    await page.evaluate(()=>window.launch({unavailable:true}));await page.waitForSelector('.chest-summary-host.visible');assert.equal(await page.locator('.depleted').count(),9);
    await page.locator('.chest-head [data-chest-close]').click();await page.waitForSelector('.chest-overlay',{state:'detached'});
    await page.evaluate(()=>window.launch({delay:500}));await page.locator('[data-chest-id="1"]').click();await page.locator('.chest-head [data-chest-close]').click();await page.waitForTimeout(900);
    assert.equal(await page.locator('.chest-overlay').count(),0);assert.equal(await page.evaluate(()=>window.rendered),1);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({width,flow:'passed',modelRequests:0}));await context.close();
  }
} finally {await browser?.close();await new Promise(r=>server.close(r));}

