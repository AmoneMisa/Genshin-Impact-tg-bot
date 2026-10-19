import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root=path.resolve('webapp'),out=path.resolve('.tmp/terrain-stitch');fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const width of [320,390,1100])for(const missing of [false,true]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url()).pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#100e14}#terrain>svg{display:block;width:100vw;height:900px}</style><div id="terrain"></div>'});
  if(missing&&u.startsWith('/art/world/'))return route.fulfill({status:404});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:file.endsWith('.js')?'text/javascript':'image/webp',body:fs.readFileSync(file)});
 });
 await page.goto('http://terrain-stitch.local/fixture');
 const pixels=await page.evaluate(async width=>{
  const [{streamedTerrain,TERRAIN_BLEND:b},{isoMatrix,isoPoint,isoPick}]=await Promise.all([import('/terrain-stitch.js'),import('/hunt-isometric.js')]);
  const viewport={width,height:520},m=isoMatrix(viewport),project=p=>isoPoint(p,viewport),colors=['#dc2828','#28dc28','#2828dc','#dcdc28'];
  const tiles=colors.map((color,i)=>({id:'test'+i,dx:i%2,dy:Math.floor(i/2),color}));
  async function raster(tiles,origin){
   const center=project(origin),vx=center.x-width/2,vy=center.y-260;
   const svg=streamedTerrain({continuous:{space:'test',tiles}},viewport,{matrix:m,project,layers:t=>({ground:`<polygon points="${[[-b,-b],[1+b,-b],[1+b,1+b],[-b,1+b]].map(([x,y])=>{const p=project({x,y});return p.x+','+p.y;}).join(' ')}" fill="${t.color}"/>`,props:''})}).replace(`viewBox="0 0 ${width} 520"`,`width="${width}" height="520" viewBox="${vx} ${vy} ${width} 520"`);
   const image=new Image(),url=URL.createObjectURL(new Blob([svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ')],{type:'image/svg+xml'}));image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=width;canvas.height=520;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
   const sample=point=>{const p=project(point);return [...ctx.getImageData(Math.round(p.x-vx),Math.round(p.y-vy),1,1).data];};
   sample.world=point=>{const p=project(point);return isoPick({x:Math.round(p.x-vx)+vx+.5,y:Math.round(p.y-vy)+vy+.5},viewport);};return sample;
  }
  const sample=await raster(tiles,{x:1,y:1}),rebase=await raster(tiles.map(t=>({...t,dx:t.dx-1})),{x:0,y:1}),hole=await raster(tiles.slice(0,3),{x:1,y:1});
  const points=[{x:.999,y:.65},{x:1.001,y:.65},{x:1,y:.65},{x:1,y:1},{x:.94,y:.65},{x:1.06,y:.65}];
  let edgeError=0,worst=null;for(const y of [.61,.65,.69])for(let x=1.03;x<1.06;x+=.0007){const p={x,y},actual=sample.world(p),t=Math.max(0,Math.min(1,(actual.x-(1-b))/(2*b))),expected=[220-180*t,40+180*t,40,255],color=sample(p),error=Math.max(...color.map((n,i)=>Math.abs(n-expected[i])));if(error>edgeError){edgeError=error;worst={actual,expected,color};}}
  return {values:points.map(sample),rebased:points.map(p=>rebase({x:p.x-1,y:p.y})),hole:hole({x:1.1,y:1.1}),edgeError,worst};
 },width);
 const difference=(a,b)=>Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
 assert.ok(difference(pixels.values[0],pixels.values[1])<30,'no colour step at the shared edge');
 assert.ok(difference(pixels.values[2],[130,130,40,255])<15,'edge mixes only its two neighbours');
 assert.ok(difference(pixels.values[3],[130,130,85,255])<15,'four-way junction blends all four cells');
 assert.ok(difference(pixels.values[4],[220,40,40,255])<3);assert.ok(difference(pixels.values[5],[40,220,40,255])<3,'interior art remains sharp and unchanged');
 pixels.values.forEach((value,i)=>assert.ok(difference(value,pixels.rebased[i])<3,'crossing preserves the same world seam'));
 assert.equal(pixels.hole[3],0,'no visual bridge across a missing cell');
 assert.ok(pixels.edgeError<10,`mask boundaries leave no antialiasing hairlines: ${pixels.edgeError} ${JSON.stringify(pixels.worst)}`);
 await page.evaluate(async width=>{
  const [{isoTerrain,isoPoint},{bindRoomObstacleFallback}]=await Promise.all([import('/hunt-isometric.js'),import('/room-obstacles.js')]);
  const tiles=Array.from({length:9},(_,i)=>({id:'r'+Math.floor(i/3)+'c'+i%3,dx:i%3-1,dy:Math.floor(i/3)-1,environment:'woodland',sceneKey:'cruma-marshlands:r0c0:floor-1',walls:[{x:.95,y:.45,w:.06,h:.07,kind:'tree'}]}));
  const viewport={width,height:900},field={continuous:{space:'cruma-marshlands',tiles}},svg=isoTerrain(field,viewport);document.querySelector('#terrain').innerHTML=svg;
  const center=isoPoint({x:1,y:.5},viewport);document.querySelector('#terrain>svg').setAttribute('viewBox',`${center.x-width/2} ${center.y-450} ${width} 900`);bindRoomObstacleFallback(document.querySelector('#terrain'));
 },width);
 await page.waitForFunction(missing=>[...document.querySelectorAll('[data-room-scene-art]')].every(image=>missing?image.style.display==='none':image.dataset.fallbackBound==='true'),missing);
 await page.waitForTimeout(150);assert.equal(await page.locator('[data-terrain-cell]').count(),9);assert.equal(await page.locator('[data-terrain-props]').count(),9);assert.equal(await page.locator('.hunt-iso-tree').count(),9);
 assert.equal(await page.locator('canvas,filter,.hunt-iso-wall').count(),0);assert.deepEqual(errors,[]);await page.screenshot({path:path.join(out,`surface-${width}-${missing?'fallback':'painted'}.png`)});await page.close();
 console.log(`PASS stitched terrain ${width}px ${missing?'fallback':'painted'}: edge pixels, junction, rebasing, holes and single props`);
}}finally{await browser.close();}
