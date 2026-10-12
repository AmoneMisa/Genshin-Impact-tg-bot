import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getFishingState,performFishingAction} from '../../miniapp/fishing.js';
import {castOnce} from '../../functions/game/fishing/fishing.js';
import FISHING_DATA from '../../template/fishingData.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp'),out=path.resolve('.tmp/fishing-light');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),p=>fs.readFileSync(path.join(root,p),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER}),results=[];
try{for(const width of [320,390])for(const reduced of [false,true])for(const mode of ['success','failure']){
    const hero={game:{stats:{lvl:80},gameClass:{stats:{name:'warrior'},skills:[]},inventory:{gold:32500,materials:{['l2_'+FISHING_DATA.rods[0].item]:1},equipment:{items:[]},potions:{items:[]}},fishing:{learned:true,expertise:1,lastAt:0}}};
    if(mode==='failure')hero.game.fishing.fish=getFishingState(hero).limit;
    let casts=0;const page=await browser.newPage({viewport:{width,height:850},reducedMotion:reduced?'reduce':'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',route=>{
        const u=new URL(route.request().url());
        if(u.pathname==='/preview')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">${styles}</head><body></body></html>`});
        if(u.pathname==='/api/fishing'){
            const body=route.request().postDataJSON();let result;
            if(body.action==='cast'){casts++;result=castOnce(hero,Date.now(),()=>.5);}else result=performFishingAction(hero,body.action,body);
            return route.fulfill({json:{...result,fishing:getFishingState(hero)}});
        }
        const bundle=assets.bundles.find(b=>b.path===u.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
        const file=path.join(root,u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
        return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':undefined});
    });
    await page.goto('http://fishing.test/preview');
    await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();await(await import('/fishing.js')).openFishingGame({api:(await import('/request-json.js')).requestJson,haptic:()=>{},renderState:()=>{},statusElement:document.createElement('p')});});
    await page.locator('[data-cast]').click();
    await page.locator(`.fishing-scene[data-phase="${mode}"]`).waitFor();
    const image=page.locator('.fishing-animation');await image.evaluate(i=>i.decode());
    assert.equal(await image.evaluate(i=>i.naturalWidth),256);assert.equal(await image.evaluate(i=>i.naturalHeight),160);
    assert.ok((await image.evaluate(i=>i.currentSrc)).endsWith(`/art/fishing/${mode}${reduced?'-still':''}.webp`));
    assert.equal(await page.locator('.fishing-panel').evaluate(p=>p.scrollWidth>p.clientWidth+1),false);
    assert.equal(casts,1);
    if(!reduced){await page.screenshot({path:path.join(out,`${mode}-${width}.png`)});}
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    assert.ok((await image.getAttribute('src')).endsWith(`${mode}-still.webp`));
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    assert.ok((await image.getAttribute('src')).endsWith(`${mode}.webp`));
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.fishing-overlay'));assert.deepEqual(errors,[]);
    results.push({width,reduced,mode,casts,overflow:false,hiddenStopsAnimation:true,errors});await page.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
