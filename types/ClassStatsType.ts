export type ClassStatsType = {
    name: string,
    description: string,
    translateName: string,
    attack: number,
    defence: number,
    criticalDamage: number,
    criticalChance: number,
    incomingDamageModifier: number,
    additionalDamageMul: number,
    maxHp: number,
    maxCp: number,
    maxMp: number,
    mp: number,
    cp: number,
    hp: number,
    hpRestoreSpeed: number, // единиц в секунду
    mpRestoreSpeed: number, // единиц в секунду
    cpRestoreSpeed: number, // единиц в секунду
    speed: number,
    block: number,
    accuracy: number,
    evasion: number
}