export default function (gameName) {
    return [
        [{text: "Ставка (+100)", callback_data: `${gameName}_bet`},
            {text: "Ставка (х2)", callback_data: `${gameName}_double_bet`}],
        [{text: "Ставка (+1000)", callback_data: `${gameName}_thousand_bet`},
            {text: "Ставка (х5)", callback_data: `${gameName}_xfive_bet`}],
        [{text: "Ставка (+10000)", callback_data: `${gameName}_10t_bet`},
            {text: "Ставка (x10)", callback_data: `${gameName}_xten_bet`}],
        [{text: "Ставка (x20)", callback_data: `${gameName}_x20_bet`},
            {text: "Ставка (x50)", callback_data: `${gameName}_x50_bet`}],
        [{text: "Всё или ничего", callback_data: `${gameName}_allin_bet`}]
    ];
}
