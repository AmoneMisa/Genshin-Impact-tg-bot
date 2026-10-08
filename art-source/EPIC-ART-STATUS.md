# Epic artwork generation

Requested PNG source batch from docs/imagegen-prompts.md sections 5d–5g.
26 assets: 8 epic raid bosses, 8 epic jewellery icons, 7 neutral enchant/craft icons,
3 fist/claw weapon tiers. Exact master-style-plus-template prompts: epic-art-jobs.mjs.
Optional banners are not included. Sections 5b/5c are existing prompt references,
not part of this new batch. Existing UI/WebP/art keys remain unchanged for the user
or their other agent to convert and integrate after delivery.

Generation completed with the built-in tool: 26 initial calls and one targeted
low-tier claw correction. Review with scripts/world/review-epic-art.py; --deliver preserves
full generated originals under art-source/masters/epic-batch before PNG
resampling to the requested dimensions. No compositing, recolouring or cropping.

5d delivered: all eight epic bosses in art-source/bosses/*.png, 960×960 RGB. Full generated originals preserved in art-source/masters/epic-batch/bosses. Reviewed subjects, palette, absence of text and 96 px readability.

5e delivered: all eight epic jewellery icons in art-source/items/epic/*.png, 512×512 RGBA. Reviewed true transparency on light/dark backgrounds, distinct boss motifs, absence of text and 96 px readability. Full originals preserved under art-source/masters/epic-batch/items/epic.

5f delivered: seven enchant/craft icons in art-source/icons/*.png, 256×256 RGBA.
Reviewed on light/dark backgrounds and at 48 px; neutral gold/parchment colours,
true transparency, distinct scroll/blessed scroll/crystal/material silhouettes.

5g delivered: art-source/items/fists-low.png, fists-mid.png and fists-high.png,
512×512 RGBA. Reviewed pair silhouettes, transparency and thumbnail readability.
Corrected the low-tier asset to iron/leather, removing gemstones and magic flames.
Exact correction: fists-low-correction-prompt.txt. Initial rejected draft retained
only under masters/epic-batch/items/fists-low-first-draft.png.

Final audit: all 26 requested files exist at their exact dimensions; all 18 item/icon
assets have true alpha; all eight bosses are RGB. Generated masters retained.
Contact sheets: docs/epic-art-{5d,5e,5f,5g}-review.webp. No runtime UI, WebP asset
delivery, BOSS_ART mappings, epic item mappings or emoji replacements performed.
No Desktop reference was used or moved. PNG batches are ready for user conversion
and integration. Optional banners and sections 5b/5c remain outside this batch.
