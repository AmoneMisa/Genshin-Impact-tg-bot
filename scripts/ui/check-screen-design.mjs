import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import defaults from '../../functions/getters/getLostFieldsInSession.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import {getCharacterState} from '../../miniapp/character.js';
import {getPlayerProfileState} from '../../miniapp/playerProfile.js';
import {getSkillsState} from '../../miniapp/skills.js';
import {getPassivesState} from '../../functions/game/player/passiveSkills.js';
import {getClassBuffsState} from '../../miniapp/buffs.js';
import {getPartyState} from '../../miniapp/party.js';
import {getFormsState} from '../../miniapp/forms.js';
import {getUpdatesState} from '../../miniapp/updates.js';
import {getHoroscopeState} from '../../miniapp/horoscope.js';
import {getArcadeState} from '../../miniapp/arcade.js';
import {mailState} from '../../miniapp/mail.js';
import {getTattooState} from '../../miniapp/tattoos.js';
import {buildChatSettingsState} from '../../miniapp/chatSettings.js';
import {buildSelfMuteState} from '../../miniapp/selfMute.js';
const hero={userId:7,userChatData:{user:{id:7,first_name:'White Amorality'}},game:{}};
defaults(hero);changeClass(hero,'humanMystic');hero.game.stats.lvl=47;hero.game.inventory.gold=163308;
const chat={members:[hero],game:{}},context={chatId:-7,userId:7,session:chat,ownerId:7};
const fixtures={
 '/api/character':getCharacterState(hero,{user:hero.userChatData.user}),
 '/api/profile':getPlayerProfileState(hero),'/api/skills':getSkillsState(hero),
 '/api/passives':getPassivesState(hero),'/api/buffs':getClassBuffsState(hero),
 '/api/party':getPartyState(hero),'/api/forms':getFormsState(chat,7),
 '/api/updates':getUpdatesState(hero),'/api/horoscope':getHoroscopeState(hero),
 '/api/arcade':getArcadeState(hero),'/api/mail':mailState(chat,7),
 '/api/tattoos':{tattoos:getTattooState(hero)},'/api/chat-settings':buildChatSettingsState(context),
 '/api/self-mute':buildSelfMuteState({...context,settings:{}}),
 '/api/titles':{cooldown:{remainingMs:0,canAssign:true},recent:[],eligibleCount:1},
};
const screens=[['character','openCharacterPage'],['profile','openPlayerProfile'],['skills','openSkillsGame'],['passives','openPassivesGame'],['buffs','openBuffsGame'],['party','openPartyGame'],['forms','openFormsGame'],['updates','openUpdatesGame'],['horoscope','openHoroscopeGame'],['arcade','openArcadeGame'],['mail','openMailGame'],['tattoos','openTattoosGame'],['chat-settings','openChatSettings'],['self-mute','openSelfMute'],['titles','openTitlesGame'],['feedback','openFeedbackGame'],['help','openHelpGame'],['language','openLanguageGame']];
const root=path.resolve('webapp'),out=path.resolve('.tmp/screen-design');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
const results=[];
try {for(const width of [320,390,820])for(const [module,fn] of screens){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/fixture.html')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><button id="origin">Открыть</button></body>`});
  if(Object.hasOwn(fixtures,u.pathname))return route.fulfill({json:fixtures[u.pathname]});
  if(u.pathname.startsWith('/api/'))return route.fulfill({status:404,json:{error:u.pathname}});
  const bundle=assets.bundles.find(b=>b.path===u.pathname);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://design.local/fixture.html');
 try {
  await page.evaluate(async({module,fn})=>{
   await (await import('/feature-styles.js')).ensureFeatureStyles();
   (await import('/overlay-a11y.js')).installOverlayA11y();
   (await import('/design/select.js')).observeSelects(document.body);
   await (await import('/'+module+'.js'))[fn]({api:(await import('/request-json.js')).requestJson,haptic(){},renderState(){},statusElement:document.createElement('p'),context:{chatId:-7,user:{id:7}}});
  },{module,fn});
  await page.locator('.game-overlay.visible').waitFor();
  if(module==='tattoos')await page.locator('.tattoo-totals').waitFor();
  if(module==='skills'){
   const detail=page.locator('.ui-disclosure').first();
   if(await detail.count()){
    assert.equal(await detail.getAttribute('open'),null);
    await detail.locator('summary').click();
    assert.notEqual(await detail.getAttribute('open'),null);
    await detail.locator('summary').click();
   }
  }
  await page.waitForTimeout(100);
  const checks=await page.locator('.overlay-panel').first().evaluate(panel=>{
   const rect=panel.getBoundingClientRect();
   return {overflow:panel.scrollWidth>panel.clientWidth+1||document.documentElement.scrollWidth>innerWidth,close:panel.querySelector('.overlay-close')?.textContent,heading:panel.querySelector('h2')?.textContent,top:rect.top};
  });
  if(width===390)await page.screenshot({path:path.join(out,module+'.png')});
  assert.equal(checks.overflow,false,'horizontal overflow');assert.equal(checks.close,'×','shared close');assert.deepEqual(errors,[]);
  if(module==='party'){
   const spacing=await page.locator('.party-empty').evaluate(el=>{const p=el.querySelector('p').getBoundingClientRect(),b=el.querySelector('button').getBoundingClientRect();return b.top-p.bottom;});
   assert.ok(spacing>=12,'text/action spacing');
  }
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.game-overlay:not(.closing)'));
  results.push({module,width,...checks,passed:true});
 }catch(e){results.push({module,width,passed:false,error:e.message});}
 await page.close();
}
}finally{await browser.close();}
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));
for(const r of results)console.log(`${r.passed?'PASS':'FAIL'} ${r.module} ${r.width}: ${r.error||'layout, close, Escape'}`);
assert.ok(results.every(r=>r.passed),'screen audit failures; see .tmp/screen-design/results.json');
