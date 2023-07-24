module.exports = function (members, dmgList) {
    let message = `Босс нанёс урон всей группе:\n\n`;

    for (let dmg of Object.values(dmgList)) {
        message += `@${dmg.username} - ${dmg.dmg} урона\n`;
        message += `@${member.userChatData.user.username}, ты был повержен(-а) боссом.\n`;

    }

    return message;
};