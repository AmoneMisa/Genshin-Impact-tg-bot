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

`sword.glb`, `shield.glb`, `staff.glb`, `ring.glb` are generated placeholders
(`node scripts/models/buildSampleModels.js`). Overwrite them with real art any
time; regenerating only rewrites those four files.
