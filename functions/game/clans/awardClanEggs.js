import Clan from '../../../db/models/Clan.js';
import { CLAN_EGGS } from './clanPerks.js';

/**
 * Puts an egg into the warehouse of every clan that had a member in the raid. Atomic ($inc), so it
 * never collides with other saves of the same clan. Returns the names of the clans that got it.
 */
export default async function awardClanEggs(userIds, egg) {
    if (!egg?.key || !CLAN_EGGS[egg.key] || !userIds?.length) return [];
    const clans = await Clan.find({'members.userId': {$in: userIds.map(Number)}}, {_id: 1, name: 1});
    await Promise.all(clans.map(clan => Clan.updateOne({_id: clan._id}, {$inc: {[`warehouse.${egg.key}`]: egg.count}})));
    return clans.map(clan => clan.name);
}
