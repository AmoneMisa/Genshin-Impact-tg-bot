import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {avatarCostumeHtml} from '../../webapp/avatar-costume-view.js';
import {AVATAR_COSTUME_VARIANTS} from '../../webapp/art/avatar-costume-art.js';
import {getCharacterState} from '../../miniapp/character.js';
import {getInventoryState} from '../../miniapp/inventory.js';

const {chromium} = await import(pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href);
const root = path.resolve('webapp');
const output = 'art-source/avatars/collections';
const variants = ['golden-phoenix','prismatic-archon','scarlet-comet','moon-velvet']
  .map(id => AVATAR_COSTUME_VARIANTS.find(v => v.costumeId === id && v.race === 'human'));
const views = variants.map(v => avatarCostumeHtml({id:v.costumeId,
  src:`/art/avatars/collections/v1/${v.key}-256.webp`,name:v.name})).join('');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="/avatar-costume-view.css">
<style>body{margin:0;padding:12px;box-sizing:border-box;background:#111725;color:#eee}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}button{padding:8px}</style>
<button id="action">Действие</button><main>${views}</main><script type="module">
import {installAvatarCostumeMotion} from '/avatar-costume-view.js';window.motion=installAvatarCostumeMotion();window.ready=true;
</script>`;
const browser = await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const report = [];
async function pageFor(width, body = html, lowPower = false, failedCanvas = false) {
  const page = await browser.newPage({viewport:{width,height:844},hasTouch:true,reducedMotion:'no-preference'});
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  if (lowPower) await page.addInitScript(() => Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>2}));
  if (failedCanvas) await page.addInitScript(()=>HTMLCanvasElement.prototype.getContext=()=>null);
  await page.route('**/*', route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/') return route.fulfill({contentType:'text/html',body});
    const file = path.resolve(root,'.'+pathname);
    if (!file.startsWith(root+path.sep) || !fs.existsSync(file)) return route.fulfill({status:404});
    return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)] || 'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4319/');
  await page.waitForFunction(() => window.ready);
  await page.locator('img').evaluateAll(imgs => Promise.all(imgs.map(i => i.decode())));
  return {page,errors};
}
try {
  for (const width of [320,390,1100]) {
    const {page,errors} = await pageFor(width);
    await page.waitForFunction(() => document.querySelectorAll('[data-avatar-motion-active]').length === 2);
    const image = page.locator('[data-avatar-motion-active] [data-avatar-art]').first();
    await page.waitForFunction(()=>document.querySelector('[data-avatar-rig-active]'));
    assert.equal(await image.evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.equal(await page.locator('.avatar-costume-canvas:not([hidden])').count(),2);
    assert.equal(await page.locator('[data-avatar-motion-active]').first().evaluate(e=>getComputedStyle(e,'::before').animationName),'costume-glimmer');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#action').tap();
    await page.locator('#action').focus();
    assert.equal(await page.locator('#action').evaluate(e=>e===document.activeElement),true);
    await page.screenshot({path:`${output}/motion-review-${width}.png`});
    await page.locator('[data-avatar-motion]').first().evaluate(e=>e.hidden=true);
    await page.waitForFunction(()=>!document.querySelector('[data-avatar-motion]').hasAttribute('data-avatar-motion-active'));
    await page.locator('[data-avatar-motion]').first().evaluate(e=>e.hidden=false);
    await page.evaluate(()=>{
      window.testPageHidden=true;
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.testPageHidden});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
    await page.evaluate(()=>{window.testPageHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    await page.waitForFunction(()=>document.querySelectorAll('[data-avatar-motion-active]').length===2);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>!document.querySelector('[data-avatar-motion-active]'));
    assert.equal(await page.locator('[data-avatar-art]').first().evaluate(e=>getComputedStyle(e).animationName),'none');
    assert.equal(await page.locator('.avatar-costume-canvas:not([hidden])').count(),0);
    assert.equal(await page.locator('[data-avatar-rig-active]').count(),0);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.waitForFunction(()=>document.querySelector('[data-avatar-motion-active]'));
    await page.evaluate(()=>window.motion.destroy());
    assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
    assert.equal(await page.locator('.avatar-costume-canvas').count(),0);
    assert.deepEqual(errors,[]);
    report.push({width,activeLimit:2,hiddenPaused:true,reducedMotion:true,controlsAccessible:true,cleanup:true});
    await page.close();
  }
  const {page:low} = await pageFor(320,html,true);
  assert.equal(await low.locator('[data-avatar-motion-active]').count(),0);
  await low.close();
  const {page:failed,errors:failedErrors}=await pageFor(320,html,false,true);
  await failed.waitForFunction(()=>document.querySelector('[data-avatar-rig-failed]'));
  assert.equal(await failed.locator('canvas').count(),0);
  assert.equal(await failed.locator('[data-avatar-art]').first().evaluate(e=>getComputedStyle(e).opacity),'1');
  await failed.locator('#action').tap();assert.deepEqual(failedErrors,[]);
  await failed.close();
  const session={gender:'female',game:{stats:{lvl:24,currentExp:0,needExp:100},equipmentStats:{},inventory:{sp:100,gold:1000,equipment:{items:[]},materials:{}},gameClass:{stats:{name:'elvenMystic',attack:100,defence:50,speed:60,hp:100,maxHp:100,mp:100,maxMp:100,cp:100,maxCp:100,accuracy:20,evasion:15,criticalChance:5,criticalDamage:1.5},skills:[]},effects:[],passives:{},clanPerks:{}}};
  const state=getCharacterState(session);state.player.race='elf';state.player.gender='female';state.player.className='elvenMystic';
  const styles=[...fs.readFileSync(path.join(root,'index.html'),'utf8').matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>`<link rel="stylesheet" href="${m[1]}">`).join('');
  for (const width of [320,1100]) {
    const actual=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<button id="opener">Персонаж</button><script type="module">import {openCharacterPage} from '/character.js';document.querySelector('#opener').focus();await openCharacterPage({api:async()=>(${JSON.stringify(state)}),haptic:()=>{}},'equipment');window.ready=true;</script>`;
    const {page,errors}=await pageFor(width,actual);
    await page.waitForFunction(()=>document.querySelector('.character-doll[data-avatar-motion-active]'));
    await page.locator('[data-character-slot="head"]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-avatar-motion-active]'));
    await page.locator('dialog [data-dismiss]').click();
    await page.waitForFunction(()=>document.querySelector('[data-avatar-motion-active]'));
    await page.locator('[data-character-tab="stats"]').click();
    assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
    await page.locator('[data-character-tab="equipment"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-avatar-motion-active]'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('.overlay-close').click();
    await page.locator('.character-overlay').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
    assert.deepEqual(errors,[]);
    report.push({width,character:true,popupPaused:true,tabPaused:true,closePaused:true});
    await page.close();
  }
  const inventory=getInventoryState(session);
  inventory.player={...inventory.player,race:'elf',gender:'female',className:'elvenMystic'};
  for (const width of [320,1100]) {
    const actual=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<script type="module">import {openInventoryGame} from '/inventory.js';await openInventoryGame({api:async()=>(${JSON.stringify(inventory)}),haptic:()=>{},renderState:()=>{},statusElement:document.createElement('span')});window.ready=true;</script>`;
    const {page,errors}=await pageFor(width,actual);
    await page.waitForFunction(()=>document.querySelector('.inventory-figure[data-avatar-motion-active]'));
    const slot=page.locator('[data-gear-slot]').first();
    await slot.focus();
    assert.equal(await slot.evaluate(e=>e===document.activeElement),true);
    await slot.tap();
    await page.waitForFunction(()=>!document.querySelector('[data-avatar-motion-active]'));
    await page.locator('dialog [data-dismiss]').click();
    await page.waitForFunction(()=>document.querySelector('[data-avatar-motion-active]'));
    assert.equal(await page.locator('[data-gear-slot]').count(),19);
    assert.equal(await page.locator('.inventory-discard').isDisabled(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`${output}/inventory-motion-${width}.png`});
    await page.locator('.overlay-close').click();
    await page.locator('.inventory-overlay').waitFor({state:'detached'});
    assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
    assert.deepEqual(errors,[]);
    report.push({width,inventory:true,touch:true,disabled:true,focus:true,closePaused:true});
    await page.close();
  }
} finally {await browser.close();}
fs.writeFileSync(`${output}/motion-review.json`,JSON.stringify({lowPowerStatic:true,checks:report},null,2)+'\n');
console.log(JSON.stringify(report));
