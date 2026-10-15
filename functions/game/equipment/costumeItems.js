import {randomUUID} from 'node:crypto';
import {COSTUME_CATALOG} from '../../../template/costumeCatalog.js';
import {isActuallyEquipped} from './snapshots.js';

export const costumeDefinition = id => COSTUME_CATALOG.find(c => c.id === id);
export const isCostumeItem = item => item?.mainType === 'costume' && Boolean(costumeDefinition(item.costumeId));
export const costumeGenderAllowed = (session, item) => isCostumeItem(item)
  && costumeDefinition(item.costumeId).gender === (session?.gender === 'female' ? 'female' : 'male');
export const costumeExpired = (item, now=Date.now()) => Boolean(item?.timed) && !(Number(item.expiresAt) > now);

export function makeCostumeItem(id, {now=Date.now(), days=null, source='shop'} = {}) {
  const c = costumeDefinition(id);
  if (!c || (days !== null && (!Number.isInteger(days) || days < 1 || days > 7))) throw new Error('Invalid costume');
  return {version:2, uid:randomUUID(), id:'costume:'+id, costumeId:id, costumeGender:c.gender,
    name:c.name, translatedName:'Костюм', description:'Декоративный костюм. Не меняет характеристики.',
    mainType:'costume', category:'costume', kind:'costume', slots:['costume'], grade:'noGrade',
    classOwner:[], characteristics:{}, stats:[], cost:0, enchant:0, isUsed:false,
    tradeable:days === null, bound:days !== null, noTrade:days !== null,
    timed:days !== null, expiresAt:days === null ? null : now + days*86400000, acquiredAt:now, source};
}

export function activeCostume(session, now=Date.now()) {
  const snapshot = session?.game?.equipmentStats?.costume;
  const item = session?.game?.inventory?.equipment?.items?.find(i => i.uid && i.uid === snapshot?.uid);
  if (!item || !isActuallyEquipped(session,item) || !costumeGenderAllowed(session,item) || costumeExpired(item,now)) return null;
  return {id:item.costumeId, name:costumeDefinition(item.costumeId).name,
    gender:costumeDefinition(item.costumeId).gender, expiresAt:item.timed ? item.expiresAt : null};
}

export function reconcileCostumeSlot(session, now=Date.now()) {
  const slot = session?.game?.equipmentStats?.costume;
  if (!slot || activeCostume(session,now)) return;
  for (const item of session?.game?.inventory?.equipment?.items || []) if (item.uid === slot.uid) item.isUsed=false;
  session.game.equipmentStats.costume=null;
}
