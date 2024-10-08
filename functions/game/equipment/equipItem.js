import unequipItem from './unequipItem.js';
import equipmentTemplate from '../../../template/equipmentTemplate.js';

export default function (session, item) {
    if (item.isUsed) {
        return 1;
    }

    let isFirst = true;
    let equipTemplateGrade = equipmentTemplate.grades.find(grade => grade.name === item.grade);
    unequipItem(session, item);

    for (let slot of item.slots) {
        if (!isFirst) {
            session.game.equipmentStats[slot] = {
                ...item,
                minLvl: equipTemplateGrade.lvl.from,
                isFilled: true
            }
        }

        session.game.equipmentStats[slot] = {
            ...item,
            minLvl: equipTemplateGrade.lvl.from,
            isFilled: true
        }

        isFirst = false;
    }

    item.isUsed = true;

    return 0;
}