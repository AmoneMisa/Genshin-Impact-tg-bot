// One-off move of a character of the old class tree to the nearest real Lineage 2 class (legacyClasses.js).
// Skill enchant levels stay with the slot they were in; the quest record keeps what was mastered.
import changePlayerClass from '../player/changePlayerGameClass.js';
import updatePlayerStats from '../player/updatePlayerStats.js';
import {legacyTarget, CLASS_SYSTEM_VERSION} from './legacyClasses.js';
import {grandfatherSkills} from '../player/skillLearning.js';

/** Returns true when the character was moved to another class. */
export function migrateSessionClass(session) {
    const game = session?.game;
    if (!game) return false;
    if (game.classSystem === CLASS_SYSTEM_VERSION) return false;
    game.classSystem = CLASS_SYSTEM_VERSION;
    const current = game.gameClass?.stats?.name;
    if (!current || current === 'noClass') return false;
    const level = Number(game.stats?.lvl) || 1;
    const target = legacyTarget(current, level);
    if (!target || target === current) {
        // the name is a real class again: only refresh the skill kit, which is generated from the real tree
        if (target) refreshKit(session, target);
        return false;
    }
    refreshKit(session, target);
    if (!Array.isArray(game.classHistory)) game.classHistory = [];
    game.classHistory.push({from: current, to: target, at: Date.now(), migrated: true});
    return true;
}

function refreshKit(session, target) {
    const previous = Array.isArray(session.game.gameClass?.skills) ? session.game.gameClass.skills : [];
    changePlayerClass(session, target);
    for (const skill of session.game.gameClass.skills) {
        const old = previous.find(item => item.slot === skill.slot);
        if (old?.enchantLevel) skill.enchantLevel = old.enchantLevel;
    }
    updatePlayerStats(session);
    // a character of the old tree keeps every skill it could already use
    grandfatherSkills(session);
}
