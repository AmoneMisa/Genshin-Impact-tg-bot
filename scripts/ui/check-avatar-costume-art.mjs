import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { AVATAR_COSTUME_VARIANTS } from '../../webapp/art/avatar-costume-art.js';
import {avatarCostumeHtml} from '../../webapp/avatar-costume-view.js';
const { chromium } = await import(process.env.ITEM_ART_PLAYWRIGHT ? pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href : 'playwright');

const root=path.resolve('webapp');
const html=`<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/avatar-costume-view.css"><style>
body{margin:0;padding:12px;background:#111725;color:#dcc58c;font:14px sans-serif;box-sizing:border-box}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
figure{margin:0;padding:8px;border:1px solid #444;min-width:0}
img{display:block;width:100%;aspect-ratio:2/3;object-fit:contain}
figcaption{padding:8px 0;overflow-wrap:anywhere}
@media(min-width:380px){main{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(min-width:800px){main{grid-template-columns:repeat(6,minmax(0,1fr))}}
</style><main>${AVATAR_COSTUME_VARIANTS.map(v=>`<figure>${avatarCostumeHtml({id:v.costumeId,src:`/art/avatars/collections/v1/${v.key}-256.webp`,name:v.name})}<figcaption>${v.race}: ${v.name}</figcaption></figure>`).join('')}</main><script type="module">import {installAvatarCostumeMotion} from '/avatar-costume-view.js';installAvatarCostumeMotion();</script></html>`;
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
const report=[];
try {
 for(const width of [320,390,1100]) {
  const page=await browser.newPage({viewport:{width,height:844},isMobile:true,reducedMotion:'reduce'});
  const failed=[];
  page.on('requestfailed',r=>failed.push(r.url()));
  page.on('response',r=>{if(r.status()>=400)failed.push(r.url())});
  await page.route('**/*',route=>{
   const pathname=new URL(route.request().url()).pathname;
   if(pathname==='/')return route.fulfill({contentType:'text/html',body:html});
   const file=path.resolve(root,'.'+pathname);
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://127.0.0.1:4319/');
  await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
  assert.equal(await page.locator('img').count(),AVATAR_COSTUME_VARIANTS.length);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.naturalWidth===256&&getComputedStyle(i).objectFit==='contain')),true);
  assert.deepEqual(failed,[]);
  assert.equal(await page.locator('[data-avatar-motion-active]').count(),0);
  await page.screenshot({path:`art-source/avatars/collections/mobile-review-${width}.png`});
  report.push({width,decoded:AVATAR_COSTUME_VARIANTS.length,overflow:false,reducedMotion:true,brokenUrls:0});
  await page.close();
 }
} finally {await browser.close()}
fs.writeFileSync('art-source/avatars/collections/browser-review.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
