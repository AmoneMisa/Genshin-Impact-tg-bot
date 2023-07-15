const builds = require('./builds');
const changeType = require('./changeType');
const collectResources = require('./collectResources');
const status = require('./status');
const upgrade = require('./upgrade');
const changeName = require('./changeName');

module.exports = [
    ...builds,
    ...changeType,
    ...collectResources,
    ...status,
    ...upgrade,
    ...changeName,
];