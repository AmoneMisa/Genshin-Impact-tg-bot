import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.env.ITEM_ART_PLAYWRIGHT).href);
const browser=await chromium.launch({headless:true,executablePath:process.env.ITEM_ART_BROWSER});
try {
  for(const width of [390,1100]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'no-preference'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4328/');await page.waitForFunction(()=>window.previewReady);
    await page.waitForTimeout(250);
    const before=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL()));
    await page.waitForTimeout(1500);
    const after=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL()));
    assert.equal(before.length,2);before.forEach((data,i)=>assert.notEqual(data,after[i]));
    await page.locator('#play').click();
    const paused=await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL()));
    await page.waitForTimeout(200);
    assert.deepEqual(await page.locator('canvas').evaluateAll(nodes=>nodes.map(n=>n.toDataURL())),paused);
    await page.locator('#still').click();assert.equal(await page.locator('canvas:not([hidden])').count(),0);
    await page.locator('#still').click();await page.locator('#play').click();
    assert.equal(await page.locator('#costume option').count(),234);
    await page.getByRole('combobox',{name:'Готовый образ'}).click();
    await page.getByRole('option',{name:'Звёздный картограф — Человек, женский',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.preview-figure img').src.includes('celestial-cartographer-human-female')&&document.querySelectorAll('canvas').length===2);
    await page.waitForTimeout(200);
    assert.equal(await page.locator('canvas').count(),2,'Switch must release the previous canvas');
    await page.getByRole('combobox',{name:'Готовый образ'}).click();await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('combobox',{name:'Готовый образ'}).getAttribute('aria-expanded'),'false');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`art-source/avatars/motion-review/rigid-live-preview-${width}.png`});
    await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.querySelector('canvas:not([hidden])'));
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Live motion preview: 390/1100, moving frames, pause, static comparison, reduced motion, no overflow.');
}finally{await browser.close();}
