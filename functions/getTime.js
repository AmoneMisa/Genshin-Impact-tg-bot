module.exports = function (datetime) {
    let remain = (datetime || 0) - new Date().getTime();
    let remainSeconds = Math.floor(remain / 1000);
    let remainMinutes = Math.floor(remainSeconds / 60);
    let remainHours = Math.floor(remainMinutes / 60);

    return [remain, remainHours, remainMinutes % 60, remainSeconds % 60];
};