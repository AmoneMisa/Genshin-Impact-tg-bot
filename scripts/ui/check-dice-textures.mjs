import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundlePageAssets } from '../../miniapp/pageAssets.js';
import { assertGameRules } from './assert-game-rules.mjs';

const root = path.resolve('webapp');
const assets = bundlePageAssets(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), file => fs.readFileSync(path.join(root, file.slice(1)), 'utf8'));
const styles = [...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m => m[0]).join('');
const require = createRequire(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json');
const { chromium } = require('playwright');
const browser = await chromium.launch({ headless: true, executablePath: process.env.DESIGN_BROWSER || 'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe' });
const out = path.resolve('output/dice-review');
fs.mkdirSync(out, { recursive: true });
try {
  for (const width of [320, 390, 820]) {
    const page = await browser.newPage({ viewport: { width, height: 960 }, reducedMotion: 'reduce', isMobile: width < 400, hasTouch: width < 400 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname === '/fixture.html') return route.fulfill({ contentType: 'text/html', body: `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body></body>` });
      const bundle = assets.bundles.find(b => b.path === url.pathname);
      if (bundle) return route.fulfill({ contentType: 'text/css', body: bundle.css });
      const file = path.resolve(root, '.' + url.pathname);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404 });
      return route.fulfill({ contentType: ({ '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    await page.goto('http://127.0.0.1:4321/fixture.html');
    await page.evaluate(async () => {
      await (await import('/feature-styles.js')).ensureFeatureStyles();
      (await import('/dice-game.js')).openDiceGame();
    });
    await page.locator('[data-mode="ai"]').click();
    await page.locator('[data-start]').click();
    await page.locator('[data-die]').first().click();
    assert.equal(await page.locator('[data-die="0"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-die="0"]').evaluate(el => el === document.activeElement), true);
    const names = ['единица', 'двойка', 'тройка', 'четвёрка', 'пятёрка', 'шестёрка'];
    for (const die of await page.locator('.dice-die').all()) {
      const label = await die.getAttribute('aria-label');
      assert.equal(await die.locator('.is-pip').count(), names.findIndex(name => label.startsWith(name)) + 1);
      const pip = await die.locator('.is-pip').first().boundingBox();
      assert.ok(pip.width >= 4 && pip.height >= 4, `Invisible pips: ${JSON.stringify(await die.evaluate(el => [...el.querySelectorAll('span')].map(s => ({ cls: s.className, width: getComputedStyle(s).width, height: getComputedStyle(s).height, display: getComputedStyle(s).display }))))}`);
      assert.equal(await die.evaluate(el => getComputedStyle(el).animationName), 'none');
    }
    await page.evaluate(async () => { const image = new Image(); image.src = '/art/dice/bone-face.webp'; await image.decode(); });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('.dice-panel').evaluate(el => el.scrollWidth > el.clientWidth), false);
    await page.locator('[data-reroll]').evaluate(el => { el.disabled = true; });
    assert.equal(await page.locator('[data-reroll]').isDisabled(), true);
    await page.locator('.dice-panel').screenshot({ path: path.join(out, `dice-${width}.png`) });
    await assertGameRules(page, '.dice-panel');
    await page.locator('.dice-panel [data-dismiss]').click();
    await page.locator('.dice-overlay').waitFor({ state: 'detached' });
    // Online opponent's hidden faces must never expose a pip value.
    await page.evaluate(async () => {
      (await import('/dice-game.js')).openDiceGame({ initialInvite: 'fixture', api: async () => ({ match: {
        id: 'fixture', phase: 'throw', round: 1, wins: { me: 0, opponent: 0 }, rolls: 0,
        dice: [1, 2, 3, 4, 5], opponent: 'Соперник', opponentDice: null, opponentRolls: 0
      } }) });
    });
    await page.locator('.dice-die.is-hidden').first().waitFor();
    assert.equal(await page.locator('.dice-die.is-hidden').count(), 5);
    assert.equal(await page.locator('.dice-die.is-hidden .is-pip').count(), 0);
    // Exercise the sixth face and the no-texture fallback with the same component.
    await page.locator('[data-die]').last().evaluate(el => {
      el.style.backgroundImage = 'none';
    });
    assert.equal(await page.locator('[data-die]').last().locator('.is-pip').count(), 6);
    await page.locator('.dice-panel [data-dismiss]').click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(async () => (await import('/dice-game.js')).openDiceGame());
    await page.locator('[data-mode="ai"]').click();
    await page.locator('[data-start]').click();
    assert.equal(await page.locator('.dice-die.rolling').count(), 10);
    assert.equal(await page.locator('[data-reroll]').isDisabled(), true);
    await page.waitForFunction(() => !document.querySelector('.dice-panel[aria-busy]'));
    await page.locator('[data-die="0"]').click();
    const keptFace = await page.locator('[data-dice-key="p0"]').getAttribute('data-face');
    await page.locator('[data-reroll]').click();
    assert.equal(await page.locator('.rolling[data-dice-key^="p"]').count(), 4);
    assert.equal(await page.locator('[data-dice-key="p0"]').getAttribute('data-face'), keptFace);
    assert.equal(await page.locator('[data-dice-key="p0"]').evaluate(el => getComputedStyle(el).transform), 'none');
    await page.evaluate(() => {
      window.diceFaceFrames = new Set();
      window.diceObserver = new MutationObserver(() => {
        const el = document.querySelector('[data-dice-key="p1"]');
        if (el) window.diceFaceFrames.add([...el.querySelectorAll('.ui-dice-pips>span')].map(p => p.className).join('|'));
      });
      window.diceObserver.observe(document.querySelector('.dice-panel'), { attributes: true, subtree: true, attributeFilter: ['class'] });
    });
    await page.waitForFunction(() => !document.querySelector('.dice-panel[aria-busy]'));
    assert.ok(await page.evaluate(() => window.diceFaceFrames.size >= 3), 'faces change while tumbling');
    await page.evaluate(() => window.diceObserver.disconnect());
    for (const die of await page.locator('.dice-die').all()) {
      assert.equal(await die.locator('.is-pip').count(), Number(await die.getAttribute('data-face')) + 1);
    }
    await page.locator('.dice-panel [data-dismiss]').click();
    // Changing the OS preference during a roll must settle immediately.
    await page.evaluate(async () => (await import('/dice-game.js')).openDiceGame());
    await page.locator('[data-mode="ai"]').click();
    await page.locator('[data-start]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.dice-panel[aria-busy]'));
    assert.equal(await page.locator('.rolling').count(), 0);
    await page.locator('[data-die="0"]').click();
    await page.locator('.dice-panel [data-dismiss]').click();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(async () => {
      const view = { id: 'motion-fixture', phase: 'throw', round: 1, wins: { me: 0, opponent: 0 }, rolls: 0,
        dice: [0, 1, 2, 3, 4], opponent: 'Соперник', opponentDice: null, opponentRolls: 0 };
      (await import('/dice-game.js')).openDiceGame({ initialInvite: 'fixture', api: async (url, options) => {
        if (options?.method === 'POST') view.rolls = 1; // Same results still constitute a new throw.
        return { match: structuredClone(view) };
      } });
    });
    await page.waitForFunction(() => document.querySelector('[data-die]') && !document.querySelector('.dice-panel[aria-busy]'));
    await page.locator('[data-die="0"]').click();
    await page.locator('[data-reroll]').click();
    await page.waitForFunction(() => document.querySelectorAll('.rolling[data-dice-key^="p"]').length === 4);
    assert.equal(await page.locator('.is-hidden.rolling').count(), 0);
    assert.equal(await page.locator('[data-dice-key="p0"].rolling').count(), 0);
    // The API completion causes another render; its animation must continue.
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.rolling[data-dice-key^="p"]').count(), 4);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    assert.equal(await page.locator('.rolling').count(), 0);
    assert.equal(await page.locator('.dice-panel[aria-busy]').count(), 0);
    await page.evaluate(() => { delete document.hidden; });
    await page.locator('.dice-panel [data-dismiss]').click();
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`PASS dice textures, live throws, kept dice, online rerenders, hidden tab, reduced motion and layout at ${width}px`);
  }
} finally {
  await browser.close();
}
