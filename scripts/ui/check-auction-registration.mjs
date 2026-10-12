import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const root=path.resolve('webapp'),out=path.resolve('docs/auction-registration-2026-10-12');
fs.mkdirSync(out,{recursive:true});
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try {
  for(const width of [320,390,1100]) {
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
      const file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
      return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    await page.goto('http://127.0.0.1:4321/fixture.html');
    await page.evaluate(async()=>{
      window.requests=[];window.rejectListing=false;
      window.auctionState={gold:100000,fee:.05,hours:48,maxLots:10,lots:[],mine:[],sellable:Array.from({length:30},(_,i)=>({kind:'material',ref:`resource-${i}`,materialKey:i%2?'seal_blue':'seal_green',title:i===0?'Зелёный камень печати':'Синий камень печати',count:253}))};
      await (await import('/auction.js')).openAuctionGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{
        if(url==='/api/auction/list') {
          const payload=JSON.parse(options.body);requests.push(payload);
          await new Promise(resolve=>setTimeout(resolve,100));
          if(rejectListing) {const e=new Error('Rejected');e.payload={reason:'invalid_price'};throw e;}
          const item=auctionState.sellable.find(item=>item.ref===payload.ref);
          item.count-=payload.count;
          auctionState.mine.push({...item,id:'new-lot',count:payload.count,price:payload.price,hoursLeft:48,mine:true});
          return {auction:structuredClone(auctionState)};
        }
        return structuredClone(auctionState);
      }});
    });
    await page.locator('[data-auction-tab="sell"]').first().click();
    assert.equal(await page.locator('[data-sell-pick]').count(),30);
    assert.equal(await page.locator('.mail-letter').count(),0);
    assert.equal(await page.locator('[data-sell-confirm]').isDisabled(),true);
    await page.locator('[data-sell-pick="0"]').click();
    await page.locator('[data-sell-count]').fill('3');
    await page.locator('[data-sell-price]').fill('101');
    assert.equal(await page.locator('[data-sell-total]').textContent(),'303');
    assert.equal(await page.locator('[data-sell-fee]').textContent(),'15');
    assert.equal(await page.locator('[data-sell-net]').textContent(),'288');
    for(const value of ['254','0','1.5']) {
      await page.locator('[data-sell-count]').fill(value);
      assert.equal(await page.locator('[data-sell-confirm]').isDisabled(),true);
    }
    await page.locator('[data-sell-count]').fill('3');
    await page.locator('[data-sell-price]').fill('1000000000');
    assert.equal(await page.locator('[data-sell-confirm]').isDisabled(),true);
    await page.locator('[data-sell-price]').fill('101');
    const grid=await page.locator('.auction-registration').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length);
    assert.equal(grid,width>600?2:1);
    assert.equal(await page.locator('.auction-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
    await page.locator('.auction-panel').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
    await page.locator('.auction-panel').screenshot({path:path.join(out,`registration-${width}.png`)});
    await page.evaluate(()=>rejectListing=true);
    await page.locator('[data-sell-confirm]').click();
    await page.locator('.feedback-result.error').waitFor();
    assert.equal(await page.locator('[data-sell-price]').inputValue(),'101');
    assert.equal(await page.locator('[data-sell-count]').inputValue(),'3');
    await page.evaluate(()=>rejectListing=false);
    await page.locator('[data-sell-confirm]').click();
    assert.equal(await page.locator('[data-sell-confirm]').isDisabled(),true);
    await page.locator('.feedback-result.success').waitFor();
    const requests=await page.evaluate(()=>window.requests);
    assert.equal(requests.length,2);
    assert.deepEqual(requests[1],{kind:'material',ref:'resource-0',count:3,price:303});
    assert.equal(await page.locator('.auction-registered-table tbody tr').count(),1);
    assert.match(await page.locator('.auction-registered-table').textContent(),/303/);
    assert.equal(await page.locator('[data-sell-confirm]').isDisabled(),true);
    await page.locator('.auction-registered').scrollIntoViewIfNeeded();
    await page.locator('.auction-panel').screenshot({path:path.join(out,`listed-${width}.png`)});
    await page.locator('[data-dismiss]').click();
    assert.equal(await page.locator('.auction-overlay').count(),0);
    assert.deepEqual(errors,[]);
    await page.close();
    console.log(`PASS ${width}px: registration layout, price/fee preview, validation, failed draft retention and listing`);
  }
} finally {await browser.close();}
