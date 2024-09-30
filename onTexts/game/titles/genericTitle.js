// import sendMessageWithDelete from '../../../functions/tgBotFunctions/sendMessageWithDelete.js';
// import buttonsDictionary from '../../../dictionaries/buttons.js';
// import deleteMessage from '../../../functions/tgBotFunctions/deleteMessage.js';
// import getUserName from '../../../functions/getters/getUserName.js';
// import getRandom from '../../../functions/getters/getRandom.js';
// import getMembers from '../../../functions/getters/getMembers.js';
// import getTime from '../../../functions/getters/getTime.js';
// import getStringRemainTime from '../../../functions/getters/getStringRemainTime.js';
// import data from '../../../data.js';
// import { openAIApiKey } from '../../../config.js';
// import axios from 'axios';
// import debugMessage from '../../../functions/tgBotFunctions/debugMessage.js';
//
// export default [[/(?:^|\s)\/title/, async (msg, session) => {
//     await deleteMessage(msg.chat.id, msg.message_id);
//
//     let message;
//     let members = getMembers(msg.chat.id);
//     let filteredMembers = Object.values(members).filter(member => !member.userChatData.user.is_bot && !member.isHided);
//     let randomMember = filteredMembers[getRandom(0, filteredMembers.length - 1)];
//
//     async function getFunnyTitle() {
//         const response = await axios.post('https://api.openai.com/v1/completions', {
//             prompt: "Сгенерируй смешной титул 18+",
//             model: "davinci-002\t\n",
//             max_tokens: 50
//         }, {
//             headers: {
//                 'Authorization': `Bearer ${openAIApiKey}`,
//                 "Content-Type": "application/json"
//             }
//         });
//
//         return response.data.choices[0].text.trim();
//     }
//
//     let title = await getFunnyTitle();
//     if (!title) {
//         debugMessage("Произошла ошибка при попытке сгенерировать титул");
//         return;
//     }
//
//     if (!session.timerTitleCallback || new Date().getTime() >= session.timerTitleCallback) {
//         session.timerTitleCallback = new Date().getTime() + 10 * 60 * 1000;
//         message = `Сегодня ты, @${getUserName(randomMember, "nickname")} - ${await getFunnyTitle()}`;
//
//         if (!data.titles[msg.chat.id]) {
//             data.titles[msg.chat.id] = [];
//         }
//
//         data.titles[msg.chat.id].unshift(message.replace("@", ""));
//
//         while (data.titles[msg.chat.id].length > 15) {
//             data.titles[msg.chat.id].pop();
//         }
//
//     } else {
//         let [remain] = getTime(session.timerTitleCallback);
//         message = `@${getUserName(session, "nickname")}, команду можно вызывать раз в 10 минут. Осталось: ${getStringRemainTime(remain)}`;
//     }
//
//     await sendMessageWithDelete(msg.chat.id, message, {
//         ...(msg.message_thread_id ? {message_thread_id: msg.message_thread_id} : {}),
//         disable_notification: true,
//         reply_markup: {
//             inline_keyboard: [[{
//                 text: buttonsDictionary["ru"].close,
//                 callback_data: "close"
//             }]]
//         }
//     }, 60 * 1000);
// }]];