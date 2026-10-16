import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import { staticModuleGraph, optimizeScripts } from '../miniapp/pageAssets.js';
import { pickEncoding, sendCompressed } from '../miniapp/http/compression.js';

const modules = {
  '/app.js': "import { a } from './lib/a.js';\nimport '/side.js';\nconst lazy = () => import('./lazy.js');",
  '/lib/a.js': "export { b } from '../b.js';\nexport const a = 1;",
  '/b.js': 'export const b = 2;',
  '/side.js': '',
  '/lazy.js': 'export const lazy = true;',
};
const read = url => { if (!(url in modules)) throw new Error('missing'); return modules[url]; };

test('the static import graph follows relative imports and skips dynamic ones', () => {
  assert.deepEqual(staticModuleGraph('/app.js', read), ['/app.js', '/lib/a.js', '/side.js', '/b.js']);
});

test('the page preloads every static module and defers the Telegram script', () => {
  const html = '<head><script src="https://telegram.org/js/telegram-web-app.js?59"></script>\n<script type="importmap">{}</script></head><body><script type="module" src="/app.js"></script></body>';
  const out = optimizeScripts(html, read);
  assert.equal((out.match(/rel="modulepreload"/g) || []).length, 4);
  assert.ok(out.indexOf('modulepreload') < out.indexOf('type="importmap"'), 'hints precede the import map');
  assert.match(out, /<script defer src="https:\/\/telegram\.org\/js\/telegram-web-app\.js\?59"><\/script>/);
  assert.equal(optimizeScripts('<body></body>', read), '<body></body>');
});

test('the best accepted encoding wins', () => {
  assert.equal(pickEncoding({ headers: { 'accept-encoding': 'gzip, deflate, br' } }), 'br');
  assert.equal(pickEncoding({ headers: { 'accept-encoding': 'gzip' } }), 'gzip');
  assert.equal(pickEncoding({ headers: { 'accept-encoding': 'identity' } }), null);
  assert.equal(pickEncoding({ headers: {} }), null);
});

test('compressed bodies round-trip and are cached per encoding', async () => {
  const send = async encoding => {
    let reads = 0, written;
    const res = { destroyed: false, writeHead(status, headers) { this.status = status; this.headers = headers; }, end(body) { written = body; } };
    await sendCompressed(res, {}, encoding, 'test-key', () => { reads++; return 'x'.repeat(2000); });
    return { res, written, reads };
  };
  const br = await send('br'), gz = await send('gzip');
  assert.equal(zlib.brotliDecompressSync(br.written).toString(), 'x'.repeat(2000));
  assert.equal(zlib.gunzipSync(gz.written).toString(), 'x'.repeat(2000));
  assert.equal(br.res.headers['content-encoding'], 'br');
  assert.equal((await send('br')).reads, 0, 'second request is served from the cache');
});

import fs from 'node:fs';
import vm from 'node:vm';
import { renderShell, inlineHeadScript } from '../miniapp/ssrShell.js';
import { takeEarly } from '../webapp/early-data.js';

test('the bottom navigation is rendered on the server, without the player-specific dots', () => {
  const html = '<nav id="bottom-nav" class="bottom-nav" aria-label="Разделы"></nav>';
  const out = renderShell(html);
  assert.equal((out.match(/data-nav-tab=/g) || []).length, 6);
  assert.match(out, /data-nav-tab="city"[^>]*aria-pressed="true"/);
  assert.doesNotMatch(out, /red-dot/);
  assert.equal(renderShell('<main></main>'), '<main></main>');
});

test('the early fetch script is inlined first in <head> and cannot close its own tag', () => {
  const out = inlineHeadScript('<head><meta charset="UTF-8" /><title>x</title></head>', '// note\nvar a = "</script>";');
  assert.ok(out.indexOf('<script>') < out.indexOf('<title>'));
  assert.ok(!out.includes('// note'));
  assert.ok(!out.slice(out.indexOf('<script>') + 8).split('</script>')[0].includes('</script'));
});

function runEarlyFetch({ hash, stored = null }) {
  const calls = [];
  const sandbox = {
    location: { hash }, localStorage: { getItem: () => stored }, URLSearchParams, JSON, String, Promise, Error,
    AbortSignal: { timeout: () => 'signal' },
    fetch: (path, options) => { calls.push({ path, headers: options.headers }); return Promise.resolve({ ok: true, json: async () => ({ path }) }); },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(fs.readFileSync(new URL('../webapp/early-fetch.js', import.meta.url), 'utf8'), sandbox);
  return { calls, early: sandbox.__early };
}

test('the early fetch asks for bootstrap and builds with the init data from the URL hash', async () => {
  const initData = 'query_id=1&user=' + encodeURIComponent('{"id":7,"language_code":"uz-UZ"}') + '&hash=abc';
  const { calls, early } = runEarlyFetch({ hash: '#tgWebAppData=' + encodeURIComponent(initData) + '&tgWebAppVersion=8' });
  assert.deepEqual(calls.map(call => call.path), ['/api/bootstrap', '/api/builds']);
  assert.equal(calls[0].headers['x-telegram-init-data'], initData);
  assert.equal(calls[0].headers['x-app-lang'], 'uz', 'Telegram language when nothing is stored');
  assert.deepEqual(await early.requests['/api/builds'], { path: '/api/builds' });
  assert.equal(runEarlyFetch({ hash: '#tgWebAppData=' + encodeURIComponent(initData), stored: 'ru' }).calls[0].headers['x-app-lang'], 'ru', 'a stored choice wins');
  assert.equal(runEarlyFetch({ hash: '' }).calls.length, 0, 'outside Telegram nothing is requested');
});

test('an early answer is used once, and only for the same player and language', () => {
  const scope = () => ({ initData: 'd', lang: 'ru', requests: { '/api/bootstrap': Promise.resolve(1) } });
  const a = scope();
  assert.ok(takeEarly('/api/bootstrap', {}, 'd', 'ru', a));
  assert.equal(takeEarly('/api/bootstrap', {}, 'd', 'ru', a), null, 'one-shot');
  assert.equal(takeEarly('/api/bootstrap', {}, 'other', 'ru', scope()), null);
  assert.equal(takeEarly('/api/bootstrap', {}, 'd', 'uz', scope()), null);
  assert.equal(takeEarly('/api/bootstrap', { method: 'POST', body: '{}' }, 'd', 'ru', scope()), null);
  assert.equal(takeEarly('/api/bootstrap', {}, 'd', 'ru', undefined), null);
});
