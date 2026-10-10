import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {addMaterial} from '../../functions/game/player/materials.js';
import fishing from '../../template/fishingData.js';
import {getFishingState} from '../../functions/game/fishing/fishing.js';
import {getSkillsState} from '../../miniapp/skills.js';
import {getClassBuffsState} from '../../miniapp/buffs.js';
import {castL2Buff} from '../../miniapp/l2Buffs.js';
import {getPassivesState} from '../../functions/game/player/passiveSkills.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const session={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e9,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
changeClass(session,'archmage');updateStats(session);
session.game.fishing={day:new Date().toISOString().slice(0,10),fish:0,casts:0,auto:false,shots:true,lastAt:0,total:0,learned:true,expertise:27};
for(const id of [fishing.rods.at(-1).item,...Object.values(fishing.shots),fishing.proofItem,...fishing.fish.filter(r=>r.level>24).slice(0,5).map(r=>r.item),...Object.keys(fishing.proofs)])addMaterial(session,'l2_'+id,10);
try{for(const width of [320,390,1100]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
 await page.goto(pathToFileURL(path.resolve('docs/l2-skill-fishing-icons-preview.html')).href);
 await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
 assert.ok(await page.locator('article').count()>500);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'gallery overflow');
 await page.locator('input').fill('Might');assert.ok(await page.locator('article:visible').count()>0);
 await page.route('**/*',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  if(pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  if(pathname.startsWith('/api/')){
   if(pathname==='/api/buffs/cast'){const request=route.request().postDataJSON();const result=castL2Buff(session,request.buffId,request.targetId);return route.fulfill({status:result.ok?200:409,contentType:'application/json',body:JSON.stringify({...result,buffs:getClassBuffsState(session)})});}
   const data=pathname==='/api/fishing'?{fishing:getFishingState(session)}:pathname==='/api/skills'?getSkillsState(session):pathname==='/api/buffs'?getClassBuffsState(session):pathname==='/api/passives'?getPassivesState(session):null;
   return route.fulfill({status:data?200:404,contentType:'application/json',body:JSON.stringify(data)});
  }
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Missing'});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 for(const [module,fn,panel] of [['skills','openSkillsGame','.skills-overlay'],['buffs','openBuffsGame','.buffs-overlay'],['passives','openPassivesGame','.buffs-overlay'],['fishing','openFishingGame','.fishing-overlay']]){
  await page.evaluate(async({module,fn})=>{const code=await import('/'+module+'.js');await code[fn]({api:async(p,o)=>(await fetch(p,o)).json(),renderState:()=>{},haptic:()=>{},statusElement:document.createElement('span')});},{module,fn});
  await page.waitForTimeout(250);
  await page.locator(panel).evaluate(async n=>{for(const i of n.querySelectorAll('img')){i.loading='eager';await i.decode();}});
  assert.ok(await page.locator(panel+' img[src*="/l2-extra/"]').count()>0,module+' native icons');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,module+' page overflow');
  assert.equal(await page.locator(panel+' .overlay-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,module+' panel overflow');
  if(width===390)await page.locator(panel+' .overlay-panel').screenshot({path:'docs/l2-'+module+'-icons-390.png'});
  await page.locator(panel).evaluate(n=>n.remove());
 }
 const oldName=session.game.gameClass.stats.name,oldTitle=session.game.gameClass.stats.translateName;
 session.game.gameClass.stats.name='warlock';session.game.gameClass.stats.translateName='Призыватель';session.game.l2CastAt={};session.game.effects=[];
 await page.evaluate(async()=>{const {openBuffsGame}=await import('/buffs.js');await openBuffsGame({api:async(p,o)=>(await fetch(p,o)).json()});});
 await page.locator('[data-effect-kind="pet"]').click();
 assert.ok(await page.locator('.buff-card').count()>0,'pet skills');assert.equal(await page.locator('[data-buff-target]').count(),0,'summon needs no target');
 await page.locator('.buffs-overlay').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(i=>i.decode())));
 await page.locator('[data-buff-cast="l2:1111"]').click();await page.waitForFunction(()=>document.querySelector('.feedback-result')?.textContent.includes('питомец призван'));
 assert.ok(session.game.effects.some(e=>e.l2SkillId===1111),'summon saved');
 assert.equal(await page.locator('.buffs-overlay .overlay-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'pets overflow');
 if(width===390)await page.locator('.buffs-overlay .overlay-panel').screenshot({path:'docs/l2-pets-icons-390.png'});
 session.game.gameClass.stats.name=oldName;session.game.gameClass.stats.translateName=oldTitle;
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);await page.close();console.log('Verified galleries, 4 live windows and mana-only pet casting at '+width+'px');
}}finally{await browser.close();}
