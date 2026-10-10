// Learning of the battle skills of a profession (Lineage II): a skill of the real class tree is bought once with
// skill points before it can be used. The base kit of a family and any skill without a real id are known from the start.
// The price is the cheapest real SP price of the skill's first level in the trees (scaled, see passiveSkills.js SP_SCALE);
// a few skills also ask for their spellbook (a material `l2_<item id>`).
// Learned skills live in session.game.learnedSkills = {l2Id: true}.
import l2 from '../../../template/l2Classes.js';
import { SP_SCALE } from './passiveSkills.js';
import { getMaterialCount, spendMaterials } from './materials.js';

const number = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

let prices = null;
function priceTable() {
    if (prices) return prices;
    prices = new Map();
    for (const rows of Object.values(l2.learn)) {
        for (const [skillId, level, , sp, items] of rows) {
            const known = prices.get(skillId);
            if (!known || level < known.level || (level === known.level && sp < known.sp)) prices.set(skillId, {level, sp, items});
        }
    }
    return prices;
}

/** What it costs to learn a skill: {sp, items: [[item, count]]}, or null when it needs no learning. */
export function skillLearnCost(skill) {
    if (!skill?.l2Id) return null;
    const row = priceTable().get(Number(skill.l2Id));
    return {sp: Math.max(1, Math.round((row?.sp || 0) * SP_SCALE)), items: row?.items || []};
}

export function isSkillLearned(session, skill) {
    if (!skill?.l2Id) return true;
    return Boolean(session?.game?.learnedSkills?.[skill.l2Id]);
}

/** Teaches the skill of a slot for skill points. The caller saves the session. */
export function learnSkill(session, slot) {
    const skills = session?.game?.gameClass?.skills;
    const skill = Array.isArray(skills) ? skills.find(item => Number(item?.slot) === Number(slot)) : null;
    if (!skill) return {ok: false, reason: 'invalid_skill'};
    if (isSkillLearned(session, skill)) return {ok: false, reason: 'already_learned'};
    if (number(skill.needLvl) > number(session.game.stats?.lvl, 1)) return {ok: false, reason: 'level_too_low', needLevel: number(skill.needLvl)};
    const cost = skillLearnCost(skill);
    const inventory = session.game.inventory;
    if (number(inventory.sp) < cost.sp) return {ok: false, reason: 'not_enough_sp', missing: cost.sp - number(inventory.sp)};
    const items = Object.fromEntries(cost.items.map(([item, count]) => [`l2_${item}`, count]));
    for (const [key, count] of Object.entries(items)) if (getMaterialCount(session, key) < count) return {ok: false, reason: 'not_enough_items', item: key};

    inventory.sp = number(inventory.sp) - cost.sp;
    if (Object.keys(items).length) spendMaterials(session, items);
    if (!session.game.learnedSkills || typeof session.game.learnedSkills !== 'object') session.game.learnedSkills = {};
    session.game.learnedSkills[skill.l2Id] = true;
    return {ok: true, slot: number(skill.slot), name: skill.name, sp: cost.sp};
}

/** Marks every kit skill a character can already use as learned (the migration from the old tree). */
export function grandfatherSkills(session) {
    const skills = session?.game?.gameClass?.skills;
    if (!Array.isArray(skills)) return;
    const level = number(session.game.stats?.lvl, 1);
    for (const skill of skills) {
        if (!skill.l2Id || number(skill.needLvl) > level) continue;
        if (!session.game.learnedSkills || typeof session.game.learnedSkills !== 'object') session.game.learnedSkills = {};
        session.game.learnedSkills[skill.l2Id] = true;
    }
}
