module.exports = function (text = "") {
    let dictionary = ["девушка", "девочка", "женщина", "жэнщина", "мадам", "она", "миледи", "леди", "ж", "жен", "женский", "девчачий", "не мужской", "не скажу", "не знаю", "би", "трап", "trap"];
    return dictionary.includes(text.toLowerCase().trim());
};