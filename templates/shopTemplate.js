module.exports = [
    {name: "Иммунитет к уменьшению меча", cost: 3800, time: 1, command: "swordImmune", message: "ты получил одноразовый иммунитет к уменьшению меча", category: "sword"},
    {name: "Увеличить меч на 25 мм", cost: 5000, time: 1, command: "swordAddMm", message: "ты увеличил свой меч на 25 мм!", category: "sword"},
    {name: "Увеличить урон на 75% ", cost: 1500, time: 1, command: "bossAddDmg", message: "ты увеличил свой урон по боссу на 75%", category: "boss"},
    {name: "Увеличить крит шанс на 50%", cost: 1500, time: 1, command: "bossAddCrChance", message: "ты увеличил свой крит шанс по боссу на 50%", category: "boss"},
    {name: "Увеличить крит урон на 150%", cost: 1500, time: 1, command: "bossAddCrDmg", message: "ты увеличил свой крит урон по боссу на 150%", category: "boss"},
    {name: "Доп. увеличение меча", cost: 1000, time: 1, command: "swordAddTry", message: "ты получил дополнительную попытку для увеличения меча", category: "sword"},
    {name: "Малое зелье ХП", cost: 750, time: 1, command: "potionHp1000", message: "ты получил зелье восстановления хп на 1000 единиц", category: "player"},
    {name: "Среднее зелье ХП", cost: 1850, time: 1, command: "potionHp3000", message: "ты получил зелье восстановления хп на 3000 единиц", category: "player"},
    {name: "Доп. открытие сундучков", cost: 5000, time: 1, command: "chestAddTry", message: "ты получил дополнительную попытку для сундучков", category: "misc"},
    {name: "Эльфийский вид для дворца", cost: 30000, time: 1, command: "palaceElven", type: "elven", message: "ты получил новый вид для дворца! Чтобы его применить, измени вид дворца через меню построек", category: "builds"},
    {name: "Королевский вид для дворца", cost: 33000, time: 1, command: "palaceRoyal", type: "royal", message: "ты получил новый вид для дворца! Чтобы его применить, измени вид дворца через меню построек", category: "builds"},
    // {name: "Готический вид для дворца", cost: 28000, time: 1, command: "palaceGothic", type: "gothic", message: "ты получил новый вид для дворца! Чтобы его применить, измени вид дворца через меню построек", category: "builds"},
    // {name: "Пляжный вид для дворца", cost: 12000, time: 1, command: "palaceBeach", type: "beach", message: "ты получил новый вид для дворца! Чтобы его применить, измени вид дворца через меню построек", category: "builds"},
    {name: "Изменить название дворца", cost: 15000, time: 1, command: "palaceChangeName", message: "ты получил карточку для смены названия дворца! Чтобы её применить, измени название дворца через меню построек", category: "builds"},
];

//Категории:
// sword - всё для меча,
// boss - всё, что относится непосредственно к боссу,
// player - то, что относится к игроку,
// builds - то, что относится к постройкам,
// misc - разное, для игр