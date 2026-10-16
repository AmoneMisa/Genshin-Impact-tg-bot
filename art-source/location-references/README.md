# Lineage II location references

## Hot Springs and Outlaw Forest

Inspected 2026-10-16. Local reference screenshots: `springs-reference.jpg`, `woodland-reference.jpg`, `woodland-path-reference.jpg`. Matching location galleries: [Hot Springs](https://l2vika.ru/lokacii/hot-springs.html), [Outlaw Forest](https://l2vika.ru/lokacii/outlaw-forest.html). Exact client builds are not identified; these must not be described as verified High Five captures.

Hot Springs: muted olive/brown grass and dirt, sparse conifers, grey rock rims and red/yellow pools. Outlaw Forest: dark olive gently rolling ground, brown soil, straight trunks, low ferns. V2 studies adapt these visible features to a traversable isometric room; they are custom art, not original client assets or geodata. UI, labels, characters, chests and watermarks are excluded. Full generation prompts are in `webapp/art/world/scenes/hot-springs-v2.source.js` and `outlaw-forest-v2.source.js`.

## Blazing Swamp

Game screenshots from [L2Dom — Blazing Swamp](https://l2dom.ru/lokacii/blazing-swamp.php), inspected on 2026-10-15:

- `blazing-swamp-l2dom.jpg`: https://l2dom.ru/screen/blazing-swamp.jpg
- `blazing-swamp-panorama-l2dom.jpg`: https://l2dom.ru/screen/blazing-swamp-view.jpg
- `blazing-swamp-glade-l2dom.jpg`: https://l2dom.ru/screen/blazing-swamp-glow-wisp.jpg

These are reference screenshots, not shipped runtime backgrounds. Their watermarks, interface and characters must not be reproduced in generated art. The source page does not identify the exact client build of each screenshot; do not present them as verified High Five captures or extract authoritative geodata from their perspective.

Observed distinguishing features: dull grey-green upper clearings, rounded grey rock terraces, broad red-orange lava channels below the cliffs, sparse leafless trees and a large burning trunk. The V2 drawing adapts these visual features to the existing local isometric room. It is not the complete original zone or an exact reconstruction of its paths.
# Wall of Argos

`wall-of-argos-reference.jpg`: https://l2vika.ru/screen/wall-of-agros.jpg, from https://l2vika.ru/lokacii/wall-of-agros.html. Inspected 2026-10-16. Original build is not identified by the source. Reference only, never a runtime background.

Recognizable features: outdoor grey-brown rounded rock towers, muted olive patches, dark earthy ground, pale stone shrine with a small blue inset. The new room painting keeps these features around a walkable clearing; no underground ceiling or crystal cave. Full built-in imagegen prompt and provenance: `webapp/art/world/scenes/wall-of-argos-v2.source.js`.
