// Parties of up to nine players of one chat. A party lives on its members: every member has
// game.party = {id, leaderId, joinedAt}, an invited player has game.partyInvites = [{partyId, fromId, until}].
// All operations take the freshly loaded Chat document and must run under the chat lock; they return the
// sessions they changed so the caller can mark exactly those members as modified.
export const PARTY_MAX = 9;
/** How a party shares the items of a kill: the killer keeps them, a random member gets each, or members take turns. */
export const LOOT_MODES = Object.freeze(['finders', 'random', 'turn']);
export const INVITE_TTL_MS = 5 * 60 * 1000;
/** Casting a buff on a party costs this much more MP per extra member (nine members: x2.2). */
export const PARTY_COST_STEP = 0.15;

const id = value => String(value);
const members = chat => (Array.isArray(chat?.members) ? chat.members : []);
const find = (chat, userId) => members(chat).find(member => id(member.userId) === id(userId)) || null;
const isPlayer = member => Boolean(member?.game) && !member.isHided && !member.userChatData?.user?.is_bot;
const invitesOf = session => (Array.isArray(session.game.partyInvites) ? session.game.partyInvites : (session.game.partyInvites = []));

/** The sessions of a party (leader first), or [] when the player is in none. */
export function partyMembers(chat, session) {
    const partyId = session?.game?.party?.id;
    if (!partyId) return [];
    const list = members(chat).filter(member => member.game?.party?.id === partyId);
    const leaderId = session.game.party.leaderId;
    return list.sort((a, b) => (id(b.userId) === id(leaderId)) - (id(a.userId) === id(leaderId)));
}

/** Members that take part in a party cast: alive, visible and in the same chat (the caster included). */
export function partyTargets(chat, session) {
    const list = partyMembers(chat, session).filter(member => isPlayer(member) && (Number(member.game.gameClass?.stats?.hp) > 0 || id(member.userId) === id(session.userId)));
    return list.length ? list : [session];
}

export const partyCostFactor = count => 1 + PARTY_COST_STEP * Math.max(0, count - 1);

export function partyState(chat, session) {
    const list = partyMembers(chat, session);
    return list.length ? {id: session.game.party.id, leaderId: id(session.game.party.leaderId), members: list} : null;
}

function setParty(member, party) {
    member.game.party = party ? {id: party.id, leaderId: id(party.leaderId), joinedAt: party.joinedAt ?? Date.now(), loot: LOOT_MODES.includes(party.loot) ? party.loot : 'finders', lootTurn: Number(party.lootTurn) || 0} : null;
}

export function createParty(chat, leader, now = Date.now()) {
    if (!isPlayer(leader)) return {ok: false, reason: 'unknown_player'};
    if (leader.game.party?.id) return {ok: false, reason: 'already_in_party'};
    setParty(leader, {id: `p${leader.userId}-${now.toString(36)}`, leaderId: leader.userId, joinedAt: now});
    return {ok: true, changed: [leader]};
}

export function invitePlayer(chat, leader, targetId, now = Date.now()) {
    const party = partyState(chat, leader);
    if (!party) return {ok: false, reason: 'no_party'};
    if (party.leaderId !== id(leader.userId)) return {ok: false, reason: 'not_leader'};
    const target = find(chat, targetId);
    if (!isPlayer(target) || id(target.userId) === id(leader.userId)) return {ok: false, reason: 'unknown_player'};
    if (target.game.party?.id) return {ok: false, reason: target.game.party.id === party.id ? 'already_member' : 'target_in_party'};
    if (party.members.length >= PARTY_MAX) return {ok: false, reason: 'party_full'};
    const invites = invitesOf(target).filter(invite => invite.until > now && invite.partyId !== party.id);
    invites.push({partyId: party.id, fromId: id(leader.userId), until: now + INVITE_TTL_MS});
    target.game.partyInvites = invites;
    return {ok: true, changed: [target]};
}

export function acceptInvite(chat, session, partyId, now = Date.now()) {
    if (session.game.party?.id) return {ok: false, reason: 'already_in_party'};
    const invite = invitesOf(session).find(entry => entry.partyId === partyId && entry.until > now);
    if (!invite) return {ok: false, reason: 'no_invite'};
    const list = members(chat).filter(member => member.game?.party?.id === partyId);
    if (!list.length) {
        session.game.partyInvites = invitesOf(session).filter(entry => entry.partyId !== partyId);
        return {ok: false, reason: 'party_gone', changed: [session]};
    }
    if (list.length >= PARTY_MAX) return {ok: false, reason: 'party_full'};
    setParty(session, {id: partyId, leaderId: list[0].game.party.leaderId, joinedAt: now, loot: list[0].game.party.loot, lootTurn: list[0].game.party.lootTurn});
    session.game.partyInvites = [];
    return {ok: true, changed: [session]};
}

export function declineInvite(chat, session, partyId) {
    const before = invitesOf(session).length;
    session.game.partyInvites = invitesOf(session).filter(entry => entry.partyId !== partyId);
    return before === session.game.partyInvites.length ? {ok: false, reason: 'no_invite'} : {ok: true, changed: [session]};
}

/** Leaving passes the leadership on; a party of one disbands. */
export function leaveParty(chat, session) {
    const party = partyState(chat, session);
    if (!party) return {ok: false, reason: 'no_party'};
    const rest = party.members.filter(member => id(member.userId) !== id(session.userId));
    setParty(session, null);
    const changed = [session];
    if (rest.length <= 1) {
        rest.forEach(member => { setParty(member, null); changed.push(member); });
    } else if (party.leaderId === id(session.userId)) {
        rest.forEach(member => { member.game.party.leaderId = id(rest[0].userId); changed.push(member); });
    }
    return {ok: true, changed};
}

export function kickMember(chat, leader, targetId) {
    const party = partyState(chat, leader);
    if (!party) return {ok: false, reason: 'no_party'};
    if (party.leaderId !== id(leader.userId)) return {ok: false, reason: 'not_leader'};
    if (id(targetId) === id(leader.userId)) return {ok: false, reason: 'invalid_target'};
    const target = party.members.find(member => id(member.userId) === id(targetId));
    if (!target) return {ok: false, reason: 'not_member'};
    setParty(target, null);
    const changed = [target];
    if (party.members.length - 1 <= 1) { setParty(leader, null); changed.push(leader); }
    return {ok: true, changed};
}

export function disbandParty(chat, leader) {
    const party = partyState(chat, leader);
    if (!party) return {ok: false, reason: 'no_party'};
    if (party.leaderId !== id(leader.userId)) return {ok: false, reason: 'not_leader'};
    party.members.forEach(member => setParty(member, null));
    return {ok: true, changed: party.members};
}

/** Drops invites that have expired or whose party no longer exists. */
export function pruneInvites(chat, session, now = Date.now()) {
    const live = new Set(members(chat).map(member => member.game?.party?.id).filter(Boolean));
    const before = invitesOf(session).length;
    session.game.partyInvites = invitesOf(session).filter(invite => invite.until > now && live.has(invite.partyId));
    return session.game.partyInvites.length !== before;
}

/** The leader chooses the loot mode; every member carries it. */
export function setLootMode(chat, leader, mode) {
    const party = partyState(chat, leader);
    if (!party) return {ok: false, reason: 'no_party'};
    if (party.leaderId !== id(leader.userId)) return {ok: false, reason: 'not_leader'};
    if (!LOOT_MODES.includes(mode)) return {ok: false, reason: 'invalid_loot_mode'};
    party.members.forEach(member => { member.game.party.loot = mode; member.game.party.lootTurn = 0; });
    return {ok: true, changed: party.members};
}

export const lootModeOf = session => (LOOT_MODES.includes(session?.game?.party?.loot) ? session.game.party.loot : 'finders');

/**
 * Who receives the next item of a kill by `killer`: returns {members, pick()}; with no party the killer alone. Items are
 * rolled one by one, so "turn" hands them out in order and "random" draws for each. Adena is always split equally.
 */
export function lootDistributor(chat, killer, random = Math.random) {
    const members = chat ? partyTargets(chat, killer) : [killer];
    const mode = members.length > 1 ? lootModeOf(killer) : 'finders';
    const leader = members.find(member => id(member.userId) === id(killer.game.party?.leaderId)) || killer;
    // the cursor lives on the leader's record so that every kill of the party advances the same turn
    let cursor = Number(leader.game?.party?.lootTurn) || 0;
    const touched = new Set();
    return {
        mode,
        members,
        pick() {
            if (mode === 'finders') return killer;
            if (mode === 'random') return members[Math.floor(random() * members.length) % members.length];
            const member = members[cursor % members.length];
            cursor += 1;
            if (leader.game?.party) { leader.game.party.lootTurn = cursor; touched.add(leader); }
            return member;
        },
        touched,
    };
}

export {find as findMember};
