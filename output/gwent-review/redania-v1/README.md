# Редания — одобренная коллекция

45/45 faces. Complete: true. Existing back reused unchanged.

New illustration generation: built-in image_gen, one independent illustration per missing card. Exact prompts: generation-jobs.json; all jobs whose kind is back are explicitly excluded because backs are already finished.

New quotations are original fan-written lines, not sourced dialogue from the game. They are separate from card mechanics. Original supplied cards retain their printed quotations.

Deterministic layout: templates-v1; raster ability icons, original power digits and separate Cyrillic text. New expansion glyphs have explicit provenance in layers/provenance.json. Font is open-license Roboto Condensed, a review candidate, not a verified original game font. This draft is not asserted to be pixel-perfect.

No game asset mapping was changed; local commit approved; no push. Every PNG is 310×585 with a WebP counterpart.

Unit glyph correction: custom mage and swap glyphs are regenerated against the original ability medal center (44,38). The complete previous heart is cleared inside the plate; border and outer alpha are preserved. All 45 faces rebuilt and gallery checks passed at 390/1280 px. Collection approved for local commit; no push.

Runtime integration: reviewed faces are now exported to webapp/art/gwent/expansion by scripts/ui/import-gwent-expansion.mjs. Extended-only badge variants are selected by ruleset; classic faces and existing cosmetic choices are retained. User approved integration and push.
