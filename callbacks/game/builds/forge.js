import equipRepair from "../../../functions/game/equipment/equipRepair.js";
import controlButtons from "../../../functions/keyboard/controlButtons.js";
import sendMessage from "../../../functions/tgBotFunctions/sendMessage.js";
import getEquipList from "../../../functions/game/equipment/getEquipList.js";

export default [[/^builds\.([\-0-9]+)\.forge\.[^.]+?$/, async function (session, callback, [, chatId, action]) {
   // sendMessage(chatId, "Выбери предмет для взаимодействия", {
   //     chat_id: callback.message.chat.id,
   //     message_id: callback.message.message_id,
   //     disable_notification: true,
   //     reply_markup: {
   //         inline_keyboard: [...controlButtons(`builds.${chatId}.forge`), []]
   //     }
   // }, callback.message.photo);
console.log(getEquipList(session, chatId));

}], [/^builds\.([\-0-9]+)\.forge\.[^.]+\.0$/, async function (session, callback, [, chatId, action]) {
   if (action === "equipUpgrade") {

   } else if (action === "equipDestroy") {

   }  else if (action === "equipPoly") {

   }  else if (action === "equipRepair") {
        equipRepair(session, item);
   }
}]];