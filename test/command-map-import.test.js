import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMMAND_MAP,
  SUPERGROUP_COMMANDS,
  buildCommandMapDocuments,
} from '../db/scripts/commandMapImport.js';

test('command map importer writes the schema field supergroupOnly', () => {
  const docs = buildCommandMapDocuments();
  assert.equal(docs.length, Object.keys(COMMAND_MAP).length);

  const byCommand = Object.fromEntries(docs.map(doc => [doc.command, doc]));
  assert.equal(byCommand.boss.supergroupOnly, true);
  assert.equal(byCommand.shop.supergroupOnly, true);
  assert.equal(byCommand.gacha.supergroupOnly, true);
  assert.equal(byCommand.change_gender.supergroupOnly, true);
  assert.equal(byCommand.bonus.supergroupOnly, true);
  assert.equal(byCommand.self_mute.settingKey, 'mute');
  assert.equal(byCommand.self_mute.supergroupOnly, true);

  assert.equal(byCommand.whoami.supergroupOnly, false);
  assert.equal(byCommand.chest.supergroupOnly, false);
  assert.equal(byCommand.point.supergroupOnly, false);
  assert.equal(byCommand.slots.supergroupOnly, false);

  for (const doc of docs) {
    assert.equal(Object.hasOwn(doc, 'isSupergroupCommand'), false);
  }
});

test('supergroup command list preserves the canonical legacy set', () => {
  assert.deepEqual([...SUPERGROUP_COMMANDS].sort(), [
    'bonus',
    'boss',
    'change_gender',
    'exchange',
    'form',
    'gacha',
    'info',
    'self_mute',
    'send_gold',
    'shop',
    'steal_resources',
    'sword',
    'swords',
    'title',
    'titles',
  ]);
});
