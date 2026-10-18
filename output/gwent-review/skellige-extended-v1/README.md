# Скеллиге — версия для согласования

61/61 faces. Complete: true. Existing back reused unchanged.

New illustration generation: built-in image_gen, one independent illustration per missing card. Exact prompts: generation-jobs.json; all jobs whose kind is back are explicitly excluded because backs are already finished.

New quotations are original fan-written lines, not sourced dialogue from the game. They are separate from card mechanics. Original supplied cards retain their printed quotations.

Deterministic layout: templates-v1; raster ability icons, original power digits and separate Cyrillic text. New expansion glyphs have explicit provenance in layers/provenance.json. Font is open-license Roboto Condensed, a review candidate, not a verified original game font. This draft is not asserted to be pixel-perfect.

No game asset mapping was changed; no commit or push. Every PNG is 310×585 with a WebP counterpart.

## Extended Skellige source handling

61 unique faces: 4 leaders and 57 collection entries. Six new illustrations (four units and two leaders). Three supplied prints receive only native badge updates: Birna 2 → 3, Draig Bon-Dhu 2 → 3, Heymaey Skald gains morale. Original portraits, printed names and literary quotes are retained; pixel comparison verifies changes remain inside the patched badges (including their antialiased edge).

Seven shared expansion faces are copied byte-for-byte from approved packages. Existing Skellige back remains its original JPEG, byte-identical. The original silver longship is isolated from that back; the shared cloth is adapted to Skellige violet. The agile medal's original green cloth fringe is removed and the roundel is centered consistently with the other row icons.

Validation: 61 PNG/WebP faces at 310×585, complete extended-rule roster, valid default loadout, badge-only pixel changes, shared-face hashes, original-back hash, gallery at 390/1280 with detail, quote, Escape/focus and no overflow or browser errors.

Previous approved deck: Eternal Fire committed as 8c05d2ab. This Skellige package awaits approval. No push.

Runtime integration: reviewed faces are now exported to webapp/art/gwent/expansion by scripts/ui/import-gwent-expansion.mjs. Extended-only badge variants are selected by ruleset; classic faces and existing cosmetic choices are retained. User approved integration and push.
