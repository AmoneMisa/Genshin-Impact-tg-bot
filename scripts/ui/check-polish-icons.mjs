import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {pathToFileURL} from 'node:url';
import {getCharacterState} from '../../miniapp/character.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp');
const session={gender:'male',game:{stats:{lvl:24,currentExp:24813,needExp:12574},equipmentStats:{},inventory:{sp:2147483647,gold:33000,crystals:1650,ironOre:165,equipment:{items:[]},materials:{}},gameClass:{stats:{name:'mage',translateName:'Маг',attack:100,defence:50,speed:60,hp:49773,maxHp:49773,mp:16211,maxMp:16211,cp:10589,maxCp:10589,accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},effects:[],passives:{},clanPerks:{'376':2}}};
const data=getCharacterState(session);data.player.vitality={rate:5,bonus:1.5,points:1500};
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');
const html='<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head><body><main style="padding:12px;max-width:100%;box-sizing:border-box"><div id="stats"></div><div id="gallery" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div></main><script type="module">import {renderCharacterTab} from "/character.js";import {POLISH_ICON_KEYS,polishIcon} from "/art/polish-icon-art.js";document.querySelector("#stats").innerHTML=renderCharacterTab('+JSON.stringify(data)+',"stats");document.querySelector("#gallery").innerHTML=POLISH_ICON_KEYS.map(k=>\'<article style="display:flex;gap:8px;align-items:center;padding:8px;background:#181c2a">\'+polishIcon(k)+polishIcon(k)+\'</article>\').join("");document.querySelectorAll("#gallery article").forEach(a=>{a.children[0].style.width="48px";a.children[0].style.height="48px";a.children[1].style.width="64px";a.children[1].style.height="64px";});window.ready=true;</script></body></html>';
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
try{for(const width of [320,390]){
 const page=await browser.newPage({viewport:{width,height:844},isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'});const errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
 await page.route('**/*',route=>{const pathname=new URL(route.request().url()).pathname;if(pathname==='/')return route.fulfill({contentType:'text/html',body:html});const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://127.0.0.1:4319/');await page.waitForFunction(()=>window.ready);
 await page.locator('img.polish-icon').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 assert.equal(await page.locator('.character-base button img').count(),6);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 await page.screenshot({path:'docs/polish-icons-'+width+'.png',fullPage:true});
 console.log(JSON.stringify({width,baseStatIcons:6,decoded:true,overflow:false,reducedMotion:true}));await page.close();
}}finally{await browser.close();}
