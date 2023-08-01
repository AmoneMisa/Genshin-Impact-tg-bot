module.exports = function (inventory, item) {
    inventory.equipment[item.type].push(item);
}