module.exports = function (buildName, lvl) {
        let increaseFactor;

        switch (buildName) {
            case "goldMine":
                increaseFactor = 1.01;
                break;
            case "crystalLake":
                increaseFactor = 1.05 * lvl;
                break;
            case "ironDeposit":
                increaseFactor = 1.02;
                break;
            default: increaseFactor = 1.01;
        }

        return increaseFactor * lvl;
};