let step = 1.15;
let currentExpCount = 1500;
let countLvls = 100;

let lvls = [];

for (let i = 1; i < countLvls; i++) {
    if (i !== 1) {
        currentExpCount = Math.ceil(currentExpCount * step);
        lvls.push({lvl: i, needExp: currentExpCount});
    } else {
        lvls.push({lvl: i, needExp: currentExpCount});
    }
}

module.exports = lvls;