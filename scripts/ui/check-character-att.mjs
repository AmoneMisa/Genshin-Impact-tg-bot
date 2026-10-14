import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import {getCharacterState} from '../../miniapp/character.js';
import {attributeInfo} from '../../functions/game/equipment/attributes.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
const root=path.resolve('webapp'),require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE));
const {chromium}=require('playwright'),browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),file=>fs.readFileSync(path.join(root,file.slice(1)),'utf8'));
const styles=assets.bundles.map(b=>`<link rel="stylesheet" href="${b.path}">`).join('');
const hero={userId:1,game:{stats:{lvl:80,currentExp:0},inventory:{gold:1e6,materials:{attr_stone_fire:10},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{}}};
changeClass(hero,'humanKnight');hero.game.l2Passives={217:1,232:1,147:1,153:1};hero.game.clanPerks={370:1,371:1,372:1};hero.game.effects=[{potionId:'might',until:Date.now()+120000}];hero.game.tattoos=[{dye:4445}];updateStats(hero);
const items=[
 {key:'valid',name:'Valid weapon',mainType:'weapon',grade:'S',custom:true,kind:'sword'},
 {key:'wrong',name:'Other element',mainType:'weapon',grade:'S',custom:true,kind:'sword',attribute:{element:'water',value:20}},
 {key:'full',name:'Stone limit',mainType:'weapon',grade:'S',custom:true,kind:'sword',attribute:{element:'fire',value:150}},
 {key:'low',name:'A grade',mainType:'weapon',grade:'A',custom:true,kind:'sword'},
].map(i=>({...i,attribute:attributeInfo(hero,i)}));
fs.mkdirSync('docs/character-redesign/implementation',{recursive:true});
try{for(const width of [320,390,1100]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const bundle=assets.bundles.find(b=>b.path===url.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+url.pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture');
 await page.evaluate(async snapshot=>{await(await import('/character.js')).openCharacterPage({api:async()=>snapshot,haptic:()=>{},renderState:()=>{}});},getCharacterState(hero));
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.character-overlay')).opacity==='1');
 assert.equal(await page.locator('[data-character-tab="stats"]').evaluate(el=>el.getBoundingClientRect().height),36);
 for(const [id,label] of [['stats','Статы'],['equipment','Эквип'],['skills','Навыки'],['effects','Эффекты']]){
  const button=page.locator(`[data-character-tab="${id}"]`);
  assert.equal(await button.textContent(),'');assert.equal(await button.getAttribute('aria-label'),label);assert.equal(await button.getAttribute('title'),label);assert.equal(await button.locator('img').count(),1);
  assert.equal(await button.evaluate(el=>el.getBoundingClientRect().width),36);
  assert.equal(await button.locator('img').evaluate(el=>el.getBoundingClientRect().width),28);
  assert.equal(await button.evaluate(el=>getComputedStyle(el).borderTopWidth),'0px');
  assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
 }
 await page.locator('[data-character-tab="stats"]').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.locator('[data-character-tab="equipment"]').getAttribute('aria-selected'),'true');
 await page.keyboard.press('Home');assert.equal(await page.locator('[data-character-tab="stats"]').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('.character-overlay .overlay-close').evaluate(el=>el.getBoundingClientRect().height),28);
 assert.equal(await page.locator('.character-portrait').evaluate(el=>el.getBoundingClientRect().width),32);
 assert.doesNotMatch(await page.locator('.character-name').textContent(),/Рыцарь-человек/);
 assert.equal(await page.locator('.character-portrait').getAttribute('title'),'Рыцарь-человек');
 assert.equal(await page.locator('.character-portrait').getAttribute('src'),'/art/l2-classes/knight.webp');
 assert.equal(await page.locator('.character-panel>.game-dialog-heading [data-heading-action="appearance"]').count(),1);
 assert.equal(await page.locator('[data-character-identity] button').count(),0);
 assert.equal(await page.locator('.character-scroll [data-character-action="appearance"]').count(),0);
 assert.match(await page.locator('[data-base-stat="STR"]').textContent(),/\+1/);assert.match(await page.locator('[data-base-stat="CON"]').textContent(),/-3/);
 assert.doesNotMatch(await page.locator('.character-scroll').textContent(),/Крит\. урон/);
 const criticalText=await page.locator('.character-combat .character-row').filter({hasText:'Шанс крита'}).locator('strong').textContent();
 assert.match(criticalText,/^\d+$/);assert.ok(Number(criticalText)<=500);
 assert.equal(await page.locator('.character-base').evaluate(el=>el.getBoundingClientRect().height),56);
 const statusColumns=await page.evaluate(()=>{
  const label=type=>document.querySelector('.character-status-grid .'+type+'>b').getBoundingClientRect();
  const hp=document.querySelector('.character-meter.hp .character-meter-track').getBoundingClientRect(),mp=document.querySelector('.character-meter.mp .character-meter-track').getBoundingClientRect(),cp=document.querySelector('.character-meter.cp .character-meter-track').getBoundingClientRect();
  const sp=document.querySelector('.character-status-value').getBoundingClientRect();
  return {leftLabels:label('hp').x-label('mp').x,rightLabels:label('cp').x-label('sp').x,bars:hp.x-mp.x,widths:hp.width-cp.width,rightEdges:cp.right-sp.right,expLeft:hp.x-document.querySelector('.character-meter.exp .character-meter-track').getBoundingClientRect().x,expWidth:hp.width-document.querySelector('.character-meter.exp .character-meter-track').getBoundingClientRect().width};
 });
 for(const delta of Object.values(statusColumns))assert.ok(Math.abs(delta)<1,'Status columns and bars must share the same edges');
 for(const button of await page.locator('[data-base-stat]').all())assert.equal(await button.evaluate(el=>el.getBoundingClientRect().height),28);
 assert.equal(await page.locator('.character-base button,.character-base [tabindex],.character-base [role="button"]').count(),0);
 await page.locator('[data-base-stat="STR"]').click();
 assert.equal(await page.locator('.character-detail-dialog').count(),0);
 const geometry=await page.evaluate(()=>{
  const middle=node=>{const r=node.getBoundingClientRect();return r.top+r.height/2;};
  const combat=[...document.querySelector('.character-combat').children];
  return {
   rows:combat.map(row=>({label:row.querySelector('span').textContent,height:row.getBoundingClientRect().height,delta:Math.abs(middle(row.querySelector('span'))-middle(row.querySelector('strong')))})),
   headings:[...document.querySelectorAll('.character-scroll>.character-section>h3')].map(h=>h.textContent),
   statElements:[...document.querySelectorAll('[data-base-stat]')].map(el=>({tag:el.tagName,tabIndex:el.tabIndex}))};
 });
 assert.equal(await page.locator('.character-meter.vitality').count(),0);
 assert.doesNotMatch(await page.locator('.character-scroll').textContent(),/Vitality/);
 assert.deepEqual(geometry.rows.slice(4,8).map(r=>r.label),['Точность','Уклонение','Шанс крита','Скорость']);
 for(const row of geometry.rows){assert.ok(row.delta<1,'Values and captions must have the same vertical center');assert.ok(row.height<=40,'Combat rows must retain compact Status density');}
 assert.deepEqual(geometry.headings.filter(h=>['Боевые','Базовые','Социальные'].includes(h)),['Боевые','Базовые','Социальные']);
 for(const stat of geometry.statElements){assert.equal(stat.tag,'DIV');assert.equal(stat.tabIndex,-1);}
 assert.equal(await page.locator('.character-elements .character-row').count(),6);
 assert.equal(await page.locator('.character-elements').isVisible(),true);
 assert.equal(await page.locator('.character-scroll details').count(),0);
 await page.locator('.character-elements').scrollIntoViewIfNeeded();
 await page.screenshot({path:`docs/character-redesign/implementation/attributes-${width}.png`});
 await page.locator('.character-scroll').evaluate(el=>el.scrollTop=0);
 await page.locator('.character-overlay .overlay-close').focus();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.screenshot({path:`docs/character-redesign/implementation/stats-${width}.png`});
 await page.locator('[data-character-tab="equipment"]').click();
 await page.locator('.character-symbols img').waitFor();
 assert.match(await page.locator('.character-symbols img').getAttribute('src'),/_symbol_/);
 assert.equal(await page.locator('.character-symbols').textContent(),'');
 await page.locator('[data-tattoo-detail]').click();
 await page.locator('.character-detail-dialog[open]').waitFor();
 assert.match(await page.locator('.character-detail-dialog').textContent(),/STR/);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('.character-detail-dialog[open]').count(),0);
 assert.equal(await page.locator('[data-character-slot]').count(),16);
 assert.equal(await page.locator('.character-slots.left [data-character-slot]').count(),8);
 await page.locator('[data-character-slot="head"]').click();
 await page.locator('.character-detail-dialog').waitFor();
 await page.locator('.character-detail-dialog [data-dismiss]').click();
 await page.screenshot({path:`docs/character-redesign/implementation/equipment-${width}.png`});
 await page.locator('[data-character-tab="skills"]').click();
 await page.locator('[data-skill-tab="passive"]').click();
 await page.locator('[data-skill-id="147"]').click();
 await page.locator('.character-detail-dialog[open]').waitFor();
 assert.equal(await page.locator('.skills-overlay').count(),0);
 await page.locator('.character-detail-dialog [data-dismiss]').click();
 assert.match(await page.locator('.character-scroll').textContent(),/LS и экипировка/);
 assert.match(await page.locator('.character-scroll').textContent(),/Клан/);
 await page.screenshot({path:`docs/character-redesign/implementation/skills-${width}.png`});
 await page.locator('[data-character-tab="effects"]').click();
 await page.locator('[data-effect-id]').first().click();
 await page.locator('.character-detail-dialog[open]').waitFor();
 await page.locator('.character-detail-dialog [data-dismiss]').click();
 await page.screenshot({path:`docs/character-redesign/implementation/effects-${width}.png`});
 await page.locator('.character-overlay .overlay-close').click();await page.locator('.character-overlay').waitFor({state:'detached'});
 await page.evaluate(async equipment=>{await(await import('/forge.js')).openForgeGame({api:async(url,options)=>{if(!options)return equipment;window.attRequests=(window.attRequests||[]);window.attRequests.push(JSON.parse(options.body));equipment.attributeStones.attr_stone_fire--;if(window.attRequests.length===2){const item=equipment.items.find(i=>i.key==='valid');item.attribute.options[0].full=true;item.attribute.eligibility.find(o=>o.tier==='stone'&&o.element==='fire').ok=false;}return {equipment,success:window.attRequests.length===1};},materialKey:'attr_stone_fire'});},{items,attributeStones:{attr_stone_fire:10}});
 assert.equal(await page.locator('[data-forge-select]').count(),4);
 for(const key of ['wrong','full','low'])assert.equal(await page.locator(`[data-forge-select="${key}"]`).isDisabled(),true);
 assert.equal(await page.locator('[data-forge-select="valid"]').isDisabled(),false);
 await page.locator('[data-forge-select="valid"]').click();
 assert.equal(await page.locator('[data-attribute-confirm]').isDisabled(),false);
 await page.locator('[data-quantity-step="1"]').click();
 assert.equal(await page.locator('[data-quantity-value]').inputValue(),'2');
 await page.locator('[data-attribute-confirm]').focus();
 assert.equal(await page.locator('[data-attribute-confirm]').evaluate(el=>el===document.activeElement),true);
 await page.locator('.equipment-overlay > .overlay-backdrop').click({force:true});
 assert.equal(await page.locator('.attribute-panel').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.equipment-overlay')).opacity==='1');await page.screenshot({path:`docs/character-redesign/implementation/att-${width}.png`});
 await page.locator('[data-quantity-value]').fill('5');
 await page.locator('[data-quantity-value]').dispatchEvent('change');
 await page.locator('[data-attribute-confirm]').click();
 await page.waitForFunction(()=>document.querySelector('.attribute-panel [role="status"]').textContent.includes('камней: 2'));
 assert.equal(await page.evaluate(()=>window.attRequests.length),2);
 assert.equal(await page.locator('[data-attribute-confirm]').isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.attRequests.every(r=>r.action==='attribute'&&r.element==='fire'&&r.tier==='stone'&&r.key==='valid')),true);
 await page.locator('.equipment-overlay .overlay-close').click();assert.equal(await page.locator('.equipment-overlay').count(),0);
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS symbols, stat deltas, ATT eligibility, focus, dialogs and layout ${width}px`);
}}finally{await browser.close();}
