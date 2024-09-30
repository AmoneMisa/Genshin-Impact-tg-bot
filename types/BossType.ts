export type BossType = {
    name: string | "kivaha" | "avrora" | "fjorina" | "radjahal" | "carnevorusIsse",
    nameCall: string,
    description: string,
    listOfDamage: object[],
    availableSkills: string[],
    stats: {
        attack: number,
        defence: number,
        minDamage: number,
        maxDamage: number,
        criticalChance: number,
        criticalDamage: number,
        lvl: number,
        currentSummons: number,
        needSummons: number
    },
    skill: object
}