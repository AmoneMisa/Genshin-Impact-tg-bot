import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getBuildsState} from '../../miniapp/builds.js';
import {getAcademyState} from '../../functions/game/academy/academy.js';
import {getClassQuestView} from '../../functions/game/classes/classQuests.js';

const {chromium} = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : await import('playwright');
const root = path.resolve('webapp');
const output = path.resolve(process.env.ACADEMY_CHECK_OUTPUT || '.tmp/academy-check');
fs.mkdirSync(output,{recursive:true});
const assets = bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file),'utf8'));
const styles = [...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const hero = {userId:7,game:{stats:{lvl:50},gameClass:{stats:{name:'warrior'}},builds:{academy:{currentLvl:1}},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}}}};
const fixtures = {'/api/builds':getBuildsState(hero),'/api/academy':getAcademyState(hero),'/api/class-quests':getClassQuestView(hero)};
const browser = await chromium.launch({headless:true,...(process.env.ITEM_ART_BROWSER?{executablePath:process.env.ITEM_ART_BROWSER}:{})});
const results = [];
try {
  for (const width of [320,390]) {
    const page = await browser.newPage({viewport:{width,height:720},reducedMotion:width===320?'reduce':'no-preference'});
    const errors=[],requests=[];let failAcademy=true,failProfessions=true;
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',request=>requests.push(new URL(request.url()).pathname));
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><main class="app-shell"><section id="city" class="city-host"></section></main></body>`});
      if(url.pathname==='/api/academy'&&failAcademy)return route.fulfill({status:503,json:{error:'HTTP 503'}});
      if(url.pathname==='/api/class-quests'&&failProfessions)return route.fulfill({status:503,json:{error:'HTTP 503'}});
      if(fixtures[url.pathname])return route.fulfill({json:fixtures[url.pathname]});
      const bundle=assets.bundles.find(item=>item.path===url.pathname);
      if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
      const file=path.resolve(root,'.'+url.pathname);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
      return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    await page.goto('http://academy.local/fixture.html');
    await page.evaluate(async()=>{
      (await import('/overlay-a11y.js')).installOverlayA11y();
      const {requestJson}=await import('/request-json.js');
      window.city=await (await import('/city.js')).mountCity(document.querySelector('#city'),{api:requestJson});
    });
    await page.locator('[data-city-card="academy"]').click();
    const button=page.locator('[data-city-academy]');
    assert.equal(requests.includes(assets.bundles[1].path),false);
    await button.click();
    await page.waitForFunction(()=>document.querySelector('[data-city-feedback]')?.textContent==='HTTP 503');
    assert.equal(await page.locator('.academy-window').count(),0,'failed load must not leave an invisible modal');
    await page.waitForFunction(()=>!document.querySelector('[data-city-academy]').disabled);
    failAcademy=false;await button.click();
    await page.waitForFunction(()=>{const n=document.querySelector('.academy-window');return n&&getComputedStyle(n).opacity==='1'&&getComputedStyle(n).pointerEvents==='auto';});
    assert.ok(requests.includes(assets.bundles[1].path));
    assert.equal(await page.locator('.academy-window [role=tab]').count(),2);
    assert.equal(await page.locator('[data-bounty-scope=day]').getAttribute('aria-selected'),'true');
    await page.screenshot({path:path.join(output,`academy-${width}.png`)});
    await page.locator('[data-academy-main]').click();
    await page.waitForFunction(()=>document.querySelector('.academy-window .city-feedback')?.textContent==='HTTP 503');
    assert.equal(await page.locator('.academy-window').count(),1,'profession load failure keeps the academy open');
    failProfessions=false;await page.locator('[data-academy-main]').click();
    await page.waitForFunction(()=>document.querySelector('.class-quests-overlay.visible'));
    assert.equal(await page.locator('.academy-window').count(),0);
    const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,nodes:[...document.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.tagName,class:n.className,right:n.getBoundingClientRect().right})).slice(0,12)}));
    assert.equal(overflow.scrollWidth>overflow.width,false,JSON.stringify(overflow));
    assert.deepEqual(errors,[]);
    results.push({width,visible:true,interactive:true,featureStylesLoaded:true,loadErrorShown:true,retry:true,professionErrorShown:true,professionOpens:true,overflow:false,errors});
    await page.evaluate(()=>window.city.destroy());await page.close();
  }
} finally {await browser.close();}
fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
