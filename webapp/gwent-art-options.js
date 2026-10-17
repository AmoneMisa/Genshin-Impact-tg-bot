import { LOCAL_GWENT_ART, GWENT_CARD_VARIANTS } from './gwent-local-art.js';

/** Variants belong to one canonical card; never create a second playable card. */
export function cardArtOptions(cardId) {
  return GWENT_CARD_VARIANTS[cardId] || (Object.hasOwn(LOCAL_GWENT_ART, cardId) ? [LOCAL_GWENT_ART[cardId]] : []);
}

export function cardArtSource(cardId, artIndex = 0) {
  const options = cardArtOptions(cardId);
  return options[Number.isInteger(artIndex) && artIndex >= 0 && artIndex < options.length ? artIndex : 0];
}
