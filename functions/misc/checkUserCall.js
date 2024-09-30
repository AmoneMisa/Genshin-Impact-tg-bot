import getUserName from '../getters/getUserName.js';
export default function (callback, session) {
    if (callback.message?.text) {
        return callback.message.text.includes(getUserName(session, "nickname"));
    }

    if (callback.message?.caption) {
        return callback.message.caption.includes(getUserName(session, "nickname"));
    }
}