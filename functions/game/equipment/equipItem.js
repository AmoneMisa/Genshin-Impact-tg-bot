import unequipItem from "./unequipItem.js";
import equipmentTemplate from "../../../template/equipmentTemplate.js";

function overlapsSlots(left = [], right = []) {
    const rightSlots = new Set(right);
    return left.some(slot => rightSlots.has(slot));
}

export default function equipItem(session, item) {
    if (!item?.slots || !Array.isArray(item.slots) || item.slots.length === 0) {
        return 2; // повреждённый предмет
    }

    if (item.isUsed) {
        return 1; // предмет уже экипирован
    }

    const equipTemplateGrade = equipmentTemplate.grades.find(
        grade => grade.name === item.grade
    );
    if (!equipTemplateGrade) {
        return 2;
    }

    session.game.equipmentStats ||= {};
    const inventory = session.game.inventory?.equipment?.items || [];

    // One slot can belong to only one equipped item. The old implementation
    // cleared the new item's slots but left the displaced inventory item marked
    // as isUsed=true. Unequip every overlapping item first so inventory and the
    // calculated equipmentStats snapshot stay in sync.
    for (const equippedItem of inventory) {
        if (equippedItem === item || !equippedItem?.isUsed) continue;
        if (overlapsSlots(equippedItem.slots || [], item.slots)) {
            unequipItem(session, equippedItem);
        }
    }

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
