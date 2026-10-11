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
 const hero={userId:7,game:{stats:{lvl:level,currentExp:0},builds:{academy:{currentLvl:1}},inventory:{gold:0,sp:0,materials:{}},gameClass:{stats:{name:'humanMystic'}}}};
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
  await (await import('/academy.js')).openAcademy({api:(await import('/request-json.js')).requestJson,renderState:()=>window.recordDraw()});
 });
 const bounties=page.locator('.academy-row:has([data-academy-claim])');
 assert.equal(await bounties.count(),5);assert.match(await bounties.locator('strong').first().innerText(),new RegExp(grade));
 assert.match(await bounties.nth(2).innerText(),/Заряд духа|заряд духа/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.locator('[data-academy-claim]').first().evaluate(button=>{button.click();button.click();});await page.waitForFunction(()=>document.querySelector('[data-academy-claim]')?.textContent==='Получено');
 assert.equal(claims,1);assert.equal(draws,1);assert.deepEqual(errors,[]);
 if(level===40){await page.waitForTimeout(250);await page.screenshot({path:path.join(output,`academy-C-${width}.png`)});}
 results.push({width,grade,allRewardsVisible:true,claimOnce:true,hudUpdated:true,overflow:false,errors});await page.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
