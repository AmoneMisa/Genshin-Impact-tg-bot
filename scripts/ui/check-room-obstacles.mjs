import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/room-obstacles');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100])for(const environment of ['woodland','catacomb'])for(const missing of [false,true]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#100e14;color:#dacba9;margin:0;padding:8px;font:14px Georgia}main{display:flex;flex-wrap:wrap;justify-content:center;gap:12px}article{overflow:hidden;position:relative;background:#121811}h2{font-size:14px;margin:0;padding:8px}svg{display:block}</style><main><article><h2>SVG</h2><div id="svg"></div></article><article><h2>Canvas 2D</h2><div id="canvas"></div></article></main>'});
  if(missing&&u.startsWith('/art/world/'))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'image/webp',body:fs.readFileSync(file)});
 });
 await page.goto('http://room-obstacles.local/fixture');
 const result=await page.evaluate(async({width,environment})=>{
  const [{isoTerrain},{paintRoom},{loadRoomPropArt},{loadRoomScene},{roomObstacleProps,bindRoomObstacleFallback}]=await Promise.all([import('/hunt-isometric.js'),import('/room-paint.js'),import('/room-props-art.js'),import('/room-scene-art.js'),import('/room-obstacles.js')]);
  const field={environment,sceneKey:environment==='woodland'?'cruma-marshlands:r0c0:floor-1':'catacomb-branded:r0c0:floor-1',walls:[{x:.22,y:.3,w:.52,h:.075,kind:'wall'},{x:.6,y:.57,w:.12,h:.13,kind:'stone'},{x:.26,y:.69,w:.06,h:.06,kind:'pillar'}]},before=JSON.stringify(field),viewport={width:Math.min(500,width-16),height:490};
  await Promise.all([loadRoomPropArt(),loadRoomScene(environment,{compact:viewport.width<480,sceneKey:field.sceneKey})]);
  document.querySelector('#svg').innerHTML=isoTerrain(field,viewport);
  const svg=document.querySelector('#svg>svg');svg.setAttribute('width',viewport.width);svg.setAttribute('height',viewport.height);
  bindRoomObstacleFallback(svg);
  const painting=paintRoom(field,viewport),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(painting.floor,painting.bounds.x,painting.bounds.y);painting.props.forEach(prop=>ctx.drawImage(prop.canvas,prop.x,prop.y));document.querySelector('#canvas').append(canvas);
  const props=roomObstacleProps(field.walls),extreme=roomObstacleProps([{x:0,y:0,w:100,h:100,kind:'wall'}]);
  return {unchanged:JSON.stringify(field)===before,svgCount:document.querySelectorAll('.hunt-iso-prop').length,canvasCount:painting.props.length,expected:props.length,bounded:extreme.length<=6,overflow:document.documentElement.scrollWidth>innerWidth};
 },{width,environment});
 assert.equal(result.unchanged,true);assert.equal(result.svgCount,result.expected);assert.equal(result.canvasCount,result.expected);assert.equal(result.bounded,true);assert.equal(result.overflow,false);
 assert.equal(await page.locator('.hunt-iso-wall,.iso-front,.iso-side,.iso-top').count(),0);assert.ok(await page.locator('[data-stone-fallback]').count()>0);
 await page.waitForFunction(missing=>[...document.querySelectorAll('[data-room-prop-art]')].every(image=>missing?image.style.display==='none':image.closest('.hunt-iso-prop').querySelector('[data-prop-fallback]').style.display==='none'),missing);assert.deepEqual(errors,[]);
 await page.screenshot({path:path.join(out,`${environment}-${width}-${missing?'fallback':'painted'}.png`),fullPage:true});await page.close();console.log(`PASS organic obstacles ${environment} ${width}px ${missing?'fallback':'painted'}`);
}}finally{await browser.close();}
