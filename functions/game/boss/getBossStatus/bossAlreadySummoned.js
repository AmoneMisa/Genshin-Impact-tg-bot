export default function (boss) {
    if (!boss) {
        return false;
    }

    return boss.hp > 0;
};