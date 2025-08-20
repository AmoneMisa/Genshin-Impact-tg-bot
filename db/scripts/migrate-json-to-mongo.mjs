import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectMongo } from '../db.js';
import { Chat } from '../models/chat.js';
import { TgUser } from '../models/user.js';
import { Session } from '../models/session.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILE = process.env.SESSIONS_FILE || path.join(__dirname, 'sessions.json');

function asId(n) { return String(n); }

async function upsertChat(chatId, chatBlob) {
    const payload = {
        _id: chatId,
        game: chatBlob.game ?? {},
        bossSettings: chatBlob.bossSettings ?? {},
        ui: {
            settingsMessageId: chatBlob.settingsMessageId ? String(chatBlob.settingsMessageId) : null,
            settingsButtons: chatBlob.settingsButtons ?? undefined,
            bossSettingsMessageId: chatBlob.bossSettingsMessageId ? String(chatBlob.bossSettingsMessageId) : null,
            bossSettingsButtons: chatBlob.bossSettingsButtons ?? undefined,
        },
    };
    await Chat.updateOne({ _id: chatId }, { $set: payload }, { upsert: true });
}

async function upsertUser(tgUser) {
    if (!tgUser?.id) return;
    const _id = asId(tgUser.id);
    const doc = {
        _id,
        username: tgUser.username ?? null,
        first_name: tgUser.first_name ?? null,
        last_name: tgUser.last_name ?? null,
        language_code: tgUser.language_code ?? null,
        is_premium: !!tgUser.is_premium,
        is_bot: !!tgUser.is_bot,
    };
    await TgUser.updateOne({ _id }, { $set: doc }, { upsert: true });
}

async function upsertSession(chatId, userId, member) {
    const base = {
        chatId, userId,
        isHided: !!member.isHided,
        user: member.user ?? {},
        gender: member.gender ?? 'male',
        userChatData: member.userChatData ?? {},
        whatsNewSettings: member.whatsNewSettings ?? {},
        horoscope: member.horoscope ?? { sign: 'aries', style: 'cheeky' },
        game: member.game ?? {},
        respawnTime: member.respawnTime ?? 0,
        shopTimers: member.shopTimers ?? {},
        stats: member.stats ?? {},
        stealImmuneTimer: member.stealImmuneTimer ?? 0,
        sword: member.sword ?? null,
        timerSwordCallback: member.timerSwordCallback ?? 0,
        chestTries: member.chestTries ?? 0,
        chestCounter: member.chestCounter ?? 0,
        chosenChests: member.chosenChests ?? [],
        chestButtons: member.chestButtons ?? [],
    };

    await Session.updateOne(
        { chatId, userId },
        { $set: base, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
    );
}

async function main() {
    await connectMongo();
    const raw = await fs.readFile(FILE, 'utf8');
    const json = JSON.parse(raw);

    for (const [chatIdRaw, chatBlob] of Object.entries(json)) {
        const chatId = asId(chatIdRaw);

        await upsertChat(chatId, chatBlob);

        const members = chatBlob?.members ?? {};
        for (const [userIdRaw, member] of Object.entries(members)) {
            const userId = asId(userIdRaw);
            await upsertUser(member?.userChatData?.user);
            await upsertSession(chatId, userId, member);
        }
    }

    console.log('✔ Migration complete');
    process.exit(0);
}

main().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
