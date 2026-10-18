import { LOCAL_GWENT_ART, GWENT_CARD_VARIANTS } from './gwent-local-art.js';
import { EXPANSION_GWENT_ART, EXTENDED_GWENT_ART } from './gwent-expansion-art.js';

/** Variants belong to one canonical card; never create a second playable card. */
export function cardArtOptions(cardId, ruleset = 'classic') {
  if (ruleset === 'extended' && Object.hasOwn(EXTENDED_GWENT_ART, cardId)) return [EXTENDED_GWENT_ART[cardId]];
  if (Object.hasOwn(EXPANSION_GWENT_ART, cardId)) return [EXPANSION_GWENT_ART[cardId]];
  return GWENT_CARD_VARIANTS[cardId] || (Object.hasOwn(LOCAL_GWENT_ART, cardId) ? [LOCAL_GWENT_ART[cardId]] : []);
}

export function cardArtSource(cardId, artIndex = 0, ruleset = 'classic') {
  const options = cardArtOptions(cardId, ruleset);
  return options[Number.isInteger(artIndex) && artIndex >= 0 && artIndex < options.length ? artIndex : 0];
}
