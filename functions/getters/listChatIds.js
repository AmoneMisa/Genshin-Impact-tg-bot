import Chat from "../../db/models/Chat.js";

/** Ids only: schedulers re-read each chat under its lock so they never save stale data. */
export default async function() {
    const rows = await Chat.find({}, { chatId: 1 }).lean();
    return rows.map(row => row.chatId);
}
