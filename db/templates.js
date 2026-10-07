// Game templates (class stats, builds, equipment, ...) live in Mongo, collection
// `game_templates`, one document per template. The template/*.js files are the seed:
//
//   - missing in Mongo            -> seeded from the file
//   - file's seedVersion is newer -> Mongo is overwritten (a deliberate balance change)
//   - otherwise                   -> Mongo wins: its data replaces the module's contents
//
// Replacement is in place, so every `import classStats from '.../classStatsTemplate.js'`
// keeps working and stays synchronous. Bump `version` here after editing a template
// file (test/templates.test.js fails until you also update template/seedHashes.js).
import crypto from 'node:crypto';
import arenaWeeklyPrizes from '../template/arenaWeeklyPrizes.js';
import bossAttacks from '../template/bossAttacksTemplate.js';
import bossLoot from '../template/bossLootTemplate.js';
import bossSkills from '../template/bossSkillsTemplate.js';
import bosses from '../template/bossTemplate.js';
import builds from '../template/buildsTemplate.js';
import chanceToHit from '../template/chanceToHitTemplate.js';
import clanApplicationConditions from '../template/clanApplicationConditionsTemplate.js';
import classSkills from '../template/classSkillsTemplate.js';
import classStats from '../template/classStatsTemplate.js';
import elements from '../template/elements.js';
import elementsSynergy from '../template/elementsSynergy.js';
import equipmentBonusStats from '../template/equipmentBonusStatsTemplate.js';
import equipment from '../template/equipmentTemplate.js';
import gacha from '../template/gachaTemplate.js';
import levels from '../template/levelsTemplate.js';
import potions from '../template/potionsInInventoryTemplate.js';
import pvpSign from '../template/pvpSignTemplate.js';
import shop from '../template/shopTemplate.js';

export const TEMPLATES = Object.freeze([
    {key: 'arenaWeeklyPrizes', source: arenaWeeklyPrizes, version: 1},
    {key: 'bossAttacks', source: bossAttacks, version: 1},
    {key: 'bossLoot', source: bossLoot, version: 1},
    {key: 'bossSkills', source: bossSkills, version: 1},
    {key: 'bosses', source: bosses, version: 1},
    {key: 'builds', source: builds, version: 1},
    {key: 'chanceToHit', source: chanceToHit, version: 1},
    {key: 'clanApplicationConditions', source: clanApplicationConditions, version: 1},
    {key: 'classSkills', source: classSkills, version: 1},
    {key: 'classStats', source: classStats, version: 1},
    {key: 'elements', source: elements, version: 1},
    {key: 'elementsSynergy', source: elementsSynergy, version: 1},
    {key: 'equipmentBonusStats', source: equipmentBonusStats, version: 1},
    {key: 'equipment', source: equipment, version: 1},
    {key: 'gacha', source: gacha, version: 1},
    {key: 'levels', source: levels, version: 1},
    {key: 'potions', source: potions, version: 1},
    {key: 'pvpSign', source: pvpSign, version: 1},
    {key: 'shop', source: shop, version: 1},
]);

function canonical(value) {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value) ?? 'null';
}

/** Stable content hash: key order does not matter, so BSON round trips compare equal. */
export function hashTemplate(value) {
    return crypto.createHash('sha1').update(canonical(value)).digest('hex');
}

const snapshot = value => JSON.parse(JSON.stringify(value));

/** Replaces the contents of `target` with `data` without changing its identity. */
export function replaceInPlace(target, data) {
    if (Array.isArray(target)) {
        target.splice(0, target.length, ...data);
    } else {
        for (const key of Object.keys(target)) delete target[key];
        Object.assign(target, data);
    }
}

/**
 * Seeds missing templates and applies the stored ones. `store` is {get(key), put(doc)};
 * returns {seeded, updated, applied, unchanged} lists of keys for logging.
 */
export async function hydrateTemplates(store, templates = TEMPLATES) {
    const report = {seeded: [], updated: [], applied: [], unchanged: []};
    for (const {key, source, version} of templates) {
        const code = snapshot(source);
        const seedHash = hashTemplate(code);
        const stored = await store.get(key);
        if (!stored || version > stored.seedVersion) {
            await store.put({_id: key, seedVersion: version, seedHash, data: code, updatedAt: new Date()});
            (stored ? report.updated : report.seeded).push(key);
        } else if (hashTemplate(stored.data) !== seedHash) {
            replaceInPlace(source, stored.data);
            report.applied.push(key);
        } else {
            report.unchanged.push(key);
        }
    }
    return report;
}

export async function loadGameTemplates() {
    const {default: GameTemplate} = await import('./models/GameTemplate.js');
    const store = {
        get: key => GameTemplate.findById(key).lean(),
        put: doc => GameTemplate.replaceOne({_id: doc._id}, doc, {upsert: true}),
    };
    const report = await hydrateTemplates(store);
    console.log(`✅ Game templates: ${report.seeded.length} seeded, ${report.updated.length} updated from code, ${report.applied.length} customised in Mongo, ${report.unchanged.length} unchanged`);
    if (report.applied.length) console.log(`   customised in Mongo: ${report.applied.join(', ')}`);
    return report;
}
