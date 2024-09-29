const sendMessage = require('../../../functions/tgBotFunctions/sendMessage');
const deleteMessage = require("../../../functions/tgBotFunctions/deleteMessage");
const {giantBombApiKey, myId} = require('../../../config');
const axios = require("axios");
const bot = require("../../../bot");

module.exports = [[/(?:^|\s)\/searchGame\b/, async (msg, session) => {
    await deleteMessage(msg.chat.id, msg.message_id);
    const chatId = msg.chat.id;

    sendMessage(chatId, "Введи свой запрос ответом на данное сообщение. Ключевые слова для поиска: название, жанр, платформа, дата (Всё с маленькой буквы, без спецсимволов). Пример: жанр: шутер дата: 2024 платформа: пк", {
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(() => {
        bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            const text = replyMsg.text.trim().toLowerCase();

            console.log(text);

            const searchParams = {};
            if (text.includes('название:')) {
                searchParams.name = text.split('название:')[1].trim().split(' ')[0];
            }
            if (text.includes('жанр:')) {
                searchParams.genre = text.split('жанр:')[1].trim().split(' ')[0];
            }
            if (text.includes('платформа:')) {
                searchParams.platform = text.split('платформа:')[1].trim().split(' ')[0];
            }
            if (text.includes('дата:')) {
                searchParams.releaseDate = text.split('дата:')[1].trim().split(' ')[0];
            }

            console.log(searchParams);
            async function searchGiantBombGames({name, genre, platform, releaseDate}) {
                const baseUrl = 'https://www.giantbomb.com/api/search/';
                const params = {
                    api_key: giantBombApiKey,
                    query: name || '',
                    resources: 'game',
                    field_list: 'name,platforms,original_release_date,genres',
                    format: 'json'
                };

                try {
                    const response = await axios.get(baseUrl, {params});
                    return response.data.results;
                } catch (error) {
                    console.error('Ошибка при запросе к Giant Bomb API:', error);
                    return [];
                }
            }

            const games = searchGiantBombGames(searchParams);
            console.log(games);

            if (games.length > 0) {
                let reply = 'Результат:\n\n';
                games.forEach(game => {
                    reply += `Название: ${game.name}\nДата выхода: ${game.original_release_date || 'нет данных'}\nПлатформы: ${game.platforms ? game.platforms.map(p => p.name).join(', ') : 'нет данных'}\nЖанры: ${game.genres ? game.genres.map(g => g.name).join(', ') : 'нет данных'}\n\n`;
                });
                sendMessage(chatId, reply);
            } else {
                sendMessage(chatId, 'Ничего не найдено по вашему запросу.');
            }

            deleteMessage(replyMsg.chat.id, replyMsg.message_id);
            deleteMessage(msg.chat.id, msg.message_id);
        });
    });
}]];