import info from './info.js';
import start from './start.js';
import help from './help.js';
import personalData from './personalData/index.js';
import game from './game/index.js';
import mute from './mute/index.js';
import commands from './commands/index.js';
import feedback from './feedback.js';
import whatsNew from './whatsNew.js';

export default [
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
