# Туссент — одобренная коллекция

45/45 faces. Complete: true. Existing back reused unchanged.

New illustration generation: built-in image_gen, one independent illustration per missing card. Exact prompts: generation-jobs.json; all jobs whose kind is back are explicitly excluded because backs are already finished.

New quotations are original fan-written lines, not sourced dialogue from the game. They are separate from card mechanics. Original supplied cards retain their printed quotations.

Deterministic layout: templates-v1; raster ability icons, original power digits and separate Cyrillic text. New expansion glyphs have explicit provenance in layers/provenance.json. Font is open-license Roboto Condensed, a review candidate, not a verified original game font. This draft is not asserted to be pixel-perfect.

No game asset mapping was changed; local commit approved; no push. Every PNG is 310×585 with a WebP counterpart.

Selected revisions for five incidental characters: generation-retries.json. Original drafts remain under illustrations/variants/ for provenance; they are not additional card entities. The 18 selected illustrations were generated using the built-in image_gen tool. Character appearance references are recorded in reference-sources.json.

Faction cloth: wine burgundy, derived from the common frame without changing transparency, parchment or layout. Fleur-de-lis extracted from the existing Toussaint back and centered on a fixed transparent canvas. Shared verification checks preserve the parchment and art window, emblem alignment, asset reuse and the unchanged back.

Validation: 45 complete PNG/WebP faces, 4 leaders; default loadout valid at 38 units and 10 specials. Browser checks passed at 390 and 1280 px with reduced motion, card detail, quote, Escape/focus and no horizontal overflow.
