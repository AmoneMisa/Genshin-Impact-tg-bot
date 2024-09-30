export default function invertButtonCallbackData(callback) {
    let [, currentFlag] = callback.match(/([0-1])$/);
    return currentFlag === "1" ? callback.replace(/(1)$/, "0") : callback.replace(/(0)$/, "1");
};