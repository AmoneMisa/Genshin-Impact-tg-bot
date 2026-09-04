import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLine } from '../functions/llm/freeLlmClient.js';

test('normalizeLine collapses whitespace and keeps one sentence', () => {
  assert.equal(
    normalizeLine('  ♈ Овен: первая строка.\nВторая строка не нужна.  ', 120),
    '♈ Овен: первая строка.'
  );
});

test('normalizeLine clamps long text without throwing', () => {
  const result = normalizeLine(`Предсказание ${'очень '.repeat(40)}`, 80);
  assert.ok(result.length <= 80);
  assert.ok(result.endsWith('…'));
});
