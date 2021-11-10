const bossTemplate = require("./bossTemplate");

let step = 1.15;
let countLvls = 30;
let needSummons = bossTemplate.stats.needSummons;

let lvls = [{lvl: 1, needSummons: 0}];

for (let i = 2; i < countLvls; i++) {
    if (i !== 2) {
        needSummons = Math.ceil(needSummons * step);
    }

    lvls.push({lvl: i, needSummons: needSummons});
}

module.exports = lvls;