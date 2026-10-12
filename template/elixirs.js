// High-grade elixirs (Lineage II): restore a share of the maximum and need a character level of
// the grade. Life = HP, Spirit = MP, CP = combat points. Sold in the Donate shop in stacks.
const GRADES = [
  {grade: 'A', needLvl: 61, power: 60},
  {grade: 'S', needLvl: 76, power: 100},
];
const KINDS = [
  {type: 'hp', id: 'life', name: 'Elixir of Life', text: 'здоровья'},
  {type: 'mp', id: 'spirit', name: 'Elixir of Mental Strength', text: 'маны'},
  {type: 'cp', id: 'cp', name: 'Elixir of CP', text: 'боевых очков (CP)'},
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
  description: `${type === 'hp' ? 'Восстанавливает' : 'Мгновенно восстанавливает'} ${power}% ${text}${type === 'hp' ? ' тиками в течение 15 секунд' : ''}. Нужен ${needLvl} уровень.`,
}))).map(Object.freeze);
