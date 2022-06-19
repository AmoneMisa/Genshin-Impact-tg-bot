const menu = require('./form');
const setField = require('./setField');
const removeKeyboard = require('./removeKeyboard');

module.exports = [
    ...menu,
    ...setField,
    ...removeKeyboard
];