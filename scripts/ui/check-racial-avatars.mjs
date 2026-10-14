import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {getCharacterState} from '../../miniapp/character.js';
import {AVATAR_OUTFITS,avatarArtUrl} from '../../webapp/art/avatar-art.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp');
const session={gender:'male',game:{stats:{lvl:24,currentExp:24813,needExp:12574},equipmentStats:{},inventory:{sp:2147483647,gold:33000,crystals:1650,ironOre:165,equipment:{items:[]},materials:{}},gameClass:{stats:{name:'mage',translateName:'Р СљР В°Р С–',attack:100,defence:50,speed:60,hp:49773,maxHp:49773,mp:16211,maxMp:16211,cp:10589,maxCp:10589,accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},effects:[],passives:{},clanPerks:{'376':2}}};
const data=getCharacterState(session);
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');
const jobs=AVATAR_OUTFITS;
const requested = new Set(process.argv.slice(2));
const selectedJobs = requested.size ? jobs.filter(job => requested.has(job.key)) : jobs;
assert.ok(selectedJobs.length,'Provide reviewed race/gender keys, e.g. elf-female');
const htmlFor=job=>{
 const state=structuredClone(data);state.player.className={human:'humanFighter',elf:'elvenMystic',darkElf:'darkMystic',orc:'orcMystic',dwarf:'dwarvenFighter',kamael:job.gender==='female'?'femaleSoldier':'maleSoldier'}[job.race];state.player.gender=job.gender;state.player.race=job.race;
 state.player.classTitle = {human:'Человек',elf:'Эльф',darkElf:'Тёмный эльф',orc:'Орк',dwarf:'Гном',kamael:'Камаэль'}[job.race];
 return '<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head><body><button id="opener" class="ui-button">Персонаж</button><script type="module">import {openCharacterPage} from "/character.js";document.querySelector("#opener").focus();await openCharacterPage({api:async()=>('+JSON.stringify(state)+'),renderState:()=>{},haptic:()=>{}},"equipment");window.ready=true;</script></body></html>';
};
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
try{for(const width of [320,390,1100]){for(const job of selectedJobs){
 const html=htmlFor(job);
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'});const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const pathname=new URL(route.request().url()).pathname;if(pathname==='/')return route.fulfill({contentType:'text/html',body:html});const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://127.0.0.1:4319/');await page.waitForFunction(()=>window.ready);await page.locator('.character-overlay.visible').waitFor();
 await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await page.locator('.character-body-art').getAttribute('src'),avatarArtUrl({race:job.race,gender:job.gender}));
 assert.equal(await page.locator('[data-character-slot]').count(),13);
 await page.locator('[data-character-slot]').first().click();
 await page.locator('[data-character-slot]').first().focus();
 assert.equal(await page.locator('[data-character-slot]').first().evaluate(e=>e===document.activeElement),true);
 assert.equal(await page.locator('.character-body-art').evaluate(e=>getComputedStyle(e).objectFit),'contain');
 assert.equal(await page.evaluate(()=>{
  const doll=document.querySelector('.character-doll').getBoundingClientRect();
  return [...document.querySelectorAll('[data-character-slot]')].every(e=>{const b=e.getBoundingClientRect();return b.top>=doll.top-1 && b.bottom<=doll.bottom+1;});
 }),true,'equipment slots stay within the doll');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 if(job.race==='dwarf')assert.equal(await page.locator('.character-body-art').evaluate(e=>e.getBoundingClientRect().height/e.parentElement.getBoundingClientRect().height<.8),true);
 await page.screenshot({path:'docs/avatar-'+job.key+'-'+width+'.png',fullPage:true});
 await page.locator('[data-dismiss]').click();await page.locator('.character-overlay').waitFor({state:'detached'});
 console.log(JSON.stringify({width,avatar:job.key,slots:13,decoded:true,overflow:false,reducedMotion:true}));await page.close();
}}}finally{await browser.close();}
