// Owner tools for the admin screen. They replace the old text commands of the
// bot owner (/add_gold, /kill, /reset_point_game, /update_all_players_skills …).
//
// Three scopes: a single player of the current game chat, the current chat,
// and the whole bot. Every tool answers `{ ok, message }`.

import fs from 'fs';
import Chat from '../db/models/Chat.js';
import Boss from '../db/models/Boss.js';
import bot from '../bot.js';
import { myId } from '../config.js';
import loadPlayer from '../functions/getters/loadPlayer.js';
import listChatIds from '../functions/getters/listChatIds.js';
import { withLock } from '../functions/general/chatLock.js';
import getChatSession from '../functions/getters/getChatSession.js';
import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import setLevel from '../functions/game/player/setLevel.js';
import updatePlayerStats from '../functions/game/player/updatePlayerStats.js';
import updatePlayerSkills from '../functions/game/player/updatePlayerSkills.js';
import getMaxHp from '../functions/game/player/getters/getMaxHp.js';
import getBossesByChatId from '../functions/game/boss/getters/getBossesByChatId.js';
import bossAlreadySummoned from '../functions/game/boss/getBossStatus/bossAlreadySummoned.js';
import updateBossModel from '../functions/game/boss/updateBossModel.js';
import hideDeadSouls from '../functions/misc/hideDeadSouls.js';
import restoreChestChances from '../functions/shedullers/restoreChestChances.js';
import resetSwordTimer from '../functions/game/sword/resetSwordTimer.js';
import { getResettableArcadeGames, resetArcadeGame } from './arcadeReset.js';
import { memberName } from './social.js';
import { translateFor } from './language.js';

const MAX_AMOUNT = 1_000_000_000;

/** Whole number from -1e9 to 1e9, not zero; null otherwise. */
export function parseAmount(value) {
  const amount = typeof value === 'string' && /^-?\d+$/.test(value.trim()) ? Number(value) : value;
  if (!Number.isSafeInteger(amount) || amount === 0 || Math.abs(amount) > MAX_AMOUNT) return null;
  return amount;
}

function inventory(member) {
  if (!member.game) member.game = {};
  if (!member.game.inventory) member.game.inventory = {};
  return member.game.inventory;
}

function addTo(target, key, amount) {
  target[key] = Math.max(0, (Number(target[key]) || 0) + amount);
}

/** Tools applied to one chat member. `apply` mutates the member; the caller saves the chat. */
export const PLAYER_TOOLS = Object.freeze([
  { id: 'add_gold', label: 'Золото', amountLabel: 'Сколько золота', apply: (m, n) => addTo(inventory(m), 'gold', n), text: n => `золото ${n > 0 ? '+' : ''}${n}` },
  { id: 'add_luck_coins', label: 'Монеты удачи', amountLabel: 'Сколько монет', apply: (m, n) => addTo(inventory(m), 'luckCoins', n), text: n => `монеты удачи ${n > 0 ? '+' : ''}${n}` },
  { id: 'add_crystals', label: 'Кристаллы', amountLabel: 'Сколько кристаллов', apply: (m, n) => addTo(inventory(m), 'crystals', n), text: n => `кристаллы ${n > 0 ? '+' : ''}${n}` },
  { id: 'add_iron_ore', label: 'Железная руда', amountLabel: 'Сколько руды', apply: (m, n) => addTo(inventory(m), 'ironOre', n), text: n => `руда ${n > 0 ? '+' : ''}${n}` },
  {
    id: 'add_experience', label: 'Опыт', amountLabel: 'Сколько опыта',
    apply: (m, n) => { m.game.stats.currentExp = Math.max(0, (Number(m.game.stats.currentExp) || 0) + n); setLevel(m); },
    text: n => `опыт ${n > 0 ? '+' : ''}${n}`,
  },
  { id: 'add_bonus_chance', label: 'Попытки бонуса', amountLabel: 'Сколько попыток', apply: (m, n) => { m.game.bonusChances = Math.max(0, (Number(m.game.bonusChances) || 0) + n); }, text: n => `попытки бонуса ${n > 0 ? '+' : ''}${n}` },
  { id: 'add_steal_chance', label: 'Попытки грабежа', amountLabel: 'Сколько попыток', apply: (m, n) => { m.game.chanceToSteal = Math.max(0, (Number(m.game.chanceToSteal) || 0) + n); }, text: n => `попытки грабежа ${n > 0 ? '+' : ''}${n}` },
  { id: 'respawn', label: 'Воскресить (полное HP)', apply: m => { m.game.gameClass.stats.hp = getMaxHp(m, m.game.gameClass); }, text: () => 'воскрешён' },
  { id: 'recalc_stats', label: 'Пересчитать характеристики', apply: m => updatePlayerStats(m), text: () => 'характеристики пересчитаны' },
  { id: 'reset_chest_timer', label: 'Сбросить таймер сундука', apply: m => { m.chestCounter = 0; m.chosenChests = []; m.chestButtons = []; m.chestTries = 1; }, text: () => 'таймер сундука сброшен' },
  { id: 'reset_sword_timer', label: 'Сбросить таймер меча', apply: m => { m.timerSwordCallback = 0; }, text: () => 'таймер меча сброшен' },
  { id: 'reset_title_timer', label: 'Сбросить таймер титула', apply: m => { m.timerTitleCallback = 0; }, text: () => 'таймер титула сброшен' },
  {
    id: 'reset_arcade', label: 'Сбросить аркадные игры',
    apply: m => { for (const gameId of getResettableArcadeGames()) resetArcadeGame(m, gameId); },
    text: () => 'аркадные игры сброшены',
  },
]);

const PLAYER_TOOL_BY_ID = new Map(PLAYER_TOOLS.map(tool => [tool.id, tool]));

export async function runPlayerTool(chatId, userId, toolId, rawAmount) {
  const tool = PLAYER_TOOL_BY_ID.get(toolId);
  if (!tool) return { ok: false, reason: 'unknown_tool' };
  let amount = null;
  if (tool.amountLabel) {
    amount = parseAmount(rawAmount);
    if (amount === null) return { ok: false, reason: 'invalid_amount' };
  }
  const { chat, member } = await loadPlayer(chatId, userId);
  if (!member) return { ok: false, reason: 'unknown_player' };
  tool.apply(member, amount);
  await chat.save();
  return { ok: true, message: `${memberName(member)}: ${tool.text(amount)}.` };
}

function resetPointTable(chat) {
  chat.game ||= {};
  if (chat.game.points) {
    chat.game.points.isStart = false;
    chat.game.points.gameSessionIsStart = false;
    chat.game.points.players = {};
    chat.game.points.usedItems = [];
  }
  delete chat.game.pointsMiniApp;
}

function resetElementsTable(chat) {
  chat.game ||= {};
  if (chat.game.elements) {
    chat.game.elements.gameSessionIsStart = false;
    chat.game.elements.players = {};
    chat.game.elements.usedItems = [];
    chat.game.elements.currentRound = 1;
    chat.game.elements.countPresses = 0;
  }
  delete chat.game.elementsMiniApp;
}

/** Tools for the whole current chat. */
export const CHAT_TOOLS = Object.freeze([
  { id: 'kill_boss', label: 'Убить босса' },
  { id: 'reset_point', label: 'Сбросить стол «21 очко»' },
  { id: 'reset_elements', label: 'Сбросить стол «Стихии»' },
  { id: 'recalc_chat_stats', label: 'Пересчитать характеристики всей группы' },
]);

export async function runChatTool(chatId, toolId) {
  if (toolId === 'kill_boss') {
    const bosses = await getBossesByChatId(chatId);
    const boss = Array.isArray(bosses) ? bosses.find(bossAlreadySummoned) : null;
    if (!boss || boss.currentHp === 0) return { ok: false, reason: 'no_boss' };
    boss.skill = null;
    boss.currentHp = 0;
    boss.hp = 0;
    boss.listOfDamage = [];
    await boss.save();
    return { ok: true, message: 'Босс убит.' };
  }
  if (toolId === 'reset_point' || toolId === 'reset_elements') {
    const chat = await getChatSession(chatId);
    (toolId === 'reset_point' ? resetPointTable : resetElementsTable)(chat);
    await chat.save();
    return { ok: true, message: 'Стол сброшен.' };
  }
  if (toolId === 'recalc_chat_stats') {
    const chat = await getChatSession(chatId);
    const members = chat.members.filter(member => !member.userChatData?.user?.is_bot && !member.isHided);
    for (const member of members) updatePlayerStats(member);
    await chat.save();
    return { ok: true, message: `Характеристики пересчитаны: ${members.length}.` };
  }
  return { ok: false, reason: 'unknown_tool' };
}

async function forEveryPlayer(visit) {
  let count = 0;
  for (const chatId of await listChatIds()) {
    // Re-read and save each chat under its lock, like the schedulers do.
    await withLock(chatId, async () => {
      const chat = await Chat.findOne({ chatId });
      if (!chat) return;
      for (const member of chat.members) {
        if (member.userChatData?.user?.is_bot) continue;
        visit(member);
        count++;
      }
      await chat.save();
    });
  }
  return count;
}

/** Tools for the whole bot. `text` marks the one that takes a message. */
export const GLOBAL_TOOLS = Object.freeze([
  { id: 'update_all_stats', label: 'Пересчитать характеристики всех игроков' },
  { id: 'update_all_skills', label: 'Обновить навыки всех игроков' },
  { id: 'restore_chests', label: 'Выдать всем попытки сундука' },
  { id: 'reset_sword_timers', label: 'Сбросить таймеры меча у всех' },
  { id: 'clear_boss_sessions', label: 'Удалить боссов пустых чатов' },
  { id: 'update_boss_model', label: 'Обновить модели боссов' },
  { id: 'hide_dead_souls', label: 'Скрыть «мёртвые души»' },
  { id: 'debug_log', label: 'Прислать лог бота в личку' },
  { id: 'broadcast', label: 'Рассылка новостей подписчикам', text: true },
]);

async function broadcast(text) {
  const recipients = new Set();
  for (const chat of await Chat.find({})) {
    for (const member of chat.members) {
      if (member.userChatData?.user?.is_bot || !member.whatsNewSettings?.flag) continue;
      recipients.add(member.userId);
    }
  }
  let sent = 0;
  for (const userId of recipients) {
    try {
      await sendMessage(userId, await translateFor(userId, `Новости: ${text}`), { disable_notification: true });
      sent++;
    } catch {
      // The player blocked the bot: skip.
    }
  }
  return sent;
}

export async function runGlobalTool(toolId, text = '') {
  switch (toolId) {
    case 'update_all_stats': {
      const count = await forEveryPlayer(member => { updatePlayerStats(member); setLevel(member); });
      return { ok: true, message: `Характеристики обновлены: ${count}.` };
    }
    case 'update_all_skills': {
      const count = await forEveryPlayer(member => updatePlayerSkills(member));
      return { ok: true, message: `Навыки обновлены: ${count}.` };
    }
    case 'restore_chests':
      await restoreChestChances();
      return { ok: true, message: 'Попытки сундука выданы.' };
    case 'reset_sword_timers':
      await resetSwordTimer();
      return { ok: true, message: 'Таймеры меча сброшены.' };
    case 'clear_boss_sessions': {
      let removed = 0;
      for (const boss of await Boss.find({})) {
        const chat = await Chat.findOne({ chatId: boss.chatId });
        if (!chat || chat.members.length <= 1) {
          await boss.deleteOne();
          removed++;
        }
      }
      return { ok: true, message: `Удалено боссов: ${removed}.` };
    }
    case 'update_boss_model':
      updateBossModel();
      return { ok: true, message: 'Модели боссов обновлены.' };
    case 'hide_dead_souls':
      await hideDeadSouls();
      return { ok: true, message: 'Мёртвые души скрыты.' };
    case 'debug_log':
      await bot.sendDocument(myId, fs.createReadStream('./api.access.log'), { caption: `Лог бота от ${new Date().toISOString()}` });
      return { ok: true, message: 'Лог отправлен тебе в личку.' };
    case 'broadcast': {
      const body = typeof text === 'string' ? text.trim() : '';
      if (!body || body.length > 3500) return { ok: false, reason: 'invalid_text' };
      return { ok: true, message: `Рассылка отправлена: ${await broadcast(body)}.` };
    }
    default:
      return { ok: false, reason: 'unknown_tool' };
  }
}

export async function getAdminToolsState(chatId) {
  const chat = await getChatSession(chatId);
  const players = chat.members
    .filter(member => !member.userChatData?.user?.is_bot && !member.isHided)
    .map(member => ({ userId: String(member.userId), name: memberName(member) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  return {
    players,
    playerTools: PLAYER_TOOLS.map(({ id, label, amountLabel }) => ({ id, label, amountLabel: amountLabel || null })),
    chatTools: CHAT_TOOLS,
    globalTools: GLOBAL_TOOLS,
  };
}

export const ADMIN_TOOL_ERRORS = Object.freeze({
  unknown_tool: 'Неизвестная команда.',
  invalid_amount: 'Нужно целое число, не ноль (до 1 000 000 000).',
  unknown_player: 'Игрок не найден в этом чате.',
  no_boss: 'Живого босса в этом чате нет.',
  invalid_text: 'Введи текст рассылки (до 3500 символов).',
});
