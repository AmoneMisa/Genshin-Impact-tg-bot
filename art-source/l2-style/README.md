# Full-detail custom equipment icons

The old publication pipeline reduced all paintings to 32 px and enlarged that result with nearest-neighbour sampling. The new build crops transparent padding from preserved 512 px paintings, fits the complete silhouette to a square and renders a 512 px master. Each 32/64/128/256/512 WebP is resized directly from that master. Existing diagonal poses are preserved; only straight tall blades are tilted. No thick frame is baked into the item: the shared item grid owns its borders.

The three backgrounds are **AI reconstructions**, not extracted original client textures. Built-in imagegen edited original client icons as style references, removing the item and recovering a smooth empty backdrop. Original client icons and original item paintings are preserved unchanged. Backgrounds are used only for custom paintings. This is the known fidelity gap: the client icons do not expose a separate empty background texture.

References: `webapp/art/l2/icon-weapon_small_sword_i00-128.webp`, `icon-armor_t88_u_i00-128.webp`, `icon-accessary_blessed_ring_i00-128.webp`.

Saved outputs: `background-weapon.png`, `background-armor.png`, `background-jewelry.png` in this directory. The build matches the references' upper-left illumination and darkens the reconstructed backgrounds to keep the item silhouette readable. No runtime canvas, WebGL or new animation; thumbnails remain capped at 256 px, with byte budgets enforced by the converter.

## Imagegen prompts

Weapon:

> Edit target: attached original Lineage II weapon inventory icon. Produce ONLY its empty square background, reconstructing the area behind the sword. Remove the sword completely. Match the original dark burgundy red and black gradient, soft subdued upper-left red illumination, slightly mottled painted surface. Smooth detailed painted resolution, no pixel blocks. Fill whole square edge to edge. No frame, no border, no object, no symbol, no text, no bright glow. This is a reusable empty backdrop, faithful to the attached game's colors and lighting. Save the output image to the workspace and return its local path.

Armor and jewelry used this prompt, with `{kind}` respectively `armor`/`jewelry` and `{color}` respectively `very dark teal green`/`very dark blue teal`:

> Edit target: original Lineage II {kind} inventory icon attached. Produce ONLY the empty square background, removing the item completely and reconstructing the area behind it. Match exactly the original {color} and almost black palette, subdued upper-left lighting, soft slightly mottled painted texture. Smooth high resolution, no pixel blocks. Whole square edge to edge. NO object, ornament, frame, border, symbol or text; no bright glow. This is a faithful reconstruction of the original game's empty backdrop for custom items.

## Rebuild

Run `scripts/items/build-l2-style.mjs` with `PLAYWRIGHT_PACKAGE` and `DESIGN_BROWSER` configured, then `scripts/items/convert-l2-style.py`. Inspect `docs/l2-painted-icons-preview.html` and run the item art checks before publishing.

## Custom names and original identities

Custom paintings have unique display names. The old L2 name from the generation brief survives only as `referenceName`, with its source catalog id as `referenceId`. Original equipment resolves to original client icons. Existing custom armor resolves to its own named painting, including the recipe and inventory views. Existing custom epic weapons retain their distinct names and paintings.

Artwork-only weapon, shield and jewelry variants have `custom-art:` ids: a named asset does not itself add a new item to the gameplay catalog or invent a recipe. Their names are ready for separate custom definitions when such items are introduced. Original items, item IDs, saved equipment, stats and crafting recipes are preserved.

For label-only changes, build with `--preview-only`, then publish with `convert-l2-style.py --metadata-only` to update the manifest and downloadable archive without re-encoding icons.
