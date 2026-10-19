import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {treasureHero,memoryTreasureStore,NOW,slot} from '../../test/helpers/treasures.js';
import {hydrateTreasures,treasureAction} from '../../miniapp/treasures.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {moveHuntField} from '../../functions/game/hunt/huntFight.js';
import {getMerchantsState,buyFromMerchant} from '../../miniapp/merchants.js';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/treasures/ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const [width,mode,method] of [[320,'auto','unlock'],[390,'auto','key'],[1100,'auto','unlock'],[320,'unavailable','key'],[320,'missing-art','unlock']]){
 const s=treasureHero(),store=memoryTreasureStore(),openedAt=Date.now(),now=()=>NOW+Date.now()-openedAt,errors=[];
 s.game.hunt.field.mobs=[];s.game.hunt.mob=null;
 const hunt=async()=>{await hydrateTreasures(s,now(),store,()=>0);return getHuntState(s,now());};
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">import {openHuntGame} from '/hunt.js';import {openMerchantsGame} from '/merchants.js';import {ensureFeatureStyles} from '/feature-styles.js';await ensureFeatureStyles();const api=async(url,options)=>{const r=await fetch(url,options),p=await r.json();if(!r.ok)throw Object.assign(new Error(p.reason),{payload:p});return p;};const options={api,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')};window.openRoom=()=>openHuntGame(options);window.openShop=()=>openMerchantsGame({...options,initialMerchant:'alchemist',initialGroup:'consumable'});</script></body>`});
  if(u==='/api/hunt')return route.fulfill({json:await hunt()});
  if(u==='/api/world/action'){
   const body=route.request().postDataJSON(),r=await treasureAction(s,body,now(),store);
   return route.fulfill({status:r.ok?200:409,json:{...r,hunt:await hunt()}});
  }
  if(u==='/api/hunt/move'){const body=route.request().postDataJSON(),r=moveHuntField(s,body.point||body.direction,now());return route.fulfill({status:r.ok?200:409,json:{...r,hunt:await hunt()}});}
  if(u==='/api/merchants'){const body=route.request().postDataJSON();return route.fulfill({json:getMerchantsState(s,body)});}
  if(u==='/api/merchants/buy'){const body=route.request().postDataJSON(),r=buyFromMerchant(s,body.merchant,body.entry,body.count,body.query);return route.fulfill({status:r.ok?200:409,json:r});}
  if(u==='/vendor/phaser/phaser.esm.min.js')return route.fulfill(mode==='unavailable'?{status:404}:{contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(mode==='missing-art'&&u.startsWith('/art/world/scenes/'))return route.fulfill({status:404});
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://treasures.local/fixture');await page.waitForFunction(()=>typeof window.openRoom==='function');await page.evaluate(()=>openRoom());
 const marker=page.locator(`[data-treasure-chest="${slot.id}"]`);await marker.waitFor();await marker.click();
 let dialog=page.locator('dialog[open]');await dialog.waitFor();
 assert.equal(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'chest dialog overflow');
 assert.equal(await dialog.locator('[data-chest-method="unlock"]').isDisabled(),true);
 await dialog.locator('[data-chest-method="learn"]').click();await page.waitForFunction(()=>document.querySelector('dialog[open] [data-chest-method="unlock"]')?.disabled===false);
 dialog=page.locator('dialog[open]');await dialog.locator('[data-chest-method="'+method+'"]').focus();
 assert.equal(await dialog.locator('[data-chest-method="'+method+'"]').evaluate(n=>n===document.activeElement),true);
 if(mode==='auto')await page.screenshot({path:path.join(out,`chest-${width}.png`)});
 await dialog.locator('[data-chest-method="'+method+'"]').click();
 await page.waitForFunction(id=>!document.querySelector(`[data-treasure-chest="${id}"]`),slot.id);
 assert.ok(s.game.hunt.lastLoot);assert.equal(s.game.hunt.lastLoot.exp,0);assert.equal(s.game.hunt.lastLoot.sp,0);
 assert.equal(s.game.inventory.materials[method==='unlock'?'l2_1661':'l2_21746'],method==='unlock'?98:2);
 await page.locator('.hunt-overlay [data-dismiss]').first().click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 await page.evaluate(()=>openShop());await page.locator('[data-search]').fill('Maestro');await page.locator('[data-store-slot="treasure-key:21746"]').waitFor();
 const key=page.locator('[data-store-slot="treasure-key:21746"]');await key.click();
 assert.equal(await page.locator('.store-view').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true,'merchant key row overflow');
 const gold=s.game.inventory.gold;await page.locator('[data-store-confirm]').click();await page.waitForFunction(()=>document.body.innerText.includes('Куплено'));
 assert.equal(s.game.inventory.gold,gold-1800);
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open],[inert],.hunt-overlay').count(),0);
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS treasure ${width}px ${mode}: ${method}, learning, native key price, source reward, focus and cleanup`);
}}finally{await browser.close();}
