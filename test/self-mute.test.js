import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SELF_MUTE_DURATION_SECONDS,
  SELF_MUTE_PERMISSIONS,
  buildSelfMuteState,
  prepareSelfMute,
} from '../miniapp/selfMute.js';

const NOW = 1_800_000_000_000;

test('self mute preserves the legacy two minute duration and restrictions', () => {
  assert.equal(SELF_MUTE_DURATION_SECONDS, 120);
  assert.deepEqual(SELF_MUTE_PERMISSIONS, {
    can_send_messages: false,
    can_send_media_messages: false,
    can_send_polls: false,
    can_send_other_messages: false,
    can_pin_messages: false,
  });
});

test('self mute is group-only and honors the chat mute setting', () => {
  const session = { userChatData: { status: 'member' } };
  assert.equal(buildSelfMuteState({ chatId: 7, userId: 7, session, settings: { mute: 1 }, nowMs: NOW }).reason, 'group_only');
  assert.equal(buildSelfMuteState({ chatId: -100, userId: 7, session, settings: { mute: 0 }, nowMs: NOW }).reason, 'disabled');
});

test('self mute rejects administrators and already restricted members', () => {
  const admin = buildSelfMuteState({
    chatId: -100,
    userId: 7,
    session: { userChatData: { status: 'administrator' } },
    settings: { mute: 1 },
    nowMs: NOW,
  });
  assert.equal(admin.canMute, false);
  assert.equal(admin.reason, 'administrator');

  const active = buildSelfMuteState({
    chatId: -100,
    userId: 7,
    session: { userChatData: { status: 'member' } },
    settings: { mute: 1 },
    telegramMember: { status: 'restricted', until_date: Math.floor(NOW / 1000) + 45 },
    nowMs: NOW,
  });
  assert.equal(active.canMute, false);
  assert.equal(active.reason, 'already_muted');
  assert.equal(active.isActive, true);
});

test('self mute prepares an exact 120 second Telegram restriction for a normal member', () => {
  const prepared = prepareSelfMute({
    chatId: -100,
    userId: 7,
    session: { userChatData: { status: 'member' } },
    settings: { mute: 1 },
    telegramMember: { status: 'member' },
    nowMs: NOW,
  });
  assert.equal(prepared.ok, true);
  assert.equal(prepared.untilDate, Math.floor(NOW / 1000) + 120);
  assert.deepEqual(prepared.permissions, SELF_MUTE_PERMISSIONS);
});
