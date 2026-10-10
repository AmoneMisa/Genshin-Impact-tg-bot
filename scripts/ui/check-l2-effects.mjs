import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE||'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.DESIGN_BROWSER});
try{
 for(const width of [320,390,1100]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.resolve('docs/l2-effects-preview.html')).href);
  const decode=()=>page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
  await decode();assert.equal(await page.locator('article').count(),120);
  const first=await page.locator('article').first().getAttribute('data-id');
  await page.locator('#next').click();await decode();assert.notEqual(await page.locator('article').first().getAttribute('data-id'),first);
  await page.locator('#search').fill('1068');assert.equal(await page.locator('article[data-id="1068"]').count(),1);await decode();
  await page.locator('#search').fill('');await page.locator('#group').selectOption({label:'Песни'});assert.ok(await page.locator('article').count()>0);await decode();
  await page.locator('#group').selectOption({label:'Танцы'});assert.ok(await page.locator('article').count()>0);await decode();
  await page.locator('#group').selectOption({label:'Питомцы'});assert.ok(await page.locator('article').count()>=26);await decode();
  await page.locator('#group').selectOption('');await page.locator('#art').selectOption('no');assert.equal(await page.locator('article img').count(),0);assert.ok(await page.locator('.missing').count()>0);
  await page.locator('#art').selectOption('');await decode();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  assert.deepEqual(errors,[]);
  if(width===390){await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'docs/l2-effects-gallery-390.png',fullPage:false});}
  await page.close();console.log(`High Five catalogue: filters, paging, images and width ${width}px verified.`);
 }
}finally{await browser.close();}
