import setPlayerClassCallback from './setPlayerClassCallback.js';
import userSkillsCallback from './userSkillsCallback.js';
import showInventory from './showInventory.js';
import updateCharacteristics from './updateCharacteristics.js';
import reloadWhoAmI from './reloadWhoAmI.js';
import stealResources from './stealResources.js';
import addStealChance from './addStealChance.js';
import addBonusChance from './addBonusChance.js';
import changeGender from './changeGender.js';
import characterStatus from './characterStatus.js';
import whoamiHome from './whoamiHome.js';

export default [
    ...setPlayerClassCallback,
    ...userSkillsCallback,
    ...showInventory,
    ...updateCharacteristics,
    ...reloadWhoAmI,
    ...stealResources,
    ...addStealChance,
    ...changeGender,
    ...characterStatus,
    ...whoamiHome,
    ...addBonusChance
];