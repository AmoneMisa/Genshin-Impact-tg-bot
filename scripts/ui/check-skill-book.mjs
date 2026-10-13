import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {bundlePageAssets} from '../../miniapp/pageAssets.js';
import defaults from '../../functions/getters/getLostFieldsInSession.js';
import changeClass from '../../functions/game/player/changePlayerGameClass.js';
import updateStats from '../../functions/game/player/updatePlayerStats.js';
import {getSkillsState} from '../../miniapp/skills.js';
import {enchantL2Skill} from '../../functions/game/player/l2SkillEnchant.js';
const root=path.resolve('webapp'),out=path.resolve('.tmp/skill-book');fs.mkdirSync(out,{recursive:true});
const assets=bundlePageAssets(fs.readFileSync(path.join(root,'index.html'),'utf8'),f=>fs.readFileSync(path.join(root,f.slice(1)),'utf8'));
const styles=[...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m=>m[0]).join('');
const {chromium}=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE))('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{for(const width of [320,390,820]){
 const hero={userId:1,game:{}};defaults(hero);hero.game.stats.lvl=85;changeClass(hero,'archmage');updateStats(hero);hero.game.inventory.sp=1e9;hero.game.inventory.gold=1e9;hero.game.inventory.materials={l2_6622:3,l2_9627:3};hero.game.learnedSkills={1230:true};
 const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const url=new URL(route.request().url()),u=url.pathname;
  if(u==='/fixture')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body></body>'});
  if(u==='/api/skills')return route.fulfill({json:getSkillsState(hero)});
  if(u==='/api/skills/enchant'){const b=route.request().postDataJSON(),r=enchantL2Skill(hero,b.id,{...b,random:()=>0});return route.fulfill({json:{...r,skills:getSkillsState(hero)}});}
  const bundle=assets.bundles.find(b=>b.path===u);if(bundle)return route.fulfill({contentType:'text/css',body:bundle.css});
  const file=path.resolve(root,'.'+u);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://design.local/fixture');
 await page.evaluate(async()=>{await(await import('/feature-styles.js')).ensureFeatureStyles();(await import('/overlay-a11y.js')).installOverlayA11y();(await import('/design/select.js')).observeSelects(document.body);await(await import('/skill-book.js')).openSkillBook({api:async(url,options)=>{const r=await fetch(url,options);return r.json();}});});
 const skill=page.locator('[data-skill-id="1230"]');assert.ok((await skill.getAttribute('title')).length>10);await skill.click();await page.locator('.skill-detail').waitFor();await page.screenshot({path:path.join(out,'tooltip-'+width+'.png')});await page.keyboard.press('Escape');
 await page.locator('[data-book-tab="passive"]').click();assert.ok(await page.locator('[data-skill-id]').count()>0);
 await page.locator('[data-book-tab="enchant"]').click();await page.locator('[data-enchant-id="1230"]').click();await page.locator('[data-enchant]').waitFor();await page.waitForFunction(()=>getComputedStyle(document.querySelector('.skill-detail-overlay')).opacity==='1');
 assert.equal(await page.locator('[data-enchant]').isEnabled(),true);await page.screenshot({path:path.join(out,'enchant-'+width+'.png')});
 assert.equal(await page.locator('.skill-detail').evaluate(p=>p.scrollWidth<=p.clientWidth+1),true);
 await page.locator('[data-enchant]').click();await page.waitForFunction(()=>!document.querySelector('.skill-detail-overlay'));assert.equal(hero.game.skillEnchants[1230].level,1);assert.equal(hero.game.inventory.materials.l2_6622,2);assert.ok(hero.game.inventory.sp<1e9);
 await page.locator('[data-enchant-id="1230"]').click();await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.deepEqual(errors,[]);await page.close();console.log('PASS skill book '+width+': tooltip, tabs, enchant, cost, original icon');
}}finally{await browser.close();}
