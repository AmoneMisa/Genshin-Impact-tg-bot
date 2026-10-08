import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldRedirectCommand } from '../miniapp/launcher.js';

const options = { adminPatterns: [/^\/add_gold(?:@\w+)?(?: .*)?$/], botUsername: 'GameBot' };

test('player text commands are answered with the launcher', () => {
  for (const text of ['/start', '/help', '/games', '/boss', '/arena@GameBot', '/settings']) {
    assert.equal(shouldRedirectCommand(text, options), true, text);
  }
});

test('/play, owner commands, other bots and plain text are left alone', () => {
  assert.equal(shouldRedirectCommand('/play', options), false);
  assert.equal(shouldRedirectCommand('/play@GameBot', options), false);
  assert.equal(shouldRedirectCommand('/add_gold 100', options), false);
  assert.equal(shouldRedirectCommand('/boss@OtherBot', options), false);
  assert.equal(shouldRedirectCommand('hello /boss', options), false);
  assert.equal(shouldRedirectCommand(undefined, options), false);
});
