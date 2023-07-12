module.exports = function (build, lvl) {
        let increaseFactor;

        switch (build) {
            case "goldMine":
                increaseFactor = 0.08;
                break;
            case "crystalLake":
                increaseFactor = 0.03 * lvl;
                break;
            case "ironDeposit":
                increaseFactor = 0.05;
                break;
            default: increaseFactor = 0.5;
        }

        return increaseFactor * lvl;
};