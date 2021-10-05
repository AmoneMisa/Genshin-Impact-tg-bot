module.exports = function (text = "") {
    let dictionary = ["девушка", "девочка", "женщина", "жэнщина", "мадам", "она", "миледи", "леди", "ж", "жен", "женский", "девчачий", "не мужской", "не скажу", "не знаю", "би", "трап", "trap"];
    for (let word of dictionary) {
        if (text.toLowerCase().includes(word)) {
            return true;
        }
    }
};