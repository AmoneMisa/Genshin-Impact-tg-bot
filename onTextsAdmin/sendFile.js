const sendMessage = require('../functions/tgBotFunctions/sendMessage');
const bot = require('../bot');
const {myId} = require('../config');
const fs = require('fs');
const deleteMessage = require("../functions/tgBotFunctions/deleteMessage");

// Отправка ботом файла по имени пользователю

module.exports = [[/\/get_file (.+)/, async (msg, regResult) => {
    if (msg.from.id !== myId) {
        return;
    }

    await deleteMessage(msg.chat.id, msg.message_id);
    let fileName = regResult[1];
    const directoryPath = './';
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error('Ошибка чтения директории:', err.message);
            return;
        }

        const file = files.find((file) => file === fileName);

        if (file) {
            const filePath = directoryPath + file;
            bot.sendDocument(myId, filePath)
                .catch((error) => {
                    sendMessage(myId, 'Ошибка при отправке файла:', error.message);
                    console.error('Ошибка при отправке файла:', error.message);
                });
        } else {
            sendMessage(myId, 'Файл не найден');
        }
    });
}]];
