export default function setButtonText(text, flag, isShort = false) {
    if (isShort) {
        return flag === "1" ? text.replace(/[^.]+$/, "Вкл") : text.replace(/[^.]+$/, "Выкл");
    }

    return flag === "1" ? text.replace(/\|[^.]+$/, "| (Вкл)") : text.replace(/\|[^.]+$/, "| (Выкл)");
};