# Lightweight fishing artwork

`lightweight-frames.png` is the generated raster source for the replacement fishing animations. It contains only dark water, a rod tip, float and one silver fish. Six rows show idle, cast, waiting, reeling, success and failure; four columns are successive poses. The failure ends with an empty hook and fading ripples. No character, shoreline, trees, UI, emoji or vectors.

The image was created with the built-in imagegen tool. The encoder records the actual painted row boundaries rather than assuming perfect equal rows. It packages the existing raster poses with Pillow; it does not redraw artwork.

Run `node scripts/ui/build-fishing-webp.mjs` with Python/Pillow installed, or set `PYTHON` to the interpreter path. Output: 256×160 WebP. Idle is static, waiting has three looping frames, and cast/reel/results play once. Result-specific still images preserve the catch outcome for reduced motion and hidden tabs. The encoder checks frame count, resolution, loop count and a 24 KB per-file budget.

Generated assets are committed under `webapp/art/fishing`. The PNG source is used only during rebuilding and is never loaded by the game.
