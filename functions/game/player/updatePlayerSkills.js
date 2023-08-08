const getGameClassSkillsFromTemplate = require('./getters/getGameClassSkillsFromTemplate');
const changePlayerClass = require("./changePlayerGameClass");

module.exports = function (session) {
    let template = getGameClassSkillsFromTemplate(session?.game?.gameClass?.stats?.name);

    if (!session.game.hasOwnProperty("gameClass")) {
        changePlayerClass(session, "noClass");
    }

    delete session.timerDealDamageCallback;
    if (!session.game.gameClass.skills || !Array.isArray(session.game.gameClass.skills)) {
        session.game.gameClass.skills = [...template];
    }

    let newSkillsArray = [];
    for (let skill of session.game.gameClass.skills) {
        delete skill.crystalCost;

        skill = Object.assign({}, skill, template[skill.slot]);
        newSkillsArray.push(skill);
    }
    session.game.gameClass.skills = newSkillsArray;
};