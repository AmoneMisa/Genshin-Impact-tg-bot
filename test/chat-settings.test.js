import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAT_SETTING_DEFINITIONS,
  buildChatSettingsState,
  canManageChatSettings,
  prepareChatSettingUpdate,
} from '../miniapp/chatSettings.js';

test('chat settings keep the canonical chests key and all legacy toggles', () => {
  const keys = CHAT_SETTING_DEFINITIONS.map(item => item.key);
  assert.equal(keys.length, 18);
  assert.ok(keys.includes('chests'));
  assert.ok(!keys.includes('chest'));
});

test('chat settings preserve legacy administrator, creator and owner ACL', () => {
  assert.equal(canManageChatSettings({ userChatData: { status: 'administrator' } }, 1, 99), true);
  assert.equal(canManageChatSettings({ userChatData: { status: 'creator' } }, 1, 99), true);
  assert.equal(canManageChatSettings({ userChatData: { status: 'member' } }, 99, 99), true);
  assert.equal(canManageChatSettings({ userChatData: { status: 'member' } }, 1, 99), false);
  assert.equal(canManageChatSettings({ $locals: { telegramMembership: { status: 'administrator' } } }, 1, 99), true);
});

test('chat settings expose values but management only in group admin context', () => {
  const state = buildChatSettingsState({
    chatId: -1001,
    userId: 7,
    ownerId: 99,
    session: { userChatData: { status: 'administrator' } },
    settings: { dice: 0, chests: 1 },
  });
  assert.equal(state.isGroup, true);
  assert.equal(state.canManage, true);
  assert.equal(state.settings.find(item => item.key === 'dice').enabled, false);
  assert.equal(state.settings.find(item => item.key === 'chests').enabled, true);
});

test('chat settings reject private, non-admin, unknown and non-boolean mutations', () => {
  const admin = { userChatData: { status: 'administrator' } };
  const member = { userChatData: { status: 'member' } };

  assert.deepEqual(
    prepareChatSettingUpdate({ chatId: 7, userId: 7, session: admin, ownerId: 99, key: 'dice', enabled: false }),
    { ok: false, status: 409, reason: 'group_only' },
  );
  assert.deepEqual(
    prepareChatSettingUpdate({ chatId: -1, userId: 7, session: member, ownerId: 99, key: 'dice', enabled: false }),
    { ok: false, status: 403, reason: 'forbidden' },
  );
  assert.deepEqual(
    prepareChatSettingUpdate({ chatId: -1, userId: 7, session: admin, ownerId: 99, key: 'chest', enabled: false }),
    { ok: false, status: 400, reason: 'unknown_setting' },
  );
  assert.deepEqual(
    prepareChatSettingUpdate({ chatId: -1, userId: 7, session: admin, ownerId: 99, key: 'chests', enabled: 0 }),
    { ok: false, status: 400, reason: 'enabled_must_be_boolean' },
  );
  assert.deepEqual(
    prepareChatSettingUpdate({ chatId: -1, userId: 7, session: admin, ownerId: 99, key: 'chests', enabled: false }),
    { ok: true, key: 'chests', enabled: false, value: 0 },
  );
});
