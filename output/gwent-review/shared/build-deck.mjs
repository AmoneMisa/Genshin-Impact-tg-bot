import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {GWENT_DECKS,TOKENS} from '../../../webapp/gwent-decks.js';
import {GWENT_ART} from '../../../webapp/gwent-art.js';
import {defaultLoadout,inspectLoadout} from '../../../webapp/gwent-builder.js';

const require=createRequire('C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),sharp=require('sharp');

export async function buildDeck(directory,spec={}) {
const out=path.resolve(directory),templates=path.resolve(out,'../templates-v1');
const WILD_HUNT_DECK=GWENT_DECKS[spec.faction||'wild-hunt'];
if(!WILD_HUNT_DECK)throw Error('Unknown review faction');
const quotes=JSON.parse(fs.readFileSync(path.join(out,'quotes.json'),'utf8'));
const existing=fs.existsSync(path.join(out,'deck-manifest.json'))?JSON.parse(fs.readFileSync(path.join(out,'deck-manifest.json'),'utf8')):null;
const missingOnly=process.argv.includes('--missing-only');
const dataUrl=file=>'data:image/'+(file.endsWith('.webp')?'webp':'png')+';base64,'+fs.readFileSync(file).toString('base64');
const xml=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
fs.mkdirSync(path.join(out,'cards'),{recursive:true});
const facePool=[...WILD_HUNT_DECK.leaders.map(card=>({card:{...card,type:'leader'},copies:1})),...WILD_HUNT_DECK.cards.map(([card,copies])=>({card,copies})),...(spec.tokens||[]).map(id=>({card:TOKENS[id],copies:0,summoned:true}))];
const report={faction:WILD_HUNT_DECK.id,title:WILD_HUNT_DECK.title,approval:fs.existsSync(path.join(out,'approval.json'))?JSON.parse(fs.readFileSync(path.join(out,'approval.json'))).status:'pending',integrated:false,pushed:false,
  templateSize:{width:310,height:585},font:'Roboto Condensed',fontMatch:'Review candidate; original game typeface not independently verified.',
  quotes:{generated:'Original fan-written lines, not quotations from Witcher 3.',existing:'Preserved inside user-supplied original card images.'},
  back:{file:'back.webp',source:GWENT_ART['back:'+WILD_HUNT_DECK.id],reusedUnchanged:true},
  customIcons:spec.customIcons||['swap','mage','fire','earth','water','prep','trap','recall'],cards:[],missing:[],textMetrics:[]};
const browser=await chromium.launch({headless:true,executablePath:'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{
 const page=await browser.newPage({viewport:{width:800,height:800}});
 await page.setContent('<!doctype html><meta charset="utf-8"><canvas></canvas>');
 await page.evaluate(async font=>{const face=new FontFace('GwentCondensed',`url(data:font/ttf;base64,${font})`,{weight:'100 900'});document.fonts.add(await face.load());await document.fonts.ready;},fs.readFileSync(path.join(out,'fonts/RobotoCondensed.ttf')).toString('base64'));
 for(const {card,copies,summoned=false}of facePool){
  const generated=fs.existsSync(path.join(out,'illustrations',card.id+'.png'));
  const original=GWENT_ART[card.id]&&fs.existsSync(path.resolve('webapp'+GWENT_ART[card.id]));
  const png=path.join(out,'cards',card.id+'.png'),webp=path.join(out,'cards',card.id+'.webp');
  const kind=card.type==='leader'?'leader':card.type==='special'?'special':card.hero?'hero':'unit';
  const record={summoned,id:card.id,name:card.name,kind,copies,strength:card.strength??null,rows:card.rows||[],file:'cards/'+card.id+'.png',webp:'cards/'+card.id+'.webp',quote:generated?quotes[card.id]||'':null,quoteOrigin:generated?'fan-written':'preserved original',source:generated?'generated illustration with shared layers':'existing supplied card',abilities:[]};
  if(spec.reuse?.[card.id]){
   const folder=path.resolve(out,spec.reuse[card.id]),old=JSON.parse(fs.readFileSync(path.join(folder,'deck-manifest.json'))).cards.find(c=>c.id===card.id);
   if(!old)throw Error('Shared card not found: '+card.id);
   fs.copyFileSync(path.join(folder,old.file),png);fs.copyFileSync(path.join(folder,old.webp),webp);
   report.cards.push({...old,copies,summoned,source:'Shared generated card reused unchanged',reuse:spec.reuse[card.id]});continue;
  }
  if(!generated&&!original){report.missing.push(card.id);continue;}
  if(missingOnly&&fs.existsSync(png)&&fs.existsSync(webp)){
   const prev=existing?.cards.find(c=>c.id===card.id);report.cards.push(prev||record);const metric=existing?.textMetrics.find(m=>m.id===card.id);if(metric)report.textMetrics.push(metric);continue;
  }
  if(!generated){
   await sharp(path.resolve('webapp'+GWENT_ART[card.id])).png().toFile(png);
  }else{
   if(!record.quote)throw Error('Missing literary quote: '+card.id);
   const frame=spec.frames?.[kind]?path.resolve(out,spec.frames[kind]):path.join(templates,kind+'.png');
   const layers=[{file:dataUrl(frame),x:0,y:0,w:310,h:585}];
   if(kind==='unit'||kind==='hero'){
    const heroSun=kind==='hero'&&card.strength===10;
    layers.push({file:dataUrl(path.join(out,'layers',heroSun?'power-hero-10-clean-v2.png':`power-${kind}-${card.strength}.png`)),x:0,y:0,w:heroSun?165:90,h:heroSun?140:90});
    layers.push({file:dataUrl(path.join(out,'layers',card.rows.length>1?'row-agile.png':`row-${card.rows[0]}.png`)),x:0,y:154,w:80,h:80});
    for(const a of ['muster','bond','spy','medic','morale','horn','swap','mage'])if(card[a])record.abilities.push(a);
    if(card.onPlay?.type==='scorchRow')record.abilities.push('scorch');
    for(const [i,a]of record.abilities.entries())layers.push({file:dataUrl(path.join(out,'layers',`ability-${a}.png`)),x:0,y:253+i*82,w:81,h:81});
    if(kind==='unit')layers.push({file:dataUrl(path.join(out,'layers/faction-emblem.png')),...(spec.emblemSlot||{x:29,y:449,w:34,h:47})});
   }else if(kind==='special'){
    const effect=spec.effects?.[card.id]||{'el-fire':'fire','el-earth':'earth','el-water':'water','ex-prep':'prep','ex-trap':'trap','ex-medic':'recall'}[card.id];
    if(!effect)throw Error('Missing effect icon '+card.id);
    record.abilities.push(effect);layers.push({file:dataUrl(path.join(out,'layers',`effect-${effect}.png`)),x:0,y:0,w:90,h:90});
   }
   const result=await page.evaluate(async({art,layers,name,quote,kind})=>{
    const canvas=document.querySelector('canvas');canvas.width=310;canvas.height=585;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,310,585);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    const image=async src=>{const img=new Image();img.src=src;await img.decode();return img;};
    const pic=await image(art),scale=Math.max(310/pic.width,435/pic.height),w=pic.width*scale,h=pic.height*scale;
    ctx.save();ctx.beginPath();ctx.rect(0,0,310,435);ctx.clip();ctx.drawImage(pic,(310-w)/2,(435-h)/2,w,h);ctx.restore();
    for(const layer of layers)ctx.drawImage(await image(layer.file),layer.x,layer.y,layer.w,layer.h);
    function fit(text,box,{bold=false,max=18,min=13,maxLines=3}={}){
     const [x,y,w,h]=box;let chosen;
     for(let size=max;size>=min;size-=.25){
      ctx.font=`${bold?700:400} ${size}px GwentCondensed`;
      let lines=[],cur='';for(const word of text.split(/\s+/)){const next=cur?cur+' '+word:word;if(cur&&ctx.measureText(next).width>w){lines.push(cur);cur=word;}else cur=next;}if(cur)lines.push(cur);
      const lineHeight=size*1.13;
      if(lines.length<=maxLines&&lines.length*lineHeight<=h&&lines.every(s=>ctx.measureText(s).width<=w)){chosen={size,lines,lineHeight};break;}
     }
     if(!chosen)throw Error('Text does not fit: '+text);
     ctx.font=`${bold?700:400} ${chosen.size}px GwentCondensed`;ctx.fillStyle='#1a1a17';ctx.textAlign='center';ctx.textBaseline='middle';
     const top=y+(h-chosen.lines.length*chosen.lineHeight)/2;
     chosen.lines.forEach((line,i)=>ctx.fillText(line,x+w/2,top+chosen.lineHeight*(i+.5)));
     return {text,fontSize:chosen.size,lines:chosen.lines.length,box};
    }
    const title=fit(name,kind==='unit'?[82,451,220,48]:[10,451,290,48],{bold:true,max:21,min:15,maxLines:2});
    const quoteMetrics=fit(quote,[8,522,294,55],{max:18,min:14,maxLines:3});
    ctx.globalCompositeOperation='destination-in';ctx.beginPath();ctx.roundRect(0,0,310,585,13);ctx.fill();ctx.globalCompositeOperation='source-over';
    return{png:canvas.toDataURL('image/png').split(',')[1],title,quote:quoteMetrics};
   },{art:dataUrl(path.join(out,'illustrations',card.id+'.png')),layers,name:card.name,quote:record.quote,kind});
   fs.writeFileSync(png,Buffer.from(result.png,'base64'));report.textMetrics.push({id:card.id,title:result.title,quote:result.quote});
  }
  await sharp(png).webp({quality:92,alphaQuality:100}).toFile(webp);report.cards.push(record);
 }
}finally{await browser.close();}
const loadout=defaultLoadout(WILD_HUNT_DECK.id,'extended');report.loadout={config:loadout,stats:inspectLoadout(loadout)};
report.complete=report.missing.length===0&&report.cards.length===facePool.length;
fs.writeFileSync(path.join(out,'deck-manifest.json'),JSON.stringify(report,null,2));
const thumbWidth=155,thumbHeight=293,cols=9,gap=12,pad=24;
const faces=report.cards.map(c=>({id:c.id,file:path.join(out,c.file)}));
faces.push({id:'back',file:path.join(out,'back.webp')});
const rows=Math.ceil(faces.length/cols),width=pad*2+cols*thumbWidth+(cols-1)*gap,height=pad*2+rows*thumbHeight+(rows-1)*gap;
const pieces=await Promise.all(faces.map(async(c,i)=>({input:await sharp(c.file).resize(thumbWidth,thumbHeight,{fit:'fill'}).png().toBuffer(),left:pad+(i%cols)*(thumbWidth+gap),top:pad+Math.floor(i/cols)*(thumbHeight+gap)})));
await sharp({create:{width,height,channels:3,background:'#141a20'}}).composite(pieces).png().toFile(path.join(out,'deck-contact-sheet.png'));
const previewIds=spec.previewIds||['wh-spectre','wh-red-rider','wh-caranthir','wh-ghost-ship','wh-leader-lord'];
const previews=previewIds.map(id=>report.cards.find(c=>c.id===id)).filter(Boolean);
if(previews.length){const items=await Promise.all(previews.map(async(c,i)=>({input:await sharp(path.join(out,c.file)).resize(248,468).png().toBuffer(),left:20+i*264,top:20})));await sharp({create:{width:40+previews.length*248+(previews.length-1)*16,height:508,channels:3,background:'#141a20'}}).composite(items).png().toFile(path.join(out,'preview.png'));}
const group=(kind,title)=>`<section><h2>${title}</h2><div class="grid">${report.cards.filter(c=>kind(c)).map(c=>`<button type="button" class="ui-button ui-card-art face" data-face="${xml(c.id)}" aria-label="${xml(c.name)}"><img loading="lazy" decoding="async" src="${c.webp}" alt="${xml(c.name)}"><span class="count">${c.summoned?'Призыв':c.kind==='leader'?'Лидер':c.copies+' коп.'}</span></button>`).join('')}</div></section>`;
const html=`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${WILD_HUNT_DECK.title} — колода для согласования</title><link rel="stylesheet" href="../../../webapp/design-system.css"><style>*{box-sizing:border-box}body{margin:0;background:#10161c;color:#eee8dc;font:15px/1.5 Arial,sans-serif}main{max-width:1440px;margin:auto;padding:24px}h1{font:36px Georgia,serif;margin:0 0 8px}h2{font:24px Georgia,serif;margin:28px 0 16px}.intro{display:flex;align-items:center;gap:24px;flex-wrap:wrap}.intro img{width:93px;height:175px;object-fit:contain}.intro>div{flex:1;min-width:240px}p{color:#b9c4cc;max-width:950px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:16px}.face{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;padding:0;border:0;background:none;box-shadow:none;cursor:zoom-in}.face>img{width:100%;height:auto;aspect-ratio:310/585;object-fit:contain}.count{padding:4px 8px;font-size:12px;color:#a8b8c6}.tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.ui-button{padding:8px 12px}.face.ui-button{padding:0}.status{color:#bcd6df}.overlay{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;background:#000d;padding:16px}.overlay[hidden]{display:none}.detail{display:flex;gap:20px;align-items:center;max-width:850px;width:100%;max-height:95vh;overflow:auto;padding:16px;background:#151c24;border:1px solid #6b6a5c}.detail img{max-height:85vh;max-width:55%;width:310px;object-fit:contain}.detail>div{min-width:0;flex:1}.detail button{margin-top:12px}.meta{white-space:pre-line;color:#bdc8d4}a{color:#c6dce8}.notice{color:#d9c397;font-size:13px}@media(max-width:500px){main{padding:16px}.grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}h1{font-size:28px}.detail{flex-direction:column}.detail img{max-width:100%;max-height:66vh}.detail>div{width:100%}.intro img{width:70px;height:132px}}@media(prefers-reduced-motion:reduce){*{animation:none;transition:none}}</style></head><body><main><div class="intro"><img src="back.webp" alt="Готовая рубашка: ${WILD_HUNT_DECK.title}"><div><h1>${WILD_HUNT_DECK.title}</h1><div class="status">${report.cards.length} из ${facePool.length} лицевых карт · 4 лидера · готовая рубашка</div><p>Единая основа. Иллюстрации, имена, цитаты, цифры и иконки собраны отдельными слоями. Нажмите на карту, чтобы рассмотреть её.</p><div class="tools"><a class="ui-button" href="deck-contact-sheet.png" target="_blank">Вся коллекция одним изображением</a><a class="ui-button" href="loadout.json" download>Состав игровой колоды</a></div></div></div><p>Игровой состав по текущим правилам: ${report.loadout.stats.units} отрядов, ${report.loadout.stats.specials} особых карт, один выбранный лидер. Копии указаны под картами; это одна сущность с одним артом.</p><p class="notice">Новые реплики написаны для этого проекта — это не цитаты из игры. Новые значки расширения отмечены в отчёте. Версия для согласования: в игру не подключена, пуш не выполнен. Это художественная адаптация, а не подтверждённая пиксельная копия.</p>${group(c=>c.kind==='leader','Лидеры')}${group(c=>c.id.startsWith(spec.prefix||'wh-')&&(c.kind==='unit'||c.kind==='hero'),'Отряды фракции')}${group(c=>!c.summoned&&!c.id.startsWith(spec.prefix||'wh-')&&c.kind!=='special','Нейтральные карты')}${group(c=>c.kind==='special','Особые карты')}${spec.tokens?.length?group(c=>c.summoned,'Призываемые карты'):''}<p class="notice">Готовая рубашка использована без изменений. Общие существующие карты сохранены из предоставленного набора. Ни одна подпись способности не заменяет литературную цитату.</p></main><div class="overlay" id="viewer" hidden role="dialog" aria-modal="true" aria-label="Просмотр карты"><div class="detail"><img id="big" alt=""><div><h2 id="title"></h2><p class="meta" id="meta"></p><button class="ui-button" id="close">Закрыть</button></div></div></div><script>const abilityNames={"muster": "Призыв", "bond": "Связь", "spy": "Шпион", "medic": "Медик", "morale": "Прилив сил", "horn": "Рог", "swap": "Подмена", "mage": "Маг", "scorch": "Казнь", "fire": "Огонь", "earth": "Земля", "water": "Вода", "prep": "Подготовка", "trap": "Ловушка", "recall": "Возврат", "igni": "Игни", "aard": "Аард", "yrden": "Ирден", "quen": "Квен", "swallow": "Ласточка", "thunderbolt": "Гром", "cat": "Кошка", "oriole": "Иволга", "ambush": "Засада", "traitor-hunt": "Охота на изменников"};const cards=${JSON.stringify(report.cards).replace(/</g,'\\u003c')};const viewer=document.querySelector('#viewer'),close=document.querySelector('#close');let origin;function hide(){viewer.hidden=true;origin?.focus();}document.querySelectorAll('[data-face]').forEach(b=>b.addEventListener('click',()=>{const c=cards.find(c=>c.id===b.dataset.face);origin=b;document.querySelector('#big').src=c.file;document.querySelector('#big').alt=c.name;document.querySelector('#title').textContent=c.name;document.querySelector('#meta').textContent=(c.quote?'«'+c.quote+'»\\n\\n':'')+(c.quoteOrigin==='fan-written'?'Авторская реплика для этой карты.':'Исходная карта из предоставленного набора.')+(c.abilities.length?'\\nЗначки: '+c.abilities.map(a=>abilityNames[a]||a).join(', '):'');viewer.hidden=false;close.focus();}));close.addEventListener('click',hide);viewer.addEventListener('click',e=>{if(e.target===viewer)hide();});document.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='Tab'&&!viewer.hidden){e.preventDefault();close.focus();}});</script></body></html>`;
fs.writeFileSync(path.join(out,'index.html'),html);
fs.writeFileSync(path.join(out,'README.md'),`# ${WILD_HUNT_DECK.title} — версия для согласования\n\n${report.cards.length}/${facePool.length} faces. Complete: ${report.complete}. Existing back reused unchanged.\n\nNew illustration generation: built-in image_gen, one independent illustration per missing card. Exact prompts: generation-jobs.json; all jobs whose kind is back are explicitly excluded because backs are already finished.\n\nNew quotations are original fan-written lines, not sourced dialogue from the game. They are separate from card mechanics. Original supplied cards retain their printed quotations.\n\nDeterministic layout: templates-v1; raster ability icons, original power digits and separate Cyrillic text. New expansion glyphs have explicit provenance in layers/provenance.json. Font is open-license Roboto Condensed, a review candidate, not a verified original game font. This draft is not asserted to be pixel-perfect.\n\nNo game asset mapping was changed; no commit or push. Every PNG is 310×585 with a WebP counterpart.\n`);
console.log(JSON.stringify({faces:report.cards.length,complete:report.complete,missing:report.missing,stats:report.loadout.stats,output:out}));

}
