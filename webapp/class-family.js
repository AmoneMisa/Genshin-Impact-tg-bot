// Every class shares the look of its combat family (warrior, mage, ...) until it has its own art. Generated from
// template/l2ClassMeta.js; test/class-tree.test.js checks this table against the server class tree, so a new class
// cannot be forgotten here. Old class names of the previous tree still resolve to their family.
export const CLASS_FAMILY = Object.freeze({
  noClass: 'noClass',
  humanFighter: 'warrior', humanKnight: 'warrior', paladin: 'warrior', darkAvenger: 'warrior', elvenFighter: 'warrior', elvenKnight: 'warrior', templeKnight: 'warrior', swordSinger: 'warrior', darkFighter: 'warrior', palusKnight: 'warrior', shillienKnight: 'warrior', dwarvenFighter: 'warrior', artisan: 'warrior', warsmith: 'warrior', phoenixKnight: 'warrior', hellKnight: 'warrior', evasTemplar: 'warrior', swordMuse: 'warrior', shillienTemplar: 'warrior', maestro: 'warrior',
  warriorProf: 'berserk', gladiator: 'berserk', warlord: 'berserk', orcFighter: 'berserk', orcRaider: 'berserk', destroyer: 'berserk', monk: 'berserk', tyrant: 'berserk', duelist: 'berserk', dreadnought: 'berserk', titan: 'berserk', grandKhavatari: 'berserk', maleSoldier: 'berserk', trooper: 'berserk', berserker: 'berserk', doombringer: 'berserk',
  rogueProf: 'rogue', treasureHunter: 'rogue', elvenScout: 'rogue', plainsWalker: 'rogue', bladedancer: 'rogue', assassin: 'rogue', abyssWalker: 'rogue', scavenger: 'rogue', bountyHunter: 'rogue', adventurer: 'rogue', windRider: 'rogue', spectralDancer: 'rogue', ghostHunter: 'rogue', fortuneSeeker: 'rogue',
  hawkeye: 'archer', silverRanger: 'archer', phantomRanger: 'archer', sagittarius: 'archer', moonlightSentinel: 'archer', ghostSentinel: 'archer', femaleSoldier: 'archer', warder: 'archer', arbalester: 'archer', kamaelTrickster: 'archer',
  humanMystic: 'mage', humanWizard: 'mage', sorcerer: 'mage', necromancer: 'mage', warlock: 'mage', elvenMystic: 'mage', elvenWizard: 'mage', spellsinger: 'mage', elementalSummoner: 'mage', darkMystic: 'mage', darkWizard: 'mage', spellhowler: 'mage', phantomSummoner: 'mage', orcMystic: 'mage', archmage: 'mage', soultaker: 'mage', arcanaLord: 'mage', mysticMuse: 'mage', elementalMaster: 'mage', stormScreamer: 'mage', spectralMaster: 'mage', maleSoulBreaker: 'mage', femaleSoulBreaker: 'mage', maleSoulHound: 'mage', femaleSoulHound: 'mage',
  cleric: 'priest', bishop: 'priest', prophet: 'priest', elvenOracle: 'priest', elvenElder: 'priest', shillienOracle: 'priest', shillienElder: 'priest', orcShaman: 'priest', overlord: 'priest', warcryer: 'priest', cardinal: 'priest', hierophant: 'priest', evasSaint: 'priest', shillienSaint: 'priest', dominator: 'priest', doomCryer: 'priest', inspector: 'priest', judicator: 'priest',
  // the families themselves and the names of the previous class tree (saved data still carries them)
  warrior: 'warrior', mage: 'mage', priest: 'priest', archer: 'archer', rogue: 'rogue', berserk: 'berserk',
  crusader: 'warrior', warden: 'warrior', bastion: 'warrior', elementalist: 'mage', soulReaper: 'mage', saint: 'priest', inquisitor: 'priest',
  ranger: 'archer', sniper: 'archer', phantomShot: 'archer', shadowBlade: 'rogue', trickster: 'rogue', phantomDancer: 'rogue',
  slayer: 'berserk', ironclad: 'berserk', warbringer: 'berserk',
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
