import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {actMail,mailState} from '../../miniapp/mail.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp'),styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
try{for(const width of [320,390,540,1100]){
 const chat={game:{},members:[1,2,3].map(id=>({userId:id,userChatData:{user:{first_name:['','White Amorality','JennyElf','Другой игрок'][id]}},game:{inventory:{gold:32500,materials:{l2_1871:30},equipment:{items:[]},potions:{items:[]}}}}))};
 let id;for(let i=0;i<9;i++){const r=actMail(chat,2,{action:'send',to:'1',title:i===8?'Припасы для рейда':'Письмо '+(i+1),text:'Привет! Вот материалы для твоего снаряжения.\nУдачной охоты!',type:i===8?'payment':'regular',price:i===8?5000:0,items:i===8?[{kind:'material',ref:'l2_1871',count:4}]:[]},Date.now()+i);if(i===8)id=r.id;}
 const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const url=new URL(route.request().url());
  if(url.pathname==='/api/mail')return route.fulfill({json:mailState(chat,1)});
  if(url.pathname==='/api/mail/action'){const result=actMail(chat,1,route.request().postDataJSON());return route.fulfill({status:result.ok?200:409,json:{...result,mail:mailState(chat,1)}});}
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async()=>{const {openMailGame}=await import('/mail.js');await openMailGame({api:async(url,options)=>{const r=await fetch(url,{headers:{'Content-Type':'application/json'},...options}),data=await r.json();if(!r.ok)throw Object.assign(new Error(data.reason),{payload:data});return data;}});});
 const check=async()=>{assert.equal(await page.locator('.mail-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);await page.locator('.mail-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));};
 await check();assert.equal(await page.locator('[data-mail-open]').count(),8);
 if(width===390)await page.locator('.mail-panel').screenshot({path:'docs/mail-inbox-390.png'});
 await page.locator('[data-mail-page="1"]').click();assert.equal(await page.locator('[data-mail-open]').count(),1);await page.locator('[data-mail-page="-1"]').click();
 await page.locator(`[data-mail-open="${id}"]`).click();await check();
 if(width===390)await page.locator('.mail-panel').screenshot({path:'docs/mail-letter-390.png'});
 await page.locator('[data-mail-claim]').click();await page.locator('[data-mail-claim]').waitFor({state:'detached'});assert.equal(chat.members[0].game.inventory.gold,27500);assert.equal(chat.members[0].game.inventory.materials.l2_1871,34);
 await page.locator('[data-mail-reply]').click();await check();
 await page.locator('[data-mail-field="text"]').fill('Спасибо!');
 await page.locator('[data-mail-stock] [data-stock-index="1"]').click();await page.locator('.stock-quantity input').fill('2');await page.locator('.stock-quantity button[type="submit"]').click();
 await page.locator('[data-mail-attached] [data-stock-index]').waitFor();await check();
 if(width===390){await page.addStyleTag({content:'.mail-overlay{position:static;padding:0}.mail-overlay>.overlay-backdrop{display:none}.mail-panel{position:static!important;max-height:none!important;overflow:visible!important;margin:auto;transform:none!important}body{overflow:auto!important}'});await page.locator('.mail-panel').screenshot({path:'docs/mail-compose-390.png'});}
 await page.locator('.mail-compose>button[type="submit"]').click();await page.locator('[data-mail-tab="sent"]').waitFor();assert.equal(mailState(chat,1).sent.length,1);assert.equal(chat.members[0].game.inventory.materials.l2_1871,32);
 await page.locator('[data-mail-tab="sent"]').click();assert.equal(await page.locator('[data-mail-open]').count(),1);await check();assert.deepEqual(errors,[]);await page.close();console.log(`Mail inbox, COD, reply, attachment popup and send verified at ${width}px`);
}}finally{await browser.close();}
