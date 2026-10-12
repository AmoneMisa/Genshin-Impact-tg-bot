import {SOUL_COLORS,SOUL_GOLD_PRICES,soulCrystalKey} from './soulCrystalData.js';
import buffPotions from './buffPotions.js';
import {LIFESTONE_SHOP, LIFESTONE_LEVELS, lifestoneKey} from './augmentData.js';
import {SHOT_GRADES, SHOT_KINDS, SHOT_PACK, SHOT_PACK_PRICE, gradeLabel, shotKey} from './shotsData.js';

// Mid Life Stones (Lineage II sells them up to level 78, grade S); one of each a day.
const midLifeStones = Object.entries(LIFESTONE_SHOP.mid).map(([grade, cost]) => ({
    name: `Камень жизни: средний · ${LIFESTONE_LEVELS[grade]} ур.`, cost, time: 1, command: `lifestoneMid-${grade}`, category: 'stones',
    material: {key: lifestoneKey(grade, 'mid'), amount: 1},
    message: `Аугментация оружия и бижутерии в кузнице.`,
}));

// Packs of shots per weapon grade; any number of packs a day.
export const SHOT_COMMANDS = SHOT_KINDS.flatMap(kind => SHOT_GRADES.map(grade => `shot-${kind.id}-${grade}`));
const shotPacks = SHOT_KINDS.flatMap(kind => SHOT_GRADES.map(grade => ({
    name: `${kind.label} ×${SHOT_PACK} (${gradeLabel(grade)})`, cost: SHOT_PACK_PRICE[grade] * kind.price, time: 1,
    command: `shot-${kind.id}-${grade}`, category: 'shots', repeatable: true,
    material: {key: shotKey(kind.id, grade), amount: SHOT_PACK},
    message: `ты получил ${SHOT_PACK} зарядов (${gradeLabel(grade)}). Включи автозаряды в бою.`,
})));

const soulCrystals=Object.entries(SOUL_COLORS).flatMap(([color,label])=>SOUL_GOLD_PRICES.map((cost,stage)=>({name:label+' кристалл души · '+stage+' ур.',cost,time:1,command:'soul-'+color+'-'+stage,category:'soul',repeatable:true,material:{key:soulCrystalKey(color,stage),amount:1},message:'Кристалл для прокачки и установки SA в оружие.'})));
export default [
    ...soulCrystals,
    ...midLifeStones,
    ...shotPacks,
    ...buffPotions.filter(p=>!p.donateOnly).map(p=>({name:p.name,cost:p.cost,time:1,command:'potionBuff-'+p.id,potionId:p.id,message:p.description,category:'player'})),
    {name: "Иммунитет к уменьшению меча", cost: 3800, time: 1, command: "swordImmune", message: "ты получил одноразовый иммунитет к уменьшению меча", category: "sword"},
    {name: "Увеличить меч на 25 мм", cost: 5000, time: 1, command: "swordAddMm", message: "ты увеличил свой меч на 25 мм!", category: "sword"},
    {name: "Увеличить урон на 75% ", cost: 1500, time: 1, command: "bossAddDmg", message: "ты увеличил свой урон по боссу на 75%", category: "boss"},
    {name: "Увеличить крит шанс на 50%", cost: 1500, time: 1, command: "bossAddCrChance", message: "ты увеличил свой крит шанс по боссу на 50%", category: "boss"},
    {name: "Увеличить крит урон на 150%", cost: 1500, time: 1, command: "bossAddCrDmg", message: "ты увеличил свой крит урон по боссу на 150%", category: "boss"},
    {name: "Доп. увеличение меча", cost: 1000, time: 1, command: "swordAddTry", message: "ты получил дополнительную попытку для увеличения меча", category: "sword"},
    {name: "Tiny HP Potion", cost: 750, time: 1, command: "potionHp1000", message: "Восстанавливает 1000 HP тиками в течение 15 секунд.", category: "player"},
    {name: "Small HP Potion", cost: 1850, time: 1, command: "potionHp3000", message: "Восстанавливает 3000 HP тиками в течение 15 секунд.", category: "player"},
    {name: "Medium HP Potion", cost: 4250, time: 1, command: "potionHp8000", message: "Восстанавливает 8000 HP тиками в течение 15 секунд.", category: "player"},
    {name: "Tiny MP Potion", cost: 5000, time: 1, command: "potionMp180", message: "Мгновенно восстанавливает 180 MP.", category: "player"},
    {name: "Small MP Potion", cost: 8800, time: 1, command: "potionMp300", message: "Мгновенно восстанавливает 300 MP.", category: "player"},
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
