module.exports = function (remain) {
    let remainSeconds = Math.floor(remain / 1000);
    let remainMinutes = Math.floor(remainSeconds / 60);
    let remainHours = Math.floor(remainMinutes / 60);

    return [remainHours, remainMinutes % 60, remainSeconds % 60];
}