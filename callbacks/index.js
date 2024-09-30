import userCallbacks from './user/index.js';
import closeCallback from './close.js';
import gameCallback from './game/index.js';
import help from './help.js';
import settings from './settings.js';
import whatsNewSettings from './whatsNewSettings.js';

export default [
    ...userCallbacks,
    ...closeCallback,
    ...gameCallback,
    ...settings,
    ...help,
    ...whatsNewSettings
];