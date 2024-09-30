import getEmoji from '../../getters/getEmoji.js';
import getStringRemainTime from '../../getters/getStringRemainTime.js';
import getTime from '../../getters/getTime.js';

export default function (chatId, boss, isAlreadyCalled) {
    let [remain] = getTime(boss.aliveTime);

    if (isAlreadyCalled) {
        return `‼️ Перед использованием некоторых команд, пожалуйста, убедитесь, что Вы начали диалог с ботом, иначе он не сможет присылать Вам сообщения. Это не прихоть разработчика, это ограничения телеграма с целью борьбы со спам-ботами.‼️\n\nГруппа уже призвала босса ${boss.nameCall} - ${boss.description}. Посмотреть ${getEmoji("hp")} хп босса: /boss - статистика.\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\nНанести урон: /boss. Оставшееся время до побега: ${getStringRemainTime(remain)}`;
    }

    return `‼️ Перед использованием некоторых команд, пожалуйста, убедитесь, что Вы начали диалог с ботом, иначе он не сможет присылать Вам сообщения. Это не прихоть разработчика, это ограничения телеграма с целью борьбы со спам-ботами.‼️\n\nГруппа призвала босса ${boss.nameCall} - ${boss.description}\n${getEmoji("lvl")} Уровень: ${boss.stats.lvl}\n${getEmoji("hp")} Его хп: ${boss.hp}\nЕго скилл: ${boss.skill.name} - ${boss.skill.description}\n${getEmoji("currentSummons")} Количество призывов: ${boss.stats.currentSummons}\n${getEmoji("needSummons")} Количество призывов до следующего уровня: ${boss.stats.needSummons - boss.stats.currentSummons}\nНанести урон: /boss.\n\nОставшееся время до побега: ${getStringRemainTime(remain)}`;
};