function finiteNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseGoldAmount(value) {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? value : null;
    }

    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!/^[0-9]+$/.test(normalized)) return null;

    const amount = Number(normalized);
    return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function isUnavailableRecipient(member) {
    const status = member?.userChatData?.status;
    return Boolean(
        member?.isHided ||
        member?.userChatData?.user?.is_bot ||
        status === 'left' ||
        status === 'kicked'
    );
}

export function transferGoldInChat(chat, senderId, recipientId, rawAmount) {
    if (!chat?.members || !Array.isArray(chat.members)) {
        return { ok: false, reason: 'chat_not_found' };
    }

    const amount = parseGoldAmount(rawAmount);
    if (!amount) {
        return { ok: false, reason: 'invalid_amount' };
    }

    if (String(senderId) === String(recipientId)) {
        return { ok: false, reason: 'self_transfer' };
    }

    const sender = chat.members.find(member => String(member.userId) === String(senderId));
    const recipient = chat.members.find(member => String(member.userId) === String(recipientId));

    if (!sender) {
        return { ok: false, reason: 'sender_not_found' };
    }
    if (!recipient || isUnavailableRecipient(recipient)) {
        return { ok: false, reason: 'recipient_not_found' };
    }

    if (!sender.game) sender.game = {};
    if (!sender.game.inventory) sender.game.inventory = {};
    if (!recipient.game) recipient.game = {};
    if (!recipient.game.inventory) recipient.game.inventory = {};

    const senderGold = finiteNumber(sender.game.inventory.gold);
    const recipientGold = finiteNumber(recipient.game.inventory.gold);

    if (senderGold < amount) {
        return {
            ok: false,
            reason: 'not_enough_gold',
            amount,
            senderGold,
        };
    }

    sender.game.inventory.gold = senderGold - amount;
    recipient.game.inventory.gold = recipientGold + amount;

    return {
        ok: true,
        amount,
        senderId: Number(sender.userId),
        recipientId: Number(recipient.userId),
        senderGold: sender.game.inventory.gold,
        recipientGold: recipient.game.inventory.gold,
    };
}
