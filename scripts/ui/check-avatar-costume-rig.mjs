import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {AVATAR_COSTUME_RIGS} from '../../webapp/art/avatar-costume-rigs.js';
import {AVATAR_COSTUME_VARIANTS} from '../../webapp/art/avatar-costume-art.js';
import {AVATAR_OUTFITS} from '../../webapp/art/avatar-art.js';
import {blinkAmount, deformCostumePoint} from '../../webapp/avatar-costume-rig.js';
const root=path.resolve('webapp'),output=path.resolve('art-source/avatars/motion-review');
for(const item of AVATAR_COSTUME_VARIANTS) assert.ok(AVATAR_COSTUME_RIGS['/art/avatars/collections/v1/'+item.key],item.key);
for(const item of AVATAR_OUTFITS) assert.ok(AVATAR_COSTUME_RIGS[item.artPath],item.key);
for(const [key,rig] of Object.entries(AVATAR_COSTUME_RIGS)) {
  assert.ok(fs.existsSync(path.join(root,'.'+key+'-512.webp')),key);
  assert.deepEqual(deformCostumePoint(.5,.95,rig,2,1),[.5,.95]);
  for(const [x,y,rx,ry] of rig.eyes) {
    assert.ok(x>0&&x<1&&y>0&&y<.4);
    assert.ok(rx>0&&ry>0);
  }
}
assert.equal(blinkAmount(.12),1);assert.equal(blinkAmount(1),0);
const {chromium}=await import(pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
try {
  const page=await browser.newPage({viewport:{width:780,height:780}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const selected=['/art/avatars/races/v3/dwarf-female','/art/avatars/races/v2/elf-female'];
  const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#121926;color:#eee;font:16px sans-serif}main{display:flex}section{position:relative;width:390px;height:680px}img{width:390px;height:585px;object-fit:contain}.avatar-costume-canvas{position:absolute;pointer-events:none}[data-avatar-rig-active]{visibility:hidden}h1{margin:16px;font-size:18px}</style><h1>Дыхание · волосы · ткань · моргание</h1><main>${selected.map(src=>`<section><img src="${src}-512.webp" alt="Персонаж"></section>`).join('')}</main><script type="module">import{createCostumeRig}from'/avatar-costume-rig.js';import{avatarCostumeRig,AVATAR_COSTUME_RIGS}from'/art/avatar-costume-rigs.js';window.testRigs=AVATAR_COSTUME_RIGS;window.views=[];for(const img of document.querySelectorAll('img')){await img.decode();window.views.push(createCostumeRig(img,avatarCostumeRig(new URL(img.src).pathname)));}window.ready=true;</script>`;
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:html});
    const file=path.resolve(root,'.'+url.pathname);
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
    return route.fulfill({contentType:({'.js':'text/javascript','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4327/');await page.waitForFunction(()=>window.ready);
  const stats=await page.evaluate(()=>{
    const durations=[];
    for(let i=0;i<20;i++)for(const v of window.views){v.setActive(true);durations.push(v.draw(i/20,0));}
    return {averageMs:durations.reduce((a,b)=>a+b)/durations.length,maxMs:Math.max(...durations)};
  });
  const before=await page.evaluate(()=>window.views.map(v=>{v.draw(0,0);return [...v.canvas.getContext('2d').getImageData(0,0,v.canvas.width,v.canvas.height).data];}));
  await page.screenshot({path:path.join(output,'rig-open.png')});
  await page.evaluate(()=>window.views.forEach(v=>v.draw(0,1)));await page.screenshot({path:path.join(output,'rig-blink.png')});
  const changes=await page.evaluate(({before,selected})=>window.views.map((v,index)=>{
    const data=v.canvas.getContext('2d').getImageData(0,0,v.canvas.width,v.canvas.height).data;
    let changed=0,outside=0,maxOutsideDelta=0;
    for(let i=0;i<data.length;i+=4)if(data[i]!==before[index][i]||data[i+1]!==before[index][i+1]||data[i+2]!==before[index][i+2]){
      changed++;const x=(i/4%v.canvas.width)/v.canvas.width,y=Math.floor(i/4/v.canvas.width)/v.canvas.height;
      const rig=window.testRigs[selected[index]];
      if(!rig.eyes.some(([ex,ey,rx,ry])=>Math.abs(x-ex)<rx*1.8+.01&&Math.abs(y-ey)<ry+.01)){
        outside++;maxOutsideDelta=Math.max(maxOutsideDelta,Math.abs(data[i]-before[index][i]),Math.abs(data[i+1]-before[index][i+1]),Math.abs(data[i+2]-before[index][i+2]));
      }
    }
    return {changed,outside,maxOutsideDelta};
  }),{before,selected});
  for(const change of changes){assert.ok(change.changed>0);assert.ok(change.maxOutsideDelta<=1,JSON.stringify(change));}
  for(let i=0;i<72;i++) {
    const t=i/12,closure=i===28?1:i===27||i===29?.4:0;
    await page.evaluate(({t,closure})=>window.views.forEach(v=>v.draw(t,closure)),{t,closure});
    await page.screenshot({path:path.join(output,`frame-${String(i).padStart(3,'0')}.png`)});
  }
  const faceSheets=process.argv.includes('--preview-only')?[]:await page.evaluate(async()=>{
    const {AVATAR_COSTUME_RIGS}=await import('/art/avatar-costume-rigs.js');
    const {createCostumeRig}=await import('/avatar-costume-rig.js');
    const sheets=[];let sheet,ctx,index=0;
    for(const [src,rig] of Object.entries(AVATAR_COSTUME_RIGS)) {
      if(index%12===0){sheet=document.createElement('canvas');sheet.width=1200;sheet.height=600;ctx=sheet.getContext('2d');ctx.fillStyle='#121926';ctx.fillRect(0,0,1200,600);}
      const img=new Image();img.src=src+'-512.webp';img.style.cssText='width:512px;height:768px';document.body.append(img);await img.decode();
      const view=createCostumeRig(img,rig);const x=(index%4)*300,y=Math.floor((index%12)/4)*200;
      ctx.fillStyle='white';ctx.font='10px sans-serif';ctx.fillText(src.split('/').at(-1),x,y+12);
      const [fx,fy]=rig.face;const w=view.canvas.width,h=view.canvas.height,left=(fx-45/512)*w,top=(fy-35/768)*h;
      view.draw(0,0);ctx.drawImage(view.canvas,left,top,90/512*w,80/768*h,x,y+20,135,120);
      view.draw(0,1);ctx.drawImage(view.canvas,left,top,90/512*w,80/768*h,x+140,y+20,135,120);
      view.destroy();img.remove();index++;
      if(index%12===0)sheets.push(sheet.toDataURL('image/png').split(',')[1]);
    }
    if(index%12)sheets.push(sheet.toDataURL('image/png').split(',')[1]);return sheets;
  });
  faceSheets.forEach((data,index)=>fs.writeFileSync(path.join(output,`blink-faces-${index}.png`),Buffer.from(data,'base64')));
  await page.evaluate(()=>window.views.forEach(v=>v.destroy()));
  assert.equal(await page.locator('canvas').count(),0);assert.deepEqual(errors,[]);
  const report={rigs:Object.keys(AVATAR_COSTUME_RIGS).length,paintingVariants:AVATAR_COSTUME_VARIANTS.length,defaultAvatars:AVATAR_OUTFITS.length,feetAnchored:true,blink:true,continuousWarp:true,...stats};
  fs.writeFileSync(path.join(output,'rig-review.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
