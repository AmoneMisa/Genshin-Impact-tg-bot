import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require = createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE || 'package.json'));
const {chromium} = require('playwright');
const browser = await chromium.launch({headless:true, executablePath:process.env.DESIGN_BROWSER});
const root = path.resolve('webapp');
const styles = [...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try {
  for (const width of [320,390,1100]) {
    const page = await browser.newPage({viewport:{width,height:850}});
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/*', async route=>{
      const pathname = new URL(route.request().url()).pathname;
      if (pathname === '/fixture.html') return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
      const file = path.resolve(root,'.'+pathname);
      if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return route.fulfill({status:404});
      return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    await page.goto('http://127.0.0.1:4321/fixture.html');
    await page.evaluate(async()=>{
      window.requests=[];
      const {openShopGame}=await import('/shop.js');
      await openShopGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{
        const q=options?.body?JSON.parse(options.body):{}; window.requests.push({url,...q});
        if(url==='/api/shop')return {gold:1000,categories:[{id:'shots',title:'Заряды'}],items:[]};
        return {merchant:q.merchant,gold:1000,aa:0,merchants:[{id:q.merchant,title:'Торговец',subtitle:'Товары'}],facets:{grades:[],groups:[]},rows:[],items:[],page:1,pages:1,total:0,convert:[]};
      }});
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-store-category]').count(),15);
    await page.locator('.l2-store-grid').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
    assert.equal(await page.locator('.l2-store-grid img[src$=".webp"]').count(),15);
    assert.equal(await page.locator('.l2-store-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    if(width===390)await page.locator('.l2-store-panel').screenshot({path:'docs/l2-shop-390.png'});
    await page.locator('[data-store-category=quest]').click({force:true});
    assert.match(await page.locator('.l2-store-notice').textContent(),/пока не продаются/);
    await page.locator('[data-store-category=arrows]').click();
    await page.waitForTimeout(250);
    assert.ok(await page.evaluate(()=>requests.some(q=>q.url==='/api/merchants'&&q.merchant==='weapons'&&q.group==='ammo')));
    await page.locator('.merchants-overlay .overlay-close').click();
    await page.waitForTimeout(250);
    await page.locator('[data-store-category=shots]').click();
    await page.waitForTimeout(250);
    assert.ok(await page.locator('.shop-overlay').isVisible());
    await page.locator('.shop-overlay .overlay-close').click();
    await page.waitForTimeout(250);
    assert.ok(await page.locator('.l2-store-grid').isVisible());
    await page.locator('.l2-store-overlay .overlay-close').click();
    await page.waitForTimeout(250);
    await page.evaluate(async()=>{
      const {openAuctionGame}=await import('/auction.js');
      const lots=Array.from({length:15},(_,i)=>({id:String(i),kind:i===1?'material':'equipment',mainType:i===1?null:'weapon',materialKey:i===1?'l2_1865':null,artItem:{name:'Long Sword',grade:'noGrade',mainType:'weapon',kind:'oneHandedSword',category:'sword'},title:i===1?'Кожа':'Long Sword',enchant:i===0?4:0,grade:i===1?null:'noGrade',count:i===1?80:1,price:1000+i*200,sellerName:'Торговец',hoursLeft:24,mine:false,stats:['Физ. атака +50']}));
      window.auctionState={gold:900000,fee:.05,hours:48,maxLots:10,lots,mine:[],sellable:[{...lots[0],ref:'item-0'}]};
      await openAuctionGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{
        if(url==='/api/auction/buy'){
          const {lotId}=JSON.parse(options.body),lot=auctionState.lots.find(l=>l.id===lotId);
          auctionState.gold-=lot.price;auctionState.lots=auctionState.lots.filter(l=>l.id!==lotId);
          return {auction:auctionState};
        }
        return auctionState;
      }});
    });
    await page.waitForTimeout(250);
    await page.locator('.auction-panel').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
    assert.equal(await page.locator('.auction-table tbody tr').count(),width<=600?6:12);
    assert.equal(await page.locator('.auction-panel select').count(),0,'no native dropdowns');
    assert.ok(await page.locator('[data-auction-search]').getAttribute('placeholder'));
    assert.equal(await page.locator('[data-auction-search]').evaluate(n=>getComputedStyle(n).borderRadius),'2px','input style survives global theme');
    await page.locator('[data-dropdown=type] summary').click();
    await page.locator('[data-dropdown=type] [data-choice=material]').click();
    assert.equal(await page.locator('.auction-table tbody tr').count(),1,'custom category filter');
    await page.locator('[data-auction-reset]').click();
    await page.locator('[data-dropdown=grade] summary').focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('[data-dropdown=grade]').getAttribute('open'),'');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-dropdown=grade]').getAttribute('open'),null);
    assert.equal(await page.locator('.auction-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'auction overflow');
    if(width===390)await page.locator('.auction-panel').screenshot({path:'docs/l2-auction-390.png'});
    if(width===1100)await page.locator('.auction-panel').screenshot({path:'docs/l2-auction-desktop.png'});
    if(width===390){
      await page.locator('[data-dropdown=type] summary').click();
      await page.locator('.auction-panel').screenshot({path:'docs/l2-auction-dropdown-390.png'});
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-auction-search]').fill('Кожа');
    await page.locator('[data-auction-search-form] button[type=submit]').click();
    assert.equal(await page.locator('.auction-table tbody tr').count(),1);
    await page.locator('[data-auction-reset]').click();
    await page.locator('[data-lot-select="0"]').click();
    await page.locator('[data-auction-buy="0"]').click();
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>auctionState.gold),899000);
    assert.equal(await page.locator('[data-lot-select="0"]').count(),0);
    await page.locator('[data-auction-tab=sell]').click();
    await page.locator('[data-sell-pick="0"]').click();
    assert.ok(await page.locator('[data-sell-price]').isVisible());
    assert.equal(await page.locator('.auction-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'registration overflow');
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`Shop routing; auction search, purchase, registration and WebP art verified at ${width}px`);
  }
} finally { await browser.close(); }
