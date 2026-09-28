import getUserName from '../getters/getUserName.js';
export default async function (callback, session) {
    if (callback.message?.text) {
        return callback.message.text.includes(await getUserName(session, "nickname"));
    }

    if (callback.message?.caption) {
        return callback.message.caption.includes(await getUserName(session, "nickname"));
    }
}