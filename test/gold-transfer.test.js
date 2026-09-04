import test from 'node:test';
import assert from 'node:assert/strict';
import { parseGoldAmount, transferGoldInChat } from '../functions/game/gold/transferGold.js';

function chat(senderGold = 1000, recipientGold = 50) {
    return {
        members: [
            { userId: 1, game: { inventory: { gold: senderGold } } },
            { userId: 2, game: { inventory: { gold: recipientGold } } },
        ],
    };
}

test('gold amount parser accepts only positive safe integers', () => {
    assert.equal(parseGoldAmount('100'), 100);
    assert.equal(parseGoldAmount(' 42 '), 42);
    assert.equal(parseGoldAmount(7), 7);
    assert.equal(parseGoldAmount('-100'), null);
    assert.equal(parseGoldAmount('100abc'), null);
    assert.equal(parseGoldAmount('1.5'), null);
    assert.equal(parseGoldAmount('0'), null);
    assert.equal(parseGoldAmount(Number.MAX_SAFE_INTEGER + 1), null);
});

test('gold transfer moves the exact amount between members', () => {
    const state = chat();
    const result = transferGoldInChat(state, 1, 2, '250');

    assert.equal(result.ok, true);
    assert.equal(result.amount, 250);
    assert.equal(state.members[0].game.inventory.gold, 750);
    assert.equal(state.members[1].game.inventory.gold, 300);
});

test('gold transfer rejects negative amount exploit without mutating balances', () => {
    const state = chat();
    const result = transferGoldInChat(state, 1, 2, '-500');

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid_amount');
    assert.equal(state.members[0].game.inventory.gold, 1000);
    assert.equal(state.members[1].game.inventory.gold, 50);
});

test('gold transfer rejects self transfer and insufficient balance', () => {
    const state = chat(100, 50);
    assert.equal(transferGoldInChat(state, 1, 1, 10).reason, 'self_transfer');
    assert.equal(transferGoldInChat(state, 1, 2, 101).reason, 'not_enough_gold');
    assert.equal(state.members[0].game.inventory.gold, 100);
    assert.equal(state.members[1].game.inventory.gold, 50);
});

test('gold transfer rejects hidden or missing recipients', () => {
    const hidden = chat();
    hidden.members[1].isHided = true;
    assert.equal(transferGoldInChat(hidden, 1, 2, 10).reason, 'recipient_not_found');

    const missing = chat();
    missing.members.pop();
    assert.equal(transferGoldInChat(missing, 1, 2, 10).reason, 'recipient_not_found');
});

test('gold transfer rejects bots and members who left the chat', () => {
    const botRecipient = chat();
    botRecipient.members[1].userChatData = {
        status: 'member',
        user: { is_bot: true },
    };
    assert.equal(transferGoldInChat(botRecipient, 1, 2, 10).reason, 'recipient_not_found');

    const leftRecipient = chat();
    leftRecipient.members[1].userChatData = {
        status: 'left',
        user: { is_bot: false },
    };
    assert.equal(transferGoldInChat(leftRecipient, 1, 2, 10).reason, 'recipient_not_found');
});
