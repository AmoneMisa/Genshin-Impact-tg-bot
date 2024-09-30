import sendMessage from '../functions/tgBotFunctions/sendMessage.js';
import bot from '../bot.js';
import { myId, token } from '../config.js';
import fs from 'fs';
import https from 'https';

// Получение файла ботом. Если найден такой файл локально, делаем бекап старого и заменяем на новый

export default [[/\/send_file/, async (msg) => {
    if (msg.from.id !== myId) {
        return;
    }

    sendMessage(myId, "Пришли файл, который необходимо заменить. Будет создан бэкап.", {
        reply_markup: {
            selective: true,
            force_reply: true
        }
    }).then(msg => {
        let id = bot.onReplyToMessage(msg.chat.id, msg.message_id, (replyMsg) => {
            bot.removeReplyListener(id);
            if (!replyMsg.document) {
                return sendMessage(myId, "Файл с таким названием не существует на сервере.");
            }

            const directoryPath = "./";
            let foundedPath;
            fs.readdir(directoryPath, async (err, files) => {
                if (err) {
                    console.error(err);
                    return sendMessage(myId, "Ошибка при сканировании директории");
                }

                const file = files.find((file) => file === replyMsg.document.file_name);
                if (!file) {
                    return sendMessage(myId, "Файл не найден");
                }

                foundedPath = directoryPath + file;
                if (!foundedPath) {
                    return sendMessage(myId, "Файл с таким названием не найден на сервере.");
                }

                getFileFromUser(myId, replyMsg.document.file_id, replyMsg.document.file_name, foundedPath)
                return sendMessage(myId, "Файл загружен на сервер!");
            });

            function getFileFromUser(chatId, fileId, fileName, foundedPath) {
                bot.getFile(fileId).then((fileInfo) => {
                    const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;
                    const fileStream = fs.createWriteStream(foundedPath + ".new");
                    https.get(fileUrl, (response) => {
                        response.pipe(fileStream);
                        fileStream.on('finish', () => {
                            fileStream.close();
                            replaceFileWithBackup(foundedPath);
                        });
                    });
                })
            }
        })
    });

    function replaceFileWithBackup(filePath) {
        if (fs.existsSync(filePath)) {
            const backupFilePath = `${filePath}.bak`;
            fs.copyFileSync(filePath, backupFilePath);
            fs.renameSync(filePath + ".new", filePath);
        }
    }
}]];
