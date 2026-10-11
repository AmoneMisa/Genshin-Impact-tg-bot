import {getMaterialCount, spendMaterials} from './materials.js';
export const boundMaterialKey = key => `bound_${key}`;
export const usableMaterialCount = (session,key) => getMaterialCount(session,key)+getMaterialCount(session,boundMaterialKey(key));
/** Bound stacks are usable, but never counted as stock for a transfer or sale. */
export function spendUsableMaterial(session,key,amount=1) {
    if (!Number.isSafeInteger(amount)||amount<1||usableMaterialCount(session,key)<amount) return false;
    const bound=Math.min(amount,getMaterialCount(session,boundMaterialKey(key)));
    return spendMaterials(session,{[boundMaterialKey(key)]:bound,[key]:amount-bound});
}
