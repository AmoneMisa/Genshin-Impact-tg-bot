import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
try{
  const page=await browser.newPage({viewport:{width:390,height:820}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4328/');await page.waitForFunction(()=>window.previewReady);
  await page.locator('#play').click();
  const result=await page.evaluate(async()=>{
    const {AVATAR_COSTUME_RIGS}=await import('/art/avatar-costume-rigs.js');
    const {createCostumeRig}=await import('/avatar-costume-rig.js');
    const records=[],sheets=[];let sheet,ctx,index=0;
    for(const [src,rig]of Object.entries(AVATAR_COSTUME_RIGS)){
      const container=document.createElement('div');container.style.cssText='position:relative;width:160px;height:240px';
      const img=new Image();img.style.cssText='width:160px;height:240px;object-fit:contain';img.src=src+'-256.webp';container.append(img);document.body.append(container);await img.decode();
      const view=createCostumeRig(img,rig);if(!view)throw new Error('No Canvas context: '+src);
      view.setActive(true);
      if(index%8===0){sheet=document.createElement('canvas');sheet.width=1280;sheet.height=540;ctx=sheet.getContext('2d');ctx.fillStyle='#121926';ctx.fillRect(0,0,1280,540);}
      const x=(index%4)*320,y=Math.floor((index%8)/4)*270;
      const ms=view.draw(0,0),before=view.canvas.toDataURL();
      ctx.font='10px sans-serif';ctx.fillStyle='white';ctx.fillText(index+' '+src.split('/').at(-1),x,y+12);ctx.drawImage(view.canvas,x,y+20,160,240);
      view.draw(1.95,0);const after=view.canvas.toDataURL();
      ctx.drawImage(view.canvas,x+160,y+20,160,240);index++;if(index%8===0)sheets.push(sheet.toDataURL().split(',')[1]);
      records.push({src,moving:before!==after,width:view.canvas.width,wing:Boolean(rig.wing),ms});
      view.destroy();container.remove();
    }
    if(index%8)sheets.push(sheet.toDataURL().split(',')[1]);
    return {records,sheets};
  });
  assert.equal(result.records.length,234);assert.equal(result.records.filter(r=>r.wing).length,39);
  for(const row of result.records){assert.ok(row.moving,row.src);assert.ok(row.width<=384,row.src);}
  assert.deepEqual(errors,[]);
  const folder=path.resolve('art-source/avatars/motion-review');
  result.sheets.forEach((data,i)=>fs.writeFileSync(path.join(folder,`pose-motion-pairs-${i}.png`),Buffer.from(data,'base64')));
  const report={rendered:234,costumes:222,defaults:12,animatedWings:39,allFramesChanged:true,errors,records:result.records};
  fs.writeFileSync(path.join(folder,'all-costume-motion-review.json'),JSON.stringify(report,null,2));
  console.log('All 234 individually annotated avatars rendered changing frames; 30 pose pair sheets saved; no browser errors.');
}finally{await browser.close();}
