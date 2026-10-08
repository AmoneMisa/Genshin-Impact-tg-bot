// High-grade elixirs (Lineage II): restore a share of the maximum and need a character level of
// the grade. Life = HP, Spirit = MP, CP = combat points. Sold in the Donate shop in stacks.
const GRADES = [
  {grade: 'A', needLvl: 61, power: 60},
  {grade: 'S', needLvl: 76, power: 100},
];
const KINDS = [
  {type: 'hp', id: 'life', name: 'Эликсир жизни', text: 'здоровья'},
  {type: 'mp', id: 'spirit', name: 'Эликсир духа', text: 'маны'},
  {type: 'cp', id: 'cp', name: 'Эликсир CP', text: 'боевых очков (CP)'},
];

export default GRADES.flatMap(({grade, needLvl, power}) => KINDS.map(({type, id, name, text}) => ({
  id: `elixir-${id}-${grade}`,
  type,
  bottleType: 'elixir',
  size: 'large',
  grade,
  needLvl,
  count: 0,
  power,
  name: `${name} (${grade})`,
  description: `Восстанавливает ${power}% ${text}. Нужен ${needLvl} уровень.`,
}))).map(Object.freeze);
