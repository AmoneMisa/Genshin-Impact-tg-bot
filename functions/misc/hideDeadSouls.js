import Chat from "../../db/models/Chat.js";
import bot from "../../bot.js";

/**
 * Обновляет статус участников (isHided) в базе,
 * если они покинули чат, были кикнуты или забанены.
 */
export default async function() {
    const chats = await Chat.find({});

    for (const chat of chats) {
        const chatId = chat.chatId;
        let updated = false;

        for (const member of chat.members) {
            try {
                const chatMember = await bot.getChatMember(chatId, parseInt(member.userId));
                const status = chatMember.status;

                const shouldHide =
                    status === "left" || status === "kicked" || status === "banned";

                if (member.isHided !== shouldHide) {
                    member.isHided = shouldHide;
                    updated = true;
                }
            } catch (err) {
                // Если не удалось получить статус — считаем, что игрок скрыт
                member.isHided = true;
                updated = true;
            }
        }

        if (updated) {
            await chat.save();
        }
    }
}
