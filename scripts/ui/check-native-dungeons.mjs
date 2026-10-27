import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldAction,worldState,advanceWorld} from '../../functions/game/world/world.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {nativeActorPoint,nativeFieldBuckets} from '../../functions/game/world/nativeFieldSpace.js';
import {nativeSegment} from '../../functions/game/world/nativeNavigation.js';
import {nativeGroundAllowed} from '../../functions/game/world/nativeGround.js';
import access from '../../template/nativeDungeonAccess.js';import registry from '../../template/nativeFieldPilot.js';import {LOCATIONS} from '../../template/worldMap.js';
import change from '../../functions/game/player/changePlayerGameClass.js';import update from '../../functions/game/player/updatePlayerStats.js';
const zone=process.env.DUNGEON_ZONE||'catacomb-heretic',d=access.zones[zone],place=LOCATIONS.find(l=>l.id===zone);assert.ok(registry.fields[zone]?.dungeon);
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/native-dungeon-ui',zone);fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const cases=[{width:320},{width:390},{width:1100},{width:320,noCanvas:true},{width:320,noImages:true}].filter(c=>!process.env.DUNGEON_WIDTH||c.width===Number(process.env.DUNGEON_WIDTH));
try{for(const {width,noCanvas=false,noImages=false}of cases){
 let now=1800000000000;const s={userId:1,userChatData:{user:{id:1}},game:{stats:{lvl:85,currentExp:0},inventory:{gold:1e6,materials:{scroll_escape:2},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:d.city,x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 const chat={game:{},members:[s]};s.ownerDocument=()=>chat;change(s,'humanFighter');update(s);
 const actors=()=>nativeFieldBuckets(s.game.hunt?.field).flatMap(b=>b.mobs||[]),quiet=()=>{for(const m of actors())Object.assign(m,{aggressive:false,aggro:false,nextAttackAt:now+1e9});};
 const dto=()=>{quiet();advanceWorld(s,now);quiet();return {world:{...worldState(s,now),holdings:[],corpses:[]}};};
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));if(noCanvas)await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=()=>null;});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world')return route.fulfill({json:dto()});if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/hunt')return route.fulfill({json:await getHuntState(s,now)});if(u==='/api/combat/chat')return route.fulfill({json:{ok:true,messages:[]}});
  if(u==='/api/world/action'){
   now+=100;const body=route.request().postDataJSON(),result=worldAction(s,body,now);assert.ok(result.ok,JSON.stringify({body,result}));
   if(body.action==='native_guide'){
    const trip=s.game.hunt.field.native.journey;let previous=trip.native.point;
    for(const p of trip.native.path){assert.ok(nativeSegment(previous,p,{allowed:nativeGroundAllowed,reversible:true}));previous=p;}
    s.game=JSON.parse(JSON.stringify(s.game));now=trip.until+1;
   }
   return route.fulfill({json:{...result,...dto(),hunt:await getHuntState(s,now)}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  if(noImages&&(/\.(webp|png|jpg)$/.test(u)||u.startsWith('/art/world/native/')))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://dungeon.local/fixture');await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const api=async(u,o)=>{const r=await fetch(u,o),data=await r.json();if(!r.ok)throw Object.assign(new Error(data.reason),{payload:data});return data;};await(await import('/world-map.js')).openWorldMap({api,statusElement:document.createElement('p')});window.firstAtlas=document.querySelector('.atlas-panel');window.firstCanvas=document.querySelector('canvas');});
 const same=async()=>assert.ok(await page.evaluate(()=>window.firstAtlas===document.querySelector('.atlas-panel')&&window.firstCanvas===document.querySelector('canvas')));
 await page.locator('[data-movement]').click();await page.getByRole('combobox',{name:'Разделы телепорта',exact:true}).click();await page.getByRole('option',{name:'Катакомбы и некрополи',exact:true}).click();await page.locator('[data-quick-go]').filter({hasText:place.name}).click();
 assert.equal(await page.locator('[data-native-walk]').count(),0,'the unverified surface approach stays unpublished');
 await page.locator('[data-quick-confirm]').click();await page.locator('.atlas-combat:not([hidden])').waitFor();assert.ok(s.game.hunt.field.native.outside);await same();
 await page.locator('[data-native-levels]>summary').click();
 async function gate(id){const button=page.locator(`[data-native-route="${id}:OTHER:0"]`),gold=s.game.inventory.gold;assert.equal(await button.isDisabled(),false);await button.focus();assert.ok(await button.evaluate(n=>n===document.activeElement));await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/world/action')&&r.request().postDataJSON()?.routeId===`${id}:OTHER:0`),button.click()]);assert.equal(s.game.inventory.gold,gold);await same();}
 await gate(d.outside.npcId);assert.equal(s.game.hunt.field.native.outside,false);assert.deepEqual(nativeActorPoint(s.game.hunt.field),d.outside.targets[0].point);
 const map=worldState(s,now).nativeField.ground;assert.ok(map?.asset);assert.equal(await page.locator(`[data-native-route="${d.inside.npcId}:OTHER:0"]`).isDisabled(),true);
 await page.locator(`button[data-native-guide="${d.inside.npcId}"]`).click();await page.waitForFunction(id=>!document.querySelector(`[data-native-route="${id}:OTHER:0"]`)?.disabled,d.inside.npcId);
 const victim=actors()[0];assert.ok(victim);victim.currentHp=2;const saved={id:victim.instanceId,hp:2};s.game=JSON.parse(JSON.stringify(s.game));
 await page.screenshot({path:path.join(out,`inside-${width}${noCanvas?'-no-canvas':noImages?'-no-images':''}.png`)});
 await gate(d.inside.npcId);assert.equal(s.game.hunt.field.native.outside,true);assert.deepEqual(nativeActorPoint(s.game.hunt.field),d.inside.targets[0].point);
 await gate(d.outside.npcId);assert.equal(actors().filter(m=>m.instanceId===saved.id).length,1);assert.equal(actors().find(m=>m.instanceId===saved.id).currentHp,saved.hp);
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);assert.equal(await page.locator('[data-native-levels]').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 assert.equal(requests.some(u=>u.includes('/vendor/phaser/')||u.includes('l2j-geodata')||u.endsWith('.gz')),false);assert.deepEqual(errors,[]);
 await page.locator('.atlas-panel>[data-close],.atlas-panel>.game-dialog-heading [data-close]').first().click();const count=requests.length;await page.waitForTimeout(2300);assert.equal(requests.length,count);assert.equal(await page.locator('.atlas-overlay,dialog[open],[inert]').count(),0);await page.close();
 console.log(`PASS ${zone} ${width}${noCanvas?' no Canvas':noImages?' no images':''}: shared Atlas, source gates, free admission, geodata guide walk, save/HP, focus and cleanup`);
}}finally{await browser.close();}
