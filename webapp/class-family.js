// Every profession shares the look of the base class it grew out of until it has
// its own art. test/class-tree.test.js checks this table against the server's
// class tree, so a new class cannot be forgotten here.
export const CLASS_FAMILY = Object.freeze({
  noClass: 'noClass',
  warrior: 'warrior', crusader: 'warrior', phoenixKnight: 'warrior', warden: 'warrior', bastion: 'warrior',
  mage: 'mage', elementalist: 'mage', archmage: 'mage', warlock: 'mage', soulReaper: 'mage',
  priest: 'priest', cleric: 'priest', saint: 'priest', inquisitor: 'priest', judicator: 'priest',
  archer: 'archer', ranger: 'archer', hawkeye: 'archer', sniper: 'archer', phantomShot: 'archer',
  rogue: 'rogue', assassin: 'rogue', shadowBlade: 'rogue', trickster: 'rogue', phantomDancer: 'rogue',
  berserk: 'berserk', slayer: 'berserk', warbringer: 'berserk', ironclad: 'berserk', titan: 'berserk',
});

/** Base class of any class name (unknown names stay as they are). */
export function familyOf(className) {
  return CLASS_FAMILY[className] || className;
}

// Families without painted portraits borrow another family's until they get theirs.
const PORTRAIT_STANDIN = Object.freeze({ rogue: 'archer', berserk: 'warrior' });

/** Which painted portrait set (warrior, mage, ...) a class uses. */
export function portraitFamily(className) {
  const family = familyOf(className);
  return PORTRAIT_STANDIN[family] || family;
}
