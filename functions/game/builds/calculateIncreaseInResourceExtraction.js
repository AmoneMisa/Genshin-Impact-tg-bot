// Production per hour is `productionPerHour` times this factor (2026-10-14 economy audit, docs/economy-audit-2026-10-14.md):
//  - gold mine: concave, L^0.85 (L30 = 18 000 adena/h) so that upgrades are a real choice and hunting keeps its place;
//  - crystal lake (moon dew): linear (L30 = 1 500/h); it used to grow with L^2 and flooded the only dew sinks;
//  - iron deposit and the rest: unchanged.
export default function (buildName, lvl) {
    switch (buildName) {
        case "goldMine":
            return Math.pow(lvl, 0.85);
        case "crystalLake":
            return lvl;
        case "ironDeposit":
            return 1.02 * lvl;
        default:
            return 1.01 * lvl;
    }
};
