import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {worldBossList} from '../../functions/game/boss/epicBosses.js';
const require = createRequire(path.resolve(process.env.PLAYWRIGHT_PACKAGE || 'package.json'));
const {chromium} = require('playwright');
const browser = await chromium.launch({headless: true, executablePath: process.env.DESIGN_BROWSER});
const root = path.resolve('webapp');
const bosses = worldBossList();
try {
  for (const width of [320, 390]) {
    const page = await browser.newPage({viewport: {width, height: 844}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/fixture.html') return route.fulfill({contentType: 'text/html', body: '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/boss.css"><link rel="stylesheet" href="/forge.css"><div id="status"></div>'});
      const file = path.resolve(root, '.' + url.pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status: 404});
      return route.fulfill({contentType: ({'.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png'})[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file)});
    });
    await page.goto('http://127.0.0.1:4321/fixture.html');
    await page.evaluate(async bosses => {
      const {openBossGame} = await import('/boss.js');
      await openBossGame({api: async url => url === '/api/boss/epic' ? {bosses} : {active: false, player: {level: 80}}, renderState() {}, haptic() {}, statusElement: document.querySelector('#status')});
    }, bosses);
    await page.locator('[data-epic-open]').click();
    await page.locator('[data-epic-all]').click();
    assert.equal(await page.locator('.epic-boss-image').count(), bosses.filter(boss => boss.image).length);
    await page.locator('[data-epic-search]').fill('Фре');
    assert.equal(await page.locator('.epic-boss-image').count(), 2);
    await page.locator('.epic-boss-image').evaluateAll(nodes => Promise.all(nodes.map(node => node.decode())));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    if (width === 390) await page.screenshot({path: 'docs/l2-bosses-390.png', fullPage: true, animations: 'disabled'});
    await page.evaluate(async () => {
      const {createBossStage} = await import('/boss-stage.js');
      const host = document.createElement('div'); document.body.append(host);
      const stage = createBossStage(host, {name: 'Emerald Horn'});
      await host.querySelector('img').decode();
      stage.destroy(); host.remove();
    });
    await page.close();
    console.log(`Original boss art verified at ${width}px`);
  }
} finally { await browser.close(); }
