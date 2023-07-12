module.exports = function (build, lvl) {
        let increaseFactor;

        switch (build) {
            case "goldMine":
                increaseFactor = 0.1;
                break;
            case "crystalLake":
                increaseFactor = 0.05 * lvl;
                break;
            case "ironDeposit":
                increaseFactor = 0.02;
                break;
            default: increaseFactor = 0.1;
        }

        return increaseFactor * lvl;
};