export default [{
    name: "newbie",
    needLvl: 5,
    translatedName: "Спираль новичка",
    freeSpins: 3,
    piecesForFleeCall: 5,
    gradesForSpin: [{value: "noGrade", chance: 0.7}, {value: "D", chance: 0.285}, {value: "C", chance: 0.015}],
    spinCost: {
        gold: 600
    }
}, {
    name: "common",
    needLvl: 20,
    translatedName: "Обычная спираль",
    freeSpins: 2,
    piecesForFleeCall: 15,
    gradesForSpin: [{value: "D", chance: 0.644}, {value: "C", chance: 0.336}, {value: "B", chance: 0.02}],
    spinCost: {
        gold: 2200
    }
}, {
    name: "rare",
    needLvl: 52,
    translatedName: "Спираль редкостей",
    freeSpins: 1,
    piecesForFleeCall: 45,
    gradesForSpin: [{value: "B", chance: 0.72}, {value: "A", chance: 0.245}, {value: "S", chance: 0.035}],
    spinCost: {
        moonDew: 3,
        gold: 12000
    }
}, {
    name: "royal",
    needLvl: 61,
    translatedName: "Королевская спираль",
    freeSpins: 1,
    piecesForFleeCall: 85,
    gradesForSpin: [{value: "A", chance: 0.75}, {value: "S", chance: 0.22}, {value: "S80", chance: 0.03}],
    spinCost: {
        moonDew: 12,
        gold: 50000,
    }
}, {
    name: "goddess",
    needLvl: 76,
    translatedName: "Божественная спираль",
    freeSpins: 1,
    piecesForFleeCall: 120,
    gradesForSpin: [{value: "S", chance: 0.65}, {value: "S80", chance: 0.28}, {value: "S84", chance: 0.07}],
    spinCost: {
        moonDew: 30,
        gold: 250000,
    }
}]