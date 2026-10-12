import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {getHoroscopeState,generateHoroscopeForMiniApp,shareHoroscopeForMiniApp,updateHoroscopeSettings} from '../../miniapp/horoscope.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');
fs.mkdirSync('docs/horoscope-game',{recursive:true});
try{for(const width of [320,390,820]){
 const hero={userChatData:{user:{first_name:'Игрок'}}};const sent=[];const page=await browser.newPage({viewport:{width,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{const url=new URL(route.request().url());
 if(url.pathname==='/api/horoscope')return route.fulfill({json:getHoroscopeState(hero)});
 if(url.pathname==='/api/horoscope/settings')return route.fulfill({json:updateHoroscopeSettings(hero,route.request().postDataJSON())});
 if(url.pathname==='/api/horoscope/generate')return route.fulfill({json:await generateHoroscopeForMiniApp(hero,{generate:async()=> '♓ Рыбы: Сегодня редкий дроп найдёт тебя. Главное — не забыть подобрать.'})});
 if(url.pathname==='/api/horoscope/share')return route.fulfill({json:await shareHoroscopeForMiniApp(hero,{send:async text=>sent.push(text)})});
 if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<link rel="stylesheet" href="/social.css"><body></body>'});
 const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
 return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(async()=>{const {startEmojiIcons}=await import('/icons.js');startEmojiIcons();const {openHoroscopeGame}=await import('/horoscope.js');await openHoroscopeGame({api:async(url,options)=>(await fetch(url,{headers:{'Content-Type':'application/json'},...options})).json(),renderState:()=>{},haptic:()=>{},statusElement:document.createElement('span')});});
 assert.equal(await page.locator('[data-horo-sign]').count(),12);
 await page.locator('[data-horo-sign="pisces"]').click();await page.waitForFunction(()=>document.querySelector('[data-horo-sign="pisces"]').getAttribute('aria-pressed')==='true');
 await page.locator('[data-horo-generate]').click();await page.waitForFunction(()=>document.querySelector('[data-horo-share]'));
 assert.equal(new Set(await page.locator('.horo-symbol').allTextContents()).size,12);assert.equal(await page.locator('.horo-symbol img').count(),0);
 await page.locator('[data-horo-share]').click();await page.waitForFunction(()=>document.querySelector('[data-horo-share]').textContent==='Отправлено в чат');
 assert.equal(sent.length,1);assert.match(sent[0],/Рыбы/);assert.equal(await page.locator('[data-horo-share]').isDisabled(),true);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 await page.locator('.horo-panel').screenshot({path:'docs/horoscope-game/horoscope-'+width+'.png'});console.log('PASS zodiac icons, mobile layout, generation and chat share '+width+'px');await page.close();
}}finally{await browser.close();}
