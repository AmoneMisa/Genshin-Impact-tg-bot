import materialsTemplate from '../../../template/materialsTemplate.js';
import {l2MaterialInfo} from '../hunt/lootTable.js';
import {loginItemInfo} from '../../../template/loginRewards.js';

/** Read-only view of the material counters (old inventories have none). */
function readMaterials(session) {
    const materials = session?.game?.inventory?.materials;
    return materials && typeof materials === 'object' && !Array.isArray(materials) ? materials : {};
}

/** The counters themselves, created on first write. */
export function getMaterials(session) {
    const inventory = session?.game?.inventory;
    if (!inventory) return {};
    if (!inventory.materials || typeof inventory.materials !== 'object' || Array.isArray(inventory.materials)) {
        inventory.materials = {};
    }
    return inventory.materials;
}

// Shots stop at S: stock saved or listed under the retired S80 / S84 keys is plain S stock.
const RETIRED_SHOT_KEY = /^(soulshot|spiritshot|blessedshot)_S(?:80|84)$/;
export const canonicalMaterialKey = key => (typeof key === 'string' ? key.replace(RETIRED_SHOT_KEY, '$1_S') : key);

export function getMaterialCount(session, key) {
    return Math.max(0, Math.floor(Number(readMaterials(session)[canonicalMaterialKey(key)]) || 0));
}

export function addMaterial(session, key, amount = 1) {
    const count = Math.floor(Number(amount) || 0);
    if (!key || count <= 0) return 0;
    const materials = getMaterials(session), target = canonicalMaterialKey(key);
    materials[target] = getMaterialCount(session, target) + count;
    return count;
}

/** Spends several materials at once; all or nothing. */
export function spendMaterials(session, items = {}) {
    const entries = Object.entries(items).filter(([, amount]) => amount > 0);
    if (entries.some(([key, amount]) => getMaterialCount(session, key) < amount)) return false;
    const materials = getMaterials(session);
    for (const [key, amount] of entries) {
        const target = canonicalMaterialKey(key);
        materials[target] = getMaterialCount(session, target) - amount;
    }
    return true;
}

export function materialInfo(key) {
    key = canonicalMaterialKey(key);
    if (String(key).startsWith('bound_')) {
        const base=String(key).slice(6);
        return {...(base.startsWith('bound_')?{name:base,icon:'✦',description:''}:materialInfo(base)),key,bound:true};
    }
    const login=loginItemInfo(key);if(login)return login;
    return materialsTemplate.find(item => item.key === key) || (String(key).startsWith('l2_') && l2MaterialInfo(key)) || {key, name:'Неизвестный предмет', icon:'✦',description:'Описание этого предмета пока отсутствует в каталоге.',metadataMissing:true};
}

/** Display rows for everything the player owns, template order first. */
export function listMaterials(session) {
    const owned = readMaterials(session);
    return materialsTemplate
        .map(info => ({...info, count: getMaterialCount(session, info.key)}))
        .concat(Object.keys(owned).filter(key => !materialsTemplate.some(info => info.key === key))
            .map(key => ({...materialInfo(key), count: getMaterialCount(session, key)})))
        .filter(row => row.count > 0);
}
