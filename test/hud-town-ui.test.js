import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createMiniAppState } from '../miniapp/state.js';
import { CLASS_SIGILS, renderPlayerHud } from '../webapp/hud.js';

const root = process.cwd();

function hudElements() {
  const ids = [
    'hello', 'level', 'class-name', 'class-sigil', 'chat-badge', 'arena-text',
    'hp-text', 'hp-fill', 'mp-text', 'mp-fill', 'cp-text', 'cp-fill',
    'sp-text', 'xp-text', 'xp-fill',
  ];
  return Object.fromEntries(ids.map(id => [id, { textContent: '', style: {} }]));
}

test('bootstrap exposes real MMO HUD resources from combat stats and inventory', () => {
  const session = {
    game: {
      stats: { lvl: 18, currentExp: 420, needExp: 1000 },
      inventory: { gold: 50, crystals: 3, ironOre: 7, sp: 980 },
      gameClass: {
        stats: {
          name: 'warrior',
          translateName: 'Паладин',
          hp: 4128,
          maxHp: 5000,
          mp: 267,
          maxMp: 400,
          cp: 420,
          maxCp: 550,
          attack: 2,
          defence: 4,
        },
      },
    },
  };

  const state = createMiniAppState(session, {
    chatId: -1001,
    chatType: 'supergroup',
    user: { id: 7, first_name: 'Rita' },
  });

  assert.equal(state.player.classTitle, 'Паладин');
  assert.equal(state.player.hp, 4128);
  assert.equal(state.player.maxHp, 5000);
  assert.equal(state.player.mp, 267);
  assert.equal(state.player.maxMp, 400);
  assert.equal(state.player.cp, 420);
  assert.equal(state.player.maxCp, 550);
  assert.equal(state.player.sp, 980);
});

test('HUD renderer maps combat values to labels and proportional bars', () => {
  const elements = hudElements();
  const state = {
    context: { chatId: -1001, chatType: 'supergroup', user: { id: 7, firstName: 'Rita' } },
    player: {
      level: 18,
      className: 'warrior',
      classTitle: 'Паладин',
      hp: 75,
      maxHp: 100,
      mp: 50,
      maxMp: 200,
      cp: 30,
      maxCp: 60,
      sp: 980,
      currentExp: 42,
      needExp: 100,
      arenaChances: 3,
    },
  };

  renderPlayerHud({
    state,
    getElement: id => elements[id],
    formatNumber: value => String(value),
  });

  assert.equal(elements['class-name'].textContent, 'Паладин');
  assert.equal(elements['class-sigil'].textContent, CLASS_SIGILS.warrior);
  assert.equal(elements['hp-text'].textContent, '75 / 100');
  assert.equal(elements['hp-fill'].style.width, '75%');
  assert.equal(elements['mp-fill'].style.width, '25%');
  assert.equal(elements['cp-fill'].style.width, '50%');
  assert.equal(elements['sp-text'].textContent, '980');
  assert.equal(elements['xp-fill'].style.width, '42%');
});

test('HUD and town styles are wired before the final design-system layer', () => {
  const index = fs.readFileSync(path.join(root, 'webapp/index.html'), 'utf8');
  const stylesheets = [...index.matchAll(/href="\/([^"]+\.css)"/g)].map(match => match[1]);
  assert.ok(stylesheets.includes('hud.css'));
  assert.ok(stylesheets.includes('town.css'));
  assert.ok(stylesheets.indexOf('hud.css') < stylesheets.indexOf('design-system.css'));
  assert.ok(stylesheets.indexOf('town.css') < stylesheets.indexOf('design-system.css'));
  assert.equal(stylesheets.at(-1), 'design-system.css');
});

test('town screen gives key buildings stable landmark positions and responsive fallback', () => {
  const town = fs.readFileSync(path.join(root, 'webapp/town.css'), 'utf8');
  for (const building of ['palace', 'academy', 'forge', 'goldMine', 'crystalLake', 'traineeArea', 'ironDeposit']) {
    assert.ok(town.includes(`[data-build-card="${building}"]`), `${building} landmark style is missing`);
  }
  assert.ok(town.includes('@media (min-width: 600px)'));
  assert.ok(town.includes('@media (max-width: 599px)'));
  assert.ok(town.includes('town-build-shine'));
});
