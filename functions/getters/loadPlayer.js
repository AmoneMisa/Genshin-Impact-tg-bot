import getSession from "./getSession.js";
import getChatSession from "./getChatSession.js";

/**
 * Loads a chat member for MUTATION.
 *
 * getSession() guarantees the member (with all default fields) exists and saves
 * that on its own throwaway chat instance — but a caller mutating its return
 * value and never saving loses the change. This helper reloads the chat so the
 * caller mutates and saves the SAME instance:
 *
 *   const { chat, member } = await loadPlayer(chatId, userId);
 *   member.game.inventory.gold += 100;
 *   await chat.save();
 *
 * @param {Number|String} chatId
 * @param {Number|String} userId
 * @returns {Promise<{chat: Object, member: Object}>}
 */
export default async function (chatId, userId) {
    await getSession(chatId, userId); // ensure member + default fields exist
    const chat = await getChatSession(chatId);
    const member = chat.members.find(m => m.userId?.toString() === userId.toString());
    return { chat, member };
}
