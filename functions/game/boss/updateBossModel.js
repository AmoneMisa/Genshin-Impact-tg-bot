import Boss from "../../../db/models/Boss.js";
import bossesTemplate from "../../../template/bossTemplate.js";

/**
 * Обновляет всех боссов в базе, накладывая шаблон и убирая временные поля
 */
export default async function() {
    const bosses = await Boss.find();

    for (let boss of bosses) {
        // ищем шаблон по имени или nameCall
        let template = bossesTemplate.find(
            _boss => _boss.name === boss.name || _boss.nameCall === boss.nameCall
        );

        if (!boss.name) {
            template = bossesTemplate.find(_boss => _boss.name === "kivaha");
        }

        // объединяем шаблон и текущие данные
        const updatedBoss = Object.assign({}, template, boss.toObject());

        // удаляем временные поля
        delete updatedBoss.damagedHp;
        delete updatedBoss.hpRegenIntervalId;
        delete updatedBoss.attackIntervalId;

        // обновляем документ в базе
        await Boss.updateOne({ _id: boss._id }, updatedBoss);
    }
}
