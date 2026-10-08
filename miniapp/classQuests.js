import {
  abandonClassQuest,
  getClassQuestView,
  payQuestStep,
  promoteClass,
  startClassQuest,
} from '../functions/game/classes/classQuests.js';
import { listMaterials } from '../functions/game/player/materials.js';

function inventoryView(session) {
  const inventory = session?.game?.inventory || {};
  return {
    gold: Number(inventory.gold) || 0,
    crystals: Number(inventory.crystals) || 0,
    sp: Number(inventory.sp) || 0,
  };
}

/** The profession screen: current class, available promotions and the active quest. */
export function getClassQuestsState(session) {
  return { ...getClassQuestView(session), inventory: inventoryView(session), materials: listMaterials(session) };
}

function withState(session, result) {
  const { quest, ...rest } = result; // the raw template stays on the server
  return { ...rest, quests: getClassQuestsState(session) };
}

export function startClassQuestForMiniApp(session, to) {
  return withState(session, startClassQuest(session, String(to || '')));
}

export function payClassQuestForMiniApp(session) {
  return withState(session, payQuestStep(session));
}

export function abandonClassQuestForMiniApp(session) {
  return withState(session, abandonClassQuest(session));
}

export function promoteClassForMiniApp(session, to) {
  return withState(session, promoteClass(session, String(to || '')));
}
