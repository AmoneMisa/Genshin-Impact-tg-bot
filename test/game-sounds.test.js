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
