const bossTemplate = require("./bossTemplate");

module.exports = function (bossName) {
    let step = 1.15;
    let countLvls = 30;
    let template = bossTemplate.find((boss) => boss.name === bossName);
    if (!template) {
        throw new Error(`Босса с таким именем не найдено в шаблоне: ${bossName}`);
    }

    let needSummons = template?.stats?.needSummons;
    if (!needSummons) {
        throw new Error(`У шаблона босса с именем: ${bossName} - не найдено поле "needSummons"`);
    }

    let lvls = [{lvl: 1, needSummons: 0}];

    for (let i = 2; i < countLvls; i++) {
        if (i !== 2) {
            needSummons += Math.ceil(needSummons * step);
        }

        lvls.push({lvl: i, needSummons: needSummons});
    }

    return lvls;
};