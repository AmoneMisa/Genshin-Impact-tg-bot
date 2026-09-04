import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rejectClanApplication,
  promoteClanMember,
  demoteClanMember,
  updateClanSettings,
} from '../miniapp/clanManagement.js';

function makeClan() {
  return {
    name: 'Test Clan',
    owner: 1,
    members: [
      { userId: 1, role: 'owner' },
      { userId: 2, role: 'officer' },
      { userId: 3, role: 'member' },
    ],
    applications: [42, 43],
    entryConditions: { entryType: 0, minLevel: 0, minGearScore: 0, allowedClass: '', allowedGender: '' },
  };
}

test('application review is owner/officer only and only removes the target id', () => {
  const clan = makeClan();

  const denied = rejectClanApplication(clan, 3, 42);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'owner_only');
  assert.deepEqual(clan.applications, [42, 43]);

  const result = rejectClanApplication(clan, 2, 42);
  assert.equal(result.ok, true);
  assert.deepEqual(clan.applications, [43]);
});

test('promote/demote are owner-only and cannot retarget the owner', () => {
  const clan = makeClan();

  const deniedByOfficer = promoteClanMember(clan, 2, 3);
  assert.equal(deniedByOfficer.ok, false);
  assert.equal(deniedByOfficer.reason, 'owner_only');

  const cannotTargetOwner = promoteClanMember(clan, 1, 1);
  assert.equal(cannotTargetOwner.ok, false);
  assert.equal(cannotTargetOwner.reason, 'invalid_role_target');

  const promoted = promoteClanMember(clan, 1, 3);
  assert.equal(promoted.ok, true);
  assert.equal(clan.members.find(m => m.userId === 3).role, 'officer');

  const demoted = demoteClanMember(clan, 1, 3);
  assert.equal(demoted.ok, true);
  assert.equal(clan.members.find(m => m.userId === 3).role, 'member');
});

test('settings update validates numeric fields and rejects unknown class/gender', () => {
  const clan = makeClan();

  const badLevel = updateClanSettings(clan, 1, { minLevel: -5 });
  assert.equal(badLevel.ok, false);
  assert.equal(badLevel.reason, 'invalid_min_level');

  const badClass = updateClanSettings(clan, 1, { allowedClass: 'wizard' });
  assert.equal(badClass.ok, false);
  assert.equal(badClass.reason, 'invalid_class');

  const badGender = updateClanSettings(clan, 1, { allowedGender: 'other' });
  assert.equal(badGender.ok, false);
  assert.equal(badGender.reason, 'invalid_gender');

  const result = updateClanSettings(clan, 1, {
    tag: '  TAGTAGTAG  ',
    description: 'x'.repeat(250),
    entryType: 1,
    minLevel: 10,
    minGearScore: 500,
    allowedClass: 'mage',
    allowedGender: 'female',
  });

  assert.equal(result.ok, true);
  assert.equal(clan.tag, 'TAGTAG'); // trimmed then clamped to 6 chars
  assert.equal(clan.description.length, 200);
  assert.equal(clan.entryConditions.entryType, 1);
  assert.equal(clan.entryConditions.minLevel, 10);
  assert.equal(clan.entryConditions.minGearScore, 500);
  assert.equal(clan.entryConditions.allowedClass, 'mage');
  assert.equal(clan.entryConditions.allowedGender, 'female');
});

test('settings update is owner-only', () => {
  const clan = makeClan();
  const denied = updateClanSettings(clan, 2, { tag: 'NOPE' });
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'owner_only');
  assert.equal(clan.tag, undefined);
});
