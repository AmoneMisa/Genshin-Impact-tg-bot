module.exports = [{
    name: "noClass",
    description: "Класс без определенной специализации, представляет собой бродягу, который не обладает выдающимися навыками или способностями",
    translateName: "Бродяжка",
    attack: 1,
    defence: 1,
    criticalDamage: 1,
    criticalChance: 1,
    incomingDamageModifier: 1,
    additionalDamageMul: 1,
    maxHp: 1000,
    maxCp: 200,
    maxMp: 200,
    mp: 200,
    cp: 200,
    hp: 1000,
    hpRestoreSpeed: 5, // единиц в секунду
    mpRestoreSpeed: 2, // единиц в секунду
    cpRestoreSpeed: 1, // единиц в секунду
    speed: 1,
    block: 1,
    accuracy: 1,
    evasion: 1
}, {
    name: "warrior",
    description: "Класс-воин с высокой защитой и силой атаки, предназначенный для ближнего боя",
    translateName: "Паладин",
    attack: 2,
    defence: 4,
    criticalChance: 10,
    criticalDamage: 1.2,
    incomingDamageModifier: 1 - 0.1,
    additionalDamageMul: 1,
    maxHp: 5000,
    maxCp: 550,
    maxMp: 400,
    mp: 400,
    cp: 550,
    hp: 5000,
    hpRestoreSpeed: 4,
    mpRestoreSpeed: 2,
    cpRestoreSpeed: 4,
    speed: 2,
    block: 85,
    accuracy: 60,
    evasion: 30
}, {
    name: "mage",
    description: "Класс-маг, специализирующийся на магических атаках и обладающий высокой скоростью и маной",
    translateName: "Маг",
    attack: 4,
    defence: 2,
    criticalChance: 20,
    criticalDamage: 1.3,
    incomingDamageModifier: 1 + 0.1,
    additionalDamageMul: 1 + 0.05,
    maxHp: 2000,
    maxCp: 430,
    maxMp: 650,
    cp: 430,
    mp: 650,
    hp: 2000,
    hpRestoreSpeed: 2,
    mpRestoreSpeed: 5,
    cpRestoreSpeed: 3,
    speed: 5,
    block: 35,
    accuracy: 80,
    evasion: 40
}, {
    name: "priest",
    description: "Класс-жрец, обладающий высокой выносливостью и защитой, а также способностью исцелять союзников",
    translateName: "Прист",
    attack: 1,
    defence: 5,
    criticalChance: 5,
    criticalDamage: 1.2,
    incomingDamageModifier: 1 - 0.05,
    additionalDamageMul: 1 - 0.1,
    maxHp: 4000,
    maxCp: 780,
    maxMp: 800,
    mp: 800,
    cp: 780,
    hp: 4000,
    hpRestoreSpeed: 2,
    mpRestoreSpeed: 3.2,
    cpRestoreSpeed: 3,
    speed: 4,
    block: 75,
    accuracy: 65,
    evasion: 58
}, {
    name: "archer",
    description: "Класс-лучник, способный наносить высокий физический урон с дальней дистанции.",
    translateName: "Лучник",
    attack: 5,
    defence: 0,
    criticalChance: 25,
    criticalDamage: 1.4,
    incomingDamageModifier: 1 + 0.02,
    additionalDamageMul: 1 + 0.15,
    maxHp: 3200,
    maxCp: 400,
    maxMp: 500,
    mp: 500,
    cp: 400,
    hp: 3200,
    hpRestoreSpeed: 2,
    mpRestoreSpeed: 3,
    cpRestoreSpeed: 2,
    speed: 7,
    block: 15,
    accuracy: 115,
    evasion: 70
}];
