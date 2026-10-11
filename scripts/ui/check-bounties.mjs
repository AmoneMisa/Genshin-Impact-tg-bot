import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getAcademyState,recordAcademyEvent,claimBounty} from '../../functions/game/academy/academy.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp'),output=path.resolve('.tmp/bounty-ui');fs.mkdirSync(output,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});const results=[];
try{for(const width of [320,390])for(const [level,grade] of [[1,'NG'],[20,'D'],[40,'C'],[52,'B'],[61,'A'],[76,'S'],[80,'S80'],[84,'S84']]){
 const quality=1+['NG','D','C','B','A','S','S80','S84'].indexOf(grade)%5;
 const hero={userId:7,game:{stats:{lvl:level,currentExp:0},builds:{academy:{currentLvl:1+(quality-1)*6}},inventory:{gold:0,sp:0,materials:{}},gameClass:{stats:{name:'humanMystic'}}}};
 getAcademyState(hero);recordAcademyEvent(hero,'mob_kill',{mob:{level},count:100000});let claims=0,draws=0;
 const page=await browser.newPage({viewport:{width,height:720},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body>`});
  if(u.pathname==='/api/academy')return route.fulfill({json:getAcademyState(hero)});
  if(u.pathname==='/api/academy/action'){
   const body=route.request().postDataJSON();claims++;const result=claimBounty(hero,body.scope,body.id,Date.now(),()=>1);
   return route.fulfill({status:result.ok?200:409,json:{...result,academy:getAcademyState(hero),state:{updated:true}}});
  }
  const bundle=assets.bundles.find(b=>b.path===u.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://bounty.local/fixture.html');await page.exposeFunction('recordDraw',()=>{draws++;});
 await page.evaluate(async()=>{
  (await import('/icons.js')).startEmojiIcons();(await import('/overlay-a11y.js')).installOverlayA11y();
  window.farmOpens=0;
  await (await import('/academy.js')).openAcademy({api:(await import('/request-json.js')).requestJson,renderState:()=>window.recordDraw(),openHuntFields:()=>{if(++window.farmOpens===1)throw new Error('Не удалось открыть охоту');}});
 });
 const bounties=page.locator('[data-bounty-open]');
 assert.equal(await bounties.count(),3);assert.match(await bounties.first().innerText(),new RegExp(grade));
 await page.locator('[data-bounty-scope="week"]').click();assert.equal(await bounties.count(),2);
 await page.locator('[data-bounty-scope="day"]').click();
 if(level===40){await page.waitForTimeout(250);await page.screenshot({path:path.join(output,`list-C-${width}.png`)});}
 await bounties.nth(1).click();const detail=page.locator('.bounty-detail');
 assert.equal(await detail.count(),1);
 assert.equal(await detail.locator('.bounty-pips .on').count(),quality);
 if(grade!=='NG')assert.match(await detail.locator('.bounty-rewards').innerText(),new RegExp(`${[10,13,15,18,20][quality-1]}\\s+Кристалл`));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 if(level===40)await page.screenshot({path:path.join(output,`popup-C-${width}.png`)});
 await detail.locator('button[data-bounty-close]').click();assert.equal(await detail.count(),0);
 await bounties.first().click();
 await detail.locator('[data-academy-claim]').evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>document.querySelector('.bounty-detail [data-academy-claim]')?.textContent==='Получено');
 assert.equal(claims,1);assert.equal(draws,1);assert.deepEqual(errors,[]);
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.bounty-detail'));
 assert.match(await bounties.first().innerText(),/Получено/);
 await bounties.nth(1).click();await detail.locator('[data-bounty-farm]').click();
 await page.waitForFunction(()=>document.querySelector('.bounty-feedback')?.textContent==='Не удалось открыть охоту');
 assert.equal(await page.locator('.academy-window').count(),1);
 await detail.locator('[data-bounty-farm]').click();await page.waitForFunction(()=>!document.querySelector('.academy-window'));
 assert.equal(await detail.count(),0);assert.equal(await page.evaluate(()=>window.farmOpens),2);assert.deepEqual(errors,[]);
 results.push({width,grade,quality,allRewardsVisible:true,claimOnce:true,hudUpdated:true,farmRetry:true,closeAndEscape:true,overflow:false,errors});await page.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
