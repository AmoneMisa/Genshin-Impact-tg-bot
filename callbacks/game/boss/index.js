import sendGoldCallback from './sendGoldCallback.js';
import boss from './boss.js';
import bossSettings from './bossSettings.js';

export default [
    ...sendGoldCallback,
    ...boss,
    ...bossSettings
];