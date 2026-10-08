// Pure level scaling of a class stats template (no template imports, so the
// class tree builder can use it while the templates are still being built).
export default function scaleClassStats(template, lvl = 1) {
    if (!template || lvl === 1) {
        return template;
    }

    const scaled = {...template};
    scaled.attack = Math.ceil(template.attack * Math.pow(1.105, lvl - 1) + 8);
    scaled.defence = Math.ceil(template.defence * Math.pow(1.102, lvl - 1) + 6);
    scaled.hp = Math.ceil(template.maxHp * lvl * 1.036) + 45;
    scaled.maxHp = Math.ceil(template.maxHp * lvl * 1.036) + 45;
    scaled.mp = Math.ceil(template.maxMp * lvl * 1.0375) + 25;
    scaled.maxMp = Math.ceil(template.maxMp * lvl * 1.0375) + 25;
    scaled.maxCp = Math.ceil(template.maxCp * lvl * 1.0224) + 37;
    scaled.cp = Math.ceil(template.cp * lvl * 1.0224) + 37;
    // Каждые 12 уровней - +2 единицы скорости
    scaled.speed = Math.ceil(template.speed + ((lvl / 12) * 2));

    return scaled;
}
