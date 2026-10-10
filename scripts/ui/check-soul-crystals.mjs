import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fieldPeers,useFieldPvpSkill,advanceFieldPvp} from '../../functions/game/hunt/fieldPvp.js';
import {getEquipmentState,performEquipmentAction} from '../../miniapp/equipment.js';
import {getHuntState, startHuntForMiniApp, moveHuntForMiniApp, targetHuntForMiniApp, useHuntSkillForMiniApp} from '../../miniapp/hunt.js';
import {selectSoulCrystal,exchangeSeals,saInfo,saOptions} from '../../functions/game/equipment/soulCrystals.js';
import {findCatalogItem,instantiate} from '../../functions/game/equipment/catalog.js';
import {addMaterial} from '../../functions/game/player/materials.js';
import changePlayerGameClass from '../../functions/game/player/changePlayerGameClass.js';
import updatePlayerStats from '../../functions/game/player/updatePlayerStats.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
console.log('Browser ready');
const root=path.resolve('webapp'),base='http://127.0.0.1:4321';
const styles=[...fs.readFileSync('webapp/index.html','utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
function hero(){const s={userId:0,userChatData:{user:{id:1}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:5e6,crystals:100,ironOre:100,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};changePlayerGameClass(s,'mage');updatePlayerStats(s);const item=instantiate(findCatalogItem('S:weapon:mace'),7);s.game.inventory.equipment.items.push(item);addMaterial(s,'soul_red_13');addMaterial(s,'soul_red_0');addMaterial(s,saInfo(s,item).gemKey,saInfo(s,item).gems);for(const c of ['red','green','blue'])addMaterial(s,'seal_'+c,10);return s;}
try{
 for(const width of [320,390,1100]){
  const session=hero(),page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[],bad=[];
  page.setDefaultTimeout(10000);
  const peer=hero();peer.userId=2;peer.userChatData.user={id:2,first_name:'Тёмный странник'};const chat={members:[session,peer]};
  const huntState=async()=>{advanceFieldPvp(chat);return getHuntState(session,Date.now(),fieldPeers(chat,session));};
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url()),p=url.pathname;
   if(p.startsWith('/api/')){const body=route.request().postDataJSON()||{};let result;
    if(p==='/api/equipment')result=getEquipmentState(session);
    else if(p==='/api/equipment/action')result=performEquipmentAction(session,body.key,body.action,body);
    else if(p==='/api/hunt')result=await huntState();
    else if(p==='/api/hunt/start')result={...startHuntForMiniApp(session,body.zone),hunt:await huntState()};
    else if(p==='/api/hunt/move')result={...moveHuntForMiniApp(session,body.direction),hunt:await huntState()};
    else if(p==='/api/hunt/target')result={...targetHuntForMiniApp(session,body.targetId),hunt:await huntState()};
    else if(p==='/api/hunt/skill')result={...(body.targetUserId!=null?useFieldPvpSkill(chat,session,body.targetUserId,body.skillIndex,{force:body.force===true,random:()=>.5}):useHuntSkillForMiniApp(session,body.skillIndex)),hunt:await huntState()};
    else if(p==='/api/soul/select')result={...selectSoulCrystal(session,body.color,body.stage),hunt:await huntState()};
    else if(p==='/api/catacombs/exchange')result={...exchangeSeals(session,body.counts),hunt:await huntState()};
    else return route.fulfill({status:404,body:'Unknown API'});
    if(p!=='/api/hunt')console.log(width,p,result.ok,result.reason || '');
    return route.fulfill({contentType:'application/json',body:JSON.stringify(result)});
   }
   if(p==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">${styles}</head><body><div id="status"></div></body></html>`});
   const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Missing'});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  console.log(width+' fixture');await page.goto(base+'/fixture.html');console.log(width+' equipment');
  await page.evaluate(async()=>{const {openEquipmentGame}=await import('/equipment.js');await openEquipmentGame({api:async(p,o)=>{const r=await fetch(p,o);const data=await r.json();if(data.ok===false)throw Object.assign(new Error(data.reason),{payload:data});return data;},renderState:()=>{},haptic:()=>{},statusElement:document.querySelector('#status'),initialView:'forge'});});
  console.log(width+' SA buttons');const install=page.locator('[data-sa-id="acumen"]');assert.equal(await install.count(),1);await install.click();await install.click();await page.waitForSelector('[data-sa-remove]',{state:'attached'});assert.equal(session.game.inventory.equipment.items[0].sa.id,'acumen');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'forge overflow '+width);
  await page.locator('.sa-block summary').click();
  if(width===390){await page.locator('.upgrade-card').scrollIntoViewIfNeeded();await page.locator('.upgrade-card').screenshot({path:'docs/sa-live-forge-390.png'});}
  await page.locator('.equipment-overlay .overlay-close').click();await page.waitForSelector('.equipment-overlay',{state:'detached'});
  await page.evaluate(async()=>{const {openHuntGame}=await import('/hunt.js');await openHuntGame({api:async(p,o)=>{const r=await fetch(p,o);const data=await r.json();if(data.ok===false)throw Object.assign(new Error(data.reason),{payload:data});return data;},renderState:()=>{},haptic:()=>{},statusElement:document.querySelector('#status'),initialZoneKind:'catacomb'});});
  assert.equal(await page.locator('.hunt-zone').count(),6);await page.locator('[data-soul-select]').selectOption('red:0');await page.waitForFunction(()=>document.querySelector('.hunt-soul strong').textContent.includes('Красный 0'));
  await page.locator('[data-seal-exchange]').click();await page.waitForFunction(()=>document.querySelector('[data-hunt-feedback]').textContent.includes('180 AA'));assert.equal(session.game.inventory.ancientAdena,180);
  await page.locator('.hunt-zone-art').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'hunt overflow '+width);
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);if(width===390)await page.locator('.hunt-panel').screenshot({path:'docs/catacombs-live-390.png'});
  await page.locator('[data-zone="catacomb-forbidden-path"]').click();await page.waitForSelector('.hunt-battlefield');
  assert.equal(await page.locator('.hunt-actor').count(),3);
  await page.locator('.hunt-actor').nth(2).click();assert.equal(session.game.hunt.field.target,session.game.hunt.field.mobs[2].instanceId);
  session.game.hunt.mob.name='Nephilim Commander';session.game.hunt.mob.element='dark';
  await page.locator('.hunt-actor').nth(2).click();
  const frameFits=await page.locator('.hunt-mob').evaluate(frame=>{
   const bounds=frame.getBoundingClientRect();
   return [...frame.querySelectorAll('.mmo-frame-title,.mmo-frame-title strong,.mmo-frame-title small,.mmo-bar,.mmo-bar-track')].every(node=>{const r=node.getBoundingClientRect();return r.left>=bounds.left+1 && r.right<=bounds.right-1 && r.bottom<=bounds.bottom-1;});
  });assert.ok(frameFits,'long mob name, role and HP stay within frame at '+width);
  if(width===390)await page.locator('.hunt-mob').screenshot({path:'docs/hunt-mob-frame-390.png'});
  for(let step=0;step<3;step++)await page.locator('[data-move="forward"]').click();
  assert.ok(session.game.hunt.field.mobs.some(m=>m.aggro));
  await page.locator('.hunt-target-drops summary').click();assert.ok(await page.locator('.hunt-target-drops .hunt-drop-table>div').count()>0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'battlefield overflow '+width);
  await page.locator('.hunt-actor img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
  if(width===390){await page.locator('.hunt-battlefield').scrollIntoViewIfNeeded();await page.locator('.hunt-panel').screenshot({path:'docs/hunt-battlefield-390.png'});}
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  assert.equal(await page.locator('.hunt-vitality').count(),1,'PvE shows vitality');
  console.log(width+' PvP');startHuntForMiniApp(peer,'catacomb-forbidden-path');peer.game.hunt.field.x=session.game.hunt.field.x;peer.game.hunt.field.y=session.game.hunt.field.y;
  await page.waitForSelector('[data-pvp-target="2"]');await page.locator('[data-pvp-target="2"]').click();
  assert.equal(await page.locator('.hunt-pvp-target .mmo-bar').evaluateAll(nodes=>nodes.map(n=>n.classList[1]).join(',')),'cp,hp,mp');
  assert.equal(await page.locator('.hunt-vitality').count(),0,'PvP hides vitality');
  assert.equal(await page.locator('.hunt-extra,.hunt-last,.hunt-target-drops').count(),0,'PvP hides PvE tools and loot');
  console.log(width+' force check');await page.locator('[data-skill="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-hunt-feedback]').textContent.includes('принудительную атаку'),null,{timeout:10000});
  await page.locator('[data-force-attack]').check();await page.locator('[data-skill="0"]').click();
  await page.waitForFunction(()=>document.querySelector('.hunt-panel .player-frame[data-pvp="flagged"]'));
  assert.equal(await page.locator('[data-hunt-feedback]').innerText(),'','PvP hit stays in the journal only');
  assert.equal(peer.game.worldPvp?.flagUntil || 0,0,'victim stays white');
  assert.equal(await page.locator('svg').count(),0);
  await page.locator('.hunt-panel img').evaluateAll(nodes=>Promise.all(nodes.map(n=>{n.loading='eager';return n.decode();})));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'PvP overflow '+width);
  if(width===390){
   await page.locator('.hunt-panel').evaluate(panel=>panel.scrollTop=0);await page.locator('.hunt-panel').screenshot({path:'docs/hunt-pvp-390.png'});
   await page.locator('.hunt-panel').evaluate(panel=>panel.scrollTop=panel.querySelector('.hunt-pvp-target').offsetTop-panel.offsetTop);await page.locator('.hunt-panel').screenshot({path:'docs/hunt-pvp-combat-390.png'});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
  await page.close();console.log(`${width}px: SA installation, crystal selection, six catacombs, AA exchange, assets OK`);
 }
}finally{await browser.close();}
