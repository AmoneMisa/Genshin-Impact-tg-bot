import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath}from 'node:url';
import{createRequire}from 'node:module';
import assert from'node:assert/strict';
import crypto from'node:crypto';
import{GWENT_DECKS}from '../../../webapp/gwent-decks.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');

export async function checkDeck(directory,spec={}) {
const{chromium}=require('playwright'),sharp=require('sharp'),out=path.resolve(directory);
const WILD_HUNT_DECK=GWENT_DECKS[spec.faction||'wild-hunt'];
const packageName=path.basename(out),expected=WILD_HUNT_DECK.cards.length+WILD_HUNT_DECK.leaders.length+(spec.tokens||[]).length;
const report=JSON.parse(fs.readFileSync(path.join(out,'deck-manifest.json'))),quotes=JSON.parse(fs.readFileSync(path.join(out,'quotes.json')));
assert.equal(report.complete,true);assert.equal(report.cards.length,expected);assert.deepEqual(report.missing,[]);
assert.equal(report.cards.filter(c=>c.kind==='leader').length,4);assert.equal(report.textMetrics.length,report.cards.filter(c=>c.quoteOrigin==='fan-written'&&!c.reuse).length);assert.equal(report.loadout.stats.valid,true);
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');assert.equal(hash(path.join(out,'back.webp')),hash('webapp/art/gwent/printed/back-'+WILD_HUNT_DECK.id+'.webp'));
// The hero medallion is one opaque object, never a set of gold-colored fragments.
const {data:medallion,info:medalInfo}=await sharp(path.join(out,'layers/power-hero-10-clean-v2.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const seen=new Uint8Array(medalInfo.width*medalInfo.height);let components=0;
for(let y=0;y<medalInfo.height;y++)for(let x=0;x<medalInfo.width;x++){
 const at=y*medalInfo.width+x;
 if(Math.hypot(x-44,y-44)<40)assert.equal(medallion[at*4+3],255,'medallion has a transparent hole');
 if(!medallion[at*4+3]||seen[at])continue;
 components++;const queue=[at];seen[at]=1;
 for(let p=0;p<queue.length;p++){
  const v=queue[p],xx=v%medalInfo.width,yy=Math.floor(v/medalInfo.width);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
   const nx=xx+dx,ny=yy+dy,n=ny*medalInfo.width+nx;
   if(nx>=0&&ny>=0&&nx<medalInfo.width&&ny<medalInfo.height&&!seen[n]&&medallion[n*4+3]){seen[n]=1;queue.push(n);}
  }
 }
}
assert.equal(components,1,'detached fragments around hero medallion');
for(const card of report.cards){
 for(const k of ['file','webp']){const m=await sharp(path.join(out,card[k])).metadata();assert.equal(m.width,310);assert.equal(m.height,585);}
 if(card.quoteOrigin==='fan-written'){assert.equal(card.quote,quotes[card.id]);assert.ok(card.quote);}
}
for(const card of report.cards.filter(c=>c.reuse)){const dir=path.resolve(out,card.reuse);assert.equal(hash(path.join(out,card.file)),hash(path.join(dir,card.file)));assert.equal(hash(path.join(out,card.webp)),hash(path.join(dir,card.webp)));}
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:950},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),prefix='/output/gwent-review/'+packageName+'/';let file;
   if(url.pathname==='/')file=path.join(out,'index.html');
   else if(url.pathname.startsWith(prefix))file=path.join(out,url.pathname.slice(prefix.length));
   else if(url.pathname==='/webapp/design-system.css')file=path.resolve('webapp/design-system.css');
   else file=path.join(out,url.pathname.slice(1));
   try{await route.fulfill({contentType:({'.html':'text/html; charset=utf-8','.png':'image/png','.webp':'image/webp','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch{await route.fulfill({status:404});}
  });
  await page.goto('http://gwent-review.local/output/gwent-review/'+packageName+'/index.html');
  assert.equal(await page.locator('[data-face]').count(),expected);
  await page.locator('[data-face="'+(spec.detailId||'wh-portal-mage')+'"]').click();
  assert.equal(await page.locator('#title').innerText(),report.cards.find(c=>c.id===(spec.detailId||'wh-portal-mage')).name);
  assert.ok((await page.locator('#meta').innerText()).includes(quotes[spec.detailId||'wh-portal-mage']));
  await page.locator('#big').evaluate(n=>n.decode());
  assert.equal(await page.locator('#big').evaluate(n=>n.complete&&n.naturalWidth===310),true);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#viewer').isHidden(),true);
  assert.equal(await page.locator('[data-face="'+(spec.detailId||'wh-portal-mage')+'"]').evaluate(n=>n===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>[...document.querySelectorAll('.face>img')].slice(0,4).every(n=>n.complete&&n.naturalWidth));await page.screenshot({path:path.join(out,`gallery-${width}.png`)});
  assert.deepEqual(errors,[]);await page.close();console.log('PASS gallery '+width+': '+expected+' faces, readable detail, quote, Escape/focus, no overflow/errors');
 }
}finally{await browser.close();}
console.log('PASS '+WILD_HUNT_DECK.title+': '+expected+' PNG/WebP faces at 310x585, exact authored quotes, valid loadout, existing back byte-identical.');

}
