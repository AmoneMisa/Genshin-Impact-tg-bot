import Character from '../../db/models/Character.js';

/** The MongoDB store of characterSync.js. */
export const characterStore = {
    async find(userIds) {
        const rows = [];
        for (let i = 0; i < userIds.length; i += 1000) {
            rows.push(...await Character.find({userId: {$in: userIds.slice(i, i + 1000)}}).lean());
        }
        return rows;
    },
    async findParty(partyIds) {
        return Character.find({'data.game.party.id': {$in: partyIds}}).lean();
    },
    async insert(record) {
        try { return (await Character.create(record)).toObject(); }
        catch (error) { if (error?.code === 11000) return null; throw error; }
    },
    async update(userId, expectedRev, data, hash) {
        const filter = expectedRev === null ? {userId} : {userId, rev: expectedRev};
        return Character.findOneAndUpdate(filter, {$set: {data, hash}, $inc: {rev: 1}}, {new: true}).lean();
    },
};

/** Telegram profiles of the users, for the names of heroes that are not members of the loaded chat. */
export const guestUsers = {
    async names(userIds) {
        const {default: User} = await import('../../db/models/User.js');
        const rows = await User.find({userId: {$in: userIds.map(Number)}}, {userId: 1, userChatData: 1}).lean();
        return new Map(rows.map(row => [String(row.userId), row.userChatData || {}]));
    },
};
