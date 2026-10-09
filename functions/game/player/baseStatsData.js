// The six base characteristics of Lineage II (STR, DEX, CON, INT, WIT, MEN): names, what each one does
// here and the starting values of every class line (the numbers of the real starting classes).
export const BASE_STATS = Object.freeze(['STR', 'DEX', 'CON', 'INT', 'WIT', 'MEN']);

export const BASE_STAT_INFO = Object.freeze({
    STR: {name: 'Сила', icon: '💪', text: 'Атака воинов, лучников и разбойников'},
    DEX: {name: 'Ловкость', icon: '🏹', text: 'Точность, уклонение, скорость боя и шанс крита'},
    CON: {name: 'Выносливость', icon: '❤️', text: 'Максимальное HP и его восстановление'},
    INT: {name: 'Интеллект', icon: '🔮', text: 'Атака магов и сила лечения жрецов'},
    WIT: {name: 'Мудрость', icon: '⚡', text: 'Скорость применения навыков, шанс крита магов'},
    MEN: {name: 'Дух', icon: '🧿', text: 'Максимальная мана и её восстановление'},
});

/** Starting values of a class line (what a level-1 character has before gear). */
export const FAMILY_BASE_STATS = Object.freeze({
    warrior: {STR: 40, DEX: 30, CON: 43, INT: 21, WIT: 11, MEN: 25},
    berserk: {STR: 40, DEX: 26, CON: 47, INT: 18, WIT: 12, MEN: 27},
    archer: {STR: 36, DEX: 35, CON: 36, INT: 23, WIT: 14, MEN: 26},
    rogue: {STR: 41, DEX: 34, CON: 32, INT: 25, WIT: 12, MEN: 26},
    mage: {STR: 22, DEX: 21, CON: 27, INT: 41, WIT: 20, MEN: 39},
    priest: {STR: 22, DEX: 21, CON: 27, INT: 40, WIT: 20, MEN: 44},
});

export const DEFAULT_BASE_STATS = FAMILY_BASE_STATS.warrior;
