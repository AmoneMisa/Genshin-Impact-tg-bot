import buffPotions from './buffPotions.js';
import elixirs from './elixirs.js';
export default [{
    type: "hp",
    bottleType: "potion",
    size: "little",
    count: 0,
    power: 1000,
    name: "Tiny HP Potion",
    description: "Восстанавливает 1000 HP тиками в течение 15 секунд."
}, {
    type: "hp",
    bottleType: "potion",
    size: "small",
    count: 0,
    power: 3000,
    name: "Small HP Potion",
    description: "Восстанавливает 3000 HP тиками в течение 15 секунд."
}, {
    type: "hp",
    bottleType: "potion",
    size: "medium",
    count: 0,
    power: 8000,
    name: "Medium HP Potion",
    description: "Восстанавливает 8000 HP тиками в течение 15 секунд."
}, {
    type: "hp",
    bottleType: "elixir",
    size: "small",
    count: 0,
    power: 45,
    name: "Small HP Elixir",
    description: "Восстанавливает 45% HP тиками в течение 15 секунд."
}, {
    type: "mp",
    bottleType: "potion",
    size: "little",
    count: 0,
    power: 180,
    name: "Tiny MP Potion",
    description: "Мгновенно восстанавливает 180 MP."
}, {
    type: "mp",
    bottleType: "potion",
    size: "small",
    count: 0,
    power: 300,
    name: "Small MP Potion",
    description: "Мгновенно восстанавливает 300 MP."
}, ...buffPotions, ...elixirs.map(elixir => ({...elixir}))];
