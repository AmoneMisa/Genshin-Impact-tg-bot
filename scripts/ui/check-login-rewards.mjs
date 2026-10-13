import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getLoginRewardsState,claimLoginReward,redeemLoginItem,monthBoxPool} from '../../functions/game/login/loginRewards.js';
import {getInventoryState} from '../../miniapp/inventory.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp'),output=path.resolve('.tmp/login-ui');fs.mkdirSync(output,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER}),results=[];
let now=Date.parse('2026-10-01T00:00:00Z');
try{for(const width of [320,390])for(const [level,grade] of [[1,'NG'],[20,'D'],[40,'C'],[52,'B'],[61,'A'],[76,'S'],[80,'S80'],[84,'S84']]){
    const hero={game:{stats:{lvl:level},equipmentStats:{},gameClass:{stats:{name:'humanWizard',hp:1000,maxHp:2000,mp:500,maxMp:1000},skills:[]},inventory:{gold:0,materials:{login_box_S:1,login_shadow_weapon_C:1,login_shadow_armor_C:1,login_shadow_jewelry_C:1,login_rune_exp_S:1},equipment:{items:[]},potions:{items:[]}}}};
    let actions=0;const page=await browser.newPage({viewport:{width,height:720},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',async route=>{
        const u=new URL(route.request().url());
        if(u.pathname==='/preview')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">${styles}</head><body><main>Preview</main></body></html>`});
        if(u.pathname==='/api/login-rewards')return route.fulfill({json:getLoginRewardsState(hero,now)});
        if(u.pathname==='/api/inventory'){
            // The engine uses a fixed game date; inventory expiry reads the system clock.
            const clock=Date.now;let inventory;try{Date.now=()=>now;inventory=getInventoryState(hero);}finally{Date.now=clock;}
            return route.fulfill({json:inventory});
        }
        if(u.pathname==='/api/login-rewards/action'){
            actions++;const body=route.request().postDataJSON(),result=body.action==='claim'?claimLoginReward(hero,now,{month:body.month,day:body.day}):redeemLoginItem(hero,body.key,body.choice,{now,random:()=>.999});
            return route.fulfill({status:result.ok?200:409,json:{...result,loginRewards:getLoginRewardsState(hero,now),state:{}}});
        }
        const bundle=assets.bundles.find(b=>b.path===u.pathname);
        if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
        const file=path.join(root,u.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        return route.fulfill({path:file,contentType:file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':undefined});
    });
    await page.goto('http://login.test/preview');
    await page.evaluate(async()=>{await (await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();window.draws=0;await(await import('/login-rewards.js')).openLoginRewards({api:(await import('/request-json.js')).requestJson,renderState:()=>window.draws++});});
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.login-overlay')).opacity==='1');
    const panel=page.locator('.login-panel'),days=page.locator('[data-login-day]');
    const closeSize=await page.locator('.game-dialog-heading [data-dismiss]').boundingBox();assert.ok(closeSize.width<=44&&closeSize.height<=44);
    assert.equal(await days.count(),31);assert.equal(await page.locator('[data-login-day="1"]').getAttribute('aria-current'),'date');
    assert.equal(await page.locator('.login-period').textContent(),'С 1 октября 2026 г. по 31 октября 2026 г.');
    assert.equal(await page.locator('.login-day-number').allTextContents().then(a=>a.join(',')),Array.from({length:31},(_,i)=>i+1).join(','));
    assert.equal(await page.locator('.login-day-item').count(),31);assert.ok(await page.locator('.login-day-item img').count()>=31);
    assert.equal(await page.locator('[data-login-day="5"] .login-day-count').textContent(),String(30+[[1,'NG'],[20,'D'],[40,'C'],[52,'B'],[61,'A'],[76,'S'],[80,'S80'],[84,'S84']].findIndex(([l])=>l===level)*20));
    assert.equal(await page.locator('[data-login-day="7"] .login-day-extra').textContent(),'+2');
    assert.equal(await page.locator('[data-login-day="7"] .is-shadow-item').count(),1);
    assert.equal(await page.locator('.login-pack-icon svg').count(),0);
    await page.waitForFunction(()=>[...document.querySelectorAll('.login-pack-icon img')].every(i=>i.complete&&i.naturalWidth>0));
    const artStyle=await page.locator('[data-login-day="7"] .login-pack-icon').evaluate(p=>({border:getComputedStyle(p).borderTopColor,contents:getComputedStyle(p.querySelector('.login-pack-contents')).width}));
    assert.equal(artStyle.border,'rgb(241, 139, 199)');assert.equal(artStyle.contents,'20px');
    assert.equal(await page.locator('.login-head').count(),0);
    const overflow=async()=>assert.equal(await panel.evaluate(p=>p.scrollWidth>p.clientWidth+1),false);
    await overflow();
    if(grade==='S')await page.screenshot({path:path.join(output,`calendar-${width}.png`)});
    await page.locator('[data-login-day="31"]').click();assert.equal(await page.locator('[data-login-claim]').isDisabled(),true);
    await page.locator('.login-box-pool summary').click();assert.ok(await page.locator('.login-box-pool li').count()>4);await overflow();
    await page.locator('[data-login-back]').click();
    await page.locator('[data-login-claim]').evaluate(b=>{b.click();b.click();});
    await page.waitForSelector('[data-login-coupon]');assert.equal(actions,1);assert.equal(await page.evaluate(()=>window.draws),1);
    await page.locator('[data-login-tab="calendar"]').click();assert.equal(await page.locator('[data-login-day="1"] .login-day-check').count(),1);assert.ok(await page.locator('[data-login-day="1"] .login-day-item img').count()>=1);await page.locator('[data-login-tab="coupons"]').click();
    await page.locator('[data-login-coupon]').filter({hasText:'Купон на заряды'}).click();
    const select=page.locator('[data-login-choice]');assert.equal(await select.locator('option').count(),25);assert.equal(await page.locator('[data-login-redeem]').isDisabled(),true);
    await select.selectOption('blessed:S');assert.equal(await page.locator('[data-login-redeem]').isDisabled(),false);await overflow();
    if(grade==='S')await page.screenshot({path:path.join(output,`coupon-${width}.png`)});
    await page.locator('[data-login-redeem]').evaluate(b=>{b.click();b.click();});await page.waitForFunction(()=>document.querySelector('[data-login-feedback]').textContent.includes('Благословенный заряд'));
    assert.equal(actions,2);assert.equal(await page.evaluate(()=>window.draws),2);
    await page.locator('[data-login-coupon="login_box_S"]').click();await page.locator('.login-box-pool summary').click();await overflow();
    if(grade==='S')await page.screenshot({path:path.join(output,`box-${width}.png`)});
    await page.locator('[data-login-redeem]').click();await page.waitForSelector('.login-coupons');assert.equal(await page.locator('[data-login-coupon="login_box_S"]').count(),0);assert.equal(actions,3);
    await page.locator('[data-login-coupon="login_shadow_weapon_C"]').click();await select.selectOption('C:weapon:mace');await overflow();
    if(level>=40){await page.locator('[data-login-redeem]').click();await page.waitForSelector('.login-coupons');assert.equal(await page.locator('[data-login-coupon="login_shadow_weapon_C"]').count(),0);}
    else{await page.locator('[data-login-redeem]').click();await page.waitForFunction(()=>document.querySelector('[data-login-feedback]').textContent.includes('нужного уровня'));await page.locator('[data-login-back]').click();}
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.login-overlay'));assert.deepEqual(errors,[]);
    if(grade==='S'){
        const pool=monthBoxPool('S'),total=pool.reduce((s,r)=>s+r.weight,0),before=pool.slice(0,pool.findIndex(r=>r.id==='epic3')).reduce((s,r)=>s+r.weight,0);
        hero.game.inventory.materials.login_box_S=1;
        assert.ok(redeemLoginItem(hero,'login_box_S','',{now,random:()=>(before+1)/total}).ok);
    }
    await page.evaluate(async()=>{await(await import('/inventory.js')).openInventoryGame({api:(await import('/request-json.js')).requestJson,renderState:()=>{},haptic:()=>{},statusElement:document.createElement('p')});});
    await page.waitForSelector('.inventory-overlay.visible');
    assert.equal(await page.locator('.inventory-panel').evaluate(p=>p.scrollWidth>p.clientWidth+1),false);
    if(grade==='S'){
        assert.equal(await page.locator('[data-inventory-equipment].is-shadow-item').count(),2);
        assert.equal(await page.locator('[data-inventory-equipment].is-shadow-item').first().evaluate(p=>getComputedStyle(p).boxShadow.includes('rgb(241, 139, 199)')),true);
    }
    await page.locator('[data-inventory-material="login_rune_exp_S"]').click();await page.locator('[data-inventory-coupon]').click();
    await page.waitForSelector('.login-overlay.visible');assert.equal(await page.locator('[data-login-redeem]').count(),1);await overflow();
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.login-overlay'));
    assert.equal(await page.locator('.inventory-overlay').count(),1);
    if(grade==='S')await page.screenshot({path:path.join(output,`inventory-${width}.png`)});
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.inventory-overlay'));assert.deepEqual(errors,[]);
    if(width===390&&grade==='S'){
        for(const [date,count,last] of [['2027-02-15',28,'28 февраля 2027 г.'],['2028-02-15',29,'29 февраля 2028 г.'],['2026-11-15',30,'30 ноября 2026 г.']]){
            now=Date.parse(`${date}T00:00:00Z`);
            await page.evaluate(async()=>{await(await import('/login-rewards.js')).openLoginRewards({api:(await import('/request-json.js')).requestJson});});
            assert.equal(await page.locator('[data-login-day]').count(),count);
            assert.equal(await page.locator('[aria-current="date"] .login-day-number').textContent(),'15');
            assert.ok((await page.locator('.login-period').textContent()).endsWith(last));
            await page.locator(`[data-login-day="${count}"]`).click();assert.equal(await page.locator('.login-detail h3').textContent(),last);await overflow();
            await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.login-overlay'));
        }
        now=Date.parse('2026-10-01T00:00:00Z');
    }
    results.push({width,grade,overflow:false,claimOnce:true,redeemOnce:true,choices:24,box:true,shadow:true,escape:true,inventoryUse:true,close36px:true,dateRange:true,realMonthDates:true,rewardIcons:true,quantity:true,claimedCheck:true,errors});await page.close();
}}finally{await browser.close();}
fs.writeFileSync(path.join(output,'verification.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
