module.exports = function (session) {
    if (session.game.hasOwnProperty("gameClass")) {
        return {skills: session.game.gameClass.skills, stats: session.game.gameClass.stats, name: session.game.gameClass.name};
    }
};