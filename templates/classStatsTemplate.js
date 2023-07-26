module.exports = [{
    name: "noClass",
    description: "Класс без определенной специализации, представляет собой бродягу, который не обладает выдающимися навыками или способностями",
    translateName: "Бродяжка",
    attack: 1,
    defence: 1,
    criticalDamage: 1,
    criticalChance: 1,
    reduceIncomingDamage: 0,
    additionalDamage: 0,
    maxHp: 1000,
    maxMp: 200,
    mp: 200,
    hp: 1000,
    hpRestoreSpeed: 5, // единиц в секунду
    mpRestoreSpeed: 2, // единиц в секунду
    speed: 1
}, {
    name: "warrior",
    description: "Класс-воин с высокой защитой и силой атаки, предназначенный для ближнего боя",
    translateName: "Паладин",
    attack: 2,
    defence: 4,
    criticalChance: 10,
    criticalDamage: 1.2,
    reduceIncomingDamage: 10,
    additionalDamage: 0,
    maxHp: 5000,
    maxMp: 400,
    mp: 400,
    hp: 5000,
    hpRestoreSpeed: 7,
    mpRestoreSpeed: 3,
    speed: 2
}, {
    name: "mage",
    description: "Класс-маг, специализирующийся на магических атаках и обладающий высокой скоростью и маной",
    translateName: "Маг",
    attack: 4,
    defence: 2,
    criticalChance: 20,
    criticalDamage: 1.3,
    reduceIncomingDamage: -10,
    additionalDamage: 5,
    maxHp: 2000,
    maxMp: 650,
    mp: 650,
    hp: 2000,
    hpRestoreSpeed: 5,
    mpRestoreSpeed: 5,
    speed: 5,
}, {
    name: "priest",
    description: "Класс-жрец, обладающий высокой выносливостью и защитой, а также способностью исцелять союзников",
    translateName: "Прист",
    attack: 1,
    defence: 5,
    criticalChance: 5,
    criticalDamage: 1.2,
    reduceIncomingDamage: 5,
    additionalDamage: -10,
    maxHp: 4000,
    maxMp: 800,
    mp: 800,
    hp: 4000,
    hpRestoreSpeed: 6,
    mpRestoreSpeed: 10,
    speed: 4
}, {
    name: "archer",
    description: "Класс-лучник, способный наносить высокий физический урон с дальней дистанции.",
    translateName: "Лучник",
    attack: 5,
    defence: 0,
    criticalChance: 25,
    criticalDamage: 1.4,
    reduceIncomingDamage: -2,
    additionalDamage: 15,
    maxHp: 3200,
    maxMp: 500,
    mp: 500,
    hp: 3200,
    hpRestoreSpeed: 5,
    mpRestoreSpeed: 4,
    speed: 7
}];
