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
