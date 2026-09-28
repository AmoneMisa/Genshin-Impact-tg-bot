import User from "../../db/models/User.js";

export default async function(userId, type = "nickname") {
    if (typeof userId === "object") {
        userId = userId.userId;
    }

    const user = await User.findOne({ userId });
    if (!user?.userChatData?.user) {
        return "";
    }

    const tgUser = user.userChatData.user;

    if (type === "nickname") {
        return tgUser.username ? tgUser.username : tgUser.id;
    }

    if (type === "name") {
        return tgUser.first_name || tgUser.username || tgUser.id;
    }

    return "";
}
