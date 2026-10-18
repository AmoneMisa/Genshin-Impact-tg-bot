// Independent browser readback of actual title glyphs and resized row medals.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {deckFor,TOKENS} from '../../../webapp/gwent-decks.js';
const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),root=fileURLToPath(new URL('..',import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const uri=p=>'data:image/png;base64,'+fs.readFileSync(p).toString('base64');
const results=[];
try{
 const page=await browser.newPage();await page.setContent('<!doctype html><canvas></canvas>');
 await page.evaluate(async font=>{const f=new FontFace('GwentCondensed',`url(data:font/ttf;base64,${font})`,{weight:'100 900'});document.fonts.add(await f.load());},fs.readFileSync(path.join(root,'wild-hunt-v1/fonts/RobotoCondensed.ttf')).toString('base64'));
 for(const folder of fs.readdirSync(root)){
  const out=path.join(root,folder),manifest=path.join(out,'deck-manifest.json');if(!fs.existsSync(manifest))continue;
  const report=JSON.parse(fs.readFileSync(manifest)),deck=deckFor(report.ruleset||'classic',report.faction);
  const cards=new Map([...deck.leaders,...deck.cards.map(([c])=>c),...Object.values(TOKENS)].map(c=>[c.id,c]));
  let titles=0,rows=0;
  for(const record of report.cards.filter(c=>c.quoteOrigin==='fan-written'&&!c.reuse)){
   const card=cards.get(record.id),metrics=report.textMetrics.find(m=>m.id===card.id),unit=card.type==='unit';
   const result=await page.evaluate(async({face,name,metric,row})=>{
    const load=async src=>{const i=new Image();i.src=src;await i.decode();return i;};
    const canvas=document.querySelector('canvas');canvas.width=310;canvas.height=585;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(await load(face),0,0);
    const pixels=ctx.getImageData(0,0,310,585).data;ctx.clearRect(0,0,310,585);
    ctx.font=`700 ${metric.fontSize}px GwentCondensed`;ctx.fillStyle='#1a1a17';ctx.textAlign='center';ctx.textBaseline='middle';
    const [x,y,w,h]=metric.box,lines=[];let cur='';
    for(const word of name.split(/\s+/)){const next=cur?cur+' '+word:word;if(cur&&ctx.measureText(next).width>w){lines.push(cur);cur=word;}else cur=next;}if(cur)lines.push(cur);
    const lineHeight=metric.fontSize*1.13,top=y+(h-lines.length*lineHeight)/2;
    lines.forEach((line,i)=>ctx.fillText(line,x+w/2,top+lineHeight*(i+.5)));
    const expected=ctx.getImageData(0,0,310,585).data;let checked=0,bad=0;
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){
     const at=(yy*310+xx)*4;if(expected[at+3]!==255)continue;checked++;
     if([0,1,2].some(c=>Math.abs(expected[at+c]-pixels[at+c])>4))bad++;
    }
    let rowChecked=0,rowBad=0,rowDelta=0,rowMax=0;
    if(row){
     ctx.clearRect(0,0,310,585);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(await load(row),0,154,80,80);
     const r=ctx.getImageData(0,0,310,585).data;
     for(let yy=154;yy<234;yy++)for(let xx=0;xx<80;xx++){
      const at=(yy*310+xx)*4;if(r[at+3]!==255||Math.hypot(xx-40,yy-194)>25)continue;rowChecked++;
      const delta=Math.max(...[0,1,2].map(c=>Math.abs(r[at+c]-pixels[at+c])));rowDelta+=delta;rowMax=Math.max(rowMax,delta);
      if(delta>4)rowBad++;
     }
    }
    return {checked,bad,rowChecked,rowBad,rowDelta,rowMax};
   },{face:uri(path.join(out,record.file)),name:card.name,metric:metrics.title,row:unit?uri(path.join(out,'layers',card.rows.length>1?'row-agile.png':`row-${card.rows[0]}.png`)):null});
   assert.ok(result.checked>30&&result.bad/result.checked<.005,`Printed name ${folder}/${card.id}: ${JSON.stringify(result)}`);titles++;
   // Independently resized medals differ slightly between Skia builds; a different
   // row glyph creates large black/gold errors, far beyond this small colour tolerance.
   if(unit){assert.ok(result.rowChecked>500&&result.rowDelta/result.rowChecked<3&&result.rowMax<45,`Painted row ${folder}/${card.id}: ${JSON.stringify(result)}`);rows++;}
  }
  results.push({folder,titles,rows,status:'passed'});console.log('PASS painted names/rows '+folder+': '+titles+'/'+rows);
 }
 fs.writeFileSync(path.join(root,'painted-text-verification.json'),JSON.stringify({status:'passed',packages:results},null,2));
}finally{await browser.close();}
