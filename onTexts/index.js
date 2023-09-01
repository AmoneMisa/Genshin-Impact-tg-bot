const info = require('./info');
const start = require('./start');
const help = require('./help');
const personalData = require('./personalData');
const game = require('./game');
const mute = require('./mute');
const commands = require('./commands');
const feedback = require('./feedback');
const whatsNew = require('./whatsNew');

module.exports = [
    ...start,
    ...info,
    ...help,
    ...personalData,
    ...game,
    ...mute,
    ...commands,
    ...feedback,
    ...whatsNew
];
