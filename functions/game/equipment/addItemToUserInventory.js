module.exports = function (session, item) {
    let inventoryType;

    if (item.type.type !== null) {
        inventoryType = `${item.type.type.name}`;
    } else {
        inventoryType = `${item.type.kind.name}`;
    }

    if (!session.game.inventory.equipment[item.type.mainType]) {
        session.game.inventory.equipment[item.type.mainType] = {};
    }

    if (!session.game.inventory.equipment[item.type.mainType][inventoryType]) {
        session.game.inventory.equipment[item.type.mainType][inventoryType] = [];
    }

    session.game.inventory.equipment[item.type.mainType][inventoryType].push(item);
}