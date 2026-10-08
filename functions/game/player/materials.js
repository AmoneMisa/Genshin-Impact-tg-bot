import materialsTemplate from '../../../template/materialsTemplate.js';

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

export function getMaterialCount(session, key) {
    return Math.max(0, Math.floor(Number(readMaterials(session)[key]) || 0));
}

export function addMaterial(session, key, amount = 1) {
    const count = Math.floor(Number(amount) || 0);
    if (!key || count <= 0) return 0;
    const materials = getMaterials(session);
    materials[key] = getMaterialCount(session, key) + count;
    return count;
}

/** Spends several materials at once; all or nothing. */
export function spendMaterials(session, items = {}) {
    const entries = Object.entries(items).filter(([, amount]) => amount > 0);
    if (entries.some(([key, amount]) => getMaterialCount(session, key) < amount)) return false;
    const materials = getMaterials(session);
    for (const [key, amount] of entries) materials[key] = getMaterialCount(session, key) - amount;
    return true;
}

export function materialInfo(key) {
    return materialsTemplate.find(item => item.key === key) || {key, name: key, icon: '✦', description: ''};
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
