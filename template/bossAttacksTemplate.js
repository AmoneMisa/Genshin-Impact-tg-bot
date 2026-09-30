// Active attacks each boss casts on the raid while alive (on top of its
// passive skill from bossSkillsTemplate). `power` multiplies the boss's normal
// hit; `weight` is how often it is picked. `single` hits one fighter (usually
// the top damage dealer), `all` hits every living fighter.
const bossAttacks = {
    kivaha: [
        { key: "lightning_strike", name: "Удар молнии", icon: "⚡", target: "single", power: 1.6, weight: 3, description: "Бьёт молнией самого опасного бойца." },
        { key: "thunder_shell", name: "Грозовой панцирь", icon: "🌩", target: "all", power: 0.7, weight: 2, description: "Разряд с панциря задевает всю группу." },
    ],
    avrora: [
        { key: "siren_kiss", name: "Поцелуй сирены", icon: "💋", target: "single", power: 1.5, weight: 3, description: "Зачарованный удар по одному бойцу." },
        { key: "tidal_wave", name: "Приливная волна", icon: "🌊", target: "all", power: 0.8, weight: 2, description: "Волна накрывает всех бойцов." },
    ],
    fjorina: [
        { key: "flame_spear", name: "Огненное копьё", icon: "🔥", target: "single", power: 1.7, weight: 3, description: "Пронзает бойца раскалённым копьём." },
        { key: "venom_mist", name: "Ядовитый туман", icon: "☠", target: "all", power: 0.65, weight: 2, description: "Отравленный туман по всей группе." },
    ],
    radjahal: [
        { key: "ice_fist", name: "Ледяной кулак", icon: "🧊", target: "single", power: 1.5, weight: 3, description: "Сокрушительный удар по одному бойцу." },
        { key: "blizzard", name: "Буран", icon: "❄", target: "all", power: 0.75, weight: 2, description: "Ледяная буря по всей группе." },
    ],
    carnevorusIsse: [
        { key: "strangling_vine", name: "Лоза-душитель", icon: "🌿", target: "single", power: 1.5, weight: 3, description: "Лоза обвивает и душит одного бойца." },
        { key: "twilight_flash", name: "Сумеречная вспышка", icon: "✴", target: "all", power: 0.8, weight: 2, description: "Вспышка света и тьмы по всей группе." },
    ],
};

const fallback = [
    { key: "crush", name: "Сокрушение", icon: "💥", target: "single", power: 1.4, weight: 3, description: "Мощный удар по одному бойцу." },
    { key: "roar", name: "Рёв", icon: "📣", target: "all", power: 0.7, weight: 2, description: "Оглушающий рёв по всей группе." },
];

export function getBossAttacks(bossName) {
    return bossAttacks[bossName] || fallback;
}

export default bossAttacks;
