# Tavern bone dice

Custom artwork for the dice poker minigame. This is an original decorative game prop, not a Lineage II inventory item or client icon.

- Generator: built-in `image_gen` (transparent background).
- Source: `art-source/dice/bone-face.png`.
- Runtime texture: `webapp/art/dice/bone-face.webp`, 128 × 128, 3,904 bytes.
- Exact pips are rendered separately by `webapp/dice-game.js`, using the shared `ui-dice` skin in `webapp/design-system.css`. Game values remain zero-based; displayed pip counts are 1–6. Hidden dice show no pips.
- The solid ivory background and pips remain usable if the texture cannot load. No WebGL or additional animation is required.
- Verification: `node scripts/ui/check-dice-textures.mjs`; previews in `output/dice-review/`.

## Final generation prompt

Use case: stylized-concept. Asset type: small raster texture for a dice poker browser game set in a medieval fantasy tavern. Create ONE ivory bone gaming die blank face, square front view exactly straight-on orthographic, not isometric, no other visible sides. Rounded slightly irregular bevelled square edges, aged warm ivory bone with subtle grain, small scratches and warm brown patina in corners, soft relief shading on bevel, pale cream very readable broad central surface. Square occupies 92% of canvas, centered. Hand-painted realistic fantasy game prop texture, restrained detail readable at 44 pixels. Truly transparent background outside silhouette. NO pips, NO numbers, NO symbols, NO letters, NO ornament, no scene, no cast shadow beyond silhouette. The center must be blank because exact dark pips will be placed by game code.

## Runtime conversion

```python
from PIL import Image
image = Image.open('art-source/dice/bone-face.png')
image.thumbnail((128, 128))
image.save('webapp/art/dice/bone-face.webp', quality=88, method=6)
```
