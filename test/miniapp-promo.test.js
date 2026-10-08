import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMail, claimAllMail, claimMail, cleanCode, getMailbox, MAIL_LIFETIME_MS, pendingMailCount,
  promoBlockReason, validateNotice, validatePromo,
} from '../miniapp/promo.js';
import { createMiniAppFeatures } from '../miniapp/state.js';
import { dismissForToday, noticeKey, readDismissed, visibleNotices } from '../webapp/notices.js';

const NOW = 1_800_000_000_000;
const session = () => ({ game: { inventory: { gold: 10, crystals: 0, ironOre: 0 }, bonusChances: 1 } });

test('promo validation normalizes the code, merges rewards and checks dates and limits', () => {
  const ok = validatePromo({
    code: ' spring-26 ', maxUses: 5,
    rewards: [{ kind: 'gold', amount: 100 }, { kind: 'gold', amount: 50 }, { kind: 'crystals', amount: 3 }],
    expiresAt: NOW + 1000,
  }, NOW);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.promo, {
    code: 'SPRING-26', startsAt: NOW, expiresAt: NOW + 1000, maxUses: 5,
    rewards: [{ kind: 'gold', amount: 150 }, { kind: 'crystals', amount: 3 }],
  });

  const bad = body => validatePromo({ code: 'ABC', rewards: [{ kind: 'gold', amount: 1 }], ...body }, NOW);
  assert.equal(validatePromo({ code: 'a!', rewards: [{ kind: 'gold', amount: 1 }] }, NOW).ok, false);
  assert.equal(bad({ rewards: [] }).ok, false);
  assert.equal(bad({ rewards: [{ kind: 'gems', amount: 1 }] }).ok, false);
  assert.equal(bad({ rewards: [{ kind: 'gold', amount: 1.5 }] }).ok, false);
  assert.equal(bad({ expiresAt: NOW - 1 }).ok, false);
  assert.equal(bad({ startsAt: NOW + 10, expiresAt: NOW + 5 }).ok, false);
  assert.equal(bad({ maxUses: 0 }).ok, false);
  assert.equal(bad({ maxUses: '' }).ok, true);
  assert.equal(cleanCode(42), '');
});

test('a promo is blocked when deleted, not started, expired, used up or already redeemed', () => {
  const promo = { startsAt: NOW - 1, expiresAt: NOW + 1, maxUses: 2, redeemedBy: [1] };
  assert.equal(promoBlockReason(promo, 2, NOW), null);
  assert.equal(promoBlockReason(promo, 1, NOW), 'already_redeemed');
  assert.equal(promoBlockReason({ ...promo, redeemedBy: [1, 3] }, 2, NOW), 'invalid');
  assert.equal(promoBlockReason({ ...promo, expiresAt: NOW }, 2, NOW), 'invalid');
  assert.equal(promoBlockReason({ ...promo, startsAt: NOW + 1 }, 2, NOW), 'invalid');
  assert.equal(promoBlockReason({ ...promo, deletedAt: 1 }, 2, NOW), 'invalid');
  assert.equal(promoBlockReason({ ...promo, expiresAt: null, maxUses: null }, 2, NOW), null);
  assert.equal(promoBlockReason(null, 2, NOW), 'invalid');
});

test('mail rewards are claimed exactly once and expire after 180 days', () => {
  const s = session();
  const rewards = [{ kind: 'gold', amount: 100 }, { kind: 'bonusChances', amount: 2 }];
  assert.equal(addMail(s, { id: 'promo:X', kind: 'promo', title: 'X', rewards }, NOW), true);
  assert.equal(addMail(s, { id: 'promo:X', rewards }, NOW), false);
  assert.equal(pendingMailCount(s, NOW), 1);

  const claimed = claimMail(s, 'promo:X', NOW);
  assert.equal(claimed.ok, true);
  assert.equal(s.game.inventory.gold, 110);
  assert.equal(s.game.bonusChances, 3);
  assert.equal(claimMail(s, 'promo:X', NOW).reason, 'already_claimed');
  assert.equal(claimMail(s, 'nope', NOW).reason, 'mail_not_found');
  assert.equal(s.game.inventory.gold, 110);

  addMail(s, { id: 'promo:Y', rewards: [{ kind: 'crystals', amount: 5 }] }, NOW);
  assert.equal(getMailbox(s, NOW + MAIL_LIFETIME_MS + 1).letters.length, 0);
});

test('claim all pays every pending letter once', () => {
  const s = session();
  addMail(s, { id: 'a', rewards: [{ kind: 'crystals', amount: 5 }] }, NOW);
  addMail(s, { id: 'b', rewards: [{ kind: 'crystals', amount: 7 }, { kind: 'ironOre', amount: 1 }] }, NOW + 1);
  const result = claimAllMail(s, NOW + 2);
  assert.equal(result.claimed, 2);
  assert.equal(s.game.inventory.crystals, 12);
  assert.equal(s.game.inventory.ironOre, 1);
  assert.equal(claimAllMail(s, NOW + 3).ok, false);
  assert.equal(getMailbox(s, NOW + 3).pending, 0);
});

test('the admin feature is only offered to the admin', () => {
  const ids = context => createMiniAppFeatures(context).map(feature => feature.id);
  assert.equal(ids({ chatId: 1, user: { id: 2 } }).includes('admin'), false);
  assert.equal(ids({ chatId: 1, user: { id: 2 }, isAdmin: true }).includes('admin'), true);
  assert.ok(ids({ chatId: 1, user: { id: 2 } }).includes('promo'));
  assert.ok(ids({ chatId: 1, user: { id: 2 } }).includes('mail'));
});

test('notice validation and the per-day dismiss list', () => {
  assert.equal(validateNotice({ title: '', body: 'x' }, NOW).ok, false);
  assert.equal(validateNotice({ title: 'Hi', body: 'x', endsAt: NOW - 1 }, NOW).ok, false);
  const ok = validateNotice({ title: ' Hi ', body: ' text ', active: false }, NOW);
  assert.deepEqual(ok.notice, { title: 'Hi', body: 'text', active: false, startsAt: null, endsAt: null });

  const notice = { id: 'n1', updatedAt: 5 };
  const dismissed = dismissForToday({ old: '2020-01-01' }, notice, '2026-10-08');
  assert.deepEqual(dismissed, { [noticeKey(notice)]: '2026-10-08' });
  assert.deepEqual(visibleNotices([notice], dismissed, '2026-10-08'), []);
  assert.equal(visibleNotices([notice], dismissed, '2026-10-09').length, 1);
  assert.equal(visibleNotices([{ ...notice, updatedAt: 6 }], dismissed, '2026-10-08').length, 1);
  assert.deepEqual(readDismissed('not json'), {});
});
