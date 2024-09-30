export type EquipmentType = {
    name: string,
    description: string,
    grade: "noGrade" | "D" | "C" | "B" | "A" | "S" | "SS" | "SSS",
    classOwner: 'warrior' | 'assassin' | 'archer' | 'mage' | 'priest',
    quality: { current: number, max: number },
    persistence: { current: number, max: number },
    rarity: "break" | "common" | "unusual" | "special" | "unique" | "rare" | "royal" | "magic" | "goddess",
    rarityTranslated: string,
    mainType: 'weapon' | 'armor' | 'shield',
    category: 'sword' | 'dagger' | 'mace' | 'bow' | 'blunt' | 'fists' | 'helmet' | 'gloves' | 'greaves' | 'boots' | 'body' | 'fullBody' | 'bigShield' | 'smallShield' | 'sigill',
    kind: 'oneHandedSword' | 'twoHandedSword' | 'dagger' | 'mace' | 'bow' | 'crossbow' | 'blunt' | 'fists' | 'heavy' | 'medium' | 'light' | 'robe' | 'bigShield' | 'smallShield' | 'sigill',
    characteristics: object,
    translatedName: string,
    slots: number,
    stats: object[],
    cost: number,
    isUsed: boolean
}