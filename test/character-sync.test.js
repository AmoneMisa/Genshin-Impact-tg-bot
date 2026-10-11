import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateChats, persistChat, sharedOf, pickHero, FRESH_MS} from '../functions/general/characterSync.js';

function fakeStore() {
    const rows = new Map();
    return {
        rows,
        async find(ids) { return ids.map(id => rows.get(id)).filter(Boolean).map(row => JSON.parse(JSON.stringify(row))); },
        async insert(record) { if (rows.has(record.userId)) return null; rows.set(record.userId, {...record}); return {...record}; },
        async update(userId, expectedRev, data, hash) {
            const row = rows.get(userId);
            if (!row || (expectedRev !== null && row.rev !== expectedRev)) return null;
            Object.assign(row, {data, hash, rev: row.rev + 1});
            return JSON.parse(JSON.stringify(row));
        },
    };
}
const member = (userId, game, extra = {}) => ({userId, userChatData: {chat: userId}, game, ...extra});
const chatOf = (...members) => ({members});

test('a hero is created once and every chat then shows it', async () => {
    const store = fakeStore();
    const a = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}));
    await persistChat(a, store);
    assert.equal(store.rows.get(1).data.game.stats.lvl, 10);
    assert.equal(a.members[0].syncRev, 1);

    // the same user joins another chat with a fresh hero: it takes the shared one
    const b = chatOf(member(1, {stats: {lvl: 1}, inventory: {gold: 0}}));
    await persistChat(b, store);
    assert.equal(b.members[0].game.stats.lvl, 10);
    assert.equal(b.members[0].userChatData.chat, 1, 'chat-bound fields stay');
});

test('a change in one chat reaches the other chat when it is loaded', async () => {
    const store = fakeStore();
    const a = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}));
    await persistChat(a, store);
    const b = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}, {syncRev: 1}));
    a.members[0].game.inventory.gold = 99;
    await persistChat(a, store);
    assert.equal(store.rows.get(1).rev, 2);
    await hydrateChats([b], store);
    assert.equal(b.members[0].game.inventory.gold, 99);
    assert.equal(b.members[0].syncRev, 2);
});

test('a stale copy does not overwrite a newer hero, a fresh one wins', async () => {
    const store = fakeStore();
    const first = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}));
    await persistChat(first, store, 0);
    const scheduler = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}, {syncRev: 1}));
    await hydrateChats([scheduler], store, 0);
    // meanwhile the player spends gold in another chat
    const other = chatOf(member(1, {stats: {lvl: 10}, inventory: {gold: 5}}, {syncRev: 1}));
    await hydrateChats([other], store, 0);
    other.members[0].game.inventory.gold = 1;
    await persistChat(other, store, 1000);
    assert.equal(store.rows.get(1).data.game.inventory.gold, 1);
    // the scheduler saves its old copy long after it was loaded: dropped
    scheduler.members[0].game.inventory.gold = 6;
    await persistChat(scheduler, store, FRESH_MS + 5000);
    assert.equal(store.rows.get(1).data.game.inventory.gold, 1);
    assert.equal(scheduler.members[0].game.inventory.gold, 1, 'the copy takes the newer hero');
});

test('only hero fields are shared and the highest level is the hero of a user', () => {
    const shared = sharedOf(member(2, {a: 1}, {isHided: true, sword: 7, keyboardMessage: {id: 1}}));
    assert.deepEqual(Object.keys(shared).sort(), ['game', 'sword']);
    assert.equal(pickHero([{level: 20, updatedAt: 5}, {level: 47, updatedAt: 1}, {level: 47, updatedAt: 9}]).updatedAt, 9);
});

test('a party holds heroes of other chats as guests and their changes reach their shared record', async () => {
    const {attachGuests, persistGuests, chatGuests} = await import('../functions/general/partyGuests.js');
    const {partyTargets, partyState, invitePlayer, createParty} = await import('../functions/game/party/party.js');
    const store = fakeStore();
    store.findParty = async ids => [...store.rows.values()].filter(row => ids.includes(row.data.game?.party?.id));
    store.rows.set(2, {userId: 2, rev: 3, data: {game: {stats: {lvl: 40}, party: {id: 'p1', leaderId: '1'}, gameClass: {stats: {hp: 10}}}}, hash: 'x'});
    const users = {async names() { return new Map([['2', {user: {first_name: 'Far'}}]]); }};
    const leader = member(1, {stats: {lvl: 50}, party: {id: 'p1', leaderId: '1'}, gameClass: {stats: {hp: 10}}});
    const chat = {members: [leader], $locals: {}};
    await attachGuests(chat, {partyIds: ['p1']}, {store, users});
    assert.equal(chatGuests(chat).length, 1);
    assert.equal(chat.members.length, 1, 'a guest is not a member of the chat');
    assert.equal(partyState(chat, leader).members.length, 2);
    assert.equal(partyTargets(chat, leader).length, 2);
    chatGuests(chat)[0].game.gameClass.stats.hp = 7;
    await persistGuests(chat, store);
    assert.equal(store.rows.get(2).data.game.gameClass.stats.hp, 7);
    assert.equal(store.rows.get(2).rev, 4);
});
