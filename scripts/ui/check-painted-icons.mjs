import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createMiniAppFeatures} from '../../miniapp/state.js';
import {getInventoryState} from '../../miniapp/inventory.js';
import {getEquipmentState} from '../../miniapp/equipment.js';
import {getSkillsState} from '../../miniapp/skills.js';
const root=process.cwd();
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const session={userId:1,game:{stats:{lvl:24},equipmentStats:{},gameClass:{stats:{name:'mage',translateName:'Маг',hp:4000,maxHp:5000,mp:300,maxMp:400},skills:[{slot:1,name:'Грозовая стужа',description:'Наносит магический урон и замедляет противника.',effect:'magic_attack',damageModifier:5,cooldown:18,isDealDamage:true,needLvl:10,cost:43,enchantLevel:0}]},inventory:{gold:1245730,crystals:4820,ironOre:12460,sp:100,arena:{items:[]},equipment:{items:[]},gacha:{items:[]},potions:{items:[{type:'hp',size:'small',bottleType:'potion',count:3,power:1000,name:'Малое зелье HP',description:'Восстанавливает здоровье.'},{type:'mp',size:'small',bottleType:'potion',count:2,power:180,name:'Малое зелье MP',description:'Восстанавливает ману.'}]}}}};
const fixtures={inventory:getInventoryState(session),equipment:getEquipmentState(session),skills:getSkillsState(session)};
const features=createMiniAppFeatures({chatId:-1,userId:1,chatType:'group'});
let html=fs.readFileSync('webapp/index.html','utf8').replace(/<script src="https:\/\/telegram[^<]+<\/script>/,'');
html=html.replace('<script type="module" src="/app.js"></script>',`<script type=module>
import {startEmojiIcons,icon} from '/icons.js';import {UI_ICON_ART} from '/art/ui-icon-art.js';
import {NAV_TABS,navHtml,featuresForTab,featureIconHtml} from '/nav.js';import {menuArtFor} from '/menu-art.js';
import {openInventoryGame} from '/inventory.js';import {openEquipmentGame} from '/equipment.js';import {openSkillsGame} from '/skills.js';import {openArenaGame} from '/arena.js';import {openClanGame} from '/clan.js';import {openLanguageGame} from '/language.js';import {openHelpGame} from '/help.js';import {cardHtml} from '/point21.js';
const features=${JSON.stringify(features)},fixtures=${JSON.stringify(fixtures)};
document.querySelector('#hello').textContent='White Amora с длинным именем';document.querySelector('#gold').textContent='1 245 730';document.querySelector('#crystals').textContent='4 820';document.querySelector('#ore').textContent='12 460';
const opts={haptic:()=>{},renderState:()=>{},statusElement:document.querySelector('#status'),player:{className:'warrior',gender:'male'}};
window.showTab=id=>{document.querySelector('#city').hidden=true;document.querySelector('#tab-title').textContent=NAV_TABS.find(t=>t.id===id).title;document.querySelector('#bottom-nav').innerHTML=navHtml(id);document.querySelector('#game-grid').innerHTML=featuresForTab(features,id).map(f=>{const art=menuArtFor(f.id,opts.player);return '<button class="game-card '+(art?'has-art':'')+'" type="button" '+(art?'style="--card-art:url('+art+')"':'')+'>'+(art?'<span class="game-art"></span>':'')+'<span class="game-icon">'+featureIconHtml(f)+'</span><h3>'+f.title+'</h3><p>'+f.subtitle+'</p></button>';}).join('');};
window.showGallery=()=>{document.querySelector('#game-grid').innerHTML=Object.keys(UI_ICON_ART).map(k=>'<article style="min-width:0;padding:12px;display:grid;gap:10px;justify-items:center"><span style="font-size:32px">'+icon(k)+'</span><small style="font-size:11px;overflow-wrap:anywhere">'+k+'</small></article>').join('');document.querySelector('#game-grid').style.gridTemplateColumns='repeat(4,minmax(0,1fr))';};
window.showScreen=async name=>{const api=async url=>{
 if(fixtures[name])return fixtures[name];
 if(name==='arena')return {mode:'common',rank:'Золото I',rating:2500,position:24,totalPlayers:100,chances:5,maxChances:5,ranks:[],leaderboard:[]};
 if(name==='clan')return {clan:{name:'WhiteOrder',level:5,members:[],reputation:1200,warehouse:{gold:12000,crystals:8000,ironOre:3000},myContribution:100,myRole:'member',levelProgress:{current:500,needed:1000}},quiz:{available:false}};
 throw Error(url);
};await ({inventory:openInventoryGame,equipment:openEquipmentGame,skills:openSkillsGame,arena:openArenaGame,clan:openClanGame,language:openLanguageGame,help:openHelpGame})[name]({...opts,api});};
startEmojiIcons();window.showTab('games');window.ready=true;
window.checkSymbols=()=>{const box=document.createElement('div');box.id='symbol-check';box.innerHTML='<p>🪙 💎 🧬 🧑‍🚀 🇷🇺</p><button aria-label="Справка">?</button><input value="🧬" />'+cardHtml('10 ♥');document.body.append(box);};
</script>`);
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end(html);return;}const file=path.resolve(root,'webapp','.'+url.pathname);if(!file.startsWith(path.join(root,'webapp')+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try {
 browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
 for(const width of [320,390]) {
  const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,isMobile:true,reducedMotion:'reduce'});
  const errors=[],failed=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready);
  const verify=async()=>{await page.locator('img.ui-icon').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));assert.equal(await page.locator('svg.ui-icon,.game-icon svg,.nav-tab svg').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'document overflow');};
  for(const id of ['hero','battle','games','clan','trade','more']) {await page.evaluate(id=>window.showTab(id),id);await verify();if(id==='games'||id==='more')await page.screenshot({path:'docs/painted-ui-'+id+'-'+width+'.png',fullPage:true});}
  await page.evaluate(()=>window.showGallery());await verify();if(width===390)await page.screenshot({path:'docs/painted-ui-icons-390.png',fullPage:true});
  await page.evaluate(()=>window.checkSymbols());await page.waitForFunction(()=>document.querySelector('#symbol-check p').textContent.trim()==='');assert.equal(await page.locator('#symbol-check input').inputValue(),'🧬');assert.equal(await page.locator('#symbol-check img').count(),9);await page.locator('#symbol-check img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));await page.locator('#symbol-check').evaluate(n=>n.remove());
  for(const name of ['inventory','equipment','skills','arena','clan','language','help']) {
   await page.evaluate(name=>window.showScreen(name),name);await page.waitForSelector('.game-overlay.visible');await verify();
   const panel=page.locator('.game-overlay > .overlay-panel');assert.equal(await panel.evaluate(n=>n.scrollWidth>n.clientWidth),false,name+' panel overflow');
   const box=await panel.boundingBox();assert.ok(box.x>=7 && box.x+box.width<=width-7,name+' gutters '+JSON.stringify(box));assert.ok(box.y<20,name+' top spacing '+JSON.stringify(box));
   if(width===390)await page.screenshot({path:'docs/painted-ui-'+name+'-390.png'});
   await page.locator('.game-overlay .overlay-close').first().click();await page.waitForSelector('.game-overlay',{state:'detached'});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({width,tabs:6,windows:7,paintedIcons:true,overflow:false}));await page.close();
 }
} finally {await browser?.close();await new Promise(r=>server.close(r));}
