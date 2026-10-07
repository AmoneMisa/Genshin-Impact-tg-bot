import test from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, hashTemplate, hydrateTemplates, replaceInPlace } from '../db/templates.js';
import seedHashes from '../template/seedHashes.js';

const memoryStore = (docs = {}) => ({
  docs,
  get: async key => docs[key] ? structuredClone(docs[key]) : null,
  put: async doc => { docs[doc._id] = structuredClone(doc); },
});

test('every seed template is JSON-safe so it round-trips through Mongo', () => {
  for (const { key, source } of TEMPLATES) {
    assert.equal(hashTemplate(JSON.parse(JSON.stringify(source))), hashTemplate(source), key);
  }
});

test('editing a template file requires a version bump and a new seed hash', () => {
  for (const { key, source } of TEMPLATES) {
    assert.equal(hashTemplate(source), seedHashes[key],
      `template "${key}" changed: bump its version in db/templates.js and run node scripts/templates/hash.mjs > template/seedHashes.js`);
  }
  assert.deepEqual(Object.keys(seedHashes).sort(), TEMPLATES.map(t => t.key).sort());
});

test('hash ignores key order but not values', () => {
  assert.equal(hashTemplate({ a: 1, b: { c: [1, 2] } }), hashTemplate({ b: { c: [1, 2] }, a: 1 }));
  assert.notEqual(hashTemplate({ a: 1 }), hashTemplate({ a: 2 }));
});

test('missing templates are seeded from code and left untouched', async () => {
  const classes = [{ name: 'a', hp: 10 }];
  const store = memoryStore();
  const report = await hydrateTemplates(store, [{ key: 'classes', source: classes, version: 1 }]);
  assert.deepEqual(report.seeded, ['classes']);
  assert.deepEqual(store.docs.classes.data, [{ name: 'a', hp: 10 }]);
  assert.equal(store.docs.classes.seedVersion, 1);
  assert.deepEqual(classes, [{ name: 'a', hp: 10 }]);
});

test('Mongo wins at the same seed version and replaces the module contents in place', async () => {
  const classes = [{ name: 'a', hp: 10 }];
  const held = classes;
  const store = memoryStore({ classes: { _id: 'classes', seedVersion: 1, seedHash: 'x', data: [{ name: 'a', hp: 99 }, { name: 'b', hp: 5 }] } });
  const report = await hydrateTemplates(store, [{ key: 'classes', source: classes, version: 1 }]);
  assert.deepEqual(report.applied, ['classes']);
  assert.equal(held, classes, 'same array object, so existing imports see the new data');
  assert.deepEqual(classes, [{ name: 'a', hp: 99 }, { name: 'b', hp: 5 }]);
  assert.equal(store.docs.classes.data[0].hp, 99, 'Mongo is not overwritten');
});

test('a newer seed version overwrites Mongo; an equal copy is reported unchanged', async () => {
  const builds = { palace: { maxLevel: 30 } };
  const store = memoryStore({ builds: { _id: 'builds', seedVersion: 1, seedHash: 'x', data: { palace: { maxLevel: 5 } } } });
  assert.deepEqual((await hydrateTemplates(store, [{ key: 'builds', source: builds, version: 2 }])).updated, ['builds']);
  assert.deepEqual(store.docs.builds.data, { palace: { maxLevel: 30 } });
  assert.equal(store.docs.builds.seedVersion, 2);
  assert.deepEqual(builds, { palace: { maxLevel: 30 } });
  assert.deepEqual((await hydrateTemplates(store, [{ key: 'builds', source: builds, version: 2 }])).unchanged, ['builds']);
});

test('replaceInPlace handles objects and arrays', () => {
  const object = { a: 1, b: 2 };
  replaceInPlace(object, { c: 3 });
  assert.deepEqual(object, { c: 3 });
  const array = [1, 2, 3];
  replaceInPlace(array, [9]);
  assert.deepEqual(array, [9]);
});
