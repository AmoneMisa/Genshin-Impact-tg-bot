const menu = require('./menu');
const setField = require('./setField');
const removeKeyboard = require('./removeKeyboard');

module.exports = [
    ...menu,
    ...setField,
    ...removeKeyboard
];