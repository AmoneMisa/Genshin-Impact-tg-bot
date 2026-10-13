// Render reusable inventory UI icons from preserved paintings and three reconstructed client-style backgrounds.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {ITEM_ART_KEYS} from '../../webapp/art/items-art.js';
import {CATALOG_ITEM_ART} from '../../webapp/art/catalog-item-art.js';
import {l2StyleProfile} from './l2-style-profile.mjs';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const directory=path.resolve('.tmp/l2-style');fs.mkdirSync(directory,{recursive:true});
const rows=[...new Set(ITEM_ART_KEYS)].map(key=>{
 const catalog=CATALOG_ITEM_ART.find(row=>row.key===key);
 return {key,label:catalog?.name||key,...l2StyleProfile(key,catalog)};
});
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const backgroundUrls=Object.fromEntries(['weapon','armor','jewelry'].map(kind=>[kind,'data:image/png;base64,'+fs.readFileSync('art-source/l2-style/background-'+kind+'.png').toString('base64')]));
const html='<!doctype html><meta charset="utf-8"><body><canvas width="512" height="512"></canvas></body>';
fs.writeFileSync(path.join(directory,'render.html'),html);
if(!process.argv.includes('--preview-only')){
 const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
 try{
  const page=await browser.newPage({viewport:{width:600,height:600},reducedMotion:'reduce'});
  await page.goto(pathToFileURL(path.join(directory,'render.html')).href);
  for(const row of rows){
   // Crop transparent padding before fitting: 32px previews must retain the silhouette.
   const source='data:image/webp;base64,'+fs.readFileSync('webapp/art/items/v1/'+row.key+'-512.webp').toString('base64');
   const png=await page.evaluate(async({source,background,vertical})=>{
    const load=async url=>{const image=new Image();image.src=url;await image.decode();return image;};
    const image=await load(source),bg=await load(background);
    const probe=document.createElement('canvas');probe.width=image.naturalWidth;probe.height=image.naturalHeight;
    const pc=probe.getContext('2d',{willReadFrequently:true});pc.drawImage(image,0,0);
    const pixels=pc.getImageData(0,0,probe.width,probe.height).data;
    let left=probe.width,top=probe.height,right=0,bottom=0;
    for(let y=0;y<probe.height;y++)for(let x=0;x<probe.width;x++)if(pixels[(y*probe.width+x)*4+3]>16){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<=left||bottom<=top)throw new Error('Empty item painting');
    const w=right-left+1,h=bottom-top+1;
    // Already diagonal paintings keep their pose; only tall straight blades tilt.
    const angle=vertical&&h/w>1.9?Math.PI/5:0;
    const bw=Math.abs(w*Math.cos(angle))+Math.abs(h*Math.sin(angle)),bh=Math.abs(h*Math.cos(angle))+Math.abs(w*Math.sin(angle));
    const scale=Math.min(456/bw,456/bh);
    const canvas=document.querySelector('canvas'),c=canvas.getContext('2d');c.clearRect(0,0,512,512);
    c.save();c.translate(512,0);c.scale(-1,1);c.filter='brightness(.65)';c.drawImage(bg,0,0,512,512);c.restore();
    c.save();c.translate(256,256);c.rotate(angle);c.scale(scale,scale);
    c.filter='saturate(.78) contrast(1.06)';c.shadowColor='rgba(0,0,0,.85)';c.shadowBlur=5/scale;c.shadowOffsetY=2/scale;
    c.drawImage(image,left,top,w,h,-w/2,-h/2,w,h);c.restore();
    return canvas.toDataURL('image/png').split(',')[1];
   },{source,background:backgroundUrls[row.background],vertical:row.vertical});
   fs.writeFileSync(path.join(directory,row.key+'.png'),Buffer.from(png,'base64'));
  }
 }finally{await browser.close();}
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(rows,null,2)+'\n');
const anchors={'Оружие':'weapons','Щиты':'shields','Плащи':'cloaks','Бижутерия':'jewelry','Броня и экипировка':'armor'};
const sections=['Оружие','Щиты','Плащи','Бижутерия','Броня и экипировка'].map(group=>`<section id="${anchors[group]}"><h2>${group}</h2><div class="grid">`+rows.filter(row=>row.group===group).map(row=>`<figure><div class="samples"><img src="../webapp/art/items/l2-style/${row.key}-32.webp" width="32" height="32" alt=""><img src="../webapp/art/items/l2-style/${row.key}-64.webp" width="64" height="64" alt=""></div><figcaption>${escape(row.label)}<br><small>${row.key}</small></figcaption><a href="../webapp/art/items/l2-style/${row.key}-32.webp" download>WebP 32×32</a></figure>`).join('')+'</div></section>').join('');
fs.writeFileSync('docs/l2-painted-icons-preview.html',`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Рисованные предметы в стиле L2</title><style>body{background:#111512;color:#d8d1bd;font:14px/1.5 system-ui;margin:0}main{max-width:1080px;padding:20px;margin:auto}h1,h2{color:#dfc185}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}figure{margin:0;padding:12px;background:#1a201b;border:1px solid #524b36;text-align:center;min-width:0}.samples{height:72px;display:flex;align-items:center;justify-content:center;gap:16px}img{image-rendering:auto}figcaption{overflow-wrap:anywhere}small{font-size:10px;color:#918a77}a{color:#cfb780;font-size:12px}</style><main><h1>Прежние картины — иконки в стиле L2</h1><p>${rows.length} отдельных иконок. Слева — размер 32×32, справа — самостоятельный вариант 64×64. Красный фон оружия и щитов, зелёный фон брони, холодный фон бижутерии; без встроенной массивной рамки, сдержанный цвет и диагональное размещение клинков и посохов. Большие исходные картины сохранены. Фоны восстановлены по оригинальным иконкам L2; это реконструкция, не отдельные текстуры клиента.</p><nav><a href="#cloaks">Плащи</a> · <a href="#shields">Щиты</a> · <a href="#armor">Броня</a> · <a href="#weapons">Оружие</a> · <a href="#jewelry">Бижутерия</a></nav><p><a href="l2-high-five-equipment-preview.html">Все сеты и плащи High Five (оригиналы L2)</a> · <a href="../webapp/art/items/l2-style/manifest.json" download>Список файлов для новых сетов</a> · <a href="../webapp/art/items/l2-style/collection.zip" download>Скачать всю коллекцию</a></p>${sections}</main></html>`);
console.log(`${rows.length} preserved paintings rendered as 512×512 full-detail inventory masters`);
