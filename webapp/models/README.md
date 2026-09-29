# Loot 3D models

Item previews in the Mini App (forge reveals, gacha pulls, the daily sword) load
high-poly glTF models from this folder. Item kinds without a model here keep the
built-in procedural renderer, so you can add models one kind at a time.

## Adding or replacing a model

1. Export the model as **`.glb`** (binary glTF 2.0) with PBR materials
   (metallic/roughness). Blender: *File → Export → glTF 2.0*, format *glTF Binary*.
2. Put the file in this folder, e.g. `webapp/models/hammer.glb`.
3. Add it to `manifest.json` under the item's **kind**:

```json
"hammer": { "file": "hammer.glb" }
```

Optional fields per entry:

| field      | meaning                                                                 |
|------------|-------------------------------------------------------------------------|
| `rotation` | `[x, y, z]` degrees, to fix a model exported lying down or facing away  |
| `scale`    | size in the frame (1 = fills the frame; the model is auto-centred)      |
| `offset`   | `[x, y, z]` nudge after centring                                        |
| `tint`     | `false` to keep the file's colours untouched by the item's rarity tone  |
| `variants` | per-grade files, e.g. `{ "S": "sword-s.glb", "SSS": "sword-sss.glb" }`  |
| `types`    | per item type (template `kind.type`), e.g. `{ "robe": "bracers.glb" }`; wins over `variants` |

Kinds: `sword`, `dagger`, `staff`, `bow`, `crossbow`, `hammer`, `shield`,
`gauntlets` (fists), `helmet`, `tiara` (priest/mage robe helmets), `armor`, `gloves`, `greaves`, `boots`,
`cloak`, `ring`, `earring`, `amulet` (necklaces), `relic`.

## How the game styles a model

- **Rarity tone** tints base colours slightly and recolours the rim light.
- **Grade** scales the glow of *emissive* materials (gems, runes) — give glowing
  parts an emissive colour in Blender and they'll get brighter at higher grades.
- **Durability** makes worn gear darker and rougher; **quality** controls how
  strongly it reflects the environment.

Model orientation: Y-up, blade/shaft pointing up, front facing +Z.

## Size budget (Telegram on phones)

Aim for **≤ 50k triangles and ≤ 1 MB per file**. Compress with
[gltfpack](https://meshoptimizer.org/gltf/) (`gltfpack -i in.glb -o out.glb -cc`)
or Draco — both are supported by the loader. Check a folder with:

```bash
npm run models:check
```

## Sample models

`node scripts/models/buildSampleModels.js` rebuilds the procedural sample set.
It skips Blender-owned files registered in `BLENDER_MODELS`; register custom
Blender replacements there before regenerating the samples.

## Blender builds

Higher-fidelity models are authored as headless Blender scripts in
`scripts/blender/` (modifiers, booleans, real 3D wraps, procedural materials
baked to textures with Cycles, Draco-compressed export):

```bash
npm run models:blender              # all Blender models
npm run models:blender -- sword.glb # one model
```

Needs Blender 4.2+ (built with 5.2). If it isn't in the default install path,
set `BLENDER_PATH`. Files listed in `BLENDER_MODELS` (`scripts/blender/build.js`)
are skipped by the Node generator, so the two never overwrite each other.

The Moonlace set replaces `necklace.glb` (amulet) and `earring.glb` with silver
filigree, faceted sapphire/ice crystals, interlocking links and hanging drops.
Both use native PBR materials and Draco compression. Their source scripts share
`scripts/blender/jewelry.py`; the existing manifest routes them into item previews.

```bash
npm run models:blender -- necklace.glb earring.glb
blender --background --python scripts/blender/render_preview.py -- webapp/models/necklace.glb /tmp/necklace.png
```

The preview tool imports the exported GLB and renders a studio image, so visual
checks exercise the shipped geometry and materials. Its lighting is for review;
the game's rarity, grade and environment lighting still apply at runtime.

Celestial staves are built by `scripts/blender/celestial_staff.py`: `staff.glb`
is the silver crescent staff, and `staff-sun.glb` is the gold solar-halo variant
used for SS/SSS grades. Both include enamel shafts, spiral metal inlay, faceted
crystals and emissive cores. Rebuild with:

```bash
npm run models:blender -- staff.glb staff-sun.glb
```

`dagger.glb` is the Moonglass dagger (`scripts/blender/moonglass_dagger.py`): a
curved, faceted ice-crystal blade with a crescent window and glowing inlay, a
silver crescent-moon guard with a sapphire, a navy leather grip and a star
pommel. Weapons keep fixed colours (no ColorID/palette data; the script asserts
it). The editable pre-bake scene is saved to `art-source/moonglass_dagger.blend`.

```bash
npm run models:blender -- dagger.glb
```
