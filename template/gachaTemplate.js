export default [{
    name: "newbie",
    needLvl: 5,
    translatedName: "Спираль новичка",
    freeSpins: 10,
    piecesForFleeCall: 5,
    gradesForSpin: [{value: "noGrade", chance: 0.7}, {value: "D", chance: 0.285}, {value: "C", chance: 0.015}],
    spinCost: {
        gold: 1500
    }
}, {
    name: "common",
    needLvl: 21,
    translatedName: "Обычная спираль",
    freeSpins: 7,
    piecesForFleeCall: 15,
    gradesForSpin: [{value: "D", chance: 0.644}, {value: "C", chance: 0.336}, {value: "B", chance: 0.02}],
    spinCost: {
        gold: 7800
    }
}, {
    name: "rare",
    needLvl: 45,
    translatedName: "Спираль редкостей",
    freeSpins: 3,
    piecesForFleeCall: 45,
    gradesForSpin: [{value: "B", chance: 0.72}, {value: "A", chance: 0.245}, {value: "S", chance: 0.035}],
    spinCost: {
        crystals: 45,
        gold: 27550
    }
}, {
    name: "royal",
    needLvl: 59,
    translatedName: "Королевская спираль",
    freeSpins: 3,
    piecesForFleeCall: 85,
    gradesForSpin: [{value: "A", chance: 0.75}, {value: "S", chance: 0.22}, {value: "SS", chance: 0.03}],
    spinCost: {
        crystals: 170,
        gold: 55000,
    }
}, {
    name: "goddess",
    needLvl: 78,
    translatedName: "Божественная спираль",
    freeSpins: 3,
    piecesForFleeCall: 120,
    gradesForSpin: [{value: "S", chance: 0.65}, {value: "SS", chance: 0.28}, {value: "SSS", chance: 0.07}],
    spinCost: {
        crystals: 550,
        gold: 355000,
    }
}]