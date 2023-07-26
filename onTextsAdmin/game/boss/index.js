const kill = require('./kill');
const updateBossModel = require('./updateBossModel');

module.exports = [...kill, ...updateBossModel];