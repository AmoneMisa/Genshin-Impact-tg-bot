import test from 'node:test';
import assert from 'node:assert/strict';
import { getChestState, openChest } from '../miniapp/chest.js';

function sessionTemplate() {
  return {
    chestTries: 1,
    chestCounter: 0,
    chosenChests: [],
    chestButtons: [],
    sword: 0,
    immuneToUpSword: false,
    game: {
      inventory: {
        gold: 0,
        crystals: 0,
      },
      stats: {
        currentExp: 0,
        needExp: 1500,
        lvl: 1,
      },
    },
  };
}

test('reports chest availability', () => {
  const session = sessionTemplate();
  assert.deepEqual(getChestState(session), {
    available: true,
    tries: 1,
    opened: [],
    selectionsLeft: 3,
  });
});

test('rejects duplicate chest selection', () => {
  const session = sessionTemplate();
  const first = openChest(session, -100123, 1);
  assert.equal(first.ok, true);

  const duplicate = openChest(session, -100123, 1);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, 'already_opened');
  assert.equal(session.chestCounter, 1);
});

test('consumes daily chest try after three unique picks', () => {
  const session = sessionTemplate();

  assert.equal(openChest(session, -100123, 1).ok, true);
  assert.equal(openChest(session, -100123, 2).ok, true);
  const third = openChest(session, -100123, 3);

  assert.equal(third.ok, true);
  assert.equal(third.completed, true);
  assert.equal(session.chestTries, 0);
  assert.equal(session.chestCounter, 0);
  assert.deepEqual(session.chosenChests, []);
});

test('rejects opening when daily try is unavailable', () => {
  const session = sessionTemplate();
  session.chestTries = 0;

  const result = openChest(session, -100123, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'cooldown');
});

test('validates chest id range', () => {
  const session = sessionTemplate();
  assert.throws(() => openChest(session, -100123, 0), /integer from 1 to 9/);
  assert.throws(() => openChest(session, -100123, 10), /integer from 1 to 9/);
});
