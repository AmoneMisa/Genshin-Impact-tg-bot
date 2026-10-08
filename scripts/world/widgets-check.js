import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${['styles','exchange','arena','clan','equipment','equipment-paper-doll','arcade','point21','icons','design-system'].map(n=>`<link rel="stylesheet" href="/${n}.css">`).join('')}
<style>body{margin:0;background:#0b0d18;color:white}main{padding:12px;max-width:420px;margin:auto}section{min-width:0;margin-bottom:16px}.paper-doll-loadout{width:100%}.badges{display:flex;gap:10px;flex-wrap:wrap}</style>
<main><section id="packs"></section><section class="badges" id="badges"></section><section id="doll"></section><section id="arcade"></section></main>
<script type="module">
import {starsHtml} from '/exchange.js';import {rankEmblem,openArenaGame} from '/arena.js';import {openClanGame} from '/clan.js';
import {renderEquipmentPaperDoll} from '/equipment-paper-doll.js';import {fullBodyHeroUrl} from '/art/world-art.js';import {stageHtml,playThrow} from '/arcade-stage.js';
document.querySelector('#packs').innerHTML=starsHtml({firstPurchase:true,packs:['pouch','sack','casket','chest','trove','vault'].map((id,i)=>({id,title:id,crystals:(i+1)*1000,stars:(i+1)*100,firstBonus:100,bonusPercent:10}))});
document.querySelector('#badges').innerHTML=['Бронза III','Серебро II','Золото I','Бриллиант I'].map(n=>rankEmblem(n,'large')).join('');
window.showHero=(cls,gender)=>renderEquipmentPaperDoll(document.querySelector('#doll'),{items:[],equippedSlots:{}},{portrait:fullBodyHeroUrl({className:cls,gender})});showHero('warrior','male');
document.querySelector('#arcade').innerHTML=stageHtml('basketball',{lastValue:4});
window.throwBall=()=>playThrow(document.querySelector('[data-stage="basketball"]'),'basketball',4);
window.showArena=()=>openArenaGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('p'),api:async url=>({mode:new URL(url,location.origin).searchParams.get('mode')||'common',rank:'Рубин I',rating:4500,position:7,totalPlayers:100,chances:5,maxChances:5,ranks:[],leaderboard:[]})});
window.showClan=level=>openClanGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('p'),api:async()=>({clan:{name:'WhiteOrder',level,members:[],reputation:1200,warehouse:{gold:12000,crystals:8000,ironOre:3000},myContribution:100,myRole:'member',levelProgress:{current:500,needed:1000}},quiz:{available:false}})});
</script>`;
const server=http.createServer((req,res)=>{
  if(req.url==='/preview'){res.setHeader('content-type','text/html');res.end(html);return;}
  const file=path.resolve(root,'webapp','.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(path.join(root,'webapp')+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
  for(const width of [320,390]){
    const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:3,reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/preview`);await page.waitForSelector('.ex-pack');
    for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
    assert.equal(await page.locator('.ex-pack').count(),6);
    assert.equal(await page.locator('.ex-pack .world-painted-icon').count(),6);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const cls of ['noClass','warrior','archer','mage','priest'])for(const gender of ['male','female']){
      await page.evaluate(([c,g])=>showHero(c,g),[cls,gender]);
      const bg=await page.locator('.paper-doll-portrait').evaluate(n=>getComputedStyle(n).backgroundImage);
      assert.ok(bg.includes(`/heroes/${cls}-${gender}-512.webp`));
      assert.equal(await page.locator('.paper-doll-portrait').evaluate(n=>getComputedStyle(n).backgroundSize),'contain');
    }
    assert.equal(errors.length,0,errors.join('\n'));await page.evaluate(()=>showHero('warrior','male'));
    await page.screenshot({path:path.join(root,`docs/world-widgets-${width}.png`),fullPage:true});
    await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>throwBall());
    assert.equal(await page.locator('.as-shot.after-hit').count(),1);await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>showArena());await page.waitForSelector('.arena-overlay.visible');
    assert.ok(await page.locator('.arena-hero-art').evaluate(n=>getComputedStyle(n).backgroundImage.includes('arena-normal-512.webp')));
    await page.locator('[data-mode="expansion"]').click();await page.waitForSelector('.arena-hero-art.expansion');
    assert.ok(await page.locator('.arena-hero-art').evaluate(n=>getComputedStyle(n).backgroundImage.includes('arena-ranked-512.webp')));
    assert.equal(await page.locator('.arena-rank .painted img').count(),1);
    if(width===390)await page.screenshot({path:path.join(root,'docs/arena-mobile.png')});
    await page.locator('.arena-overlay .overlay-close').click();await page.waitForSelector('.arena-overlay',{state:'detached'});
    for(const [level,tier] of [[1,1],[6,2],[11,3],[21,4]]){
      await page.evaluate(l=>showClan(l),level);await page.waitForSelector('.clan-overlay.visible');
      const banner=page.locator('.clan-banner img');await banner.evaluate(i=>i.decode());
      assert.ok((await banner.getAttribute('src')).includes('clan-banner-'+tier+'-256.webp'));
      assert.ok(await page.locator('.clan-hero').evaluate(n=>getComputedStyle(n).backgroundImage.includes('clan-hero-512.webp')));
      assert.equal(await page.locator('.clan-panel').evaluate(n=>n.scrollWidth>n.clientWidth),false);
      if(width===390&&tier===4)await page.screenshot({path:path.join(root,'docs/clan-mobile.png')});
      await page.locator('.clan-overlay .overlay-close').click();await page.waitForSelector('.clan-overlay',{state:'detached'});
    }
    assert.equal(errors.length,0,errors.join('\n'));
    console.log(JSON.stringify({width,packs:6,heroes:10,overflow:false}));await context.close();
  }
}finally{await browser?.close();server.close();}
