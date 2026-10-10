import test from 'node:test';
import assert from 'node:assert/strict';
import changeClass from '../functions/game/player/changePlayerGameClass.js';
import updateStats from '../functions/game/player/updatePlayerStats.js';
import castSkill from '../functions/game/player/castSkill.js';
import saveSession from '../functions/getters/saveSession.js';
import {
  PARTY_MAX, acceptInvite, createParty, declineInvite, disbandParty, invitePlayer, kickMember, leaveParty, partyMembers, partyState, partyTargets, partyCostFactor,transferPartyLeadership,
} from '../functions/game/party/party.js';
import {castClassBuff, buffManaCost} from '../miniapp/buffs.js';
import {getPartyState, performPartyAction} from '../miniapp/party.js';

const NOW = Date.now();
test('inviting from a player card creates a party and a failed invite leaves no new party',()=>{
 const {at}=chatOf(2);
 assert.equal(performPartyAction(at(1),'invite',{userId:99},NOW).ok,false);assert.equal(at(1).game.party,null);
 assert.equal(performPartyAction(at(1),'invite',{userId:2},NOW).ok,true);assert.ok(at(1).game.party.id);assert.equal(at(2).game.partyInvites.length,1);
});

test('only the party leader can transfer leadership or disband, preserving loot and pending invitations',()=>{
 const {chat,at}=chatOf(4);
 createParty(chat,at(1),NOW);invitePlayer(chat,at(1),2,NOW);acceptInvite(chat,at(2),at(1).game.party.id,NOW);invitePlayer(chat,at(1),3,NOW);
 at(1).game.party.lootTurn=7;
 assert.equal(transferPartyLeadership(chat,at(2),1).reason,'not_leader');
 assert.equal(disbandParty(chat,at(2)).reason,'not_leader');
 assert.equal(transferPartyLeadership(chat,at(1),4).reason,'invalid_target');
 assert.equal(transferPartyLeadership(chat,at(1),2).ok,true);
 assert.equal(at(1).game.party.leaderId,'2');assert.equal(at(2).game.party.lootTurn,7);
 assert.equal(at(3).game.partyInvites[0].fromId,'2');
 assert.equal(disbandParty(chat,at(1)).reason,'not_leader');
 assert.equal(disbandParty(chat,at(2)).ok,true);assert.equal(at(1).game.party,null);assert.deepEqual(at(3).game.partyInvites,[]);
});

function chatOf(count, className = 'warrior') {
  const saved = [];
  const chat = {members: [], markModified: path => saved.push(path), save: async () => {}};
  for (let userId = 1; userId <= count; userId += 1) {
    const session = {
      userId, userChatData: {user: {id: userId, first_name: `Hero ${userId}`}},
      game: {stats: {lvl: 85, currentExp: 0}, inventory: {gold: 0, materials: {}, equipment: {items: []}, potions: {items: []}}, equipmentStats: {}, effects: [], builds: {}, respawnTime: 0},
      ownerDocument: () => chat,
    };
    changeClass(session, className);
    updateStats(session);
    chat.members.push(session);
  }
  return {chat, saved, at: index => chat.members[index - 1]};
}

function fullParty(count) {
  const world = chatOf(count);
  const leader = world.at(1);
  assert.equal(createParty(world.chat, leader, NOW).ok, true);
  for (let userId = 2; userId <= count; userId += 1) {
    assert.equal(invitePlayer(world.chat, leader, userId, NOW).ok, true);
    assert.equal(acceptInvite(world.chat, world.at(userId), leader.game.party.id, NOW).ok, true);
  }
  return {...world, leader};
}

test('a party holds up to nine players and refuses the tenth', () => {
  const world = fullParty(9);
  assert.equal(PARTY_MAX, 9);
  assert.equal(partyMembers(world.chat, world.leader).length, 9);
  assert.equal(partyState(world.chat, world.at(5)).leaderId, '1');
  const extra = chatOf(10);
  const leader = extra.at(1);
  createParty(extra.chat, leader, NOW);
  for (let userId = 2; userId <= 9; userId += 1) { invitePlayer(extra.chat, leader, userId, NOW); acceptInvite(extra.chat, extra.at(userId), leader.game.party.id, NOW); }
  assert.equal(invitePlayer(extra.chat, leader, 10, NOW).reason, 'party_full');
  // an invitation sent before the party filled up cannot be used afterwards either
  extra.at(10).game.partyInvites = [{partyId: leader.game.party.id, fromId: '1', until: NOW + 1000}];
  assert.equal(acceptInvite(extra.chat, extra.at(10), leader.game.party.id, NOW).reason, 'party_full');
});

test('only the leader invites and kicks; invites expire and can be declined', () => {
  const world = chatOf(4);
  const [a, b, c] = [world.at(1), world.at(2), world.at(3)];
  assert.equal(invitePlayer(world.chat, a, 2, NOW).reason, 'no_party');
  createParty(world.chat, a, NOW);
  assert.equal(createParty(world.chat, a, NOW).reason, 'already_in_party');
  invitePlayer(world.chat, a, 2, NOW);
  assert.equal(acceptInvite(world.chat, b, a.game.party.id, NOW + 6 * 60 * 1000).reason, 'no_invite');
  invitePlayer(world.chat, a, 2, NOW);
  assert.equal(declineInvite(world.chat, b, a.game.party.id).ok, true);
  assert.equal(acceptInvite(world.chat, b, a.game.party.id, NOW).reason, 'no_invite');
  invitePlayer(world.chat, a, 2, NOW); acceptInvite(world.chat, b, a.game.party.id, NOW);
  assert.equal(invitePlayer(world.chat, b, 3, NOW).reason, 'not_leader');
  assert.equal(kickMember(world.chat, b, 1).reason, 'not_leader');
  invitePlayer(world.chat, a, 3, NOW); acceptInvite(world.chat, c, a.game.party.id, NOW);
  assert.equal(kickMember(world.chat, a, 3).ok, true);
  assert.equal(c.game.party, null);
  assert.equal(invitePlayer(world.chat, a, 2, NOW).reason, 'already_member');
});

test('leaving passes the leadership on and a party of one disbands', () => {
  const world = fullParty(3);
  assert.equal(leaveParty(world.chat, world.leader).ok, true);
  assert.equal(world.leader.game.party, null);
  assert.equal(partyState(world.chat, world.at(2)).leaderId, '2');
  assert.equal(partyState(world.chat, world.at(3)).leaderId, '2');
  leaveParty(world.chat, world.at(3));
  assert.equal(world.at(2).game.party, null, 'the last member is left alone: no party');
  const again = fullParty(4);
  assert.equal(disbandParty(again.chat, again.at(2)).reason, 'not_leader');
  assert.equal(disbandParty(again.chat, again.leader).ok, true);
  assert.ok(again.chat.members.every(member => !member.game.party));
});

test('a class buff reaches the whole party, costs more per member and skips the dead', () => {
  const world = fullParty(4);
  world.at(4).game.gameClass.stats.hp = 0;
  const caster = world.leader;
  const solo = buffManaCost(caster, 3);
  const mp = caster.game.gameClass.stats.mp;
  const cast = castClassBuff(caster, 'might', null, NOW);
  assert.equal(cast.ok, true);
  assert.deepEqual(cast.party.sort(), ['1', '2', '3']);
  assert.equal(cast.spent, Math.ceil(solo * partyCostFactor(3)));
  assert.equal(caster.game.gameClass.stats.mp, mp - cast.spent);
  for (const userId of [1, 2, 3]) assert.ok(world.at(userId).game.effects.some(effect => effect.potionId === 'might'), `member ${userId}`);
  assert.ok(!world.at(4).game.effects.some(effect => effect.potionId === 'might'), 'a dead member is not buffed');
  assert.equal(world.at(2).needsSave, true);
});

test('a player outside a party still buffs only themselves', () => {
  const world = chatOf(2);
  const cast = castClassBuff(world.at(1), 'might', null, NOW);
  assert.equal(cast.ok, true);
  assert.equal(cast.party, null);
  assert.equal(cast.onSelf, true);
  assert.ok(!world.at(2).game.effects.some(effect => effect.potionId === 'might'));
});

test('a buff skill of a member is applied to everyone in the party', () => {
  const world = fullParty(3);
  const guard = {name: 'Guard', cooldown: 1, cost: 0, isBuff: true, buffs: [{kind: 'guard', amount: 20, seconds: 30}]};
  const result = castSkill(world.leader, null, guard, {now: NOW});
  assert.deepEqual(result.party.sort(), ['2', '3']);
  for (const userId of [1, 2, 3]) assert.ok(world.at(userId).game.effects.some(effect => effect.name === 'guard'), `member ${userId}`);
  // a member who is not in a party (or a lone caster) shares nothing
  const alone = chatOf(2);
  assert.equal(castSkill(alone.at(1), null, guard, {now: NOW}).party, undefined);
  assert.ok(!alone.at(2).game.effects.some(effect => effect.name === 'guard'));
});

test('partyTargets falls back to the caster alone and saveSession writes party members that changed', async () => {
  const world = chatOf(2);
  assert.deepEqual(partyTargets(world.chat, world.at(1)).map(member => member.userId), [1]);
  const party = fullParty(3);
  castClassBuff(party.leader, 'might', null, NOW);
  await saveSession(party.leader);
  assert.ok(party.saved.includes('members.0') && party.saved.includes('members.1') && party.saved.includes('members.2'));
  assert.equal(party.at(2).needsSave, false);
});

test('the mini app state lists the party, invitations and who can be invited', () => {
  const world = chatOf(4);
  assert.equal(performPartyAction(world.at(1), 'create', {}, NOW).ok, true);
  assert.equal(performPartyAction(world.at(1), 'invite', {userId: 2}, NOW).ok, true);
  const leaderView = getPartyState(world.at(1), NOW);
  assert.equal(leaderView.party.amLeader, true);
  assert.deepEqual(leaderView.candidates.map(candidate => [candidate.userId, candidate.invited]), [['2', true], ['3', false], ['4', false]]);
  const invited = getPartyState(world.at(2), NOW);
  assert.equal(invited.party, null);
  assert.equal(invited.invites.length, 1);
  assert.equal(invited.invites[0].fromName, 'Hero 1');
  assert.equal(performPartyAction(world.at(2), 'accept', {partyId: invited.invites[0].partyId}, NOW).ok, true);
  assert.equal(getPartyState(world.at(1), NOW).party.members.length, 2);
  assert.equal(performPartyAction(world.at(2), 'nonsense', {}, NOW).reason, 'unknown_action');
});

test('the leader sets the loot mode: finder, random or one by one; members cannot', async () => {
  const {setLootMode, lootDistributor, lootModeOf} = await import('../functions/game/party/party.js');
  const world = fullParty(3);
  assert.equal(lootModeOf(world.at(2)), 'finders');
  assert.equal(setLootMode(world.chat, world.at(2), 'random').reason, 'not_leader');
  assert.equal(setLootMode(world.chat, world.leader, 'dice').reason, 'invalid_loot_mode');
  assert.equal(setLootMode(world.chat, world.leader, 'random').ok, true);
  assert.deepEqual(world.chat.members.map(lootModeOf), ['random', 'random', 'random']);

  // finder: the killer keeps everything
  setLootMode(world.chat, world.leader, 'finders');
  const finder = lootDistributor(world.chat, world.at(2));
  assert.deepEqual([finder.pick(), finder.pick()].map(m => m.userId), [2, 2]);

  // one by one: items go round the party and the turn survives to the next kill
  setLootMode(world.chat, world.leader, 'turn');
  const first = lootDistributor(world.chat, world.at(2));
  assert.deepEqual([first.pick(), first.pick()].map(m => m.userId), [1, 2]);
  const next = lootDistributor(world.chat, world.at(3));
  assert.deepEqual([next.pick(), next.pick(), next.pick()].map(m => m.userId), [3, 1, 2]);

  // random: every member can win, the draw is the injected random
  setLootMode(world.chat, world.leader, 'random');
  const draws = [0, 0.4, 0.99];
  const random = lootDistributor(world.chat, world.at(1), () => draws.shift());
  assert.deepEqual([random.pick(), random.pick(), random.pick()].map(m => m.userId), [1, 2, 3]);

  // a new member inherits the mode; outside a party the killer keeps everything
  const extra = chatOf(1).at(1);
  assert.equal(lootDistributor(null, extra).pick(), extra);
});

test('a hunt kill shares adena equally and items by the loot mode', async () => {
  const {setLootMode} = await import('../functions/game/party/party.js');
  const {grantKillRewards} = await import('../functions/game/hunt/huntRewards.js');
  const {getZone, getMobDef, buildMob} = await import('../functions/game/hunt/huntMobs.js');
  const zone = getZone('catacomb-heretic'), def = zone.mobs.find(mob => mob.name === 'Lith Medium');
  const world = fullParty(3);
  for (const member of world.chat.members) member.game.hunt = {zone: zone.id, field: {mobs: []}};
  const kill = (mode, random = () => 0) => {
    setLootMode(world.chat, world.leader, mode);
    for (const member of world.chat.members) { member.game.inventory.gold = 0; member.game.inventory.materials = {}; }
    const mob = buildMob(zone, def, {champion: null, random: () => 0.5});
    const result = grantKillRewards(world.at(2), mob, def, {random, now: NOW});
    const total = member => Object.values(member.game.inventory.materials).reduce((sum, count) => sum + count, 0);
    return {result, items: world.chat.members.map(total), gold: world.chat.members.map(member => member.game.inventory.gold)};
  };

  const finders = kill('finders');
  assert.equal(finders.items[0] + finders.items[2], 0);
  assert.ok(finders.items[1] > 0);

  const turn = kill('turn');
  assert.ok(turn.items.every(count => count > 0), 'items went round all three members');
  assert.equal(turn.result.shared.every(row => row.userId !== '2' || row.item === 'gold'), true);

  // adena is split equally in every mode (Lith Medium has none, so use a mob that drops it)
  const goldDef = zone.mobs.find(mob => mob.gold), goldMob = buildMob(zone, goldDef, {champion: null, random: () => 0.5});
  for (const member of world.chat.members) member.game.inventory.gold = 0;
  const paid = grantKillRewards(world.at(2), goldMob, goldDef, {random: () => 0, now: NOW});
  const gold = world.chat.members.map(member => member.game.inventory.gold);
  assert.ok(paid.gold > 0);
  assert.equal(gold.reduce((sum, value) => sum + value, 0), paid.gold + paid.shared.filter(row => row.item === 'gold').reduce((sum, row) => sum + row.amount, 0));
  assert.ok(Math.max(...gold) - Math.min(...gold) <= 2);
});

test('party experience: highest level, High Five bonus, split by level squared, only members on the field', async () => {
  const {expShares, partyExpBonus} = await import('../functions/game/party/party.js');
  const {grantKillRewards} = await import('../functions/game/hunt/huntRewards.js');
  const {getZone, buildMob} = await import('../functions/game/hunt/huntMobs.js');
  assert.deepEqual([1, 2, 3, 4, 9].map(partyExpBonus), [1, 1.30, 1.39, 1.50, 1.71]);
  const shares = expShares([{game: {stats: {lvl: 60}}}, {game: {stats: {lvl: 80}}}]);
  assert.equal(shares.level, 80);
  assert.equal(shares.bonus, 1.30);
  assert.ok(Math.abs(shares.shares[0].share - 3600 / 10000) < 1e-9 && Math.abs(shares.shares[1].share - 6400 / 10000) < 1e-9);

  const zone = getZone('catacomb-heretic'), def = zone.mobs.find(mob => mob.name === 'Lith Medium');
  const mob = () => buildMob(zone, def, {champion: null, random: () => 0.5});
  const level = 38;
  const setup = count => {
    const world = fullParty(count);
    for (const member of world.chat.members) { member.game.stats = {lvl: level, currentExp: 0}; member.game.hunt = {zone: zone.id, field: {mobs: []}}; }
    return world;
  };
  const solo = chatOf(1).at(1);
  solo.game.stats = {lvl: level, currentExp: 0};
  const alone = grantKillRewards(solo, mob(), def, {random: () => 0.99, now: NOW});
  assert.ok(alone.exp > 0);

  const world = setup(3);
  const together = grantKillRewards(world.at(1), mob(), def, {random: () => 0.99, now: NOW});
  // three equal members: a third of the reward times the 1.39 party bonus each
  assert.ok(Math.abs(together.exp - alone.exp * 1.39 / 3) <= 1, `${together.exp} vs ${alone.exp * 1.39 / 3}`);
  assert.equal(together.party.length, 2);
  assert.ok(together.party.every(row => Math.abs(row.exp - together.exp) <= 1));
  assert.ok(world.at(2).game.stats.currentExp > 0 && world.at(2).game.inventory.sp > 0);
  assert.equal(world.at(2).needsSave, true);

  // a member who is elsewhere gets nothing and does not dilute the shares
  const apart = setup(3);
  apart.at(3).game.hunt = {zone: 'other-zone', field: null};
  const two = grantKillRewards(apart.at(1), mob(), def, {random: () => 0.99, now: NOW});
  assert.ok(Math.abs(two.exp - alone.exp * 1.30 / 2) <= 1);
  assert.equal(apart.at(3).game.stats.currentExp, 0);
});
