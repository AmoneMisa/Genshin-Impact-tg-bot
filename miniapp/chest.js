import { gainExp } from '../functions/game/player/vitality.js';
import getRandom from '../functions/getters/getRandom.js';
import getValueByChance from '../functions/getters/getValueByChance.js';
import setLevel from '../functions/game/player/setLevel.js';
import buffPotions from '../template/buffPotions.js';
import { addBuffPotion } from '../functions/game/player/potionBuffs.js';
import {grantRandomCostume,costumeRewardPool,costumePlayer} from './costumes.js';

const PRIZES = [
  { chance: 15, value: { name: 'experience', label: 'опыта', minAmount: 4970, maxAmount: 115850 } },
  { chance: 20, value: { name: 'gold', label: 'золота', minAmount: 7500, maxAmount: 128500 } },
  { chance: 10, value: { name: 'moonDew', label: 'лунной росы', minAmount: 50, maxAmount: 950 } },
  { chance: 21, value: { name: 'nothing', label: 'ничего' } },
  { chance: 5, value: { name:'costume',label:'Временный костюм' } },
  { chance: 4, value: { name: 'buffPotion', label: 'зелье-бафф' } },
  { chance: 10, value: { name: 'sword', label: 'мм меча', minAmount: 1, maxAmount: 10 } },
  { chance: 5, value: { name: 'brokenSword', label: 'мм меча', minAmount: -10, maxAmount: -1 } },
  { chance: 10, value: { name: 'immuneToUpSword', label: 'иммунитет к увеличению меча' } },
];

function ensureChestState(session) {
  session.chestCounter = Number(session.chestCounter) || 0;
  session.chosenChests = Array.isArray(session.chosenChests) ? session.chosenChests : [];
  session.chestButtons = Array.isArray(session.chestButtons) ? session.chestButtons : [];
  session.chestTries = Number(session.chestTries) || 0;
}

function chestKey(chatId, chestId) {
  return `chest.${chatId}_${chestId}`;
}

function normalizeChosenChestId(value) {
  const match = String(value).match(/_([1-9])$/);
  return match ? Number(match[1]) : null;
}

function applyPrize(session, prize, extras = {}) {
  const game = session.game;
  const inventory = game.inventory;
  let amount = 0;

  if (typeof prize.minAmount === 'number' && typeof prize.maxAmount === 'number') {
    amount = getRandom(prize.minAmount, prize.maxAmount);
  }

  switch (prize.name) {
    case 'gold':
      inventory.gold = (Number(inventory.gold) || 0) + amount;
      break;
    case 'moonDew':
      inventory.moonDew = (Number(inventory.moonDew) || 0) + amount;
      break;
    case 'experience':
      amount = gainExp(session, amount).gained;
      setLevel(session);
      break;
    case 'sword':
    case 'brokenSword':
      session.sword = (Number(session.sword) || 0) + amount;
      break;
    case 'immuneToUpSword':
      session.immuneToUpSword = true;
      break;
    case 'buffPotion': {
      // One random Lineage II style buff potion (Might, Shield, Haste, ...).
      const definition = buffPotions[getRandom(0, buffPotions.length - 1)];
      addBuffPotion(session, definition.id);
      extras.label = definition.name;
      amount = 1;
      break;
    }
    case 'nothing':
      break;
    default:
      throw new Error(`Unknown chest prize: ${prize.name}`);
  }

  return amount;
}

export function getChestState(session) {
  ensureChestState(session);
  return {
    player:costumePlayer(session),
    costumes:costumeRewardPool(session),
    available: session.chestTries > 0,
    tries: session.chestTries,
    opened: session.chosenChests.map(normalizeChosenChestId).filter(Boolean),
    selectionsLeft: Math.max(0, 3 - session.chestCounter),
  };
}

export function openChest(session, chatId, chestId, options={}) {
  ensureChestState(session);

  const numericChestId = Number(chestId);
  if (!Number.isInteger(numericChestId) || numericChestId < 1 || numericChestId > 9) {
    throw new Error('Chest id must be an integer from 1 to 9');
  }

  if (session.chestTries < 1) {
    return { ok: false, reason: 'cooldown', ...getChestState(session) };
  }

  const key = chestKey(chatId, numericChestId);
  if (session.chosenChests.includes(key)) {
    return { ok: false, reason: 'already_opened', ...getChestState(session) };
  }

  const prize = getValueByChance((options.randomInt||getRandom)(0, 99), PRIZES);
  const extras = {};
  let amount;
  if(prize.name==='costume'){
    const grant=grantRandomCostume(session,{now:options.now??Date.now(),random:options.costumeRandom,source:'chest'});
    if(!grant.ok)return {...grant,...getChestState(session)};
    Object.assign(extras,grant);amount=1;
  }else amount=applyPrize(session, prize, extras);

  session.chestCounter += 1;
  session.chosenChests.push(key);

  const opened = session.chosenChests.map(normalizeChosenChestId).filter(Boolean);
  const completed = session.chestCounter >= 3;

  if (completed) {
    session.chestCounter = 0;
    session.chosenChests = [];
    session.chestButtons = [];
    session.chestTries = 0;
  }

  return {
    ok: true,
    chestId: numericChestId,
    prize: {
      ...extras,
      type: prize.name,
      label: extras.label ?? prize.label,
      amount,
    },
    opened,
    completed,
    tries: session.chestTries,
    selectionsLeft: completed ? 0 : Math.max(0, 3 - session.chestCounter),
  };
}
