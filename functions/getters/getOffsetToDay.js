export default function () {
    let date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    date.setDate(date.getDate() + 1);

    while (date.getDay() !== 1) {
        date.setDate(date.getDate() + 1);
    }

    return date.getTime();
};