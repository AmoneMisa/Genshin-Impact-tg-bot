// A party may hold heroes of several chats. The party code (functions/game/party/party.js) walks the members of a chat
// document; the heroes of the party that are members of other chats are attached to it here as "guests": plain member
// records built from the shared character, kept in chat.$locals.guests (never in chat.members, so a guest does not
// become a member of the chat). Whatever a request changes on a guest (health, loot, experience, buffs) is written back
// to its shared record when the chat is saved (persistGuests, called by the Chat save hook).
import {sharedOf, hashOf} from './characterSync.js';

const guestsOf = chat => chat?.$locals?.guests || [];

/** Guests of the chat document (empty when none were attached). */
export const chatGuests = guestsOf;

/**
 * store: {find(userIds), findParty(partyIds)}; users: {names(userIds) -> Map(userId -> userChatData)}.
 * Attaches the heroes of `partyIds` and `userIds` that are not members of the chat. Returns the guests.
 */
export async function attachGuests(chat, {partyIds = [], userIds = []} = {}, {store, users}) {
    if (!chat) return [];
    const wanted = new Map();
    const inChat = new Set((chat.members || []).map(member => String(member.userId)));
    const add = records => { for (const record of records) if (!inChat.has(String(record.userId))) wanted.set(String(record.userId), record); };
    const parties = [...new Set(partyIds.filter(Boolean))];
    if (parties.length) add(await store.findParty(parties));
    const missing = [...new Set(userIds.map(String))].filter(id => !inChat.has(id) && !wanted.has(id));
    if (missing.length) add(await store.find(missing.map(Number)));
    if (!chat.$locals) chat.$locals = {};
    const known = new Map(guestsOf(chat).map(guest => [String(guest.userId), guest]));
    const names = wanted.size ? await users.names([...wanted.values()].map(record => record.userId)) : new Map();
    for (const record of wanted.values()) {
        if (known.has(String(record.userId))) continue;
        const guest = {
            userId: record.userId, isGuest: true, isHided: false, syncRev: record.rev,
            userChatData: names.get(String(record.userId)) || {},
            ownerDocument: () => chat,
        };
        for (const [key, value] of Object.entries(JSON.parse(JSON.stringify(record.data || {})))) guest[key] = value;
        Object.defineProperty(guest, '__baseline', {value: hashOf(sharedOf(guest)), enumerable: false, writable: true});
        known.set(String(record.userId), guest);
    }
    chat.$locals.guests = [...known.values()];
    return chat.$locals.guests;
}

/** Writes the guests that changed to their shared records (a record that moved on meanwhile wins). */
export async function persistGuests(chat, store) {
    for (const guest of guestsOf(chat)) {
        const data = sharedOf(guest);
        const hash = hashOf(data);
        if (hash === guest.__baseline) continue;
        const written = await store.update(Number(guest.userId), guest.syncRev, data, hash);
        if (written) { guest.syncRev = written.rev; guest.__baseline = hash; }
    }
}
