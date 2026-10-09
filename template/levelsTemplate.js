// Experience needed for each level: lvls[i] is the price of the step from level i + 1 to i + 2.
// Level MAX_LEVEL is the last one, so there is no step from it.
export const MAX_LEVEL = 85;

let step = 1.15;
let currentExpCount = 1500;

let lvls = [];

for (let i = 1; i < MAX_LEVEL; i++) {
    if (i !== 1) {
        currentExpCount = Math.ceil(currentExpCount * step);
        lvls.push({lvl: i, needExp: currentExpCount});
    } else {
        lvls.push({lvl: i, needExp: currentExpCount});
    }
}

export default lvls;
