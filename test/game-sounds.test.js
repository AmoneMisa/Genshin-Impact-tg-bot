import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const audio = readFileSync(new URL('../webapp/audio.js', import.meta.url), 'utf8');
const effects = new Set([...audio.matchAll(/^ {2}(\w+): /gm)].map(match => match[1]));
const clientFiles = new Set([...audio.matchAll(/FROM_CLIENT = \{([^}]*)\}/g)][0][1].split(',').map(entry => entry.split(':')[0].trim()));
const known = name => effects.has(name) || clientFiles.has(name);
const used = file => [...readFileSync(new URL(`../webapp/${file}`, import.meta.url), 'utf8').matchAll(/\bsfx\('(\w+)'\)|\bat\(\d+, '(\w+)'\)|\bat\(\d+, [^'`]*? \? '(\w+)' : [^'`]*?'(\w+)'\)/g)].flatMap(match => match.slice(1).filter(Boolean));

test('every sound the games ask for exists in the sound bank', () => {
  for (const file of ['dice-game.js', 'arcade-stage.js', 'arcade.js', 'elements.js', 'gwent.js', 'point21.js']) {
    for (const name of used(file)) assert.ok(known(name), `${file} plays "${name}" which audio.js does not have`);
  }
});

test('the sport sounds a throw can schedule are all there', () => {
  const stage = readFileSync(new URL('../webapp/arcade-stage.js', import.meta.url), 'utf8');
  const names = [...stage.matchAll(/'(dartThrow|swish|rim|ballBounce|kick|goal|miss|dartHit|bullseye|pinRoll|strike|pinsCrash|reelSpin|reelStop|jackpot|diceShake|diceLand)'/g)].map(match => match[1]);
  assert.ok(names.length >= 15);
  for (const name of names) assert.ok(effects.has(name), name);
});

test('every recorded game sound has its file and the licence files are kept', async () => {
  const { existsSync } = await import('node:fs');
  const list = audio.match(/const GAME_FILES = new Set\(\[([^\]]*)\]\)/)[1].match(/'(\w+)'/g).map(name => name.slice(1, -1));
  assert.ok(list.length >= 19);
  for (const name of list) {
    assert.ok(existsSync(new URL(`../webapp/audio/games/${name}.ogg`, import.meta.url)), `${name}.ogg is missing`);
    assert.ok(effects.has(name) || clientFiles.has(name), `${name} has no synthesised fallback`);
  }
  for (const file of ['LICENSE-casino-audio.txt', 'LICENSE-impact-sounds.txt', 'README.txt']) assert.ok(existsSync(new URL(`../webapp/audio/games/${file}`, import.meta.url)), file);
});
