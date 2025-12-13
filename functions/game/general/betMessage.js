import getUserName from "../../getters/getUserName.js";

export default async function (players, members) {
    let str = "";

    for (let [id, player] of Object.entries(players)) {
        if (id === "bot") {
            continue;
        }

        str += `Ставка ${await getUserName(id)} - ${player.bet}\n`;
    }
    return str;
};