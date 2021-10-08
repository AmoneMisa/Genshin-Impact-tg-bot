function getLvlExpAmount() {
    let step = 1.15;
    let currentExpCount = 1000;
    let countLvls = 20;

    let lvls = [];

    for (let i = 1; i < countLvls; i++) {
        if (i !== 1) {
            currentExpCount = currentExpCount * step;
            lvls.push({lvl: i, needExp: currentExpCount});
        } else {
            lvls.push({lvl: i, needExp: currentExpCount});
        }
    }
    return lvls;
}

module.exports = getLvlExpAmount();