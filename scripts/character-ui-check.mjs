import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { getCharacterState } from '../miniapp/character.js';
import { performEquipmentAction } from '../miniapp/equipment.js';
import { learnPassive } from '../functions/game/player/passiveSkills.js';
import { castClassBuff } from '../miniapp/buffs.js';
const require=createRequire(path.resolve(process.argv[2] || 'package.json'));
const {chromium}=require('playwright');
const root=process.cwd(),webroot=path.join(root,'webapp');
const now=Date.now();
const session={gender:'male',game:{
  stats:{lvl:84,currentExp:24813,needExp:12574},equipmentStats:{},
  inventory:{sp:2147483647,gold:10000000,crystals:1650,ironOre:165,equipment:{items:[]},materials:{}},
  gameClass:{stats:{name:'mage',translateName:'Маг',attack:100,defence:50,speed:60,
    hp:49773,maxHp:49773,mp:16211,maxMp:16211,cp:10589,maxCp:10589,accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},
  effects:[{potionId:'might',until:now+600000,factor:1},{name:'addDamageToBoss',amount:75,count:3}],
  passives:{},clanPerks:{'clan-might':2,'clan-shield':1},
}};
const gear=(name,slot,mainType,kind,extra={})=>({uid:slot,name,translatedName:name,grade:'B',mainType,kind,category:kind,slots:[slot],
  classOwner:['mage'],cost:1000,isUsed:true,characteristics:{},...extra});
for(const item of [
  gear('Посох','rightHand','weapon','staff',{enchant:16,augment:{name:'attackMul',value:.1,tier:'high',skill:{id:'active_empower',level:1}}}),
  gear('Плащ','cloak','cloak','cloak'),
  gear('Мантия','up','armor','robe',{category:'chest',attribute:{element:'water',value:30}}),
  gear('Кольцо','leftRing','jewelry','ring',{augment:{name:'INT',value:4,tier:'high'}}),
]){session.game.inventory.equipment.items.push(item);session.game.equipmentStats[item.slots[0]]=structuredClone(item);}
const context={chatId:-100,user:{id:1,first_name:'White Amora'}};
const calls=[],errors=[],badAssets=[];
const html='<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><title>Character preview</title>'+
  ['styles','profile','equipment','skills','loot-renderer','loot-forge','loot-equipment','equipment-paper-doll','icons','character','design-system'].map(name=>'<link rel="stylesheet" href="/'+name+'.css">').join('')+
  '<body><main>Preview fixture</main><script type="module">import {openCharacterPage} from "/character.js"; window.openPreview=()=>openCharacterPage({api:async(path,options={})=>{const response=await fetch(path,{...options,headers:{"content-type":"application/json"}});const data=await response.json();if(!response.ok){const error=new Error(data.reason);error.payload=data;throw error;}return data;},haptic:()=>{},renderState:()=>{},statusElement:document.createElement("p"),context:{chatId:-100,user:{id:1}}});window.openPreview();</script>';
const mime={'.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.html':'text/html'};
const server=http.createServer(async(req,res)=>{
  try {
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
    if(pathname.startsWith('/api/')){
      let raw='';for await(const chunk of req)raw+=chunk;
      const body=raw?JSON.parse(raw):{};
      calls.push({path:pathname,body});
      let result;
      if(pathname==='/api/character')result=getCharacterState(session,context);
      else if(pathname==='/api/equipment/action')result=performEquipmentAction(session,body.key,body.action);
      else if(pathname==='/api/passives/learn')result=learnPassive(session,body.id);
      else if(pathname==='/api/buffs/cast')result=castClassBuff(session,body.buffId);
      else throw new Error('Unexpected API '+pathname);
      if(result?.ok===false)res.statusCode=409;
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
    }
    const file=path.resolve(webroot,'.'+pathname);
    if(!file.startsWith(webroot+path.sep)){res.statusCode=403;res.end();return;}
    res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));
  }catch(error){res.statusCode=404;res.end(error.message);}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true,...(process.argv[3]?{executablePath:process.argv[3]}:{})});
  const page=await browser.newPage({viewport:{width:340,height:780},deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&!response.url().includes('/api/'))badAssets.push(response.url());});
  await page.goto('http://127.0.0.1:'+server.address().port);
  await page.locator('.character-overlay.visible').waitFor();
  assert.equal(await page.locator('.character-panel').evaluate(node=>getComputedStyle(node).borderRadius),'0px','Character window must retain square High Five corners');
  await fs.mkdir(path.join(root,'docs','character-ui'),{recursive:true});
  for(const [tab,label] of [['stats','Статы'],['equipment','Эквип'],['skills','Навыки'],['effects','Эффекты']]){
    await page.getByRole('tab',{name:label,exact:true}).click();
    await page.waitForTimeout(100);

    const alignment=await page.locator('[data-character-action] .character-button-label').evaluateAll(labels=>labels.map(label=>{
      const button=label.parentElement.getBoundingClientRect(),walker=document.createTreeWalker(label,NodeFilter.SHOW_TEXT);
      const range=document.createRange();let node,first,last;while(node=walker.nextNode()){if(node.textContent.trim()){first ||= node;last=node;}}
      if(!first)return null;range.setStart(first,0);range.setEnd(last,last.length);const text=range.getBoundingClientRect();
      return {text:label.textContent,dx:Math.abs((text.left+text.right-button.left-button.right)/2),dy:Math.abs((text.top+text.bottom-button.top-button.bottom)/2)};
    }).filter(Boolean));
    for(const caption of alignment){assert.ok(caption.dx<=1.5&&caption.dy<=2,JSON.stringify(caption));}
    if(tab==='equipment')assert.equal(await page.locator('[data-character-action="forge"]').count(),1);

    const overflow=await page.locator('.character-panel').evaluate(node=>[node.clientWidth,node.scrollWidth]);
    assert.ok(overflow[1]<=overflow[0]+1,tab+' overflow: '+overflow);
    await page.screenshot({path:path.join(root,'docs','character-ui',tab+'-340.png')});
  }
  await page.getByRole('tab',{name:'Эквип',exact:true}).click();
  await page.locator('.character-scroll').evaluate(node=>{node.scrollTop=node.scrollHeight;});
  await page.screenshot({path:path.join(root,'docs','character-ui','equipment-ls-340.png')});
  await page.getByRole('tab',{name:'Статы',exact:true}).click();
  await page.locator('[data-base-stat="INT"]').click();
  await page.getByText('Бонус экипировки',{exact:true}).waitFor();
  await page.getByRole('tab',{name:'Эквип',exact:true}).click();
  assert.equal(await page.locator('[data-character-slot]').count(),13);
  await page.locator('[data-character-slot="cloak"]').click();
  assert.equal(await page.locator('[data-character-slot="cloak"]').getAttribute('aria-pressed'),'true');
  await page.locator('[data-character-slot="up"]').click();
  await page.getByText('Защитный атрибут',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Снять',exact:true}).click();
  await page.getByText('Слот свободен.',{exact:true}).waitFor();
  assert.ok(calls.some(call=>call.path==='/api/equipment/action'&&call.body.action==='unequip'));
  await page.getByRole('tab',{name:'Навыки',exact:true}).click();
  await page.locator('[data-character-action="learn"]:enabled').first().click();
  await page.waitForFunction(()=>document.querySelector('.character-feedback').textContent==='Готово.');
  assert.ok(calls.some(call=>call.path==='/api/passives/learn'));
  await page.locator('[data-character-action="ls-activate"]:enabled').first().click();
  await page.waitForFunction(()=>document.querySelector('.character-feedback').textContent==='Готово.');
  assert.ok(calls.some(call=>call.body.action==='ls_activate'));
  await page.getByRole('tab',{name:'Эффекты',exact:true}).click();
  await page.locator('[data-character-action="cast"]:enabled').first().click();
  await page.waitForFunction(()=>document.querySelector('.character-feedback').textContent==='Готово.');
  assert.ok(calls.some(call=>call.path==='/api/buffs/cast'));
  for(const width of [320,340,390,768]){
    await page.setViewportSize({width,height:780});
    for(const label of ['Статы','Эквип','Навыки','Эффекты']){
      await page.getByRole('tab',{name:label,exact:true}).click();
      const overflow=await page.locator('.character-scroll').evaluate(node=>node.scrollWidth>node.clientWidth+1);
      assert.equal(overflow,false,label+' content overflow at '+width);
    }
  }
  await page.getByRole('tab',{name:'Эквип',exact:true}).click();
  await page.locator('.character-scroll').evaluate(node=>{node.scrollTop=node.scrollHeight;});
  await page.screenshot({path:path.join(root,'docs','character-ui','equipment-ls-340.png')});
  await page.getByRole('tab',{name:'Статы',exact:true}).click();
  await page.getByRole('tab',{name:'Статы',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.getByRole('tab',{name:'Эквип',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('.overlay-close').click();await page.locator('.character-overlay').waitFor({state:'detached'});
  await page.waitForTimeout(1100);
  assert.deepEqual(errors,[]);
  assert.deepEqual(badAssets,[]);
  console.log('PASS: 4 tabs at 320/340/390/768px, 13 slots, armor attributes, INT source, unequip, passive learning, LS activation, buffs, keyboard tabs, close, no console errors or missing assets.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
