import { withLock } from '../general/chatLock.js';
import listChatIds from '../getters/listChatIds.js';
import Chat from "../../db/models/Chat.js";
import isPlayerInFight from "../game/player/isPlayerInFight.js";
import getMaxHp from "../game/player/getters/getMaxHp.js";
import getCurrentHp from "../game/player/getters/getCurrentHp.js";
import {advanceFieldPvp} from '../game/hunt/fieldPvp.js';
import {l2RawStat} from '../game/player/l2Effects.js';

/**
 * Регенерация HP у игроков
 */
export default async function regenHp() {
    const chatIds = await listChatIds();
    for (const chatId of chatIds) {
        await withLock(chatId, async () => {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return;
            let updated = advanceFieldPvp(chat);

            for (const member of chat.members) {
                if (member.userChatData?.user?.is_bot) continue;

                const gameClass = member.game?.gameClass;
                if (!gameClass?.stats) continue;

                const currentHp = getCurrentHp(member);
                const maxHp = getMaxHp(member);

                // Если HP уже на максимуме
                if (currentHp === maxHp) continue;

                // Если HP выше максимума — обрезаем
                if (currentHp > maxHp) {
                    gameClass.stats.hp = maxHp;
                    updated = true;
                    continue;
                }

                // Если игрок мёртв — не регеним
                if (currentHp <= 0) continue;

                // Скорость регена
                let hpRegenSpeed = (gameClass.stats.hpRestoreSpeed || 0)*l2RawStat(member,'regHp',true)+l2RawStat(member,'regHp',false);

                // В бою реген медленнее
                if (isPlayerInFight(member)) {
                    hpRegenSpeed *= 0.35;
                }

                // Применяем реген
                gameClass.stats.hp = Math.min(maxHp, currentHp + hpRegenSpeed);
                updated = true;
            }

            if (updated) {
                chat.members.forEach((member,index)=>{if(member.needsSave){chat.markModified(`members.${index}`);member.needsSave=false;}});
                await chat.save();
            }
        });
    }
}
