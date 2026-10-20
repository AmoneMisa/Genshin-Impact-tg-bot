import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {worldState,worldAction,CITIES,CITY_NPCS} from '../../functions/game/world/world.js';
import {findCityPath} from '../../functions/game/world/cityNavigation.js';
import change from '../../functions/game/player/changePlayerGameClass.js';
import update from '../../functions/game/player/updatePlayerStats.js';
const root=path.resolve('webapp'),out=path.resolve('.tmp/city-navigation-ui');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const selected=process.env.CITY_NAVIGATION_ALL?CITIES:CITIES.filter(c=>(process.env.CITY_NAVIGATION_CITIES||"giran").split(",").includes(c.id));
try{for(const width of [320,390,1100])for(const city of selected){
 let now=1800000000000;
 const s={userId:1,game:{stats:{lvl:85},inventory:{gold:1000000,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0,world:{mode:'city',city:city.id,x:.5,y:.5,path:[],moveAt:now,locks:{}}}};
 change(s,'humanFighter');update(s);
 const dto=()=>({world:{...worldState(s,now),holdings:[],corpses:[]}}),errors=[],requests=[];
 const page=await browser.newPage({viewport:{width,height:900},hasTouch:width<500,reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url()).pathname;requests.push(u);
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/world'){if(s.game.world.cityWalk||s.game.world.walkHome?.native)now+=1000;return route.fulfill({json:dto()});}
  if(u==='/api/boss/epic')return route.fulfill({json:{bosses:[]}});
  if(u==='/api/world/action'){
   const result=worldAction(s,route.request().postDataJSON(),now);return route.fulfill({status:result.ok?200:409,json:{...result,...dto()}});
  }
  const bundle=assets.bundles?.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://city.local/fixture');
 await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();const api=async(url,opts)=>{const response=await fetch(url,opts),data=await response.json();if(!response.ok)throw Object.assign(new Error(data.reason),{payload:data});return data;};window.openAtlas=()=>import('/world-map.js').then(m=>m.openWorldMap({api}));await window.openAtlas();});
 await page.locator('[data-mode="city"]').click();
 assert.equal(await page.locator('[data-city-view]').count(),0);assert.equal(await page.locator('.atlas-popup').isVisible(),false);
 await page.waitForTimeout(500);
 const tile=String(Math.floor(city.x/32768)+20)+"_"+String(Math.floor(city.y/32768)+18);
 assert.ok(requests.some(u=>u.includes("/l2/"+tile)),city.id+" original map tile");
 const box=await page.locator("canvas").boundingBox(),actorSize=city.size||14000;
 const baseSpan=city.mapSize||city.size||14000,focus={x:s.game.world.x,y:s.game.world.y};
 let target,span=baseSpan,camera;
 for(let attempt=0;attempt<3&&!target;attempt++){
  if(attempt){await page.locator("[data-zoom=\"1\"]").click();span/=1.4;}
  camera={x:.5+(focus.x-.5)*span/baseSpan,y:.5+(focus.y-.5)*span/baseSpan};
  const d=Math.min(5000,span*.4);
  const groups=[];for(const n of CITY_NPCS.filter(n=>n.city===city.id))if(!groups.some(g=>Math.hypot(g.x-n.x,g.y-n.y)*box.width/span<55))groups.push(n);
  const offsets=[...[-1,-.5,0,.5,1].flatMap(x=>[-1,-.5,0,.5,1].filter(y=>x||y).map(y=>[x*d,y*d]))];
  target=offsets.map(([dx,dy])=>({x:.5+(Math.floor((city.x+(camera.x-.5)*actorSize+dx)/16)*16+8-city.x)/actorSize,y:.5+(Math.floor((city.y+(camera.y-.5)*actorSize+dy)/16)*16+8-city.y)/actorSize})).find(p=>{
   const px=box.width/2+(p.x-camera.x)*actorSize*box.width/span,py=box.height/2+(p.y-camera.y)*actorSize*box.width/span;
   if(px<30||px>box.width-30||py<120||py>box.height-75)return false;
   if(groups.some(n=>Math.hypot(n.x-(city.x+(p.x-.5)*actorSize),n.y-(city.y+(p.y-.5)*actorSize))*box.width/span<34))return false;
   return findCityPath({...s.game.world},city,p)?.length;
  });
 }
 assert.ok(target,city.id+" verified click away from NPC markers");
 const position=()=>s.game.world.walkHome?.native?.point||s.game.world.nativePosition||{x:city.x+(s.game.world.x-.5)*actorSize,y:city.y+(s.game.world.y-.5)*actorSize,z:s.game.world.z};
 const before={...position()};
 const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith("/api/world/action")&&r.request().postDataJSON()?.action==="move"),page.locator("canvas").click({position:{x:box.width/2+(target.x-camera.x)*actorSize*box.width/span,y:box.height/2+(target.y-camera.y)*actorSize*box.width/span}})]);
 assert.equal(response.status(),200,city.id+': '+JSON.stringify({reason:(await response.json()).reason,expected:target,actual:response.request().postDataJSON(),box,span}));
 assert.ok(s.game.world.cityWalk||s.game.world.walkHome?.native,city.id+' canvas click creates a source-checked journey');
 await page.waitForTimeout(2300);assert.ok(Math.hypot(position().x-before.x,position().y-before.y)>0,'the server advances the actual position');
 assert.ok(['city','road','native'].includes(s.game.world.mode));assert.ok(Number.isFinite(position().z));
 assert.equal(await page.locator('.atlas-panel').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
 await page.screenshot({path:path.join(out,`${city.id}-${width}.png`)});
 await page.locator('[data-close]').click();assert.equal(await page.locator('.atlas-overlay').count(),0);assert.deepEqual(errors,[]);
 await page.close();console.log(`PASS ${city.id} ${width}: original map, no preview, native town click, server movement, focus cleanup`);
}}finally{await browser.close();}
