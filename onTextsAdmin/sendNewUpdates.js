import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import deleteMessage from '../functions/tgBotFunctions/deleteMessage.js';
import { myId } from '../config.js';
import Chat from '../db/models/Chat.js';
import bot from '../bot.js';

export default [[/(?:^|\s)\/send_new_updates\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    await sendMessage(msg.from.id, "Сообщение для рассылки новостей", {
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(promptMsg => {
            let id = bot.onReplyToMessage(promptMsg.chat.id, promptMsg.message_id, async (replyMsg) => {
                bot.removeReplyListener(id);

                // Collect the telegram user ids of every subscribed (opted-in) member.
                const recipients = new Set();
                const chats = await Chat.find({});

                for (const chat of chats) {
                    for (const member of chat.members) {
                        if (member.userChatData?.user?.is_bot) {
                            continue;
                        }

                        if (!member.whatsNewSettings?.flag) {
                            continue;
                        }

                        recipients.add(member.userId);
                    }
                }

                for (const userId of recipients) {
                    await sendMessage(userId, `Новости: ${replyMsg.text}`, {
                        disable_notification: true
                    });
                }
            })
        }
    );
}]];