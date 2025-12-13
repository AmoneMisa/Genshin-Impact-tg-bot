import unequipItem from "./unequipItem.js";
import equipmentTemplate from "../../../template/equipmentTemplate.js";

export default function equipItem(session, item) {
    if (item.isUsed) {
        return 1; // предмет уже экипирован
    }

    const equipTemplateGrade = equipmentTemplate.grades.find(
        grade => grade.name === item.grade
    );

    // снимаем предыдущую экипировку
    unequipItem(session, item);

    // записываем предмет во все слоты
    for (const slot of item.slots) {
        session.game.equipmentStats[slot] = {
            ...item,
            minLvl: equipTemplateGrade.lvl.from,
            isFilled: true
        };
    }

    item.isUsed = true;
    return 0;
}
