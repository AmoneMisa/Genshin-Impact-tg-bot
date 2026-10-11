import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import {once} from 'node:events';
import {bundlePageAssets} from '../miniapp/pageAssets.js';
import {requestBoundary,requestUrl} from '../miniapp/requestBoundary.js';
import {L2_UI_ART as full,l2IconUrl as fullUrl} from '../webapp/art/l2-icon-art.js';
import {L2_UI_ART as tiny,l2IconUrl as tinyUrl} from '../webapp/art/l2-ui-art.js';

test('malformed Host and request URLs never escape the HTTP boundary; server stays available', async () => {
  const server = http.createServer(requestBoundary(async (req,res) => {
    const url = requestUrl(req);
    if (url.pathname === '/failure') throw new Error('test failure');
    res.end('ok');
  },res => {res.writeHead(500);res.end('error');}));
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const request = path => new Promise((resolve,reject) => {
    http.get({host:'127.0.0.1',port:server.address().port,path,headers:{host:'['}},res => {
      res.resume();res.on('end',()=>resolve(res.statusCode));
    }).on('error',reject);
  });
  try {
    assert.equal(await request('/health'),200);
    assert.equal(await request('http://['),400);
    assert.equal(await request('/failure'),500);
    assert.equal(await request('/health'),200);
  } finally {await new Promise(resolve => server.close(resolve));}
});

test('startup CSS excludes feature styles; deferred bundle preserves their original cascade', () => {
  const html = fs.readFileSync('webapp/index.html','utf8');
  const result = bundlePageAssets(html, file => fs.readFileSync(`webapp${file}`,'utf8'));
  const [initial,deferred] = result.bundles;
  assert.ok(initial.css.length < deferred.css.length / 2);
  assert.equal(initial.files.includes('/boss.css'),false);
  assert.equal(initial.files.at(-1),'/design-system.css');
  assert.equal(deferred.files.at(-1),'/design-system.css');
  assert.deepEqual(deferred.files,[...html.matchAll(/<link rel="stylesheet" href="([^\"]+)"/g)].map(m=>m[1]));
  assert.ok(result.html.includes(`content="${deferred.path}"`));
  assert.equal([...result.html.matchAll(/<link rel="stylesheet"/g)].length,1);
});

test('small UI atlas resolves exactly the same published icons as the full item catalog', () => {
  assert.deepEqual(tiny,full);
  for (const key of Object.values(full)) for (const size of [128,256,512,13]) assert.equal(tinyUrl(key,size),fullUrl(key,size));
  assert.equal(tinyUrl('../private'),null);
});
