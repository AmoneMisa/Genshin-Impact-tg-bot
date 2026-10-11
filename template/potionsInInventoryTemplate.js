import buffPotions from './buffPotions.js';
import elixirs from './elixirs.js';
export default [{
    type: "hp",
    bottleType: "potion",
    size: "little",
    count: 0,
    power: 1000,
    name: "Tiny HP Potion",
    description: "Восстанавливает хп в количестве 1000 единиц"
}, {
    type: "hp",
    bottleType: "potion",
    size: "small",
    count: 0,
    power: 3000,
    name: "Small HP Potion",
    description: "Восстанавливает хп в количестве 3000 единиц"
}, {
    type: "hp",
    bottleType: "potion",
    size: "medium",
    count: 0,
    power: 8000,
    name: "Medium HP Potion",
    description: "Восстанавливает хп в количестве 8000 единиц"
}, {
    type: "hp",
    bottleType: "elixir",
    size: "small",
    count: 0,
    power: 45,
    name: "Small HP Elixir",
    description: "Восстанавливает хп в количестве 45%"
}, {
    type: "mp",
    bottleType: "potion",
    size: "little",
    count: 0,
    power: 180,
    name: "Tiny MP Potion",
    description: "Восстанавливает мп в количестве 180 единиц"
}, {
    type: "mp",
    bottleType: "potion",
    size: "small",
    count: 0,
    power: 300,
    name: "Small MP Potion",
    description: "Восстанавливает мп в количестве 300 единиц"
}, ...buffPotions, ...elixirs.map(elixir => ({...elixir}))];
