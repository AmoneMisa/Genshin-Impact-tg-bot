import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {enterHuntField,moveHuntField,selectHuntTarget,setHuntAttack,useHuntSkill} from '../../functions/game/hunt/huntFight.js';
import {getHuntState} from '../../miniapp/hunt.js';
import {setHotbarForMiniApp,getHuntDropForMiniApp,setAutoShotsForMiniApp} from '../../miniapp/hunt.js';
import {setHuntSupplies} from '../../miniapp/huntSupplies.js';
import {useFieldPvpSkill} from '../../functions/game/hunt/fieldPvp.js';
import l2 from '../../template/l2Classes.js';
import {getInventoryState} from '../../miniapp/inventory.js';
import {getCharacterState} from '../../miniapp/character.js';
import {mailState} from '../../miniapp/mail.js';
import {setPlayerNickname,limitPlayerName} from '../../functions/game/player/playerName.js';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const {chromium}=require('playwright'),root=path.resolve('webapp');
const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER||'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
try{for(const {width,mode} of [{width:320,mode:'auto'},{width:390,mode:'auto'},{width:1100,mode:'auto'},{width:320,mode:'canvas'},{width:390,mode:'unavailable'},{width:320,mode:'missing-art'}].filter(c=>!process.env.HUNT_RENDER_MODE||c.mode===process.env.HUNT_RENDER_MODE)){
 const s={userId:0,userChatData:{user:{id:0,first_name:'White Amorality'}},game:{stats:{lvl:80,currentExp:0},inventory:{gold:0,materials:{},equipment:{items:[]},potions:{items:[]}},equipmentStats:{},effects:[],builds:{},respawnTime:0}};
 changeClass(s,'humanFighter');updateStats(s);enterHuntField(s,'catacomb-forbidden-path');
 s.game.hunt.field.mobs.forEach(m=>{m.aggressive=false;m.nextAttackAt=Date.now()+1e6;});
 let peer=null,preview16=false,reads=0,socialPreview=false,chatMessages=[];
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce',hasTouch:width<500}),errors=[],posts=[];
 const instrumentation=mode==='unavailable'?'':`const {Game}=await import('/vendor/phaser/phaser.esm.min.js');const boot=Game.prototype.boot;Game.prototype.boot=function(){window.huntEngine=this;window.renderFrames=0;this.events.on('postrender',()=>window.renderFrames++);return boot.call(this);};`;
 if(mode==='canvas')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:original.call(this,type,...args);};});
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(mode==='missing-art'&&url.pathname.startsWith('/art/world/')&&url.pathname.endsWith('.webp'))return route.fulfill({status:404});
  if(url.pathname==='/vendor/phaser/phaser.esm.min.js')return mode==='unavailable'?route.fulfill({status:503}):route.fulfill({contentType:'text/javascript',body:fs.readFileSync('node_modules/phaser/dist/phaser.esm.min.js')});
  if(url.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><script type="module">import {openHuntGame} from '/hunt.js';${instrumentation}window.openHuntFixture=()=>openHuntGame({haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span'),api:async(url,options)=>{const r=await fetch('/fixture',{method:'POST',body:JSON.stringify({url,body:options?.body?JSON.parse(options.body):null})});return r.json();}});openHuntFixture();</script></body></html>`});
  if(url.pathname==='/fixture-scene'){
   const {scenario}=route.request().postDataJSON();preview16=true;
   peer=structuredClone(s);peer.userId=2;peer.userChatData={user:{id:2,first_name:'Night Raven'}};
   changeClass(peer,'duelist');updateStats(peer);peer.game.clanName='Moon Guard';
   peer.game.worldPvp={karma:scenario==='pk'?300:0,flagUntil:0,log:[],effects:{}};
   s.game.worldPvp={karma:0,flagUntil:0,log:[],effects:{}};
   s.game.gameClass.stats.hp=1415;s.game.gameClass.stats.cp=566;
   Object.assign(s.game.hunt.field,{x:.4,y:.75,path:[],seenAt:Date.now()});
   Object.assign(peer.game.hunt.field,{x:.6,y:.65,path:[],seenAt:Date.now()});
   const chat={members:[s,peer]};
   if(scenario!=='neutral'){
    assert.ok(useFieldPvpSkill(chat,peer,s.userId,0,{force:true,random:()=>.5}).ok);
    if(scenario==='pvp')assert.ok(useFieldPvpSkill(chat,s,peer.userId,0,{random:()=>.5}).ok);
   }
   return route.fulfill({contentType:'application/json',body:'{}'});
  }
  if(url.pathname==='/fixture-shots'){
   s.game.equipmentStats.rightHand={name:'Long Sword',mainType:'weapon',grade:'noGrade',isFilled:true,kind:'oneHandedSword',characteristics:{}};
   s.game.inventory.materials.soulshot_noGrade=20;s.game.inventory.materials.blessedshot_noGrade=20;
   setAutoShotsForMiniApp(s,false,'soulshot');
   return route.fulfill({contentType:'application/json',body:'{}'});
  }
  if(url.pathname==='/fixture-social'){socialPreview=true;return route.fulfill({contentType:'application/json',body:'{}'});}
  if(url.pathname==='/fixture'){
   const {url:api,body}=route.request().postDataJSON();let result={ok:true};
   if(api==='/api/inventory')return route.fulfill({contentType:'application/json',body:JSON.stringify(getInventoryState(s))});
   if(api==='/api/character')return route.fulfill({contentType:'application/json',body:JSON.stringify(getCharacterState(s,{user:s.userChatData.user}))});
   if(api==='/api/mail')return route.fulfill({contentType:'application/json',body:JSON.stringify(mailState({members:[s],game:{}},s.userId))});
   if(api==='/api/clan')return route.fulfill({contentType:'application/json',body:JSON.stringify({clan:null,available:[],createCost:100000})});
   if(api.startsWith('/api/auction?'))return route.fulfill({contentType:'application/json',body:JSON.stringify({lots:[],mine:[],sellable:[],gold:0,fee:.05,hours:24,maxLots:10})});
   if(api==='/api/profile/nickname')return route.fulfill({contentType:'application/json',body:JSON.stringify(body.nickname==='TakenName'?{ok:false,reason:'nickname_taken'}:setPlayerNickname(s,body.nickname))});
   if(api.startsWith('/api/combat/chat')){
    reads++;
    const channel=body?.channel||new URL(api,'http://localhost').searchParams.get('channel');
    if(body)chatMessages.push({id:String(chatMessages.length),name:'White Amorality',text:body.text,at:Date.now(),channel});
    return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,scope:channel,messages:chatMessages.filter(m=>m.channel===channel)})});
   }
   if(!body)reads++;
   if(body){posts.push({api,body});
    if(api==='/api/hunt/move')result=moveHuntField(s,body.point||body.direction);
    if(api==='/api/hunt/target')result=selectHuntTarget(s,body.targetId);
    if(api==='/api/hunt/attack')result=setHuntAttack(s,body.enabled);
    if(api==='/api/hunt/skill')result=useHuntSkill(s,body.skillIndex);
    if(api==='/api/hunt/hotbar')result=setHotbarForMiniApp(s,body.slots);
    if(api==='/api/hunt/supplies')result=setHuntSupplies(s,body);
    if(api==='/api/hunt/drop')result=getHuntDropForMiniApp(s,body.targetId);
    if(api==='/api/shots/auto')result=setAutoShotsForMiniApp(s,body.enabled,body.kind);
   }
   const hunt=await getHuntState(s,Date.now(),peer?[peer]:[]);
   // UI fixture: show an original buff and debuff without changing combat calculations.
   hunt.player.effects.push({id:'l2:1204',iconKey:'l2:1204',label:'Wind Walk',kind:'buff',count:1200},{id:'l2:1160',iconKey:'l2:1160',label:'Slow',kind:'debuff',count:30});
   if(socialPreview){
    hunt.party={id:'fixture-party',leaderId:'0',members:Array.from({length:9},(_,i)=>({userId:String(i),name:limitPlayerName(i===8?'VeryLongPartyName':'Ally_'+i),classTitle:'Duelist',leader:i===0,me:i===0,cp:50,maxCp:100,hp:80,maxHp:100,mp:40,maxMp:100}))};
    const buffIds=[1204,1040,1068,1036,1086,1077,1242,1045,1048,1059];
    hunt.player.effects=Array.from({length:30},(_,i)=>({id:'fixture-buff-'+i,iconKey:'l2:'+buffIds[i%buffIds.length],label:'Buff '+i,kind:'buff',count:1200}));
    hunt.player.effects.push({id:'l2:1160',iconKey:'l2:1160',label:'Slow',kind:'debuff',count:30});
    hunt.player.special.push(...Array.from({length:5},(_,i)=>({id:'l2:'+(110+i),type:'toggle',name:'Toggle '+i,running:true,canUse:true})));
    const at=Date.now();hunt.log.push(...['incoming','outgoing','heal','miss','evade'].map((kind,i)=>({id:'combat-fixture-'+kind,at:at-100+i,combat:{kind,actor:kind==='incoming'?'Орк':hunt.player.name,target:hunt.player.name,amount:100+i},text:'Combat fixture'})));
   }
   if(preview16){
    // Rendering fixture only: sixteen original L2 abilities, without granting any skills to the character.
    const names=['Attack','Triple Slash','Double Sonic Slash','Triple Sonic Slash','Sonic Blaster','Sonic Buster','Sonic Storm','War Cry','Battle Roar','Dash','Lionheart','Duelist Spirit','Sonic Focus','Sonic Move','Sonic Rage','Sonic Barrier'];
    const base=hunt.player.skills[0];
    hunt.player.skills=names.map((name,index)=>{const row=Object.values(l2.skills).find(r=>r.name===name);return {...base,index,name,costMp:Number(row?.mp?.at(-1))||0,locked:false,canUse:true,cooldownUntil:0,cooldownMs:0};});
    hunt.player.hotbar=names.map((_,index)=>index);
   }
   return route.fulfill({contentType:'application/json',body:JSON.stringify(body?{...result,hunt}:hunt)});
  }
  const file=path.resolve(root,'.'+url.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://127.0.0.1:4321/fixture.html');await page.waitForSelector('.hunt-overlay.visible');
 await page.waitForFunction(()=>{const n=document.querySelector('.hunt-vitals'),scene=n?.closest('.hunt-scene');return n&&scene&&n.offsetWidth/scene.clientWidth>.25&&n.offsetWidth/scene.clientWidth<.38;});
 // Query live DOM for layout assertions: polling can replace a previously resolved element.
 const ratio=await page.evaluate(()=>{const n=document.querySelector('.hunt-vitals');return n.offsetWidth/n.closest('.hunt-scene').clientWidth;});
 assert.ok(ratio>.25&&ratio<.38,`self status occupies approximately one third of the scene: ${ratio}`);
 assert.ok(await page.locator('.hunt-vitals').evaluateAll(([n])=>{const scene=n.closest('.hunt-scene').getBoundingClientRect(),r=n.getBoundingClientRect();return Math.abs(r.top-scene.top)<1&&Math.abs(r.left-scene.left)<1;}),'self frame attaches to top left without outer offsets');
 assert.ok(await page.locator('.hunt-player-vitality .mmo-bar-track').evaluateAll(([n])=>n.offsetHeight<=2),'Vitality is a subtle two-pixel gauge');
 assert.equal(await page.locator('.hunt-target-hud .ui-resource-label-inside .mmo-bar-label').textContent(),'HP');
 assert.ok(await page.locator('.mmo-hotbar[data-slot-count]>.mmo-skill').evaluateAll(nodes=>nodes.every(n=>n.getBoundingClientRect().width<=34.5)),'skill columns remain compact on wide and narrow screens');
 assert.ok(await page.locator('.hunt-target-hud').evaluateAll(([n])=>n.offsetWidth<=148&&n.offsetHeight<=40),'target stays narrow and thin');
 assert.equal(await page.locator('.hunt-action-state').count(),0,'idle message takes no space');
 assert.equal(await page.locator('.hunt-target-hud').count(),1);
 assert.ok(await page.locator('.hunt-target-hud').evaluateAll(([n])=>n.offsetWidth<=148&&n.offsetHeight<=40),'target stays narrow and thin');
 assert.equal(await page.locator('.hunt-target-hud small').count(),0,'target does not show the monster level');
 assert.ok(Array.from(await page.locator('.hunt-target-title>strong').textContent()).length<=18,'visible monster name is at most eighteen characters');
 assert.equal((await page.locator('[data-target-drop]').textContent()).trim(),'?','drop action remains a visible question glyph');
 assert.equal(await page.locator('[data-target-drop]').getAttribute('aria-label'),'Посмотреть дроп');
 assert.ok(await page.locator('[data-target-drop]').evaluateAll(([n])=>n.offsetWidth<=20&&n.offsetHeight<=20),'question icon is twenty pixels or smaller');
 assert.ok(await page.locator('[data-target-drop]').evaluateAll(([n])=>n.getBoundingClientRect().left-n.previousElementSibling.getBoundingClientRect().right<=2.5),'drop question stays next to target name without free space');
 assert.equal(await page.locator('[data-combat-details="menu"]').count(),0,'no separate battle menu');
 assert.equal(await page.locator('[data-system-chat]').getAttribute('aria-label'),'Открыть системный чат');
 assert.equal(await page.locator('[data-system-chat] .ui-control-glyph').count(),1,'system chat has a speech bubble control, not a settings hammer');
 assert.ok(await page.locator('[data-system-chat]').evaluateAll(([n])=>n.offsetWidth===22&&n.offsetHeight===22),'system chat uses a small square control');
 await page.locator('[data-system-chat]').click();await page.waitForSelector('.combat-chat-overlay.visible');
 assert.equal(await page.locator('[data-chat-channel=system]').getAttribute('aria-selected'),'true');
 assert.equal(await page.locator('.combat-chat-form').isVisible(),false);
 await page.locator('.combat-chat-overlay [data-dismiss]').click();
 await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-system-chat'));
 assert.ok(await page.locator('[data-hunt-open=clan] img').getAttribute('src').then(src=>src.includes('/l2ui/navigation/Icon_DF_MenuWnd_Clan')));
 assert.ok(await page.locator('[data-hunt-open=auction] img').getAttribute('src').then(src=>src.includes('/l2/icon-etc_adena_i00')));
 assert.ok(await page.locator('.hunt-panel').evaluate(panel=>{const heading=panel.querySelector('.game-dialog-heading').getBoundingClientRect(),scene=panel.querySelector('.hunt-scene').getBoundingClientRect();return Math.abs(scene.top-heading.bottom-6)<1;}),'title-to-scene gap is halved to six pixels');
 assert.deepEqual(await page.locator('.hunt-bar-tools button').evaluateAll(nodes=>nodes.map(n=>n.dataset.huntOpen||n.hasAttribute('data-shots-collapse')&&'collapse'||'settings')),['settings','collapse','inventory','mail','character','clan','auction']);
 assert.ok(await page.locator('.hunt-bar-tools button,[data-bar-tab]').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).borderTopWidth==='0px'&&getComputedStyle(n).boxShadow==='none')),'all bottom navigation icons are frameless');
 assert.ok(await page.locator('[data-supply],[data-shots]').evaluateAll(nodes=>nodes.every(n=>n.offsetWidth===21&&getComputedStyle(n).borderTopWidth==='0px')),'supplies are thirty percent smaller and frameless');
 await page.waitForFunction(()=>{const n=document.querySelector('.mmo-hotbar[data-slot-count]>.mmo-skill');return n&&getComputedStyle(n).borderTopWidth==='0px';});
 if(width<600)assert.ok(await page.locator('.hunt-scene-dock').evaluateAll(([n])=>n.offsetLeft<=4&&parseFloat(getComputedStyle(n).paddingLeft)<=4),'mobile dock sits close to the scene edges');
 assert.ok(await page.locator('[data-shots-collapse] svg').evaluateAll(([n])=>n.getBoundingClientRect().width>=16),'collapse arrow retains visible geometry inside its button');
 assert.equal(await page.locator('.hunt-top-hud .ui-resource-l2').count(),await page.locator('.hunt-top-hud .mmo-bar').count(),'both readouts reuse the L2 resource-bar variant');
 assert.notEqual(await page.locator('.hunt-vitals .mmo-bar-track').first().evaluateAll(([n])=>getComputedStyle(n).boxShadow),'none');
 assert.equal(await page.locator('.hunt-player-level').textContent(),String(s.game.stats.lvl));
 assert.equal(await page.locator('.hunt-player-resources .mmo-bar').count(),5,'CP, HP, MP, EXP and Vitality share the status frame');
 assert.ok(await page.locator('.hunt-player-resources .mmo-bar-track').evaluateAll(nodes=>nodes.every((node,i)=>!i||Math.abs(node.getBoundingClientRect().top-nodes[i-1].getBoundingClientRect().bottom)<.5)),'resource tracks touch vertically');
 assert.ok(await page.locator('.hunt-vitals').evaluateAll(([n])=>parseFloat(getComputedStyle(n).paddingTop)<=4),'nickname frame uses reduced padding');
 assert.ok(await page.locator('[data-bar-tab]').evaluateAll(nodes=>nodes.every(n=>!n.textContent.trim()&&n.getAttribute('aria-label')&&n.title&&n.querySelector('img'))),'icon tabs retain accessible names and tooltips');
 assert.equal(await page.locator('.hunt-shot-shortcuts [data-shots]').count(),2,'only soulshot and blessed spiritshot choices');
 const shotWidth=await page.locator('.hunt-shot-shortcuts').evaluateAll(([n])=>n.offsetWidth),dockHeight=await page.locator('.hunt-scene-dock').evaluateAll(([n])=>n.offsetHeight),beforeCollapse=posts.length;
 await page.locator('[data-shots-collapse]').click();
 assert.equal(await page.locator('[data-shots-collapse]').getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('#hunt-shot-items').isVisible(),false);
 assert.equal(await page.locator('.hunt-potion-shortcuts').isVisible(),false,'potions collapse together with shots');
 assert.ok(await page.locator('.hunt-scene-dock').evaluateAll(([n])=>n.offsetHeight)<dockHeight,'entire supply row releases vertical space');
 assert.ok(await page.locator('.hunt-shot-shortcuts').evaluateAll(([n])=>n.offsetWidth)<shotWidth,'collapsed shots release space');
 assert.equal(posts.length,beforeCollapse,'collapsing never changes server shot settings');
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-hud-collapsed-390.png'});
 await page.locator('[data-shots-collapse]').click();assert.equal(await page.locator('#hunt-shot-items').isVisible(),true);
 await page.waitForFunction(()=>['.hunt-target-hud','.hunt-vitals'].every(selector=>{const node=document.querySelector(selector);return node&&getComputedStyle(node).backgroundColor==='rgba(8, 11, 17, 0.59)';}));
 await page.waitForFunction(()=>{const n=document.querySelector('.hunt-target-hud');if(!n)return false;const ratio=n.querySelector('.hunt-mob-target-hp')?.getBoundingClientRect().width/(n.clientWidth-parseFloat(getComputedStyle(n).paddingLeft)-parseFloat(getComputedStyle(n).paddingRight));return Math.abs(ratio-.75)<.02;});
 await page.locator('[data-target-drop]').click();await page.waitForSelector('.loot-preview-overlay.visible');
 assert.ok(await page.locator('[data-drop-groups] .ui-drop-group').count()>0);
 assert.ok(await page.locator('.ui-drop-item img').count()>0);
 assert.match(await page.locator('[data-drop-groups]').textContent(),/Шанс группы:.*За убийство:.*В группе:/s);
 assert.equal(await page.locator('.loot-notice-panel').evaluateAll(([n])=>n.scrollWidth>n.clientWidth+1),false,'drop rows fit the narrow dialog');
 await page.locator('.ui-drop-item img').evaluateAll(async images=>{await Promise.all(images.map(image=>{image.loading='eager';return image.decode().catch(()=>{});}));});
 assert.deepEqual(await page.locator('.ui-drop-item img').evaluateAll(images=>images.filter(image=>!image.naturalWidth).map(image=>image.src)),[],'drop item icons actually load');
 await page.waitForTimeout(220);
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-target-drop-390.png'});
 await page.keyboard.press('Escape');await page.waitForSelector('.loot-preview-overlay',{state:'detached'});
 await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-target-drop'));
 assert.equal(await page.locator('.hunt-effects-hud .mmo-status[data-effect-kind=buff],.hunt-effects-hud .mmo-status[data-effect-kind=debuff]').count(),2);
 await page.locator('[data-bar-tab="actions"]').click();
 await page.locator('[data-pin-action="trade"]').click();
 await page.locator('[data-bar-tab="skills"]').click();
 assert.equal(await page.locator('.mmo-hotbar [data-combat-action="trade"]').count(),1,'actions persist on the bar');
 await page.locator('[data-bar-tab="actions"]').click();await page.locator('[data-pin-action="trade"]').click();
 await page.locator('[data-bar-tab="skills"]').click();
 await page.locator('[data-bar-edit]').click();await page.locator('[data-combat-details="acp"]>summary').click();
 await page.locator('[data-acp]').check();
 await page.locator('[data-supply="cp-small"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-supply="cp-small"]')?.getAttribute('aria-pressed')==='true');
 assert.equal(await page.locator('[data-supply="cp-small"]').getAttribute('aria-pressed'),'true');
 assert.equal(s.game.huntSupplies.slots['cp-small'],true,'ACP toggle reaches the server');
 await page.locator('[data-acp]').uncheck();await page.locator('[data-bar-cancel]').click();
 if(mode!=='unavailable'){
  await page.waitForSelector('.hunt-phaser-ready canvas');
  assert.equal(await page.locator('.hunt-phaser').getAttribute('data-renderer'),mode==='canvas'?'canvas':'webgl');
  await page.waitForSelector('.hunt-avatar-painted');
  assert.equal(await page.evaluate(()=>huntEngine.loop.running),false,'no independent Phaser animation loop');
 }else{
  await page.waitForTimeout(150);
  assert.equal(await page.locator('.hunt-phaser-ready').count(),0);
  assert.ok(await page.locator('.hunt-isometric-terrain').isVisible(),'SVG remains playable if the engine cannot load');
 }
 // The embedding screen owns visibility; neither polling nor drawing runs in a hidden tab.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(150);
 const hiddenFrames=await page.evaluate(()=>window.renderFrames),hiddenPosts=posts.length,hiddenReads=reads;
 await page.waitForTimeout(850);
 assert.equal(await page.evaluate(()=>window.renderFrames),hiddenFrames);
 assert.equal(posts.length,hiddenPosts);
 assert.equal(reads,hiddenReads,'no polling in a hidden tab');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.getByRole('button',{name:'Стоп',exact:true}).count(),0,'no standalone Stop button');
 assert.equal(await page.locator('.hunt-scene .hunt-ground').count(),1,'one scene contains the world');
 assert.equal(await page.locator('.hunt-scene .hunt-controls').count(),1,'controls belong to the same scene');
 assert.equal(await page.locator('[data-world-stairs]').count(),0,'one-floor fields do not show useless stairs');
 assert.equal(await page.locator('.hunt-exit').count(),2,'entrance has only its two neighbouring exits');
 assert.equal(await page.locator('.hunt-panel').evaluateAll(([n])=>n.scrollWidth>n.clientWidth+1),false,'dialog has no horizontal overflow');
 await page.waitForFunction(()=>{const skill=document.querySelector('[data-skill]')?.getBoundingClientRect();return skill&&skill.height>0&&skill.y+skill.height<844;});
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='true');assert.ok(s.game.hunt.field.autoAttack);
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='false');assert.equal(s.game.hunt.field.autoAttack,undefined);
 const targets=page.locator('[data-target]');
 await targets.nth(1).click();assert.equal(s.game.hunt.field.target,s.game.hunt.field.mobs[1].instanceId);
 await page.locator('[data-next-target]').click();assert.equal(s.game.hunt.field.target,s.game.hunt.field.mobs[2].instanceId);
 await page.waitForSelector('.hunt-overlay:not(.busy)');
 await page.waitForSelector('.hunt-ground');
 const panBox=await page.locator('.hunt-ground').boundingBox(),beforePan=posts.length;
 await page.mouse.move(panBox.x+12,panBox.y+30);await page.mouse.down();await page.mouse.move(panBox.x+42,panBox.y+42,{steps:4});await page.mouse.up();
 assert.equal(posts.length,beforePan,'dragging the camera never walks or selects a target');
 assert.match(await page.locator('.hunt-world').getAttribute('style'),/translate\(30px,\s*12px\)/);
 await page.mouse.move(panBox.x+panBox.width/2,panBox.y+panBox.height/2);await page.mouse.wheel(0,-100);
 await page.waitForFunction(()=>document.querySelector('.hunt-world')?.style.transform.includes('scale(1.1)'));
 await page.waitForTimeout(120);
 const groundPoint=await page.evaluate(async()=>{const {isoPoint}=await import('/hunt-isometric.js');const node=document.querySelector('.hunt-ground');return isoPoint({x:.65,y:.8},{width:node.clientWidth,height:node.clientHeight},{x:30,y:12,zoom:1.1});});

 await page.locator('.hunt-ground').click({position:groundPoint});
 await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Перемещение');
 assert.ok(posts.some(p=>p.api==='/api/hunt/move'&&p.body.point));
 const pickedMove=posts.findLast(p=>p.body.point)?.body.point;assert.ok(Math.abs(pickedMove.x-.65)<.01&&Math.abs(pickedMove.y-.8)<.01,'screen pick includes the actual camera transform');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.hunt-action-state'));
 await page.locator('.hunt-exit.east').click();assert.equal(s.game.hunt.field.pendingRoom,'r0c1');
 await page.waitForFunction(()=>document.querySelector('.hunt-action-state')?.textContent==='Идём к выходу');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.hunt-action-state'));assert.equal(s.game.hunt.field.pendingRoom,undefined);
 await page.locator('[data-bar-edit]').click();
 await page.locator('[data-combat-details="rooms"] summary').click();
 await page.waitForTimeout(850);assert.equal(await page.locator('[data-combat-details="rooms"]').getAttribute('open'),'');
 await page.locator('[data-combat-details="rooms"] summary').click();
 await page.locator('[data-view-reset]').click();
 await page.locator('[data-bar-cancel]').click();
 await page.locator('[data-next-target]').focus();
 await page.waitForFunction(()=>document.activeElement?.hasAttribute('data-next-target'));
 await page.locator('[data-attack]').click();await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='true');await page.keyboard.press('Escape');
 await page.waitForFunction(()=>document.querySelector('[data-attack]')?.getAttribute('aria-pressed')==='false');
 assert.equal(await page.locator('.hunt-overlay').count(),1,'Escape first stops the action');assert.equal(s.game.hunt.field.autoAttack,undefined);
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-spatial-390.png',fullPage:true});
 for(const scenario of ['neutral','pvp','pk']){
  await page.evaluate(async scenario=>{await fetch('/fixture-scene',{method:'POST',body:JSON.stringify({scenario})});},scenario);
  await page.waitForSelector('[data-pvp-target="2"]');
  const expected=scenario==='pvp'?'flagged':scenario==='pk'?'pk':'neutral';
  await page.waitForSelector(`.hunt-player-marker.ui-pvp-${expected}`);
  await page.locator('.hunt-player-marker[data-pvp-target="2"] .hunt-iso-avatar').click();
  await page.waitForSelector(`.hunt-player-marker.ui-pvp-${expected}.selected`);
  assert.equal(await page.locator('.mmo-hotbar[data-slot-count="16"]>.mmo-skill').count(),16,'sixteen ability slots');
  assert.equal(await page.locator('.hunt-scene-target,.hunt-peer-target').count(),0,'no separate target panel');
  assert.equal(await page.locator('.hunt-player-marker .mmo-bar').count(),0,'other players never show HP or CP');
  assert.equal(await page.locator('.hunt-presence-clan').innerText(),'Moon Guard');
  assert.equal(await page.locator('.hunt-actor .hunt-mob-percent').count(),3);
  assert.equal(await page.locator('.hunt-actor .hunt-mob-name').count(),3);
  assert.equal(await page.locator('.hunt-actor .hunt-actor-hp,.hunt-actor .hunt-actor-portrait>i').count(),0,'only monster name, percentage and avatar');
  assert.equal(await page.locator('[data-force-attack]').count(),scenario==='neutral'?1:0,'force is only offered against a peaceful player');
  if(mode!=='unavailable'){
   await page.waitForFunction(()=>[...document.querySelectorAll('.hunt-iso-actor:has(img)')].every(n=>n.classList.contains('hunt-avatar-painted')));
   const opacity=await page.locator('.hunt-avatar-painted>.hunt-iso-avatar').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).opacity));
   assert.ok(opacity.every(o=>o==='0'),'portraits are painted once, without an HTML duplicate');
  }
  assert.equal(await page.locator('.hunt-panel').evaluateAll(([n])=>n.scrollWidth>n.clientWidth+1),false);
  const last=await page.locator('.mmo-hotbar[data-slot-count="16"]>.mmo-skill').last().boundingBox();assert.ok(last.y+last.height<=844);
  if(scenario!=='neutral')assert.ok(await page.locator('[data-combat-log] [data-combat-kind]').count()>0,'actual attacks use the colored combat log');
  if(width===390&&mode==='auto')await page.screenshot({path:`docs/hunt-unified-${scenario}-390.png`,fullPage:true});
 }
 if(mode==='auto'){
  const canvas=await page.locator('.hunt-phaser canvas').elementHandle();
  await canvas.evaluate(n=>n.dispatchEvent(new Event('webglcontextlost',{cancelable:true})));
  assert.equal(await page.locator('.hunt-phaser-ready').count(),0,'context loss restores lightweight field');
  assert.equal(await page.locator('.hunt-avatar-painted').count(),0,'original portraits return');
  assert.ok(await page.locator('.hunt-iso-prop image').count()>0,'lightweight mode renders the shared painted props');
  await page.locator('[data-bar-tab="actions"]').click();
  await page.locator('[data-next-target]').click();
  await page.waitForSelector('.hunt-actor.selected');
 }
 await page.evaluate(()=>fetch('/fixture-shots',{method:'POST'}));
 await page.waitForFunction(()=>document.querySelector('[data-shots="soulshot"]')?.disabled===false);
 await page.locator('[data-shots="soulshot"]').click();await page.waitForFunction(()=>document.querySelector('[data-shots="soulshot"]')?.getAttribute('aria-pressed')==='true');
 await page.locator('[data-shots="blessed"]').click();await page.waitForFunction(()=>document.querySelector('[data-shots="blessed"]')?.getAttribute('aria-pressed')==='true');
 assert.equal(await page.locator('[data-shots="soulshot"]').getAttribute('aria-pressed'),'false','shot modes cannot both remain enabled');
 assert.equal(s.game.autoShotKind,'blessed');
 await page.locator('[data-shots="blessed"]').click();await page.waitForFunction(()=>document.querySelector('[data-shots="blessed"]')?.getAttribute('aria-pressed')==='false');
 assert.equal(s.game.autoShots,false,'second click disables the selected shot mode');
 await page.locator('[data-bar-tab="skills"]').click();
 await page.evaluate(()=>fetch('/fixture-social',{method:'POST'}));
 await page.waitForSelector('[data-party-target="8"]');
 assert.equal(await page.locator('.hunt-effects-hud .mmo-status[data-effect-kind=buff]').count(),30);
 assert.equal(await page.locator('.hunt-effects-hud .mmo-status[data-effect-kind=toggle]').count(),5);
 assert.equal(await page.locator('.hunt-effects-hud .mmo-status[data-effect-kind=debuff]').count(),1);
 assert.ok(await page.locator('.hunt-effects-hud .mmo-status[data-effect-kind=buff]').first().evaluateAll(([n])=>n.offsetWidth<=16&&n.offsetHeight<=16),'dense buff artwork stays at most sixteen pixels');
 await page.waitForFunction(()=>{const n=document.querySelector('.hunt-effects-hud .mmo-status[data-effect-kind=debuff]'),image=n?.querySelector('img');return n&&image&&getComputedStyle(n,'::after').backgroundImage.includes('linear-gradient')&&getComputedStyle(image).filter.includes('grayscale');});
 assert.equal(await page.locator('.hunt-effects-hud em').count(),0,'timers do not cover buff artwork');
 assert.equal(await page.locator('[data-party-target]').count(),8,'nine-person party shows eight allies, with self already in the status frame');
 assert.equal(await page.locator('[data-party-target="0"]').count(),0,'own status is not duplicated');
 assert.ok(await page.locator('[data-party-target] .ui-party-vitals').first().evaluateAll(([n])=>n.offsetWidth>=n.closest('button').clientWidth-10),'party resource bars use the full padded row width');
 assert.equal(await page.locator('[data-party-mini]').getAttribute('aria-pressed'),'true','mini mode is the default');
 assert.ok(await page.locator('[data-party-target]').first().evaluateAll(([n])=>n.offsetHeight<=28),'mini member stays within twenty-eight pixels');
 assert.ok(await page.locator('#combat-party-roster').evaluateAll(([n])=>n.scrollHeight<=n.clientHeight+1),'all eight allies fit without a roster scrollbar');
 const regions=await page.evaluate(()=>Object.fromEntries(['.hunt-effects-hud','.combat-party','.hunt-top-hud','.hunt-scene-dock','.hunt-scene'].map(selector=>[selector,document.querySelector(selector).getBoundingClientRect().toJSON()])));
 assert.ok(regions['.combat-party'].right<=regions['.hunt-effects-hud'].left+1,'party and buff columns do not overlap');
 assert.ok(regions['.combat-party'].bottom<regions['.hunt-scene-dock'].top,'mini party clears the hotbar');
 assert.ok(regions['.hunt-effects-hud'].height<=128,`thirty buffs plus toggles and debuffs keep a compact band (${regions['.hunt-effects-hud'].height}px)`);
 assert.ok(await page.evaluate(()=>{const vitals=document.querySelector('.hunt-vitals').getBoundingClientRect(),effects=document.querySelector('.hunt-effects-hud').getBoundingClientRect(),target=document.querySelector('.hunt-target-hud').getBoundingClientRect(),scene=document.querySelector('.hunt-scene').getBoundingClientRect();return Math.abs(vitals.right-effects.left)<1&&Math.abs(target.top-Math.max(vitals.bottom,effects.bottom)-8)<1&&Math.abs(effects.top-vitals.top)<1&&Math.abs((target.left+target.right)/2-(scene.left+scene.right)/2)<1&&target.left>=vitals.right-1&&target.top>vitals.bottom&&target.top>effects.bottom;}),'target is centered below the entire status and effects band, with an eight-pixel gap');
 assert.ok(await page.locator('.hunt-effects-hud').evaluateAll(([n])=>{const icons=[...n.querySelectorAll('.mmo-status')],buffs=icons.filter(n=>n.dataset.effectKind==='buff'),debuff=icons.find(n=>n.dataset.effectKind==='debuff'),last=buffs.at(-1),a=last.getBoundingClientRect(),b=debuff.getBoundingClientRect(),first=icons[0].getBoundingClientRect();return icons.indexOf(debuff)===icons.indexOf(last)+1&&(Math.abs(a.top-b.top)<1?Math.abs(a.right-b.left)<1:Math.abs(b.top-a.bottom)<1&&Math.abs(b.left-first.left)<1); }),'debuff immediately follows last buff in the same wrapping strip');
 assert.ok(await page.evaluate(()=>{const styles=['.hunt-vitals','.hunt-target-hud','.combat-party','.hunt-scene-dock','.ui-chat-preview'].map(s=>getComputedStyle(document.querySelector(s)));return styles.every(s=>s.backgroundColor===styles[0].backgroundColor&&s.borderRadius===styles[0].borderRadius);}),'HUD surfaces share opacity and rounding');
 await page.locator('[data-party-mini]').click();assert.equal(await page.locator('[data-party-mini]').getAttribute('aria-pressed'),'false');
 await page.locator('[data-party-mini]').click();
 await page.locator('[data-party-target="8"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-party-target="8"]')?.getAttribute('aria-pressed')==='true');
 await page.locator('[data-party-collapse]').click();assert.equal(await page.locator('#combat-party-roster').isVisible(),false);
 await page.locator('[data-party-collapse]').click();
 await page.locator('[data-chat-toggle]').click();
 await page.waitForSelector('.combat-chat-overlay.visible');
 await page.locator('[data-chat-channel=local]').click();
 assert.ok(await page.locator('.combat-chat-overlay [role=dialog]').isVisible(),'full chat opens in its own shared dialog');
 await page.locator('[data-chat-text]').fill('Черновик сообщения');
 await page.waitForTimeout(900);assert.equal(await page.locator('[data-chat-text]').inputValue(),'Черновик сообщения','polling preserves draft');
 assert.equal(await page.locator('[data-chat-text]').evaluateAll(([n])=>n===document.activeElement),true,'polling preserves chat focus');
 await page.locator('[data-chat-channel="party"]').click();
 await page.locator('[data-chat-text]').fill('<script>Привет группе</script>');await page.locator('[data-chat-text]').press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-chat-messages]')?.textContent.includes('Привет группе'));
 assert.equal(await page.locator('[data-chat-messages] script').count(),0,'chat renders plain text');
 assert.equal(chatMessages.at(-1).channel,'party');
 await page.locator('[data-chat-channel="local"]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-chat-messages]')?.textContent.includes('Привет группе'));
 await page.locator('[data-chat-text]').fill('Всем привет');await page.locator('[data-chat-text]').press('Enter');
 await page.waitForFunction(()=>document.querySelector('[data-chat-messages]')?.textContent.includes('Всем привет'));
 assert.equal(await page.locator('.hunt-panel').evaluateAll(([n])=>n.scrollWidth>n.clientWidth+1),false);
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-party-chat-390.png'});
 await page.locator('[data-chat-text]').press('Escape');assert.equal(await page.locator('#combat-chat-body').isVisible(),false);
 await page.waitForSelector('.combat-chat-overlay',{state:'detached'});
 assert.equal(await page.locator('[data-chat-preview]>span').count(),2,'preview has exactly two lines');
 assert.ok((await page.locator('[data-chat-preview]').textContent()).includes('Всем привет'));
 assert.equal(await page.locator('[data-combat-log] p').count(),4,'battle log keeps four compact lines');
 assert.ok(await page.locator('[data-combat-log] p').evaluateAll(rows=>new Set(rows.map(row=>getComputedStyle(row).color)).size===4),'combat outcomes have distinct colors');
 const chatBoxes=await page.evaluate(()=>['[data-combat-log]','[data-chat-toggle]','.hunt-scene-dock'].map(s=>document.querySelector(s).getBoundingClientRect().toJSON()));
 assert.ok(chatBoxes[0].bottom<chatBoxes[1].top&&chatBoxes[1].bottom<=chatBoxes[2].top,'log and two-line chat are above the hotbar');
 assert.equal(await page.locator('.system-toast').count(),0,'combat feedback never stacks toast cards over the HUD');
 if(width===390&&mode==='auto')await page.screenshot({path:'docs/hunt-party-effects-390.png'});
 if(width===390&&mode==='auto'){
  for(const [id,selector] of [['inventory','.inventory-overlay'],['mail','.mail-overlay'],['character','.character-overlay'],['clan','.clan-overlay'],['auction','.auction-overlay']]){
   await page.locator(`[data-hunt-open="${id}"]`).click();await page.waitForSelector(selector+'.visible');
   if(id==='character'){
    await page.locator('[data-character-nickname]').click();
    const name=page.locator('dialog input[name=nickname]');
    await name.fill('a'.repeat(17));assert.equal(await page.locator('dialog [type=submit]').isDisabled(),true);
    await name.fill('TakenName');await page.locator('dialog [type=submit]').click();await page.waitForFunction(()=>document.querySelector('[data-nickname-error]')?.textContent.includes('занят'));
    await name.fill('Белый_Маг');await page.locator('dialog [type=submit]').click();await page.waitForSelector('dialog[open]',{state:'detached'});
    assert.equal(s.game.nickname,'Белый_Маг');
    await page.waitForFunction(()=>document.querySelector('.character-name strong')?.textContent==='Белый_Маг');
    await page.screenshot({path:'docs/character-nickname-390.png'});
   }
   await page.locator(selector+' :is([data-dismiss],.overlay-close)').first().click();await page.waitForSelector(selector,{state:'detached'});
  }
  await page.waitForFunction(()=>document.querySelector('.hunt-self-status')?.textContent.includes('Белый_Маг'));
 }
 await page.locator('[data-shots-collapse]').click();
 await page.locator('[data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 const count=posts.length,closedReads=reads,closedFrames=await page.evaluate(()=>window.renderFrames);await page.waitForTimeout(850);assert.equal(posts.length,count,'no actions after closing');
 assert.equal(reads,closedReads,'no polling after closing');
 assert.equal(await page.evaluate(()=>window.renderFrames),closedFrames,'no rendering after closing');
 if(width===390&&mode==='auto'){
  await page.evaluate(async()=>{
   const {createCombatChat}=await import('/combat-chat.js');const chat=window.chatHistoryFixture=createCombatChat({api:async()=>({ok:true,messages:[]})});
   const host=window.chatHistoryHost=document.createElement('div');host.className='combat-social';host.append(chat.element);document.body.append(host);
   for(let i=0;i<160;i++)chat.combat({kind:'outgoing',actor:'Hero',target:'Орк',amount:i});
   chat.loot({gold:123,items:[{item:'ironOre',name:'Iron Ore',amount:2}]});
  });
  await page.locator('[data-chat-toggle]').click();await page.locator('[data-chat-channel=system]').click();
  assert.equal(await page.locator('[data-chat-messages]>p').count(),150);
  assert.ok((await page.locator('[data-chat-messages]').textContent()).includes('Hero → Орк'));
  assert.ok((await page.locator('[data-chat-messages]').textContent()).includes('Получено 123 адены.'));
  assert.ok((await page.locator('[data-chat-messages]').textContent()).includes('Вы получили Iron Ore ×2.'));
  await page.locator('[data-chat-messages]').evaluateAll(([n])=>{n.scrollTop=0;});
  await page.evaluate(()=>window.chatHistoryFixture.combat({kind:'incoming',actor:'Орк',target:'Hero',amount:50}));
  assert.equal(await page.locator('[data-chat-messages]').evaluateAll(([n])=>n.scrollTop),0,'new events preserve position while reading history');
  assert.ok(await page.locator('[data-chat-messages]').evaluateAll(([n])=>n.scrollHeight>n.clientHeight),'system history scrolls');
  await page.screenshot({path:'docs/hunt-system-chat-390.png'});
  await page.locator('.combat-chat-overlay [data-dismiss]').click();
  await page.evaluate(()=>{window.chatHistoryFixture.destroy();window.chatHistoryHost.remove();});
 }
 await page.evaluate(()=>openHuntFixture());await page.waitForSelector('.hunt-overlay.visible');
 assert.equal(await page.locator('#hunt-shot-items').isVisible(),false,'shot strip preference survives reopening');
 assert.equal(await page.locator('[data-party-mini]').getAttribute('aria-pressed'),'true','mini mode persists when reopening combat');
 await page.locator('[data-shots-collapse]').focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('#hunt-shot-items').isVisible(),true,'strip can be reopened with the keyboard');
 if(mode!=='unavailable')await page.waitForSelector('.hunt-phaser-ready canvas');
 await page.locator('[data-dismiss]').click();await page.waitForSelector('.hunt-overlay',{state:'detached'});
 assert.deepEqual(errors,[]);await page.close();console.log(`Spatial combat ${width}px ${mode}: renderer, target, walking, exits, hotbar, reduced motion and cleanup passed`);
}}finally{await browser.close();}
