import getMembers from "../getters/getMembers.js";
import User from "../../db/models/User.js";

export default async function(chatId, name, includeHimself = true, callerId) {
    const members = await getMembers(chatId);
    if (!members || members.length === 0) {
        return [];
    }

    const userIds = members.map(m => m.userId.toString());
    const users = await User.find({ userId: { $in: userIds } });

    let buttons = [];
    let tempRow = [];

    for (const member of members) {
        const user = users.find(u => u.userId.toString() === member.userId.toString());
        if (!user) {
            continue;
        }

        if (user.userChatData?.user?.is_bot || member.isHided) {
            continue;
        }
        if (!includeHimself && user.userId.toString() === callerId.toString()) {
            continue;
        }

        tempRow.push({
            text: user.userChatData?.user?.first_name || "Без имени",
            callback_data: `${name}.${user.userId}`
        });

        if (tempRow.length === 3) {
            buttons.push(tempRow);
            tempRow = [];
        }
    }

    if (tempRow.length > 0) {
        buttons.push(tempRow);
    }

    return buttons;
}
