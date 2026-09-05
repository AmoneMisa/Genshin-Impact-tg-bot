import editMessageCaption from "../../../functions/tgBotFunctions/editMessageCaption.js";
import sendMessage from "../../../functions/tgBotFunctions/sendMessage.js";
import buttonsDictionary from "../../../dictionaries/buttons.js";
import getClan from "../../../functions/game/clans/getClan.js";
import getUserName from "../../../functions/getters/getUserName.js";
import getSession from "../../../functions/getters/getSession.js";
import getChatSession from "../../../functions/getters/getChatSession.js";
import getEmoji from "../../../functions/getters/getEmoji.js";
import addClanXp from "../../../functions/game/clans/addClanXp.js";
import summonClanBoss from "../../../functions/game/clans/summonClanBoss.js";
import clanBossAttack from "../../../functions/game/clans/clanBossAttack.js";
import giveClanShopPotion from "../../../functions/game/clans/giveClanShopPotion.js";
import clanDuel from "../../../functions/game/clans/clanDuel.js";
import getBuildingBonus from "../../../functions/game/clans/getBuildingBonus.js";
import getInvestigationBonus from "../../../functions/game/clans/getInvestigationBonus.js";
import calcReputationPoints from "../../../functions/game/clans/calcReputationPoints.js";
import calcGearScore from "../../../functions/game/player/calcGearScore.js";
import clanQuiz from "../../../dictionaries/clanQuiz.js";
import clanUpgrades from "../../../dictionaries/clanUpgrades.js";
import clanShop from "../../../dictionaries/clanShop.js";
import clanBuildings from "../../../dictionaries/clanBuildings.js";
import clanInvestigations from "../../../dictionaries/clanInvestigations.js";
import clanTasks, { CLAN_TASKS_BONUS_XP } from "../../../dictionaries/clanTasks.js";
import Clan from "../../../db/models/Clan.js";
import bot from "../../../bot.js";

const closeButton = [{ text: buttonsDictionary["ru"].close, callback_data: "close" }];

// Warehouse / contribution config.
const WAREHOUSE_RESOURCES = ["gold", "crystals", "ironOre"];
const RESOURCE_LABELS = { gold: "Золото", crystals: "Кристаллы", ironOre: "Железная руда" };
const XP_PER_CONTRIBUTION = 10; // 1 clan xp per this many resource units contributed

// Quiz reward config.
const QUIZ_GOLD_REWARD = 100;
const QUIZ_XP_REWARD = 50;
const QUIZ_CONTRIBUTION_REWARD = 10;

// Clan boss config.
const BOSS_ATTACK_COOLDOWN = 30 * 1000; // ms between a member's attacks
const BOSS_CONTRIBUTION_PER_DAMAGE = 100; // damage needed for 1 contribution point

// Cost of the next level of a character improvement track (personal gold).
function upgradeCost(track, currentLevel) {
    return track.baseCost * (currentLevel + 1);
}

// Clan shop config.
const SHOP_COOLDOWN = 7 * 24 * 60 * 60 * 1000; // one purchase per member per week

// The "tradeRoutes" investigation halves the wait, effectively ~2 purchases/week.
function getShopCooldown(clan) {
    return getInvestigationBonus(clan, "tradeRoutes") ? SHOP_COOLDOWN * 0.5 : SHOP_COOLDOWN;
}

// Renders a shop item's warehouse cost, e.g. "4000 🪙, 2 💎".
function formatShopCost(cost) {
    return Object.entries(cost)
        .map(([res, amount]) => `${amount} ${getEmoji(res)}`)
        .join(", ");
}

// Clan PvP config.
const PVP_COOLDOWN = 60 * 1000; // between a member's duels
const PVP_WIN_CONTRIBUTION = 2; // contribution granted to a duel winner

// Guild war (clan-vs-clan) config.
const WAR_DURATION = 24 * 60 * 60 * 1000; // active war window
const WAR_ATTACK_COOLDOWN = 60 * 1000; // between a member's war strikes
const WAR_TARGET_BASE_DEFENCE = 30; // war dummy defence, scales with opponent level
const WAR_ATTACK_CONTRIBUTION = 1; // contribution granted per war strike
const WAR_WIN_GOLD_PER_LEVEL = 5000; // warehouse gold to the winning clan (× level)
const WAR_WIN_CRYSTALS = 20; // warehouse crystals to the winning clan
const WAR_WIN_XP = 500; // clan xp to the winner
const WAR_CONSOLATION_XP = 100; // clan xp to the loser / on a draw

// Moderation config.
const KICK_COOLDOWN = 5 * 60 * 1000; // between kicks performed by the same actor

// Class options selectable as an entry requirement (see dictionaries/emoji.js).
const CLAN_CLASS_LABELS = { noClass: "Бродяжка", priest: "Прист", mage: "Маг", archer: "Лучник", warrior: "Палладин", berserk: "Берсерк" };

// Returns "owner" | "officer" | "member" | null for a userId in a clan.
function getRole(clan, userId) {
    return findMember(clan, userId)?.role || null;
}

// Owner and officers can manage members/applications/buildings/wars; only the
// owner can promote/demote, disband, or edit entry conditions.
function canManage(clan, userId) {
    const role = getRole(clan, userId);
    return role === "owner" || role === "officer";
}

// Checks a joining player's session against a clan's entryConditions, returning
// a list of human-readable reasons they don't qualify (empty = eligible).
function getEntryBlockReasons(clan, session) {
    const cond = clan.entryConditions || {};
    const reasons = [];

    const level = session.game?.stats?.lvl || 1;
    if (cond.minLevel && level < cond.minLevel) {
        reasons.push(`• Минимальный уровень: ${cond.minLevel} (у тебя ${level})`);
    }

    if (cond.minGearScore) {
        const gearScore = Number(calcGearScore(session.game)) || 0;
        if (gearScore < cond.minGearScore) {
            reasons.push(`• Минимальный рейтинг снаряжения: ${cond.minGearScore} (у тебя ${gearScore})`);
        }
    }

    if (cond.allowedClass && session.game?.gameClass?.name !== cond.allowedClass) {
        reasons.push(`• Требуемый класс: ${CLAN_CLASS_LABELS[cond.allowedClass] || cond.allowedClass}`);
    }

    if (cond.allowedGender && session.gender !== cond.allowedGender) {
        reasons.push(`• Требуемый пол: ${cond.allowedGender === "male" ? "муж." : "жен."}`);
    }

    return reasons;
}

// A member can duel only if they have a battle-ready class (skills).
function hasCombatClass(session) {
    const skills = session.game?.gameClass?.skills;
    return Array.isArray(skills) && skills.length > 0;
}

// Returns (lazily creating) a member's win/loss/draw record on clan.pvp.
function getPvpRecord(clan, userId) {
    if (!clan.pvp) {
        clan.pvp = { records: {}, cooldowns: {} };
    }
    if (!clan.pvp.records) {
        clan.pvp.records = {};
    }
    const key = String(userId);
    if (!clan.pvp.records[key]) {
        clan.pvp.records[key] = { wins: 0, losses: 0, draws: 0 };
    }
    return clan.pvp.records[key];
}

// Rolls loot into the shared warehouse + contribution, then clears the boss.
function grantBossRewards(clan, boss) {
    if (!clan.warehouse) {
        clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
    }

    const goldReward = Math.floor(boss.maxHp * (1 + getBuildingBonus(clan, "treasury")));
    const crystalReward = 10 * boss.level;
    const xpReward = 100 * boss.level;

    clan.warehouse.gold = (clan.warehouse.gold || 0) + goldReward;
    clan.warehouse.crystals = (clan.warehouse.crystals || 0) + crystalReward;

    for (const [uid, dmg] of Object.entries(boss.damageByUser || {})) {
        const member = clan.members.find(m => m.userId?.toString() === uid);
        if (member) {
            member.contribution = (member.contribution || 0) + Math.floor(dmg / BOSS_CONTRIBUTION_PER_DAMAGE);
        }
    }

    const { leveledUp, level } = addClanXp(clan, xpReward);
    clan.boss = null;

    return { goldReward, crystalReward, xpReward, leveledUp, level };
}

// Returns the member subdoc for a userId, or null.
function findMember(clan, userId) {
    return clan.members.find(m => m.userId === userId) || null;
}

// Applies a war reward (warehouse + xp) to a clan for a given outcome.
function applyWarReward(clan, outcome) {
    if (outcome === "win") {
        if (!clan.warehouse) {
            clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
        }
        const gold = Math.floor(WAR_WIN_GOLD_PER_LEVEL * (clan.level || 1) * (1 + getBuildingBonus(clan, "treasury")));
        clan.warehouse.gold = (clan.warehouse.gold || 0) + gold;
        clan.warehouse.crystals = (clan.warehouse.crystals || 0) + WAR_WIN_CRYSTALS;
        addClanXp(clan, WAR_WIN_XP);
    } else {
        // loss or draw
        addClanXp(clan, WAR_CONSOLATION_XP);
    }
}

// Resolves an ended guild war for BOTH clans in one pass (rare, only fires the
// first time a member opens the war menu after endsAt). Rewards are applied to
// each clan fairly and both guildWar states are cleared, so the outcome does not
// depend on which side triggers resolution. Reads the caller's clan perspective.
async function resolveGuildWar(clan) {
    const war = clan.guildWar;
    if (!war) {
        return null;
    }

    const opponent = await Clan.findById(war.opponentClanId);
    const oppWar = opponent?.guildWar;
    const sameWar = oppWar && oppWar.warId === war.warId;

    const myScore = war.score || 0;
    const oppScore = sameWar ? (oppWar.score || 0) : 0;

    let myOutcome; // from clan's perspective
    if (!opponent || !sameWar) {
        // Opponent disbanded or already resolved into a different state — void it.
        clan.guildWar = null;
        await clan.save();
        return { outcome: "void", myScore, oppScore, opponentName: war.opponentName };
    }

    if (myScore > oppScore) {
        myOutcome = "win";
    } else if (myScore < oppScore) {
        myOutcome = "loss";
    } else {
        myOutcome = "draw";
    }
    const oppOutcome = myOutcome === "win" ? "loss" : myOutcome === "loss" ? "win" : "draw";

    applyWarReward(clan, myOutcome);
    applyWarReward(opponent, oppOutcome);
    clan.guildWar = null;
    opponent.guildWar = null;

    await clan.save();
    await opponent.save();

    return { outcome: myOutcome, myScore, oppScore, opponentName: war.opponentName };
}

// Builds a throwaway war target for a strike; effectively unkillable so each
// strike simply yields the damage number, reused as war points via clanBossAttack.
function buildWarTarget(opponentLevel) {
    return {
        currentHp: Number.POSITIVE_INFINITY,
        defence: WAR_TARGET_BASE_DEFENCE + (opponentLevel || 1) * 3,
        damageByUser: {}
    };
}

// Formats the win/loss/draw/void war outcome into a player-facing message.
function formatWarResult(res) {
    if (!res) {
        return "";
    }
    if (res.outcome === "void") {
        return `Война с кланом ${res.opponentName} отменена: противник недоступен.`;
    }
    const header = res.outcome === "win"
        ? `Победа в войне против ${res.opponentName}! 🏆`
        : res.outcome === "loss"
            ? `Поражение в войне против ${res.opponentName}.`
            : `Ничья в войне против ${res.opponentName}.`;
    let msg = `${header}\n\nОчки: ${res.myScore} — ${res.oppScore}\n\n`;
    if (res.outcome === "win") {
        msg += `Клан получил ${WAR_WIN_GOLD_PER_LEVEL} × уровень ${getEmoji("gold")}, +${WAR_WIN_CRYSTALS} ${getEmoji("crystals")} и +${WAR_WIN_XP} XP.`;
    } else {
        msg += `Клан получил +${WAR_CONSOLATION_XP} XP за участие.`;
    }
    return msg;
}

// Ensures the player exists in the chat, then returns the member subdoc from a
// freshly loaded chat instance so mutations + chat.save() hit the same document.
async function loadPlayer(chatId, userId) {
    await getSession(chatId, userId); // guarantees the member + inventory exist
    const chat = await getChatSession(chatId);
    const member = chat.members.find(m => m.userId?.toString() === userId.toString());
    return { chat, member };
}

// Lazily initialise the daily quiz state before the first scheduler run.
function ensureQuizState(clan) {
    if (!clan.quiz || !clan.quiz.lastResetAt) {
        clan.quiz = {
            lastResetAt: Date.now(),
            questionIndex: Math.floor(Math.random() * clanQuiz.length),
            participants: {}
        };
    }
    if (!clan.quiz.participants) {
        clan.quiz.participants = {};
    }
    return clanQuiz[clan.quiz.questionIndex] || clanQuiz[0];
}

// Lazily initialise today's task-checklist state before the first scheduler run.
function ensureTaskState(clan) {
    if (!clan.tasks || !clan.tasks.lastResetAt) {
        clan.tasks = { lastResetAt: Date.now(), progress: {}, claimed: {} };
    }
    if (!clan.tasks.progress) {
        clan.tasks.progress = {};
    }
    if (!clan.tasks.claimed) {
        clan.tasks.claimed = {};
    }
}

// Marks a daily task as done today for a member (idempotent). Caller is
// responsible for clan.save() (clan.tasks is Mixed).
function markTaskProgress(clan, userId, taskKey) {
    ensureTaskState(clan);
    const key = String(userId);
    if (!clan.tasks.progress[key]) {
        clan.tasks.progress[key] = {};
    }
    clan.tasks.progress[key][taskKey] = true;
}

function editCaption(callback, message, keyboard = []) {
    return editMessageCaption(message, {
        chat_id: callback.message.chat.id,
        message_id: callback.message.message_id,
        disable_notification: true,
        reply_markup: {
            inline_keyboard: [...keyboard, closeButton]
        }
    }, callback.message.photo);
}

export default [
    [/^clan\.listMembers$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        let message = `Список участников клана ${clan.name} (${clan.members.length}):\n\n`;
        for (const member of clan.members) {
            const name = await getUserName(member.userId, "name");
            const roleLabel = member.role === "owner" ? " 👑" : member.role === "officer" ? " ⭐" : "";
            message += `• ${name || member.userId}${roleLabel}\n`;
        }

        return editCaption(callback, message);
    }],

    [/^clan\.create$/, async function (session, callback) {
        const userId = callback.from.id;

        const existing = await getClan(userId);
        if (existing) {
            return editCaption(callback, `Ты уже состоишь в клане ${existing.name}.`);
        }

        const prompt = await sendMessage(callback.message.chat.id, "Введите название клана (в ответ на это сообщение):", {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);

            if (replyMsg.from.id !== userId) {
                return;
            }

            const name = (replyMsg.text || "").trim();
            if (!name) {
                return sendMessage(callback.message.chat.id, "Название клана не может быть пустым.");
            }

            // Guard against a race where the user joined/created a clan meanwhile.
            if (await getClan(userId)) {
                return sendMessage(callback.message.chat.id, "Ты уже состоишь в клане.");
            }

            try {
                const clan = await Clan.create({
                    name,
                    owner: userId,
                    members: [{ userId, role: "owner" }]
                });
                await sendMessage(callback.message.chat.id, `Клан ${clan.name} создан! Ты его глава.`);
            } catch (e) {
                if (e.code === 11000) {
                    return sendMessage(callback.message.chat.id, "Клан с таким названием уже существует.");
                }
                throw e;
            }
        });
    }],

    [/^clan\.join$/, async function (session, callback) {
        const userId = callback.from.id;

        if (await getClan(userId)) {
            return editCaption(callback, "Ты уже состоишь в клане.");
        }

        // Show open clans (free entry / by application), skip closed ones.
        const clans = await Clan.find({ "entryConditions.entryType": { $ne: -1 } }).limit(20);
        if (!clans.length) {
            return editCaption(callback, "Пока нет доступных для вступления кланов. Создай свой!");
        }

        const keyboard = clans.map(clan => ([{
            text: `${clan.name} (${clan.members.length})`,
            callback_data: `clan.join_${clan._id}`
        }]));

        return editCaption(callback, "Выбери клан для вступления:", keyboard);
    }],

    [/^clan\.join_([a-f0-9]{24})$/, async function (session, callback, [, clanId]) {
        const userId = callback.from.id;

        if (await getClan(userId)) {
            return editCaption(callback, "Ты уже состоишь в клане.");
        }

        const clan = await Clan.findById(clanId);
        if (!clan) {
            return editCaption(callback, "Клан не найден.");
        }

        if (clan.entryConditions?.entryType === -1) {
            return editCaption(callback, "Этот клан закрыт для вступления.");
        }

        if (clan.entryConditions?.entryType === 1) {
            if (!clan.applications.includes(userId)) {
                clan.applications.push(userId);
                await clan.save();
            }
            return editCaption(callback, `Заявка на вступление в ${clan.name} отправлена.`);
        }

        const reasons = getEntryBlockReasons(clan, session);
        if (reasons.length) {
            return editCaption(callback, `Ты не соответствуешь условиям вступления в ${clan.name}:\n${reasons.join("\n")}`);
        }

        clan.members.push({ userId, role: "member" });
        clan.reputation = calcReputationPoints(clan);
        await clan.save();
        return editCaption(callback, `Ты вступил в клан ${clan.name}!`);
    }],

    [/^clan\.leave$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);

        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (clan.owner === userId) {
            return editCaption(callback, "Глава не может покинуть клан. Используй «Расформировать клан».");
        }

        clan.members = clan.members.filter(m => m.userId !== userId);
        clan.reputation = calcReputationPoints(clan);
        await clan.save();
        return editCaption(callback, `Ты покинул клан ${clan.name}.`);
    }],

    [/^clan\.reconstruct$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);

        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (clan.owner !== userId) {
            return editCaption(callback, "Только глава может расформировать клан.");
        }

        const name = clan.name;
        await clan.deleteOne();
        return editCaption(callback, `Клан ${name} расформирован.`);
    }],

    // ---- Warehouse (Phase 1) ----
    [/^clan\.warehouse$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const member = findMember(clan, callback.from.id);
        const wh = clan.warehouse || {};

        let message = `Хранилище клана ${clan.name} (уровень ${clan.level}, ${clan.xp} XP):\n\n`;
        for (const res of WAREHOUSE_RESOURCES) {
            message += `${getEmoji(res)} ${RESOURCE_LABELS[res]}: ${wh[res] || 0}\n`;
        }
        message += `\nТвой вклад: ${member?.contribution || 0}`;

        return editCaption(callback, message, [[{
            text: "Внести вклад",
            callback_data: "clan.contribute"
        }]]);
    }],

    [/^clan\.contribute$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const keyboard = WAREHOUSE_RESOURCES.map(res => ([{
            text: `${getEmoji(res)} ${RESOURCE_LABELS[res]}`,
            callback_data: `clan.contribute_${res}`
        }]));

        return editCaption(callback, "Что внести в хранилище?", keyboard);
    }],

    [/^clan\.contribute_(gold|crystals|ironOre)$/, async function (session, callback, [, resource]) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const prompt = await sendMessage(callback.message.chat.id, `Сколько внести (${RESOURCE_LABELS[resource]})? Ответь на это сообщение числом:`, {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);

            if (replyMsg.from.id !== userId) {
                return;
            }

            const amount = parseInt(replyMsg.text, 10);
            if (!Number.isFinite(amount) || amount <= 0) {
                return sendMessage(callback.message.chat.id, "Введи положительное число.");
            }

            // Reload the clan in case membership changed while we waited for the reply.
            const freshClan = await getClan(userId);
            if (!freshClan) {
                return sendMessage(callback.message.chat.id, "Ты больше не состоишь в клане.");
            }

            const { chat, member: playerSession } = await loadPlayer(callback.message.chat.id, userId);
            const available = playerSession.game.inventory[resource] || 0;

            if (available < amount) {
                return sendMessage(callback.message.chat.id, `Недостаточно ресурса. У тебя ${RESOURCE_LABELS[resource]}: ${available}.`);
            }

            playerSession.game.inventory[resource] = available - amount;

            if (!freshClan.warehouse) {
                freshClan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
            }
            freshClan.warehouse[resource] = (freshClan.warehouse[resource] || 0) + amount;

            const member = findMember(freshClan, userId);
            if (member) {
                member.contribution = (member.contribution || 0) + amount;
            }

            const { leveledUp, level } = addClanXp(freshClan, Math.floor(amount / XP_PER_CONTRIBUTION));
            markTaskProgress(freshClan, userId, "contribute");

            await chat.save();
            await freshClan.save();

            let text = `Ты внёс ${amount} ${RESOURCE_LABELS[resource]} в хранилище клана ${freshClan.name}.`;
            if (leveledUp) {
                text += ` Клан достиг уровня ${level}!`;
            }
            return sendMessage(callback.message.chat.id, text);
        });
    }],

    // ---- Quiz (Phase 2) ----
    [/^clan\.quiz$/, async function (session, callback) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (!clanQuiz.length) {
            return editCaption(callback, "Вопросы викторины пока не заданы.");
        }

        const question = ensureQuizState(clan);
        await clan.save();

        const record = clan.quiz.participants[userId];
        if (record) {
            const verdict = record.correct ? "Ты ответил верно! ✅" : "Ты ответил неверно. ❌";
            return editCaption(callback, `Клановая викторина\n\nТы уже отвечал сегодня.\n${verdict}\n\nНовый вопрос — завтра.`);
        }

        const keyboard = question.options.map((opt, i) => ([{
            text: opt,
            callback_data: `clan.quiz.answer_${i}`
        }]));

        return editCaption(callback, `Клановая викторина ${clan.name}\n\n${question.question}`, keyboard);
    }],

    [/^clan\.quiz\.answer_([0-9]+)$/, async function (session, callback, [, rawIndex]) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const question = ensureQuizState(clan);

        if (clan.quiz.participants[userId]) {
            const verdict = clan.quiz.participants[userId].correct ? "верно ✅" : "неверно ❌";
            return editCaption(callback, `Ты уже отвечал сегодня (${verdict}). Новый вопрос — завтра.`);
        }

        const chosen = parseInt(rawIndex, 10);
        const correct = chosen === question.answer;

        clan.quiz.participants[userId] = { correct, answeredAt: Date.now() };
        markTaskProgress(clan, userId, "quizAnswer");

        let message;
        if (correct) {
            const { chat, member: playerSession } = await loadPlayer(callback.message.chat.id, userId);
            playerSession.game.inventory.gold = (playerSession.game.inventory.gold || 0) + QUIZ_GOLD_REWARD;

            const member = findMember(clan, userId);
            if (member) {
                member.contribution = (member.contribution || 0) + QUIZ_CONTRIBUTION_REWARD;
            }
            const { leveledUp, level } = addClanXp(clan, QUIZ_XP_REWARD);

            await chat.save();

            message = `Верно! ✅\nНаграда: ${QUIZ_GOLD_REWARD} ${getEmoji("gold")} золота, +${QUIZ_XP_REWARD} XP клана.`;
            if (leveledUp) {
                message += `\nКлан достиг уровня ${level}!`;
            }
        } else {
            const right = question.options[question.answer];
            message = `Неверно. ❌\nПравильный ответ: ${right}.`;
        }

        await clan.save();

        return editCaption(callback, `Клановая викторина\n\n${message}\n\nНовый вопрос — завтра.`);
    }],

    // ---- Clan boss (Phase 3) ----
    [/^clan\.boss$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const boss = clan.boss;
        if (!boss) {
            return editCaption(callback, "Клановый босс не призван. Призови его, чтобы получить награду в хранилище клана!", [[{
                text: "Призвать босса",
                callback_data: "clan.boss.summon"
            }]]);
        }

        const message = `Клановый босс: ${boss.name} (ур. ${boss.level})\n\n❤️ ХП: ${boss.currentHp} / ${boss.maxHp}`;
        return editCaption(callback, message, [[{
            text: "Нанести удар",
            callback_data: "clan.boss.attack"
        }, {
            text: "Список урона",
            callback_data: "clan.boss.damage"
        }]]);
    }],

    [/^clan\.boss\.summon$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (clan.boss) {
            return editCaption(callback, `Босс ${clan.boss.name} уже призван.`, [[{
                text: "К боссу",
                callback_data: "clan.boss"
            }]]);
        }

        clan.boss = summonClanBoss(clan);
        await clan.save();

        return editCaption(callback, `Призван клановый босс: ${clan.boss.name} (ур. ${clan.boss.level})!\n\n❤️ ХП: ${clan.boss.currentHp} / ${clan.boss.maxHp}`, [[{
            text: "Нанести удар",
            callback_data: "clan.boss.attack"
        }, {
            text: "Список урона",
            callback_data: "clan.boss.damage"
        }]]);
    }],

    [/^clan\.boss\.attack$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const boss = clan.boss;
        if (!boss) {
            return editCaption(callback, "Клановый босс не призван.", [[{
                text: "Призвать босса",
                callback_data: "clan.boss.summon"
            }]]);
        }

        const userKey = String(callback.from.id);
        const now = Date.now();
        if (boss.cooldowns && boss.cooldowns[userKey] > now) {
            const remain = Math.ceil((boss.cooldowns[userKey] - now) / 1000);
            return editCaption(callback, `Ты восстанавливаешься. Следующий удар через ${remain} сек.`, [[{
                text: "К боссу",
                callback_data: "clan.boss"
            }]]);
        }

        // `session` is the caller's member subdoc in the current chat (from the dispatcher).
        // Clan improvements live on the clan member subdoc.
        const attacker = findMember(clan, callback.from.id);
        const barracksMul = 1 + getBuildingBonus(clan, "barracks");
        const result = clanBossAttack(session, boss, attacker?.upgrades || {}, barracksMul);
        if (result.error === "noClass") {
            return editCaption(callback, "Сначала выбери игровой класс через меню игрока, чтобы сражаться.");
        }

        if (!boss.cooldowns) {
            boss.cooldowns = {};
        }
        const bossCooldown = getInvestigationBonus(clan, "swiftStrikes") ? BOSS_ATTACK_COOLDOWN * 0.7 : BOSS_ATTACK_COOLDOWN;
        boss.cooldowns[userKey] = now + bossCooldown;
        markTaskProgress(clan, callback.from.id, "bossAttack");

        let message = `Ты нанёс ${result.dmg}${result.isCrit ? " (крит!) 💥" : ""} урона боссу ${boss.name}.`;

        if (result.defeated) {
            const reward = grantBossRewards(clan, boss);
            await clan.save();

            message += `\n\nБосс повержен! 🏆\nВ хранилище клана: +${reward.goldReward} ${getEmoji("gold")}, +${reward.crystalReward} ${getEmoji("crystals")}. Клан получил +${reward.xpReward} XP.`;
            if (reward.leveledUp) {
                message += `\nКлан достиг уровня ${reward.level}!`;
            }
            return editCaption(callback, message, [[{
                text: "К клановому боссу",
                callback_data: "clan.boss"
            }]]);
        }

        await clan.save();
        message += `\n\n❤️ ХП босса: ${boss.currentHp} / ${boss.maxHp}`;
        return editCaption(callback, message, [[{
            text: "Нанести удар",
            callback_data: "clan.boss.attack"
        }, {
            text: "Список урона",
            callback_data: "clan.boss.damage"
        }]]);
    }],

    [/^clan\.boss\.damage$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const boss = clan.boss;
        if (!boss) {
            return editCaption(callback, "Клановый босс не призван.", [[{
                text: "Призвать босса",
                callback_data: "clan.boss.summon"
            }]]);
        }

        const entries = Object.entries(boss.damageByUser || {}).sort((a, b) => b[1] - a[1]);

        let message = `Клановый босс: ${boss.name}\n❤️ ХП: ${boss.currentHp} / ${boss.maxHp}\n\nСписок урона:\n`;
        if (!entries.length) {
            message += "Пока никто не атаковал.";
        } else {
            for (const [uid, dmg] of entries) {
                const name = await getUserName(Number(uid), "name");
                message += `• ${name || uid}: ${dmg}\n`;
            }
        }

        return editCaption(callback, message, [[{
            text: "К боссу",
            callback_data: "clan.boss"
        }]]);
    }],

    // ---- Activities (schema ready in db/models/Clan.js, gameplay pending) ----
    // ---- Friendly PvP (Phase 6) ----
    [/^clan\.pvp$/, async function (session, callback) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const record = getPvpRecord(clan, userId);
        await clan.save(); // persist lazy record init

        let message = `Дружеские дуэли\n\nТвой счёт: ${record.wins} побед / ${record.losses} поражений / ${record.draws} ничьих\n\n`;

        if (!hasCombatClass(session)) {
            return editCaption(callback, message + "Сначала выбери боевой класс через меню игрока, чтобы участвовать в дуэлях.");
        }

        // Opponents = fellow clan members present in this chat with a battle class.
        const chat = await getChatSession(callback.message.chat.id);
        const clanMemberIds = new Set(clan.members.map(m => m.userId));
        const opponents = chat.members.filter(m =>
            m.userId !== userId &&
            clanMemberIds.has(m.userId) &&
            hasCombatClass(m)
        );

        if (!opponents.length) {
            return editCaption(callback, message + "Нет доступных соперников из клана в этом чате.");
        }

        const keyboard = [];
        for (const opponent of opponents) {
            const name = await getUserName(opponent.userId, "name");
            keyboard.push([{
                text: name || String(opponent.userId),
                callback_data: `clan.pvp.fight_${opponent.userId}`
            }]);
        }

        return editCaption(callback, message + "Выбери соперника:", keyboard);
    }],

    [/^clan\.pvp\.fight_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const opponentId = Number(rawId);

        if (opponentId === userId) {
            return editCaption(callback, "Нельзя вызвать на дуэль самого себя.");
        }

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (!clan.members.some(m => m.userId === opponentId)) {
            return editCaption(callback, "Этот игрок не состоит в твоём клане.");
        }

        if (!clan.pvp) {
            clan.pvp = { records: {}, cooldowns: {} };
        }
        if (!clan.pvp.cooldowns) {
            clan.pvp.cooldowns = {};
        }

        const now = Date.now();
        if (clan.pvp.cooldowns[String(userId)] > now) {
            const remain = Math.ceil((clan.pvp.cooldowns[String(userId)] - now) / 1000);
            return editCaption(callback, `Отдышись после боя. Следующая дуэль через ${remain} сек.`);
        }

        const chatId = callback.message.chat.id;
        const chat = await getChatSession(chatId);
        if (!chat.members.some(m => m.userId === opponentId)) {
            return editCaption(callback, "Соперник должен находиться в этом чате.");
        }

        const attacker = await getSession(chatId, userId);
        const defender = await getSession(chatId, opponentId);

        if (!hasCombatClass(attacker)) {
            return editCaption(callback, "Сначала выбери боевой класс через меню игрока.");
        }
        if (!hasCombatClass(defender)) {
            return editCaption(callback, "У соперника нет боевого класса.");
        }

        const { result } = clanDuel(attacker, defender);

        const myRecord = getPvpRecord(clan, userId);
        const oppRecord = getPvpRecord(clan, opponentId);
        const oppName = (await getUserName(opponentId, "name")) || String(opponentId);

        let message;
        if (result === 0) {
            myRecord.wins++;
            oppRecord.losses++;
            const member = findMember(clan, userId);
            if (member) {
                member.contribution = (member.contribution || 0) + PVP_WIN_CONTRIBUTION;
            }
            markTaskProgress(clan, userId, "duelWin");
            message = `Победа! 🏆 Ты одолел ${oppName}. +${PVP_WIN_CONTRIBUTION} к вкладу в клан.`;
        } else if (result === 1) {
            myRecord.losses++;
            oppRecord.wins++;
            message = `Поражение. ${oppName} оказался сильнее. Тренируйся и возвращайся!`;
        } else {
            myRecord.draws++;
            oppRecord.draws++;
            message = `Ничья с ${oppName}. Достойный бой!`;
        }

        clan.pvp.cooldowns[String(userId)] = now + PVP_COOLDOWN;
        // Note: player sessions are intentionally NOT saved — the duel is a
        // read-only simulation; only the clan ladder is persisted.
        await clan.save();

        return editCaption(callback, message, [[{
            text: "К дуэлям",
            callback_data: "clan.pvp"
        }]]);
    }],
    // ---- Clan shop (Phase 5) ----
    [/^clan\.shop$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const member = findMember(clan, callback.from.id);
        const wh = clan.warehouse || {};
        const now = Date.now();
        const shopCooldown = getShopCooldown(clan);
        const onCooldown = member && (now - (member.lastShopAt || 0) < shopCooldown);

        let message = "Клановый магазин (оплата из хранилища клана)\n\n";
        for (const item of clanShop) {
            message += `${item.label} — ${formatShopCost(item.cost)}\n`;
        }
        message += `\nВ хранилище: ${getEmoji("gold")} ${wh.gold || 0}, ${getEmoji("crystals")} ${wh.crystals || 0}`;

        let keyboard;
        if (onCooldown) {
            const remain = Math.ceil((shopCooldown - (now - member.lastShopAt)) / (60 * 60 * 1000));
            message += `\n\nТы уже покупал на этой неделе. Следующая покупка через ~${remain} ч.`;
            keyboard = [];
        } else {
            message += `\n\nДоступна одна покупка в неделю.`;
            keyboard = clanShop.map(item => ([{
                text: `${item.label} (${formatShopCost(item.cost)})`,
                callback_data: `clan.shop_${item.key}`
            }]));
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.shop_([a-zA-Z]+)$/, async function (session, callback, [, itemKey]) {
        const userId = callback.from.id;

        const item = clanShop.find(i => i.key === itemKey);
        if (!item) {
            return editCaption(callback, "Неизвестный товар.");
        }

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const member = findMember(clan, userId);
        if (!member) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const now = Date.now();
        if (now - (member.lastShopAt || 0) < getShopCooldown(clan)) {
            return editCaption(callback, "Ты уже покупал в клановом магазине на этой неделе.");
        }

        if (!clan.warehouse) {
            clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
        }

        // Verify the warehouse can cover every resource in the cost.
        for (const [res, amount] of Object.entries(item.cost)) {
            if ((clan.warehouse[res] || 0) < amount) {
                return editCaption(callback, `В хранилище клана недостаточно ресурсов (${RESOURCE_LABELS[res] || res}). Нужно ${amount}, есть ${clan.warehouse[res] || 0}.`);
            }
        }

        // Deliver the item to the buyer's personal inventory first — if delivery
        // fails we must not charge the warehouse.
        const { chat, member: playerSession } = await loadPlayer(callback.message.chat.id, userId);
        const delivered = giveClanShopPotion(playerSession, item.potion);
        if (!delivered) {
            return editCaption(callback, "Не удалось выдать товар. Обратись к администратору.");
        }

        for (const [res, amount] of Object.entries(item.cost)) {
            clan.warehouse[res] = (clan.warehouse[res] || 0) - amount;
        }
        member.lastShopAt = now;

        await chat.save();
        await clan.save();

        return editCaption(callback, `Покупка совершена: ${item.label}! Предмет добавлен в твой инвентарь.`, [[{
            text: "К магазину",
            callback_data: "clan.shop"
        }]]);
    }],
    // ---- Character improvements (Phase 4) ----
    [/^clan\.upgrades$/, async function (session, callback) {
        const clan = await getClan(callback.from.id);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const member = findMember(clan, callback.from.id);
        const upgrades = member?.upgrades || {};

        let message = "Улучшения персонажа (действуют против кланового босса)\n\n";
        const keyboard = [];
        for (const track of clanUpgrades) {
            const level = upgrades[track.key] || 0;
            const maxed = level >= track.maxLevel;
            message += `${track.label} — ур. ${level}/${track.maxLevel} (${track.perLevel} ${track.desc})\n`;

            if (maxed) {
                message += `  Максимальный уровень.\n`;
            } else {
                message += `  След. уровень: ${upgradeCost(track, level)} ${getEmoji("gold")}\n`;
                keyboard.push([{
                    text: `${track.label} (ур. ${level} → ${level + 1})`,
                    callback_data: `clan.upgrade_${track.key}`
                }]);
            }
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.upgrade_([a-z]+)$/, async function (session, callback, [, trackKey]) {
        const userId = callback.from.id;

        const track = clanUpgrades.find(t => t.key === trackKey);
        if (!track) {
            return editCaption(callback, "Неизвестное улучшение.");
        }

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const member = findMember(clan, userId);
        if (!member) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (!member.upgrades) {
            member.upgrades = {};
        }

        const level = member.upgrades[trackKey] || 0;
        if (level >= track.maxLevel) {
            return editCaption(callback, `${track.label}: уже максимальный уровень.`);
        }

        const cost = upgradeCost(track, level);
        const { chat, member: playerSession } = await loadPlayer(callback.message.chat.id, userId);
        const gold = playerSession.game.inventory.gold || 0;

        if (gold < cost) {
            return editCaption(callback, `Недостаточно золота. Нужно ${cost} ${getEmoji("gold")}, у тебя ${gold}.`);
        }

        playerSession.game.inventory.gold = gold - cost;
        member.upgrades[trackKey] = level + 1;
        clan.reputation = calcReputationPoints(clan);

        await chat.save();
        await clan.save();

        return editCaption(callback, `${track.label} улучшена до уровня ${level + 1}! Списано ${cost} ${getEmoji("gold")}.`, [[{
            text: "К улучшениям",
            callback_data: "clan.upgrades"
        }]]);
    }],
    // ---- Clan buildings (Phase 8) ----
    [/^clan\.buildings$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const canManageBuildings = canManage(clan, userId);
        const wh = clan.warehouse || {};

        let message = `Постройки клана ${clan.name}\n\n`;
        const keyboard = [];
        for (const b of clanBuildings) {
            const level = clan.buildings?.[b.key]?.level || 0;
            message += `🏛️ ${b.label} — ур. ${level}/${b.maxLevel}\n${b.description}\n${b.effectLabel}.\n`;
            if (level < b.maxLevel) {
                message += `Улучшение: ${formatShopCost(b.cost(level))}\n\n`;
                if (canManageBuildings) {
                    keyboard.push([{
                        text: `Улучшить: ${b.label} → ур. ${level + 1}`,
                        callback_data: `clan.building_${b.key}`
                    }]);
                }
            } else {
                message += `Максимальный уровень.\n\n`;
            }
        }
        message += `В хранилище: ${wh.gold || 0} ${getEmoji("gold")}, ${wh.crystals || 0} ${getEmoji("crystals")}, ${wh.ironOre || 0} ${getEmoji("ironOre")}`;
        if (!canManageBuildings) {
            message += `\n\nУлучшать постройки может только глава или офицер клана.`;
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.building_([a-zA-Z]+)$/, async function (session, callback, [, key]) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Улучшать постройки может только глава или офицер клана.");
        }

        const def = clanBuildings.find(b => b.key === key);
        if (!def) {
            return editCaption(callback, "Такой постройки не существует.");
        }

        if (!clan.buildings) {
            clan.buildings = {};
        }
        const level = clan.buildings[key]?.level || 0;
        if (level >= def.maxLevel) {
            return editCaption(callback, `${def.label} уже максимального уровня.`, [[{
                text: "К постройкам",
                callback_data: "clan.buildings"
            }]]);
        }

        const cost = def.cost(level);
        if (!clan.warehouse) {
            clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
        }

        // Verify the warehouse can cover the full cost before charging anything.
        for (const [res, amount] of Object.entries(cost)) {
            if ((clan.warehouse[res] || 0) < amount) {
                return editCaption(callback, `В хранилище недостаточно ресурсов (${RESOURCE_LABELS[res] || res}). Нужно ${amount}, есть ${clan.warehouse[res] || 0}.`, [[{
                    text: "К постройкам",
                    callback_data: "clan.buildings"
                }]]);
            }
        }
        for (const [res, amount] of Object.entries(cost)) {
            clan.warehouse[res] = (clan.warehouse[res] || 0) - amount;
        }

        clan.buildings[key] = { level: level + 1 };
        clan.reputation = calcReputationPoints(clan);
        await clan.save();

        return editCaption(callback, `${def.label} улучшена до уровня ${level + 1}! Эффект: ${def.effectLabel}.`, [[{
            text: "К постройкам",
            callback_data: "clan.buildings"
        }]]);
    }],

    // ---- Guild wars (Phase 7) ----
    [/^clan\.war$/, async function (session, callback) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const war = clan.guildWar;

        // No active war → offer to declare one (owner/officer only).
        if (!war) {
            const message = `Войны кланов — ${clan.name}\n\nСейчас клан не участвует в войне.`;
            if (canManage(clan, userId)) {
                return editCaption(callback, message + "\n\nОбъяви войну другому клану!", [[{
                    text: "Объявить войну",
                    callback_data: "clan.war.declare"
                }]]);
            }
            return editCaption(callback, message + "\n\nОбъявить войну может только глава или офицер клана.");
        }

        // War window elapsed → resolve it and show the outcome.
        if (Date.now() > war.endsAt) {
            const res = await resolveGuildWar(clan);
            return editCaption(callback, formatWarResult(res));
        }

        // Active war → show scoreboard and the attack action.
        const opponent = await Clan.findById(war.opponentClanId);
        const oppScore = opponent?.guildWar?.warId === war.warId ? (opponent.guildWar.score || 0) : 0;
        const remainMin = Math.ceil((war.endsAt - Date.now()) / 60000);

        const message = `Война: ${clan.name} против ${war.opponentName}\n\n`
            + `Очки: ${war.score || 0} — ${oppScore}\n`
            + `До конца войны: ~${remainMin} мин.`;

        return editCaption(callback, message, [[{
            text: "Атаковать 🗡️",
            callback_data: "clan.war.attack"
        }]]);
    }],

    [/^clan\.war\.declare$/, async function (session, callback) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Только глава или офицер клана может объявлять войну.");
        }
        if (clan.guildWar) {
            return editCaption(callback, "Твой клан уже участвует в войне.");
        }

        // Candidates: other clans not currently at war.
        const clans = await Clan.find({ _id: { $ne: clan._id }, guildWar: null }).limit(20);
        const candidates = clans.filter(c => c.members.length > 0);
        if (!candidates.length) {
            return editCaption(callback, "Нет доступных для войны кланов.");
        }

        const keyboard = candidates.map(c => ([{
            text: `${c.name} (ур. ${c.level || 1}, ${c.members.length})`,
            callback_data: `clan.war.declare_${c._id}`
        }]));

        return editCaption(callback, "Выбери клан-противника:", keyboard);
    }],

    [/^clan\.war\.declare_([a-f0-9]{24})$/, async function (session, callback, [, targetId]) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Только глава или офицер клана может объявлять войну.");
        }
        if (clan.guildWar) {
            return editCaption(callback, "Твой клан уже участвует в войне.");
        }
        if (String(targetId) === String(clan._id)) {
            return editCaption(callback, "Нельзя объявить войну своему клану.");
        }

        const target = await Clan.findById(targetId);
        if (!target) {
            return editCaption(callback, "Клан-противник не найден.");
        }
        if (target.guildWar) {
            return editCaption(callback, `Клан ${target.name} уже участвует в войне.`);
        }

        const now = Date.now();
        const warId = `${now}_${clan._id}`;
        const endsAt = now + WAR_DURATION;

        clan.guildWar = {
            warId,
            opponentClanId: String(target._id),
            opponentName: target.name,
            startedAt: now,
            endsAt,
            score: 0,
            cooldowns: {},
            participants: {}
        };
        target.guildWar = {
            warId,
            opponentClanId: String(clan._id),
            opponentName: clan.name,
            startedAt: now,
            endsAt,
            score: 0,
            cooldowns: {},
            participants: {}
        };

        await clan.save();
        await target.save();

        return editCaption(callback, `Война объявлена! ${clan.name} против ${target.name}. У вас 24 часа, чтобы набрать больше очков.`, [[{
            text: "К войне",
            callback_data: "clan.war"
        }]]);
    }],

    [/^clan\.war\.attack$/, async function (session, callback) {
        const userId = callback.from.id;

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const war = clan.guildWar;
        if (!war) {
            return editCaption(callback, "Твой клан сейчас не участвует в войне.");
        }

        // Window elapsed → resolve instead of allowing more strikes.
        if (Date.now() > war.endsAt) {
            const res = await resolveGuildWar(clan);
            return editCaption(callback, formatWarResult(res));
        }

        if (!hasCombatClass(session)) {
            return editCaption(callback, "Сначала выбери боевой класс через меню игрока, чтобы участвовать в войне.");
        }

        if (!war.cooldowns) {
            war.cooldowns = {};
        }
        const now = Date.now();
        const key = String(userId);
        if (war.cooldowns[key] > now) {
            const remain = Math.ceil((war.cooldowns[key] - now) / 1000);
            return editCaption(callback, `Перезарядка. Следующая атака через ${remain} сек.`);
        }

        const opponent = await Clan.findById(war.opponentClanId);
        const opponentLevel = opponent?.level || 1;

        const upgrades = findMember(clan, userId)?.upgrades || {};
        const barracksMul = 1 + getBuildingBonus(clan, "barracks");
        const target = buildWarTarget(opponentLevel);
        const strike = clanBossAttack(session, target, upgrades, barracksMul);
        if (strike.error === "noClass") {
            return editCaption(callback, "Сначала выбери боевой класс через меню игрока.");
        }

        const points = strike.dmg;
        war.score = (war.score || 0) + points;
        if (!war.participants) {
            war.participants = {};
        }
        war.participants[key] = (war.participants[key] || 0) + points;
        const warCooldown = getInvestigationBonus(clan, "warTactics") ? WAR_ATTACK_COOLDOWN * 0.7 : WAR_ATTACK_COOLDOWN;
        war.cooldowns[key] = now + warCooldown;

        const member = findMember(clan, userId);
        if (member) {
            member.contribution = (member.contribution || 0) + WAR_ATTACK_CONTRIBUTION;
        }

        await clan.save();

        const critText = strike.isCrit ? " (крит! 💥)" : "";
        return editCaption(callback, `Ты нанёс ${points} очков войны${critText}!\nОчки клана: ${war.score}.`, [[{
            text: "Ещё атака 🗡️",
            callback_data: "clan.war.attack"
        }], [{
            text: "К войне",
            callback_data: "clan.war"
        }]]);
    }],

    // ---- Applications review (owner/officer) ----
    [/^clan\.applications$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Заявки может рассматривать только глава или офицер клана.");
        }

        const applications = clan.applications || [];
        if (!applications.length) {
            return editCaption(callback, "Нет новых заявок на вступление.");
        }

        let message = `Заявки на вступление в ${clan.name}:\n\n`;
        const keyboard = [];
        for (const applicantId of applications) {
            const name = (await getUserName(applicantId, "name")) || String(applicantId);
            message += `• ${name}\n`;
            keyboard.push([{
                text: `✅ ${name}`,
                callback_data: `clan.applications.accept_${applicantId}`
            }, {
                text: `❌ ${name}`,
                callback_data: `clan.applications.reject_${applicantId}`
            }]);
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.applications\.accept_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const applicantId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Заявки может рассматривать только глава или офицер клана.");
        }

        clan.applications = (clan.applications || []).filter(id => id !== applicantId);

        if (await getClan(applicantId)) {
            await clan.save();
            return editCaption(callback, "Игрок уже состоит в другом клане.", [[{
                text: "К заявкам",
                callback_data: "clan.applications"
            }]]);
        }

        clan.members.push({ userId: applicantId, role: "member" });
        clan.reputation = calcReputationPoints(clan);
        await clan.save();

        const name = (await getUserName(applicantId, "name")) || String(applicantId);
        return editCaption(callback, `${name} принят(а) в клан!`, [[{
            text: "К заявкам",
            callback_data: "clan.applications"
        }]]);
    }],

    [/^clan\.applications\.reject_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const applicantId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Заявки может рассматривать только глава или офицер клана.");
        }

        clan.applications = (clan.applications || []).filter(id => id !== applicantId);
        await clan.save();

        return editCaption(callback, "Заявка отклонена.", [[{
            text: "К заявкам",
            callback_data: "clan.applications"
        }]]);
    }],

    // ---- Invite (owner/officer) ----
    [/^clan\.invite$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Приглашать может только глава или офицер клана.");
        }

        const chat = await getChatSession(callback.message.chat.id);
        const clanMemberIds = new Set(clan.members.map(m => m.userId));
        const candidates = chat.members.filter(m => m.userId !== userId && !clanMemberIds.has(m.userId));

        const alreadyInClan = await Promise.all(candidates.map(m => getClan(m.userId)));
        const eligible = candidates.filter((m, i) => !alreadyInClan[i]).slice(0, 20);

        if (!eligible.length) {
            return editCaption(callback, "В этом чате нет игроков без клана, которых можно пригласить.");
        }

        const keyboard = [];
        for (const m of eligible) {
            const name = (await getUserName(m.userId, "name")) || String(m.userId);
            keyboard.push([{ text: name, callback_data: `clan.invite_${m.userId}` }]);
        }

        return editCaption(callback, "Кого пригласить в клан?", keyboard);
    }],

    [/^clan\.invite_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const targetId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Приглашать может только глава или офицер клана.");
        }
        if (await getClan(targetId)) {
            return editCaption(callback, "Игрок уже состоит в клане.", [[{
                text: "К приглашению",
                callback_data: "clan.invite"
            }]]);
        }

        clan.members.push({ userId: targetId, role: "member" });
        clan.reputation = calcReputationPoints(clan);
        await clan.save();

        const name = (await getUserName(targetId, "name")) || String(targetId);
        return editCaption(callback, `${name} добавлен(а) в клан ${clan.name}!`, [[{
            text: "Ещё пригласить",
            callback_data: "clan.invite"
        }]]);
    }],

    // ---- Kick (owner/officer; officer can't kick another officer or the owner) ----
    [/^clan\.kick$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Исключать может только глава или офицер клана.");
        }

        const myRole = getRole(clan, userId);
        const kickable = clan.members.filter(m =>
            m.userId !== userId && m.role !== "owner" && (myRole === "owner" || m.role !== "officer")
        );

        if (!kickable.length) {
            return editCaption(callback, "Некого исключить.");
        }

        const keyboard = [];
        for (const m of kickable) {
            const name = (await getUserName(m.userId, "name")) || String(m.userId);
            keyboard.push([{ text: name, callback_data: `clan.kick_${m.userId}` }]);
        }

        return editCaption(callback, "Кого исключить из клана?", keyboard);
    }],

    [/^clan\.kick_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const targetId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Исключать может только глава или офицер клана.");
        }

        const target = findMember(clan, targetId);
        if (!target) {
            return editCaption(callback, "Этот игрок не состоит в клане.");
        }

        const myRole = getRole(clan, userId);
        if (target.role === "owner" || (target.role === "officer" && myRole !== "owner")) {
            return editCaption(callback, "Недостаточно прав, чтобы исключить этого участника.");
        }

        if (!clan.moderation) {
            clan.moderation = {};
        }
        if (!clan.moderation.kickCooldowns) {
            clan.moderation.kickCooldowns = {};
        }

        const now = Date.now();
        const actorKey = String(userId);
        if (clan.moderation.kickCooldowns[actorKey] > now) {
            const remain = Math.ceil((clan.moderation.kickCooldowns[actorKey] - now) / 1000);
            return editCaption(callback, `Подожди перед следующим исключением: ${remain} сек.`);
        }
        clan.moderation.kickCooldowns[actorKey] = now + KICK_COOLDOWN;

        clan.members = clan.members.filter(m => m.userId !== targetId);
        clan.reputation = calcReputationPoints(clan);
        await clan.save();

        const name = (await getUserName(targetId, "name")) || String(targetId);
        return editCaption(callback, `${name} исключён(а) из клана.`, [[{
            text: "К списку",
            callback_data: "clan.kick"
        }]]);
    }],

    // ---- Officer promotion (owner only) ----
    [/^clan\.roles$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (clan.owner !== userId) {
            return editCaption(callback, "Управлять ролями может только глава клана.");
        }

        let message = `Роли клана ${clan.name}\n\n`;
        const keyboard = [];
        for (const m of clan.members) {
            if (m.userId === userId) {
                continue;
            }
            const name = (await getUserName(m.userId, "name")) || String(m.userId);
            const roleLabel = m.role === "officer" ? "офицер" : "участник";
            message += `• ${name} — ${roleLabel}\n`;
            keyboard.push([{
                text: m.role === "officer" ? `${name}: разжаловать` : `${name}: сделать офицером`,
                callback_data: m.role === "officer" ? `clan.demote_${m.userId}` : `clan.promote_${m.userId}`
            }]);
        }

        if (!keyboard.length) {
            message += "В клане пока нет других участников.";
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.promote_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const targetId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (clan.owner !== userId) {
            return editCaption(callback, "Управлять ролями может только глава клана.");
        }

        const member = findMember(clan, targetId);
        if (!member || member.role === "owner") {
            return editCaption(callback, "Нельзя изменить роль этого участника.");
        }

        member.role = "officer";
        await clan.save();

        return editCaption(callback, "Участник назначен офицером.", [[{
            text: "К ролям",
            callback_data: "clan.roles"
        }]]);
    }],

    [/^clan\.demote_([0-9]+)$/, async function (session, callback, [, rawId]) {
        const userId = callback.from.id;
        const targetId = Number(rawId);

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (clan.owner !== userId) {
            return editCaption(callback, "Управлять ролями может только глава клана.");
        }

        const member = findMember(clan, targetId);
        if (!member || member.role === "owner") {
            return editCaption(callback, "Нельзя изменить роль этого участника.");
        }

        member.role = "member";
        await clan.save();

        return editCaption(callback, "Участник разжалован.", [[{
            text: "К ролям",
            callback_data: "clan.roles"
        }]]);
    }],

    // ---- Clan settings (owner only edits; owner/officer can view) ----
    [/^clan\.settings$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Настройки доступны главе и офицерам клана.");
        }

        const cond = clan.entryConditions || {};
        const entryLabel = cond.entryType === -1 ? "Закрытый" : cond.entryType === 1 ? "По заявке" : "Свободный";
        const genderLabel = cond.allowedGender === "male" ? "муж." : cond.allowedGender === "female" ? "жен." : "любой";

        let message = `Настройки клана ${clan.name}\n\n`
            + `Тег: ${clan.tag || "—"}\n`
            + `Описание: ${clan.description || "—"}\n\n`
            + `Тип вступления: ${entryLabel}\n`
            + `Мин. уровень: ${cond.minLevel || 0}\n`
            + `Мин. рейтинг снаряжения: ${cond.minGearScore || 0}\n`
            + `Требуемый класс: ${cond.allowedClass ? (CLAN_CLASS_LABELS[cond.allowedClass] || cond.allowedClass) : "любой"}\n`
            + `Требуемый пол: ${genderLabel}\n`
            + `\nРепутация: ${clan.reputation || 0} 🎖️`;

        const isOwner = clan.owner === userId;
        const keyboard = [];
        if (isOwner) {
            keyboard.push([{ text: "Тег", callback_data: "clan.settings.tag" }, { text: "Описание", callback_data: "clan.settings.description" }]);
            keyboard.push([{ text: "Тип вступления", callback_data: "clan.settings.entry" }]);
            keyboard.push([{ text: "Мин. уровень", callback_data: "clan.settings.minlevel" }, { text: "Мин. рейтинг", callback_data: "clan.settings.mingearscore" }]);
            keyboard.push([{ text: "Класс", callback_data: "clan.settings.class" }, { text: "Пол", callback_data: "clan.settings.gender" }]);
        } else {
            message += "\n\nИзменять настройки может только глава клана.";
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.settings\.tag$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять тег может только глава клана.");
        }

        const prompt = await sendMessage(callback.message.chat.id, "Введи новый тег клана (до 6 символов, в ответ на это сообщение). Пустое сообщение уберёт тег:", {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);
            if (replyMsg.from.id !== userId) {
                return;
            }

            const freshClan = await getClan(userId);
            if (!freshClan || freshClan.owner !== userId) {
                return sendMessage(callback.message.chat.id, "Ты больше не глава клана.");
            }

            const tag = (replyMsg.text || "").trim().slice(0, 6);
            freshClan.tag = tag;
            await freshClan.save();

            return sendMessage(callback.message.chat.id, tag ? `Тег клана обновлён: ${tag}` : "Тег клана убран.");
        });
    }],

    [/^clan\.settings\.description$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять описание может только глава клана.");
        }

        const prompt = await sendMessage(callback.message.chat.id, "Введи новое описание клана (до 200 символов, в ответ на это сообщение):", {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);
            if (replyMsg.from.id !== userId) {
                return;
            }

            const freshClan = await getClan(userId);
            if (!freshClan || freshClan.owner !== userId) {
                return sendMessage(callback.message.chat.id, "Ты больше не глава клана.");
            }

            const description = (replyMsg.text || "").trim().slice(0, 200);
            freshClan.description = description;
            await freshClan.save();

            return sendMessage(callback.message.chat.id, "Описание клана обновлено.");
        });
    }],

    [/^clan\.settings\.minlevel$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования может только глава клана.");
        }

        const prompt = await sendMessage(callback.message.chat.id, "Введи минимальный уровень для вступления (0 — без ограничения), ответом на это сообщение:", {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);
            if (replyMsg.from.id !== userId) {
                return;
            }

            const value = parseInt(replyMsg.text, 10);
            if (!Number.isFinite(value) || value < 0) {
                return sendMessage(callback.message.chat.id, "Введи неотрицательное число.");
            }

            const freshClan = await getClan(userId);
            if (!freshClan || freshClan.owner !== userId) {
                return sendMessage(callback.message.chat.id, "Ты больше не глава клана.");
            }

            if (!freshClan.entryConditions) {
                freshClan.entryConditions = {};
            }
            freshClan.entryConditions.minLevel = value;
            await freshClan.save();

            return sendMessage(callback.message.chat.id, `Минимальный уровень для вступления: ${value}.`);
        });
    }],

    [/^clan\.settings\.mingearscore$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования может только глава клана.");
        }

        const prompt = await sendMessage(callback.message.chat.id, "Введи минимальный рейтинг снаряжения для вступления (0 — без ограничения), ответом на это сообщение:", {
            reply_markup: { selective: true, force_reply: true }
        });

        const listenerId = bot.onReplyToMessage(prompt.chat.id, prompt.message_id, async (replyMsg) => {
            bot.removeReplyListener(listenerId);
            if (replyMsg.from.id !== userId) {
                return;
            }

            const value = parseInt(replyMsg.text, 10);
            if (!Number.isFinite(value) || value < 0) {
                return sendMessage(callback.message.chat.id, "Введи неотрицательное число.");
            }

            const freshClan = await getClan(userId);
            if (!freshClan || freshClan.owner !== userId) {
                return sendMessage(callback.message.chat.id, "Ты больше не глава клана.");
            }

            if (!freshClan.entryConditions) {
                freshClan.entryConditions = {};
            }
            freshClan.entryConditions.minGearScore = value;
            await freshClan.save();

            return sendMessage(callback.message.chat.id, `Минимальный рейтинг снаряжения для вступления: ${value}.`);
        });
    }],

    [/^clan\.settings\.entry$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять тип вступления может только глава клана.");
        }

        return editCaption(callback, "Выбери тип вступления в клан:", [
            [{ text: "Свободный", callback_data: "clan.settings.entry_0" }],
            [{ text: "По заявке", callback_data: "clan.settings.entry_1" }],
            [{ text: "Закрытый", callback_data: "clan.settings.entry_-1" }]
        ]);
    }],

    [/^clan\.settings\.entry_(-1|0|1)$/, async function (session, callback, [, rawType]) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять тип вступления может только глава клана.");
        }

        if (!clan.entryConditions) {
            clan.entryConditions = {};
        }
        clan.entryConditions.entryType = Number(rawType);
        await clan.save();

        return editCaption(callback, "Тип вступления обновлён.", [[{
            text: "К настройкам",
            callback_data: "clan.settings"
        }]]);
    }],

    [/^clan\.settings\.class$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования по классу может только глава клана.");
        }

        const keyboard = [[{ text: "любой", callback_data: "clan.settings.class_any" }]];
        for (const [key, label] of Object.entries(CLAN_CLASS_LABELS)) {
            keyboard.push([{ text: label, callback_data: `clan.settings.class_${key}` }]);
        }

        return editCaption(callback, "Выбери требуемый класс для вступления:", keyboard);
    }],

    [/^clan\.settings\.class_(any|noClass|priest|mage|archer|warrior|berserk)$/, async function (session, callback, [, key]) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования по классу может только глава клана.");
        }

        if (!clan.entryConditions) {
            clan.entryConditions = {};
        }
        clan.entryConditions.allowedClass = key === "any" ? "" : key;
        await clan.save();

        return editCaption(callback, "Требование по классу обновлено.", [[{
            text: "К настройкам",
            callback_data: "clan.settings"
        }]]);
    }],

    [/^clan\.settings\.gender$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования по полу может только глава клана.");
        }

        return editCaption(callback, "Выбери требуемый пол для вступления:", [
            [{ text: "любой", callback_data: "clan.settings.gender_any" }],
            [{ text: "муж.", callback_data: "clan.settings.gender_male" }],
            [{ text: "жен.", callback_data: "clan.settings.gender_female" }]
        ]);
    }],

    [/^clan\.settings\.gender_(any|male|female)$/, async function (session, callback, [, key]) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan || clan.owner !== userId) {
            return editCaption(callback, "Изменять требования по полу может только глава клана.");
        }

        if (!clan.entryConditions) {
            clan.entryConditions = {};
        }
        clan.entryConditions.allowedGender = key === "any" ? "" : key;
        await clan.save();

        return editCaption(callback, "Требование по полу обновлено.", [[{
            text: "К настройкам",
            callback_data: "clan.settings"
        }]]);
    }],

    // ---- Investigations: cooperative, multi-day research (dictionaries/clanInvestigations.js) ----
    [/^clan\.investigations$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        if (!clan.investigations) {
            clan.investigations = { active: null, completed: [] };
        }
        const { active, completed } = clan.investigations;

        let message = `Исследования клана ${clan.name}\n\n`;

        if (completed?.length) {
            message += "Завершено:\n";
            for (const key of completed) {
                const def = clanInvestigations.find(i => i.key === key);
                if (def) {
                    message += `• ${def.label} — ${def.effectLabel}\n`;
                }
            }
            message += "\n";
        }

        if (active) {
            const def = clanInvestigations.find(i => i.key === active.key);
            if (!def) {
                clan.investigations.active = null;
                await clan.save();
                return editCaption(callback, "Активное исследование больше не существует. Начни новое.", [[{
                    text: "К исследованиям",
                    callback_data: "clan.investigations"
                }]]);
            }

            message += `Активно: ${def.label}\n${def.description}\nЭффект: ${def.effectLabel}\n\n`;
            for (const [res, need] of Object.entries(def.cost)) {
                const have = active.progress?.[res] || 0;
                message += `${getEmoji(res)} ${RESOURCE_LABELS[res]}: ${have} / ${need}\n`;
            }

            const fullyFunded = Object.entries(def.cost).every(([res, need]) => (active.progress?.[res] || 0) >= need);
            const durationDone = Date.now() - active.startedAt >= def.durationMs;

            if (!durationDone) {
                const remainMs = def.durationMs - (Date.now() - active.startedAt);
                message += `\nОсталось минимум: ~${Math.ceil(remainMs / (60 * 60 * 1000))} ч.`;
            } else if (!fullyFunded) {
                message += `\nВремя вышло, ждём финансирования.`;
            }

            const keyboard = [[{ text: "Пополнить из хранилища", callback_data: "clan.investigations.fund" }]];
            if (fullyFunded && durationDone) {
                keyboard.push([{ text: "Завершить исследование", callback_data: "clan.investigations.complete" }]);
            }
            if (canManage(clan, userId)) {
                keyboard.push([{ text: "Отменить (вернуть ресурсы)", callback_data: "clan.investigations.cancel" }]);
            }

            return editCaption(callback, message, keyboard);
        }

        const startable = clanInvestigations.filter(i => !completed?.includes(i.key));
        if (!startable.length) {
            message += "Все доступные исследования завершены.";
            return editCaption(callback, message);
        }

        message += "Нет активного исследования.";
        const keyboard = [];
        if (canManage(clan, userId)) {
            for (const def of startable) {
                keyboard.push([{
                    text: `${def.label} (${formatShopCost(def.cost)})`,
                    callback_data: `clan.investigations.start_${def.key}`
                }]);
            }
        } else {
            message += "\n\nНачать исследование может только глава или офицер клана.";
        }

        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.investigations\.start_([a-zA-Z]+)$/, async function (session, callback, [, key]) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Начать исследование может только глава или офицер клана.");
        }

        const def = clanInvestigations.find(i => i.key === key);
        if (!def) {
            return editCaption(callback, "Неизвестное исследование.");
        }

        if (!clan.investigations) {
            clan.investigations = { active: null, completed: [] };
        }
        if (clan.investigations.active) {
            return editCaption(callback, "Уже идёт другое исследование.");
        }
        if (clan.investigations.completed?.includes(key)) {
            return editCaption(callback, "Это исследование уже завершено.");
        }

        clan.investigations.active = {
            key,
            progress: { gold: 0, crystals: 0, ironOre: 0 },
            startedAt: Date.now()
        };
        await clan.save();

        return editCaption(callback, `Начато исследование: ${def.label}!`, [[{
            text: "К исследованиям",
            callback_data: "clan.investigations"
        }]]);
    }],

    [/^clan\.investigations\.fund$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const active = clan.investigations?.active;
        if (!active) {
            return editCaption(callback, "Сейчас нет активного исследования.");
        }

        const def = clanInvestigations.find(i => i.key === active.key);
        if (!def) {
            return editCaption(callback, "Активное исследование больше не существует.");
        }

        if (!clan.warehouse) {
            clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
        }
        if (!active.progress) {
            active.progress = { gold: 0, crystals: 0, ironOre: 0 };
        }

        const moved = {};
        for (const [res, need] of Object.entries(def.cost)) {
            const remaining = Math.max(0, need - (active.progress[res] || 0));
            const available = clan.warehouse[res] || 0;
            const take = Math.min(remaining, available);
            if (take > 0) {
                clan.warehouse[res] = available - take;
                active.progress[res] = (active.progress[res] || 0) + take;
                moved[res] = take;
            }
        }

        if (!Object.keys(moved).length) {
            return editCaption(callback, "В хранилище нет ресурсов для пополнения.", [[{
                text: "К исследованиям",
                callback_data: "clan.investigations"
            }]]);
        }

        await clan.save();

        const movedText = Object.entries(moved).map(([res, amt]) => `${amt} ${getEmoji(res)}`).join(", ");
        return editCaption(callback, `Из хранилища вложено: ${movedText}.`, [[{
            text: "К исследованиям",
            callback_data: "clan.investigations"
        }]]);
    }],

    [/^clan\.investigations\.complete$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        const active = clan.investigations?.active;
        if (!active) {
            return editCaption(callback, "Сейчас нет активного исследования.");
        }

        const def = clanInvestigations.find(i => i.key === active.key);
        if (!def) {
            return editCaption(callback, "Активное исследование больше не существует.");
        }

        const fullyFunded = Object.entries(def.cost).every(([res, need]) => (active.progress?.[res] || 0) >= need);
        if (!fullyFunded) {
            return editCaption(callback, "Исследование ещё не полностью профинансировано.");
        }
        if (Date.now() - active.startedAt < def.durationMs) {
            const remainMs = def.durationMs - (Date.now() - active.startedAt);
            return editCaption(callback, `Исследование ещё не готово. Осталось ~${Math.ceil(remainMs / (60 * 60 * 1000))} ч.`);
        }

        if (!clan.investigations.completed) {
            clan.investigations.completed = [];
        }
        clan.investigations.completed.push(def.key);
        clan.investigations.active = null;
        clan.reputation = calcReputationPoints(clan);
        await clan.save();

        return editCaption(callback, `Исследование завершено: ${def.label}!\nЭффект: ${def.effectLabel}`, [[{
            text: "К исследованиям",
            callback_data: "clan.investigations"
        }]]);
    }],

    [/^clan\.investigations\.cancel$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }
        if (!canManage(clan, userId)) {
            return editCaption(callback, "Отменить исследование может только глава или офицер клана.");
        }

        const active = clan.investigations?.active;
        if (!active) {
            return editCaption(callback, "Сейчас нет активного исследования.");
        }

        if (!clan.warehouse) {
            clan.warehouse = { gold: 0, crystals: 0, ironOre: 0 };
        }
        for (const [res, amt] of Object.entries(active.progress || {})) {
            clan.warehouse[res] = (clan.warehouse[res] || 0) + amt;
        }
        clan.investigations.active = null;
        await clan.save();

        return editCaption(callback, "Исследование отменено, вложенные ресурсы возвращены в хранилище.", [[{
            text: "К исследованиям",
            callback_data: "clan.investigations"
        }]]);
    }],

    // ---- Daily tasks: checklist separate from the quiz (dictionaries/clanTasks.js) ----
    [/^clan\.tasks$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        ensureTaskState(clan);
        await clan.save(); // persist lazy state init

        const key = String(userId);
        const progress = clan.tasks.progress[key] || {};
        const claimed = clan.tasks.claimed[key] || [];

        let message = "Ежедневные задания клана\n\n";
        const keyboard = [];
        for (const task of clanTasks) {
            const done = Boolean(progress[task.key]);
            const isClaimed = claimed.includes(task.key);
            const status = isClaimed ? "🏆 получено" : done ? "✅ выполнено" : "⬜ не выполнено";
            message += `${task.label} — ${status}\n`;
            if (done && !isClaimed) {
                keyboard.push([{
                    text: `Забрать: ${task.label}`,
                    callback_data: `clan.tasks.claim_${task.key}`
                }]);
            }
        }

        const allClaimed = clanTasks.every(t => claimed.includes(t.key));
        if (allClaimed && !claimed.includes("__bonus__")) {
            message += `\nВсе задания выполнены! Бонус: +${CLAN_TASKS_BONUS_XP} XP клана.`;
            keyboard.push([{ text: "Забрать бонус", callback_data: "clan.tasks.claimBonus" }]);
        }

        message += "\n\nОбновляется каждый день.";
        return editCaption(callback, message, keyboard);
    }],

    [/^clan\.tasks\.claim_([a-zA-Z]+)$/, async function (session, callback, [, taskKey]) {
        const userId = callback.from.id;
        const task = clanTasks.find(t => t.key === taskKey);
        if (!task) {
            return editCaption(callback, "Неизвестное задание.");
        }

        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        ensureTaskState(clan);
        const key = String(userId);
        const progress = clan.tasks.progress[key] || {};
        if (!progress[task.key]) {
            return editCaption(callback, "Это задание ещё не выполнено.");
        }

        if (!clan.tasks.claimed[key]) {
            clan.tasks.claimed[key] = [];
        }
        if (clan.tasks.claimed[key].includes(task.key)) {
            return editCaption(callback, "Награда уже получена.", [[{
                text: "К заданиям",
                callback_data: "clan.tasks"
            }]]);
        }

        const { chat, member: playerSession } = await loadPlayer(callback.message.chat.id, userId);
        playerSession.game.inventory.gold = (playerSession.game.inventory.gold || 0) + task.goldReward;

        const member = findMember(clan, userId);
        if (member) {
            member.contribution = (member.contribution || 0) + task.contributionReward;
        }

        clan.tasks.claimed[key].push(task.key);

        await chat.save();
        await clan.save();

        return editCaption(callback, `Награда получена: +${task.goldReward} ${getEmoji("gold")}, +${task.contributionReward} к вкладу.`, [[{
            text: "К заданиям",
            callback_data: "clan.tasks"
        }]]);
    }],

    [/^clan\.tasks\.claimBonus$/, async function (session, callback) {
        const userId = callback.from.id;
        const clan = await getClan(userId);
        if (!clan) {
            return editCaption(callback, "Ты не состоишь в клане.");
        }

        ensureTaskState(clan);
        const key = String(userId);
        const claimed = clan.tasks.claimed[key] || [];

        const allClaimed = clanTasks.every(t => claimed.includes(t.key));
        if (!allClaimed) {
            return editCaption(callback, "Сначала забери награды за все задания.");
        }
        if (claimed.includes("__bonus__")) {
            return editCaption(callback, "Бонус уже получен.", [[{
                text: "К заданиям",
                callback_data: "clan.tasks"
            }]]);
        }

        const { leveledUp, level } = addClanXp(clan, CLAN_TASKS_BONUS_XP);
        clan.tasks.claimed[key].push("__bonus__");
        await clan.save();

        let message = `Бонус получен: +${CLAN_TASKS_BONUS_XP} XP клана!`;
        if (leveledUp) {
            message += `\nКлан достиг уровня ${level}!`;
        }

        return editCaption(callback, message, [[{
            text: "К заданиям",
            callback_data: "clan.tasks"
        }]]);
    }]
];
