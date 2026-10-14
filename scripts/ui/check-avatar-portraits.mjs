import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {getPlayerProfileState} from '../../miniapp/playerProfile.js';
import getClassStatsFromTemplate from '../../functions/game/player/getters/getGameClassStatsFromTemplate.js';
import {AVATAR_OUTFITS} from '../../webapp/art/avatar-art.js';
import {avatarPortraitUrl} from '../../webapp/art/avatar-portrait-art.js';

const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const root=path.resolve('webapp');
const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
const styles=[...index.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');
const header=index.match(/<header class="top-hud[\s\S]*?<\/header>/)[0];
const base={human:'humanFighter',elf:'elvenMystic',darkElf:'darkMystic',orc:'orcMystic',dwarf:'dwarvenFighter'};
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const requested = new Set(process.argv.slice(2));
const outfits = requested.size ? AVATAR_OUTFITS.filter(outfit => requested.has(outfit.key)) : AVATAR_OUTFITS;
assert.ok(outfits.length, 'Provide reviewed race/gender keys, e.g. dwarf-female');
fs.mkdirSync('docs/avatar-portraits',{recursive:true});
try {
  for(const width of [320,390,1100]) for(const outfit of outfits){
    const className=base[outfit.race]||(outfit.gender==='female'?'femaleSoldier':'maleSoldier');
    const session={gender:outfit.gender,changeClassTimer:Date.now()+86400000,game:{stats:{lvl:24},gameClass:{stats:getClassStatsFromTemplate(className,24)},inventory:{}}};
    const profile=getPlayerProfileState(session);
    const player={className,race:outfit.race,gender:outfit.gender,level:24,classTitle:profile.currentClass.title};
    const html='<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'</head><body><main class="app-shell">'+header+'<button id="open" class="ui-button">Персонаж</button></main><script type="module">import {renderPlayerHud} from "/hud.js";import {openPlayerProfile} from "/profile.js";const player='+JSON.stringify(player)+';let profile='+JSON.stringify(profile)+';renderPlayerHud({state:{player,context:{user:{firstName:"Наряд"}}},getElement:id=>document.getElementById(id),formatNumber:String});await openPlayerProfile({api:async(url,options)=>{if(options){profile={...profile,gender:JSON.parse(options.body).gender};window.changedGender=profile.gender;return {profile};}return profile;},renderState:()=>{},haptic:()=>{},statusElement:document.createElement("div")});window.ready=true;</script></body></html>';
    const page=await browser.newPage({viewport:{width,height:844},deviceScaleFactor:2,isMobile:width<500,reducedMotion:'reduce'});
    const errors=[],failed=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
    await page.route('**/*',route=>{
      const pathname=new URL(route.request().url()).pathname;
      if(pathname==='/')return route.fulfill({contentType:'text/html',body:html});
      const file=path.resolve(root,'.'+pathname);
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
      return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    await page.goto('http://127.0.0.1:4321/');await page.waitForFunction(()=>window.ready);
    await page.locator('.profile-overlay.visible').waitFor();
    assert.ok((await page.locator('.hero-portrait-shell').getAttribute('style')).includes(avatarPortraitUrl(player,128)));
    assert.ok((await page.locator('.profile-hero').getAttribute('style')).includes(avatarPortraitUrl(player,512)));
    await page.evaluate(async()=>{
      const urls=new Set([...document.querySelectorAll('[style]')].flatMap(e=>[...(e.getAttribute('style')||'').matchAll(/url\(['"]?([^'"\)]+)['"]?\)/g)].map(m=>m[1])));
      await Promise.all([...urls].map(url=>{const img=new Image();img.src=url;return img.decode();}));
    });
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.profile-hero-art').evaluate(e=>getComputedStyle(e).animationName),'none');
    const alternate=page.locator('[data-profile-select]:not([aria-current="true"])').first();
    await alternate.click();
    assert.equal(await page.locator('.profile-confirm').isDisabled(),true,'class cooldown stays server controlled');
    const otherGender=outfit.gender==='female'?'male':'female';
    await page.locator('[data-profile-gender="'+otherGender+'"]').click();
    await page.waitForFunction(g=>window.changedGender===g,otherGender);
    await page.waitForFunction(g=>document.querySelector('[data-profile-gender="'+g+'"]').classList.contains('active'),otherGender);
    assert.ok((await page.locator('.profile-hero').getAttribute('style')).includes(avatarPortraitUrl({...player,gender:otherGender},512)));
    await page.locator('[data-profile-gender="'+outfit.gender+'"]').click();
    await page.waitForFunction(g=>document.querySelector('[data-profile-gender="'+g+'"]').classList.contains('active'),outfit.gender);
    await page.locator('.overlay-close').focus();
    assert.equal(await page.locator('.overlay-close').evaluate(e=>e===document.activeElement),true);
    await page.screenshot({path:'docs/avatar-portraits/'+outfit.key+'-'+width+'.png'});
    await page.locator('.overlay-close').click();await page.locator('.profile-overlay').waitFor({state:'detached'});
    assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
    console.log(JSON.stringify({width,portrait:outfit.key,genderSwitch:true,cooldown:true,focus:true,overflow:false}));
    await page.close();
  }
}finally{await browser.close();}
