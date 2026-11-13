import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('the proxy key is read from its key file once the proxy has created it', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'freellm-'));
  const file = path.join(dir, 'unified.key');
  const saved = {key: process.env.FREE_LLM_API_KEY, file: process.env.FREE_LLM_API_KEY_FILE, fetch: globalThis.fetch};
  delete process.env.FREE_LLM_API_KEY;
  process.env.FREE_LLM_API_KEY_FILE = file;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push(options.headers.authorization); return {ok: true, json: async () => ({choices: [{message: {content: '♍ Дева: Звёзды на связи.'}}]})}; };
  try {
    const {generateFunnyLine} = await import(`../functions/llm/freeLlmClient.js?case=${Date.now()}`);
    const before = await generateFunnyLine({fallbacks: ['A', 'B'], avoid: 'A'});
    assert.equal(before, 'B', 'without a key the previous prepared line is not repeated');
    assert.equal(calls.length, 0);
    fs.writeFileSync(file, 'freellmapi-test-key\n');
    const after = await generateFunnyLine({fallbacks: ['A']});
    assert.equal(after, '♍ Дева: Звёзды на связи.');
    assert.deepEqual(calls, ['Bearer freellmapi-test-key']);
  } finally {
    globalThis.fetch = saved.fetch;
    if (saved.key === undefined) delete process.env.FREE_LLM_API_KEY; else process.env.FREE_LLM_API_KEY = saved.key;
    if (saved.file === undefined) delete process.env.FREE_LLM_API_KEY_FILE; else process.env.FREE_LLM_API_KEY_FILE = saved.file;
    fs.rmSync(dir, {recursive: true, force: true});
  }
});
