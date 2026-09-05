import Chat from "../../../db/models/Chat.js";
import settleBuildUpgrade from './settleBuildUpgrade.js';

export default async function(chatId, userId, buildName) {
    const chat = await Chat.findOne({ chatId });
    if (!chat) throw new Error(`Чат ${chatId} не найден`);

    const member = chat.members.find(m => m.userId === userId);
    if (!member) throw new Error(`Игрок ${userId} не найден`);

    const build = member.game.builds?.[buildName];

    // Complete an expired upgrade timer right here instead of waiting for the
    // hourly cron (checkAccumulateTimer.js) — every builds callback reads
    // through this function, so this is the one place that keeps the bot menu
    // in sync with the persisted timer as soon as a player looks at it, the
    // same way miniapp/builds.js already settles on every Mini App read.
    if (build && settleBuildUpgrade(build, buildName)) {
        chat.markModified("members");
        await chat.save();
    }

    return build;
};
