export type UserSkillType = {
    slot: number,
    name: string,
    description: string,
    effect: string,
    damageModifier: number,
    cooldown: number,
    isSelf: boolean,
    isDealDamage: boolean,
    isHeal: boolean,
    isShield: boolean,
    isBuff: boolean,
    needLvl: number,
    costHp: number,
    cost: number,
    cooldownReceive: number
}