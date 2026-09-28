import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { forgeMilestoneProfile, renderForgeLootArt } from '../webapp/loot-forge.js';

const root = process.cwd();
const base = {
  name: 'Starforged Edge',
  kind: 'twoHandedSword',
  category: 'sword',
  mainType: 'weapon',
  grade: 'S',
  rarity: 'rare',
  cost: 120000,
  maxForgeLevel: 10,
  quality: { current: 94, max: 100 },
  persistence: { current: 188, max: 190 },
};

test('forge milestones trigger only on the actual +5 and max-level transitions', () => {
  assert.deepEqual(forgeMilestoneProfile({ ...base, forgeLevel: 5 }, 4), {
    milestone: 'breakthrough', previous: 4, level: 5, maxLevel: 10, increased: true,
  });
  assert.deepEqual(forgeMilestoneProfile({ ...base, forgeLevel: 10 }, 9), {
    milestone: 'ascendant', previous: 9, level: 10, maxLevel: 10, increased: true,
  });
  assert.equal(forgeMilestoneProfile({ ...base, forgeLevel: 4 }, 3).milestone, 'none');
  assert.equal(forgeMilestoneProfile({ ...base, forgeLevel: 6 }, 5).milestone, 'none');
  assert.equal(forgeMilestoneProfile({ ...base, forgeLevel: 5 }, 5).milestone, 'none');
  assert.equal(forgeMilestoneProfile({ ...base, forgeLevel: 10 }, 10).milestone, 'none');
});

test('max milestone follows the actual maxForgeLevel instead of a hardcoded ten', () => {
  const custom = { ...base, forgeLevel: 12, maxForgeLevel: 12 };
  const milestone = forgeMilestoneProfile(custom, 11);
  assert.equal(milestone.milestone, 'ascendant');
  assert.equal(milestone.level, 12);
  assert.equal(milestone.maxLevel, 12);
});

test('milestone markup layers on top of a confirmed forge impact only', () => {
  const breakthrough = renderForgeLootArt({ ...base, forgeLevel: 5 }, { reveal: true, forgeImpact: true, previousLevel: 4 });
  assert.match(breakthrough, /is-forge-milestone forge-milestone-breakthrough-state/);
  assert.match(breakthrough, /data-forge-milestone="breakthrough"/);
  assert.match(breakthrough, /forge-milestone-breakthrough/);
  assert.match(breakthrough, /ПРОРЫВ · \+5/);
  assert.match(breakthrough, /forge-impact-blade/);

  const ascendant = renderForgeLootArt({ ...base, forgeLevel: 10 }, { reveal: true, forgeImpact: true, previousLevel: 9 });
  assert.match(ascendant, /forge-milestone-ascendant-state/);
  assert.match(ascendant, /data-forge-milestone="ascendant"/);
  assert.match(ascendant, /forge-milestone-crown/);
  assert.match(ascendant, /forge-milestone-beam/);
  assert.match(ascendant, /МАКСИМУМ · \+10/);

  const reopened = renderForgeLootArt({ ...base, forgeLevel: 10 }, { reveal: true });
  assert.match(reopened, /data-forge-milestone="none"/);
  assert.doesNotMatch(reopened, /is-forge-milestone/);
  assert.doesNotMatch(reopened, /forge-milestone-crown/);
});

test('milestone stylesheet is layered after type impact and remains mobile/reduced-motion safe', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(root, 'webapp/loot-forge-milestone.css'), 'utf8');
  const sheets = [...index.matchAll(/href="\/([^\"]+\.css)"/g)].map(match => match[1]);

  assert.ok(sheets.includes('loot-forge-milestone.css'));
  assert.ok(sheets.indexOf('loot-forge.css') < sheets.indexOf('loot-forge-impact.css'));
  assert.ok(sheets.indexOf('loot-forge-impact.css') < sheets.indexOf('loot-forge-milestone.css'));
  assert.ok(sheets.indexOf('loot-forge-milestone.css') < sheets.indexOf('vfx.css'));
  assert.equal(sheets.at(-1), 'design-system.css');

  assert.ok(css.includes('.forge-milestone-breakthrough'));
  assert.ok(css.includes('.forge-milestone-ascendant'));
  assert.ok(css.includes('@keyframes forge-breakthrough-ring'));
  assert.ok(css.includes('@keyframes forge-ascendant-halo'));
  assert.ok(css.includes('@media(max-width:390px)'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
  assert.ok(css.includes('pointer-events:none'));
});
