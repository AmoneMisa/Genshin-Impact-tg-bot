const equipmentTemplate = require("../../../templates/equipmentTemplate");

module.exports = function (session, item) {
    let penaltyModifier = 0;

    if (!item.classOwner.includes(session.game.gameClass.stats.name)) {
        penaltyModifier += 0.55;
    }

    let minLvl = equipmentTemplate.grades[item.grade].lvl.from;

    if (minLvl > session.game.stats.lvl) {
        penaltyModifier += 0.35;
    }
}