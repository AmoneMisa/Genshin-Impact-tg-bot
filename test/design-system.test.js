import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
const designSystem = fs.readFileSync(path.join(root, 'webapp/design-system.css'), 'utf8');

test('design system is the final stylesheet so shared primitives win feature-local literals', () => {
  const stylesheets = [...index.matchAll(/href="\/([^"]+\.css)"/g)].map(match => match[1]);
  assert.equal(stylesheets.at(-1), 'design-system.css');
  assert.ok(stylesheets.includes('styles.css'));
  assert.ok(stylesheets.includes('boss.css'));
  assert.ok(stylesheets.includes('social.css'));
});

test('design system exposes semantic tokens and per-mode accents', () => {
  for (const token of [
    '--surface-page',
    '--surface-panel',
    '--surface-card',
    '--surface-control',
    '--border-subtle',
    '--radius-md',
    '--radius-xl',
    '--shadow-panel',
    '--motion-fast',
    '--success-rgb',
    '--danger-rgb',
  ]) {
    assert.ok(designSystem.includes(token), `${token} is missing`);
  }

  for (const hook of [
    '.boss-overlay',
    '.arena-overlay',
    '.equipment-overlay',
    '.gacha-overlay',
    '.point21-overlay',
  ]) {
    assert.ok(designSystem.includes(hook), `${hook} theme hook is missing`);
  }
});

test('design system owns common surfaces, actions, focus and reduced motion', () => {
  for (const selector of [
    '.overlay-panel',
    '.utility-card',
    '.chat-setting-row',
    '.self-mute-card',
    '.equipment-tabs',
    '.arena-tabs',
    '.utility-action',
    '.self-mute-action',
    '.point-primary',
    '.gacha-roll',
    '.arena-attack',
    '.equipment-action.primary',
    '.boss-summon',
    '@media (prefers-reduced-motion: reduce)',
  ]) {
    assert.ok(designSystem.includes(selector), `${selector} normalization is missing`);
  }

  assert.ok(designSystem.includes(':focus-visible'));
  assert.equal(designSystem.includes('!important'), false);
});
