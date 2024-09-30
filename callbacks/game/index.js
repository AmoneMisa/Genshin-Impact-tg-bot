import bossCallback from './boss/index.js';
import chestCallback from './chest/index.js';
import experienceCallback from './experience/index.js';
import goldCallback from './gold/index.js';
import ironOre from './ironOre/index.js';
import crystalsCallback from './crystals/index.js';
import points21 from './points21/index.js';
import swordCallback from './sword/index.js';
import player from './player/index.js';
import slots from './slots/index.js';
import dice from './dice/index.js';
import bowling from './bowling/index.js';
import darts from './darts/index.js';
import basketball from './basketball/index.js';
import football from './football/index.js';
import elements from './elements/index.js';
import builds from './builds/index.js';
import shop from './shop/index.js';
import equipmentGacha from './equipmentGacha/index.js';
import arena from './arena/index.js';
import title from './title/index.js';

export default [
    ...bossCallback,
    ...goldCallback,
    ...ironOre,
    ...experienceCallback,
    ...crystalsCallback,
    ...chestCallback,
    ...swordCallback,
    ...points21,
    ...player,
    ...slots,
    ...dice,
    ...bowling,
    ...darts,
    ...basketball,
    ...football,
    ...elements,
    ...builds,
    ...shop,
    ...equipmentGacha,
    ...arena,
    ...title
];
