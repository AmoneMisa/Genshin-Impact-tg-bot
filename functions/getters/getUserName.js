export default function (session, type = "nickname") {
    if (type === "nickname") {
        return session.userChatData.user.username ? session.userChatData.user.username : session.userChatData.user.id;
    }

    if (type === "name") {
        return session.userChatData.user.first_name;
    }
}