import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {getShopState,buyShopItem} from '../../miniapp/shop.js';
import {getStarsState} from '../../miniapp/stars.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const root=path.resolve('webapp');
const out=path.resolve('docs/col-topup-2026-10-12');
fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try {
  for(const width of [320,390]) {
    const page=await browser.newPage({viewport:{width,height:850}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const session={game:{inventory:{gold:0,crystals:12,luckCoins:2},shopTimers:{}}};
    const packs=getStarsState(session);
    const requests=[];
    await page.exposeFunction('fixtureApi',async(url,options)=>{
      requests.push(url);
      if(url==='/api/shop')return getShopState(session);
      if(url==='/api/shop/buy')return buyShopItem(session,JSON.parse(options.body).command);
      if(url==='/api/exchange')return {luckCoins:2,stars:packs};
      if(url==='/api/stars/invoice')return {url:'https://t.me/test-invoice'};
      throw new Error(`Unexpected API ${url}`);
    });
    await page.route('**/*',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
      const file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
      return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    await page.goto('http://127.0.0.1:4321/fixture.html');
    await page.evaluate(async()=>{
      window.fixtureOptions={api:window.fixtureApi,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')};
      window.Telegram={WebApp:{openInvoice:(_url,callback)=>callback('cancelled')}};
      await (await import('/exchange.js')).openExchangeGame(window.fixtureOptions);
    });
    await page.locator('.exchange-overlay').waitFor({state:'visible'});
    await page.locator('.exchange-panel').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
    assert.equal(await page.locator('[data-star-pack]').count(),6);
    assert.equal(await page.locator('.exchange-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    assert.doesNotMatch(await page.locator('.exchange-panel').textContent(),/Кристалл|кристалл|Обмен золота/);
    assert.equal(await page.locator('.exchange-panel svg').count(),0);
    const panel=await page.locator('.exchange-panel').boundingBox();
    const close=await page.locator('.exchange-panel [data-dismiss]').boundingBox();
    assert.ok(close.x>panel.x+panel.width/2);
    await page.locator('.exchange-panel').screenshot({path:path.join(out,`topup-${width}.png`)});
    await page.locator('[data-star-pack="pouch"]').click();
    await page.waitForFunction(()=>!document.querySelector('.exchange-overlay').classList.contains('busy'));
    assert.equal(requests.filter(url=>url==='/api/stars/invoice').length,1);
    assert.equal(requests.includes('/api/exchange/buy'),false);
    await page.locator('.exchange-panel [data-dismiss]').click();
    assert.equal(await page.locator('.exchange-overlay').count(),0);
    await page.evaluate(async()=>await (await import('/shop.js')).openShopGame(window.fixtureOptions));
    await page.locator('[data-store-category="adena"]').click();
    await page.locator('[data-store-slot="adena-col"]').click();
    assert.match(await page.locator('.store-req').textContent(),/CoL/);
    assert.equal(await page.locator('.shop-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    await page.locator('.shop-panel').screenshot({path:path.join(out,`adena-${width}.png`)});
    await page.locator('[data-store-confirm]').click();
    await page.waitForFunction(()=>document.querySelector('.shop-feedback').textContent.includes('Получено'));
    assert.equal(session.game.inventory.gold,15000);
    assert.equal(session.game.inventory.luckCoins,1);
    assert.equal(session.game.inventory.crystals,12);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`PASS ${width}px: top-up, invoice cancellation, shared close, shop navigation and CoL purchase`);
  }
} finally {await browser.close();}
