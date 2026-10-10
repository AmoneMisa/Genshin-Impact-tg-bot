import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {enterHuntField} from '../../functions/game/hunt/huntFight.js';
import {getZones} from '../../functions/game/hunt/huntMobs.js';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const session={userId:0,userChatData:{user:{id:0}},game:{stats:{lvl:85},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
changeClass(session,'duelist');updateStats(session);
const zone=getZones().find(z=>z.kind!=='catacomb'&&z.level>=70);
enterHuntField(session,zone.id);
const hunt=await getHuntState(session);
try {for(const width of [320,390,1100]){
 const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>`});
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');
 await page.evaluate(async(hunt)=>{
  window.hunt=structuredClone(hunt);window.posts=[];
  // Extra selectable rows exercise the 16-slot limit independently of class balance.
  const example=window.hunt.player.skills[0];window.hunt.player.skills=Array.from({length:22},(_,index)=>({...example,index,slot:index,name:index%2?'War Cry':'Triple Slash',description:'Skill description',costMp:40+index,canUse:true,locked:false}));
  window.hunt.player.hotbar=[0,1,2];
  window.hunt.player.special=[{type:'ls',id:'ls:active_might',iconId:'active_might',name:'Might',description:'Life Stone skill',costMp:0,canUse:true},{type:'toggle',id:'l2:312',name:'Vicious Stance',description:'Toggle skill',costMp:12,canUse:true}];
  window.boss={active:true,player:window.hunt.player,boss:{name:'queen_ant',title:'Queen Ant',currentHp:1000,maxHp:1000,hpPercent:100,level:85,damageList:[],attacks:[],attackLog:[],statuses:[],nextAttackMs:0}};
  window.options={haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{
   if(options?.method==='POST'){
    const body=options.body?JSON.parse(options.body):{};posts.push({url,body});
    if(url==='/api/hunt/hotbar'){window.hunt.player.hotbar=body.slots;window.boss.player.hotbar=body.slots;}
    return {hunt:window.hunt};
   }
   return url==='/api/boss'?window.boss:window.hunt;
  }};
  const {openHuntGame}=await import('/hunt.js');await openHuntGame(window.options);
 },hunt);
 await page.waitForTimeout(200);
 assert.equal(await page.locator('.hunt-controls [data-skill]').count(),3);
 assert.equal(await page.locator('.hunt-controls [data-skill] strong').count(),0);
 await page.locator('.hunt-controls .mmo-skill-icon img').evaluateAll(nodes=>Promise.all(nodes.map(n=>n.decode())));
 assert.equal(await page.locator('.hunt-panel').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
 await page.locator('[data-bar-edit]').click();
 for(let index=3;index<17;index++)await page.locator(`[data-hotbar-toggle="${index}"]`).click();
 assert.equal(await page.locator('[data-hotbar-toggle][aria-pressed=true]').count(),16);
 await page.locator('[data-bar-save]').click();
 assert.equal(await page.locator('.hunt-controls [data-skill]').count(),16);
 if(width===390)await page.locator('.hunt-controls').screenshot({path:'docs/battle-hotbar-390.png'});
 await page.locator('[data-bar-tab=special]').click();
 assert.equal(await page.locator('[data-special]').count(),2);
 assert.equal(await page.locator('[data-special="l2:312"] .mmo-skill-cost').textContent(),'12');
 await page.locator('[data-special="ls:active_might"] img').evaluate(n=>n.decode());
 if(width===390)await page.locator('.hunt-controls').screenshot({path:'docs/battle-special-390.png'});
 await page.locator('[data-special="l2:312"]').click();
 assert.ok(await page.evaluate(()=>posts.some(p=>p.url==='/api/hunt/special'&&p.body.id==='l2:312')));
 await page.locator('.hunt-overlay').evaluate(n=>n.remove());
 await page.evaluate(async()=>{const {openBossGame}=await import('/boss.js');await openBossGame(window.options);});
 assert.equal(await page.locator('.boss-panel [data-skill]').count(),16);
 await page.locator('.boss-panel [data-bar-tab=special]').click();
 assert.equal(await page.locator('.boss-panel [data-special]').count(),2);
 assert.equal(await page.locator('.boss-panel .mmo-hotbar').evaluate(n=>n.scrollWidth>n.clientWidth+1),false,'boss skill grid overflow');
 assert.deepEqual(errors,[]);
 await page.close();console.log(`Skill selection, MP badges, special casting and boss/hunt tabs verified at ${width}px`);
}}finally{await browser.close();}
