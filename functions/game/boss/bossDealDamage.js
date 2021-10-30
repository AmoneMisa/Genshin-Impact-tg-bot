const mathBossDamage = require('./mathBossDamage');
const bossPunishPlayer = require('./bossPunishPlayer');

module.exports = function (members, boss, chatId) {
    for (let member of Object.values(members)) {
        let dmg = mathBossDamage(boss, member);

        if (member.game.boss.hasOwnProperty("shield")) {
            if (member.game.boss.shield > 0) {
                if (dmg > member.game.boss.shield) {
                    member.game.boss.shield = 0;
                    dmg = member.game.boss.shield;
                }
                member.game.boss.shield -= dmg;
            }
        }

        member.game.boss.damagedHp -= dmg;

        bossPunishPlayer(member.game.boss, chatId, member);
    }
};