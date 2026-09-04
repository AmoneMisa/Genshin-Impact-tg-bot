import Clan from "../../../db/models/Clan.js";

/**
 * Returns the clan the given user belongs to, or null.
 * @param {Number} userId - telegram user id
 */
export default async function (userId) {
    return await Clan.findOne({ "members.userId": userId });
}
