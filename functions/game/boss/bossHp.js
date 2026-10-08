// Boss health: scales with the size of the chat (more fighters, more hp) and the
// boss's own `combat.hpMul`, with a modest random spread. The chat size is
// clamped so a tiny chat is not trivial and a huge one is not endless.
export const HP_PER_MEMBER = 6780;
export const MIN_MEMBERS = 3;
export const MAX_MEMBERS = 60;
export const HP_SPREAD = [1.8, 3.0];

export default function computeBossHp({members, template, skillEffect = '', random = Math.random}) {
    const count = Math.min(MAX_MEMBERS, Math.max(MIN_MEMBERS, Number(members) || MIN_MEMBERS));
    const [low, high] = HP_SPREAD;
    const spread = low + random() * (high - low);
    let hp = count * HP_PER_MEMBER * spread * (Number(template?.combat?.hpMul) || 1);

    if (String(skillEffect).includes('rage')) {
        hp = hp / 2;
    }
    return Math.round(hp);
}
