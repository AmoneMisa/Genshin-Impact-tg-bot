module.exports = function (attack, defence, modification = 0) {
    let dmg = 100 + ((attack * 5) + (modification * 5));
    return  dmg / (defence * 3);
};