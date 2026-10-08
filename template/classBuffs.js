// Lineage II style class buffs: a class casts the same seven buffs the potions give
// (template/buffPotions.js), for the same 20 minutes, but weaker at first and
// stronger with the character's level, like skill levels of a buffer.
//
// Each entry is the character level at which buff level I, II and III unlock;
// fewer than three numbers means that buff tops out lower for the class. A
// promoted class inherits the buffs of its parent and may improve them.

/** Share of the potion's strength a buff gives at each buff level. */
export const BUFF_LEVEL_FACTOR = Object.freeze({1: 0.5, 2: 0.75, 3: 1});

/** Classes that can cast on other players of the chat (the "buffers"). */
export const SUPPORT_CLASSES = Object.freeze(['priest', 'cleric', 'saint', 'inquisitor', 'judicator']);

/** Buffs a class learns by itself (the parent's come on top, see classBuffsFor). */
export const OWN_CLASS_BUFFS = Object.freeze({
  // --- Base classes ---
  warrior:  {might: [8, 28, 48], shield: [14, 34, 54]},
  mage:     {guidance: [8, 28, 48], focus: [14, 34]},
  archer:   {focus: [8, 28, 48], 'wind-walk': [14, 34, 54]},
  berserk:  {'death-whisper': [8, 28, 48], might: [14, 34]},
  rogue:    {'death-whisper': [8, 28, 48], 'wind-walk': [12, 32, 52], focus: [20, 40]},
  priest:   {shield: [6, 26, 46], might: [10, 30, 50], haste: [16, 36], 'wind-walk': [22, 42]},

  // --- Warrior line ---
  crusader:     {haste: [24, 44]},
  phoenixKnight: {focus: [42, 62]},
  warden:       {haste: [24, 44]},
  bastion:      {shield: [10, 30, 42]},
  // --- Mage line ---
  elementalist: {'wind-walk': [24, 44]},
  archmage:     {'death-whisper': [42, 62]},
  warlock:      {'death-whisper': [24, 44]},
  soulReaper:   {might: [42, 62]},
  // --- Priest line (full buffers) ---
  cleric:       {focus: [24, 44], guidance: [24, 44]},
  saint:        {shield: [6, 20, 40], might: [10, 24, 44], haste: [16, 30, 48], 'wind-walk': [22, 36, 50], 'death-whisper': [30, 50]},
  inquisitor:   {'death-whisper': [28, 48], haste: [20, 40]},
  judicator:    {might: [10, 22, 42], shield: [6, 20, 40], focus: [26, 46]},
  // --- Archer line ---
  ranger:       {might: [24, 44]},
  hawkeye:      {'death-whisper': [42, 62]},
  sniper:       {guidance: [24, 44]},
  phantomShot:  {haste: [42, 62]},
  // --- Rogue line ---
  assassin:     {haste: [24, 44]},
  shadowBlade:  {might: [42, 62]},
  trickster:    {shield: [24, 44]},
  phantomDancer: {guidance: [42, 62]},
  // --- Berserk line ---
  slayer:       {focus: [24, 44]},
  warbringer:   {'wind-walk': [42, 62]},
  ironclad:     {shield: [10, 30, 50]},
  titan:        {haste: [42, 62]},
});

const PARENT = {
  crusader: 'warrior', warden: 'warrior', phoenixKnight: 'crusader', bastion: 'warden',
  elementalist: 'mage', warlock: 'mage', archmage: 'elementalist', soulReaper: 'warlock',
  cleric: 'priest', inquisitor: 'priest', saint: 'cleric', judicator: 'inquisitor',
  ranger: 'archer', sniper: 'archer', hawkeye: 'ranger', phantomShot: 'sniper',
  assassin: 'rogue', trickster: 'rogue', shadowBlade: 'assassin', phantomDancer: 'trickster',
  slayer: 'berserk', ironclad: 'berserk', warbringer: 'slayer', titan: 'ironclad',
};

/** buff id → unlock levels for a class, merging its ancestors (the earlier unlock and the higher cap win). */
export function classBuffsFor(className) {
  const chain = [];
  for (let name = className; name; name = PARENT[name]) chain.push(name);
  const merged = {};
  for (const name of chain.reverse()) {
    for (const [buff, levels] of Object.entries(OWN_CLASS_BUFFS[name] || {})) {
      const known = merged[buff] || [];
      const length = Math.max(known.length, levels.length);
      merged[buff] = Array.from({length}, (_, index) => Math.min(known[index] ?? Infinity, levels[index] ?? Infinity));
    }
  }
  return merged;
}

/** Buff level (0 = not learned yet) of `buffId` for a class at a character level. */
export function buffLevelAt(className, buffId, characterLevel) {
  const levels = classBuffsFor(className)[buffId] || [];
  return levels.filter(unlock => characterLevel >= unlock).length;
}

export const canBuffOthers = className => SUPPORT_CLASSES.includes(className);
