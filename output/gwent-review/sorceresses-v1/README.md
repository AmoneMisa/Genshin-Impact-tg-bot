# Чародейки — одобренная коллекция

50/50 faces. Complete: true. Existing back reused unchanged.

New illustration generation: built-in image_gen, one independent illustration per missing card. Exact prompts: generation-jobs.json; all jobs whose kind is back are explicitly excluded because backs are already finished.

New quotations are original fan-written lines, not sourced dialogue from the game. They are separate from card mechanics. Original supplied cards retain their printed quotations.

Deterministic layout: templates-v1; raster ability icons, original power digits and separate Cyrillic text. New expansion glyphs have explicit provenance in layers/provenance.json. Font is open-license Roboto Condensed, a review candidate, not a verified original game font. This draft is not asserted to be pixel-perfect.

No game asset mapping was changed; local commit approved; no push. Every PNG is 310×585 with a WebP counterpart.

Runtime integration: reviewed faces are now exported to webapp/art/gwent/expansion by scripts/ui/import-gwent-expansion.mjs. Extended-only badge variants are selected by ruleset; classic faces and existing cosmetic choices are retained. User approved integration and push.
