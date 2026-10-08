// Share of an incoming PvE hit that gets through the target's defence
// (1 = nothing blocked, 0.5 = the most defence can ever block). The reference
// defence is what a class with a defence stat of 10 has at that level, so the
// curve follows the same level scaling as scaleClassStats.js.
export function defenceReference(lvl = 1) {
    return 10 * Math.pow(1.102, Math.max(1, lvl) - 1) + 6;
}

export default function damageMitigation(defence, lvl = 1) {
    const value = Math.max(0, Number(defence) || 0);
    return 1 - 0.5 * value / (value + defenceReference(lvl));
}
