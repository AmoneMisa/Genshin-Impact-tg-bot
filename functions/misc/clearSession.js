module.exports = function (session) {
    if (session.game.gameClass.boss) {
        if (session.game.gameClass.boss.hasOwnProperty("isDead")) {
            delete session.game.gameClass.boss.isDead;
        }

        if (session.game.gameClass.boss.hasOwnProperty("damagedHp")) {
            delete session.game.gameClass.boss.damagedHp;
        }

        if (session.game.gameClass.boss.hasOwnProperty("hp")) {
            delete session.game.gameClass.boss.hp;
        }

        if (session.game.gameClass.boss.hasOwnProperty("damage")) {
            delete session.game.gameClass.boss.damage;
        }
    }

    if (session.game.hasOwnProperty("builds")) {
        if (session.game.builds.hasOwnProperty("stealImmuneTimer")) {
            delete session.game.builds.stealImmuneTimer;
        }

        if (session.game.builds.hasOwnProperty("chanceToSteal")) {
            delete session.game.builds.chanceToSteal;
        }

        if (session.game.builds.hasOwnProperty("stealChance")) {
            delete session.game.builds.stealChance;
        }
    }

    if (session.game.hasOwnProperty("reddit")) {
        delete session.reddit;
    }

    if (session.game.hasOwnProperty("timerBossCallback")) {
        delete session.timerBossCallback;
    }
}