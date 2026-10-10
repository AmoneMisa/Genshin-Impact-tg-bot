// Render reusable inventory UI icons from preserved paintings and one painted slot background.
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
const background=pathToFileURL(path.resolve('art-source/l2-style/slot-background.png')).href;
const html=`<!doctype html><style>body{margin:0;display:flex;flex-wrap:wrap;width:320px}.slot{position:relative;width:32px;height:32px;overflow:hidden;box-sizing:border-box;border:1px solid #62553e;background:#10120e}.slot::before{content:'';position:absolute;inset:0;background:url('${background}') center/100% 100%}.slot.armor::before{filter:hue-rotate(115deg) saturate(.55)}.slot.jewelry::before{filter:hue-rotate(165deg) saturate(.55)}.slot img{position:absolute;inset:0;width:30px;height:30px;object-fit:contain;filter:saturate(.82) brightness(1.18) contrast(1.14) drop-shadow(0 1px .7px #000)}.slot.vertical img{transform:rotate(32deg) scale(.9)}</style>`+rows.map(row=>`<div id="${row.key}" class="slot ${row.background}${row.vertical?' vertical':''}"><img src="${pathToFileURL(path.resolve('webapp/art/items/v1/'+row.key+'-256.webp')).href}" alt=""></div>`).join('');
fs.writeFileSync(path.join(directory,'render.html'),html);
if(!process.argv.includes('--preview-only')){
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{
 const page=await browser.newPage({viewport:{width:320,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 await page.goto(pathToFileURL(path.join(directory,'render.html')).href);
 await page.evaluate(async()=>Promise.all([...document.images].map(image=>image.decode())));
 for(const row of rows)await page.locator('#'+row.key).screenshot({path:path.join(directory,row.key+'.png')});
}finally{await browser.close();}
}
fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(rows,null,2)+'\n');
const anchors={'Оружие':'weapons','Щиты':'shields','Плащи':'cloaks','Бижутерия':'jewelry','Броня и экипировка':'armor'};
const sections=['Оружие','Щиты','Плащи','Бижутерия','Броня и экипировка'].map(group=>`<section id="${anchors[group]}"><h2>${group}</h2><div class="grid">`+rows.filter(row=>row.group===group).map(row=>`<figure><div class="samples"><img src="../webapp/art/items/l2-style/${row.key}-32.webp" width="32" height="32" alt=""><img src="../webapp/art/items/l2-style/${row.key}-64.webp" width="64" height="64" alt=""></div><figcaption>${escape(row.label)}<br><small>${row.key}</small></figcaption><a href="../webapp/art/items/l2-style/${row.key}-32.webp" download>WebP 32×32</a></figure>`).join('')+'</div></section>').join('');
fs.writeFileSync('docs/l2-painted-icons-preview.html',`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Рисованные предметы в стиле L2</title><style>body{background:#111512;color:#d8d1bd;font:14px/1.5 system-ui;margin:0}main{max-width:1080px;padding:20px;margin:auto}h1,h2{color:#dfc185}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}figure{margin:0;padding:12px;background:#1a201b;border:1px solid #524b36;text-align:center;min-width:0}.samples{height:72px;display:flex;align-items:center;justify-content:center;gap:16px}img{image-rendering:pixelated}figcaption{overflow-wrap:anywhere}small{font-size:10px;color:#918a77}a{color:#cfb780;font-size:12px}</style><main><h1>Прежние картины — иконки в стиле L2</h1><p>${rows.length} отдельных иконок. Слева — настоящий размер 32×32, справа — увеличение ×2. Красный фон оружия и щитов, зелёный фон брони, холодный фон бижутерии; общая рамка, сдержанный цвет и диагональное размещение клинков и посохов. Большие исходные картины сохранены.</p><nav><a href="#cloaks">Плащи</a> · <a href="#shields">Щиты</a> · <a href="#armor">Броня</a> · <a href="#weapons">Оружие</a> · <a href="#jewelry">Бижутерия</a></nav><p><a href="l2-high-five-equipment-preview.html">Все сеты и плащи High Five (оригиналы L2)</a> · <a href="../webapp/art/items/l2-style/manifest.json" download>Список файлов для новых сетов</a> · <a href="../webapp/art/items/l2-style/collection.zip" download>Скачать всю коллекцию</a></p>${sections}</main></html>`);
console.log(`${rows.length} preserved paintings rendered as 32×32 inventory icons`);
