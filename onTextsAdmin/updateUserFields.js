import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import { myId } from '../config.js';
import potionsInInventoryTemplate from '../template/potionsInInventoryTemplate.js';
import { sessions } from '../data.js';
import lodash from 'lodash';
import debugMessage from "../functions/tgBotFunctions/debugMessage.js";

export default [[/(?:^|\s)\/update_users\b/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    const newDataTemplate = {
        arena: {
            name: "Предметы арены",
            items: [
                { tokens: 0 },
                { pvpSign: null }
            ]
        },
        gold: 0,
        crystals: 0,
        ironOre: 0,
        potions: {
            name: "Зелья",
            items: lodash.cloneDeep(potionsInInventoryTemplate) // Клон шаблона, если требуется
        },
        gacha: {
            name: "Предметы гачи",
            items: []
        },
        equipment: {
            name: "Экипировка",
            items: []
        }
    };

    function migrateData(oldData) {
        const newData = lodash.cloneDeep(newDataTemplate);  // Создаем копию шаблона

        // Переносим значения для 'arena'
        newData.arena.items[0].tokens = oldData.arena.tokens || 0;
        newData.arena.items[1].pvpSign = oldData.arena.pvpSign || null;

        // Переносим остальные поля, которые не требуют изменений
        newData.gold = oldData.gold;
        newData.crystals = oldData.crystals;
        newData.ironOre = oldData.ironOre;

        if (Array.isArray(oldData.potions)) {
            newData.potions.items = oldData.potions.map(potion => ({
                type: potion.type,
                bottleType: potion.bottleType,
                size: potion.size,
                count: potion.count,
                power: potion.power,
                name: potion.name,
                description: potion.description
            }));
        }

        newData.gacha.items = Array.isArray(oldData.gacha) ? oldData.gacha : [];

        if (Array.isArray(oldData.gacha)) {
            for (const gachaItem of oldData.gacha) {
                newData.gacha.items.push(gachaItem);
            }
        }

        newData.equipment.items = Array.isArray(oldData.equipment) ? oldData.equipment : [];

        if (Array.isArray(oldData.equipment)) {
            for (const equipmentItem of oldData.equipment) {
                newData.equipment.items.push(equipmentItem);
            }
        }
        return newData;
    }

    for (let chatSession of Object.values(sessions)) {
        for (let session of Object.values(chatSession.members)) {
            if (session.userChatData.user.is_bot) {
                continue;
            }

            session.game.inventory = migrateData(session.game.inventory);
        }
    }

    sendMessage(myId, "Модель Инвентаря обновлена.");
}]];
