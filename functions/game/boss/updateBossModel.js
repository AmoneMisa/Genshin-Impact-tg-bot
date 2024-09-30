import {bosses} from "../../../data.js";
import bossesTemplate from '../../../template/bossTemplate.js';

export default function () {
    let newBosses = {};
    for (let [chatId, bossesArray] of Object.entries(bosses)) {
        if (Array.isArray(bossesArray)) {
            let newBossesArray = [];
            for (let boss of bossesArray) {
                let template = bossesTemplate.find(_boss => _boss.name === boss.name || _boss.nameCall === boss.nameCall);

                if (!boss.hasOwnProperty("name")) {
                    template = bossesTemplate.find(_boss => _boss.name === "kivaha");
                }

                boss = Object.assign({}, template, boss);

                delete boss.damagedHp;
                delete boss.hpRegenIntervalId;
                delete boss.attackIntervalId;

                newBossesArray.push(boss);
            }
            newBosses[chatId] = newBossesArray;
        } else {
            let newBossesArray = [];
            let template = bossesTemplate.find(_boss => _boss.nameCall === bossesArray.nameCall);

            if (!bossesArray.hasOwnProperty("name")) {
                template = bossesTemplate.find(_boss => _boss.name === "kivaha");
            }

            let boss = Object.assign({}, template, bossesArray);

            delete boss.damagedHp;
            delete boss.hpRegenIntervalId;
            delete boss.attackIntervalId;

            newBossesArray.push(boss);
            newBosses[chatId] = newBossesArray;
        }
    }

    bosses = newBosses;
}