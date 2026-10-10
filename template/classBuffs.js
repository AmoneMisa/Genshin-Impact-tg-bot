// Lineage II style class buffs: a class casts the same seven buffs the potions give
// (template/buffPotions.js), for the same 20 minutes, but weaker at first and
// stronger with the character's level, like skill levels of a buffer.
//
// Each entry is the character level at which buff level I, II and III unlock;
// fewer than three numbers means that buff tops out lower for the class. A
// promoted class inherits the buffs of its parent and may improve them.

import classStats from './classStatsTemplate.js';
import { ARCHETYPES } from './classTree.js';
import { resolveClassName } from '../functions/game/classes/legacyClasses.js';
import { classFamily } from '../functions/game/classes/classFamily.js';

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

/** buff id → unlock levels for a class, merging its ancestors (the earlier unlock and the higher cap win). */
export function classBuffsFor(className) {
  const merged = {};
  const add = (owner) => {
    for (const [buff, levels] of Object.entries(OWN_CLASS_BUFFS[owner] || {})) {
      const known = merged[buff] || [];
      const length = Math.max(known.length, levels.length);
      merged[buff] = Array.from({length}, (_, index) => Math.min(known[index] ?? Infinity, levels[index] ?? Infinity));
    }
  };
  // The tree is the real Lineage 2 one: a class has the buffs of its combat family and, for every profession on
  // its way, those of the archetype (`like`) of that profession - the old tree's entry of the same shape.
  let name = resolveClassName(className);
  const chain = [];
  while (name) {
    const item = classStats.find(entry => entry.name === name);
    if (!item) break;
    chain.push(item);
    name = item.parent;
  }
  for (const item of chain.reverse()) {
    if (item.tier === 1) add(item.family);
    else if (item.like && ARCHETYPES[item.like]) add(ARCHETYPES[item.like][Math.min(item.tier, 3)].name);
  }
  // an old class name that is not part of the real tree still has its own row
  if (!chain.length) add(className);
  return merged;
}

/** Buff level (0 = not learned yet) of `buffId` for a class at a character level. */
export function buffLevelAt(className, buffId, characterLevel) {
  const levels = classBuffsFor(className)[buffId] || [];
  return levels.filter(unlock => characterLevel >= unlock).length;
}

export const canBuffOthers = className => classFamily(resolveClassName(className)) === 'priest' || SUPPORT_CLASSES.includes(className);
