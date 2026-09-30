import test from 'node:test';
import assert from 'node:assert/strict';
import { createLoader } from '../webapp/loading.js';

// Minimal DOM stand-in: the loader only needs createElement, classList,
// setAttribute, innerHTML, querySelector and body.appendChild.
function fakeDocument() {
  const appended = [];
  const doc = {
    appended,
    body: { appendChild: node => appended.push(node) },
    createElement() {
      const classes = new Set();
      const label = { textContent: '' };
      return {
        classes, label,
        className: '', innerHTML: '',
        setAttribute() {},
        addEventListener() {},
        querySelector: () => label,
        classList: {
          add: (...names) => names.forEach(n => classes.add(n)),
          remove: (...names) => names.forEach(n => classes.delete(n)),
          toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)),
          contains: name => classes.has(name),
        },
      };
    },
  };
  return doc;
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

test('fast opens never show the veil and return the task result', async () => {
  const doc = fakeDocument();
  const loader = createLoader(doc, { delay: 40 });
  assert.equal(await loader.run('Открываем…', async () => 'opened'), 'opened');
  await wait(60);
  assert.equal(doc.appended.length, 0);
  assert.equal(loader.busy, false);
});

test('slow opens show the labelled veil and hide it when done', async () => {
  const doc = fakeDocument();
  const loader = createLoader(doc, { delay: 10 });
  const running = loader.run('Открываем: Босс…', () => wait(50));
  assert.equal(loader.busy, true);
  await wait(25);
  const veil = doc.appended[0];
  assert.ok(veil.classes.has('on'));
  assert.equal(veil.label.textContent, 'Открываем: Босс…');
  await running;
  assert.equal(veil.classes.has('on'), false);
  assert.equal(loader.busy, false);
});

test('failures still hide the veil, and error() shows a dismissible card', async () => {
  const doc = fakeDocument();
  const loader = createLoader(doc, { delay: 1, errorMs: 20 });
  await assert.rejects(loader.run('x', async () => { await wait(10); throw new Error('boom'); }), /boom/);
  assert.equal(loader.busy, false);
  loader.error('Босс: не удалось открыть');
  const veil = doc.appended[0];
  assert.ok(veil.classes.has('on') && veil.classes.has('error'));
  await wait(35);
  assert.equal(veil.classes.has('on'), false);
});
