// One character for all chats.
//
// The hero lives in the Character collection (one record per Telegram user). A Chat still holds a member record per
// user with a working copy of it, so every module keeps reading and writing chat.members[].game as before:
//   - when chats are loaded, the copy of every member is replaced by the shared record (hydrateChats);
//   - when a chat is saved, a member that changed is written back to the shared record (persistChat).
// A copy that was loaded before somebody else changed the hero (a scheduler that walks thousands of chats) is stale
// and is dropped instead of overwriting the newer record. The store is injected so the logic is testable.
import crypto from 'node:crypto';

/** The member fields that belong to the hero; everything else (userId, userChatData, hidden flag, message ids) stays per chat. */
export const SHARED_KEYS = Object.freeze([
    'game', 'gender', 'whatsNewSettings', 'horoscope', 'sword', 'swordImmune', 'immuneToUpSword',
    'chestCounter', 'chosenChests', 'chestTries', 'changeClassTimer', 'user',
]);

/** A copy loaded this recently is the result of the current request: it wins over a newer record (last write wins). */
export const FRESH_MS = 60 * 1000;

const state = new WeakMap(); // member -> {hash, at}

const plain = value => (value && typeof value.toObject === 'function' ? value.toObject() : value);
const clone = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(plain(value))));

export function sharedOf(member) {
    const data = {};
    for (const key of SHARED_KEYS) {
        const value = member[key];
        if (value !== undefined && value !== null) data[key] = clone(value);
    }
    return data;
}

export const hashOf = data => crypto.createHash('sha1').update(JSON.stringify(data)).digest('hex');

function adopt(member, record, now) {
    for (const key of SHARED_KEYS) {
        if (record.data[key] === undefined) continue;
        member[key] = clone(record.data[key]);
    }
    member.syncRev = record.rev;
    state.set(member, {hash: record.hash || hashOf(record.data), at: now});
}

/**
 * store: {find(userIds) -> records, insert(record) -> record|null, update(userId, expectedRev|null, data, hash) -> record|null}
 * Replaces the copy of every member (that has a game) with the shared record.
 */
export async function hydrateChats(chats, store, now = Date.now()) {
    const members = [];
    for (const chat of chats) {
        if (!chat || !Array.isArray(chat.members)) continue;
        for (const member of chat.members) if (member && member.game !== undefined && member.userId !== undefined) members.push(member);
    }
    if (!members.length) return;
    const records = new Map((await store.find([...new Set(members.map(member => Number(member.userId)))])).map(record => [Number(record.userId), record]));
    for (const member of members) {
        const record = records.get(Number(member.userId));
        if (record) adopt(member, record, now);
    }
}

/** Writes the members of a chat that changed to the shared records. */
export async function persistChat(chat, store, now = Date.now()) {
    const members = (chat?.members || []).filter(member => member && member.game !== undefined && member.userId !== undefined);
    if (!members.length) return;
    const records = new Map((await store.find([...new Set(members.map(member => Number(member.userId)))])).map(record => [Number(record.userId), record]));
    for (const member of members) {
        const userId = Number(member.userId);
        const record = records.get(userId);
        const known = state.get(member);
        if (!record) {
            const data = sharedOf(member);
            const created = await store.insert({userId, rev: 1, data, hash: hashOf(data)});
            if (created) { member.syncRev = created.rev; state.set(member, {hash: created.hash, at: now}); records.set(userId, created); }
            continue;
        }
        // never synced: a new member of this chat or a copy from before the merge takes the hero as it is
        if (member.syncRev === undefined || member.syncRev === null) { adopt(member, record, now); continue; }
        const data = sharedOf(member);
        const hash = hashOf(data);
        if (known && known.hash === hash && member.syncRev === record.rev) continue;
        if (hash === record.hash) { member.syncRev = record.rev; state.set(member, {hash, at: now}); continue; }
        const current = member.syncRev === record.rev;
        const fresh = known && now - known.at <= FRESH_MS;
        if (!current && !fresh) { adopt(member, record, now); continue; }
        const written = await store.update(userId, current ? record.rev : null, data, hash);
        if (written) { member.syncRev = written.rev; state.set(member, {hash, at: now}); records.set(userId, written); }
        else { const latest = (await store.find([userId]))[0]; if (latest) adopt(member, latest, now); }
    }
}

/** The member to keep as the hero when a user has several: the highest level, then the most recently played. */
export function pickHero(candidates) {
    return [...candidates].sort((a, b) => (Number(b.level) - Number(a.level)) || (Number(b.updatedAt) - Number(a.updatedAt)))[0] || null;
}
