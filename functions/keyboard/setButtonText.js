module.exports = function setButtonText(text, flag) {
    return flag === "1" ? text.replace(/\|[^.]+$/, "| (Вкл)") : text.replace(/\|[^.]+$/, "| (Выкл)");
};