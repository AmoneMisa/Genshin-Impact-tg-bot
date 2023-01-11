const reddit = require('./reddit');
const redditSettings = require('./redditSettings');

module.exports = [
    ...reddit,
    ...redditSettings
];