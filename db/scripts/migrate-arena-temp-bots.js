const mongoose = require('mongoose');
import GameClass from "../models/gameClass.js";
import Skill from "../models/skill.js";
import ArenaTempBot from "../models/arenaTempBot.js";
import RAW from '../../arenaTempBots.json';

const CLASS_KEY_MAP = { archer: 'archer', mage: 'mage', priest: 'priest', warrior: 'warrior' };

async function upsertClass(gc) {
    const key = CLASS_KEY_MAP[gc.stats.name] || gc.stats.name;
    return GameClass.findOneAndUpdate(
        { key },
        {
            key,
            stats: {
                name: gc.stats.name,
                translateName: gc.stats.translateName,
                description: gc.stats.description,
                attack: gc.stats.attack,
                defence: gc.stats.defence,
                criticalChance: gc.stats.criticalChance,
                criticalDamage: gc.stats.criticalDamage,
                incomingDamageModifier: gc.stats.incomingDamageModifier,
                additionalDamageMul: gc.stats.additionalDamageMul,
                speed: gc.stats.speed,
                block: gc.stats.block,
                accuracy: gc.stats.accuracy,
                evasion: gc.stats.evasion
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean(false);
}

async function upsertSkill(classId, s) {
    return Skill.findOneAndUpdate(
        { class: classId, slot: s.slot },
        {
            name: s.name,
            description: s.description,
            class: classId,
            slot: s.slot,
            effect: s.effect,
            cooldown: s.cooldown ?? 0,
            isSelf: !!s.isSelf,
            isDealDamage: !!s.isDealDamage,
            isHeal: !!s.isHeal,
            isShield: !!s.isShield,
            isBuff: !!s.isBuff,
            needLvl: s.needLvl ?? 1,
            costHp: s.costHp ?? 0,
            cost: s.cost ?? 0,
            damageModifier: s.damageModifier,
            healPower: s.healPower,
            shieldPower: s.shieldPower,
            vampirePower: s.vampirePower
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean(false);
}

async function run() {
    await mongoose.connect(process.env.MONGO_URL);

    for (const item of RAW) {
        const gcDoc = await upsertClass(item.gameClass);

        // апсертим (или берём) умения класса по слотам
        const skillIds = [];
        for (const s of item.gameClass.skills) {
            const sk = await upsertSkill(gcDoc._id, s);
            skillIds.push(sk._id);
        }

        // сохраняем бота
        await ArenaTempBot.findOneAndUpdate(
            { name: item.name },
            {
                name: item.name,
                level: item.stats?.lvl ?? 1,
                rating: item.rating ?? 1000,
                class: gcDoc._id,
                skills: skillIds,
                classStatsSnapshot: {
                    attack: item.gameClass.stats.attack,
                    defence: item.gameClass.stats.defence,
                    criticalChance: item.gameClass.stats.criticalChance,
                    criticalDamage: item.gameClass.stats.criticalDamage,
                    incomingDamageModifier: item.gameClass.stats.incomingDamageModifier,
                    additionalDamageMul: item.gameClass.stats.additionalDamageMul,
                    maxHp: item.gameClass.stats.maxHp,
                    maxCp: item.gameClass.stats.maxCp,
                    maxMp: item.gameClass.stats.maxMp,
                    hp: item.gameClass.stats.hp,
                    cp: item.gameClass.stats.cp,
                    mp: item.gameClass.stats.mp,
                    hpRestoreSpeed: item.gameClass.stats.hpRestoreSpeed,
                    mpRestoreSpeed: item.gameClass.stats.mpRestoreSpeed,
                    cpRestoreSpeed: item.gameClass.stats.cpRestoreSpeed,
                    speed: item.gameClass.stats.speed,
                    block: item.gameClass.stats.block,
                    accuracy: item.gameClass.stats.accuracy,
                    evasion: item.gameClass.stats.evasion
                }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
    }

    console.log('✓ arena_temp_bots seeded');
    await mongoose.disconnect();
}

run().catch(async (e) => {
    console.error(e);
    process.exit(1);
});