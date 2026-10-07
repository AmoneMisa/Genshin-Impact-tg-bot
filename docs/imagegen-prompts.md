# ImageGen prompts for Codex: matching the WhitesLove design sheet

How to use: paste **section 0 (master style)** first, then one asset prompt at a time. Ask for **4 variants per asset**, pick the best, and save it under the path given with each asset. When a folder is ready, tell Claude Code and it wires the files in (WebP conversion, art key lists, CSS).

References you attach in Codex are **style-only**: never copy a reference, never reproduce a signature or watermark, and invent original silhouettes.

---

## 0. Master style (paste first, applies to every asset)

```
You are painting game art for "WhitesLove", a Telegram Mini App RPG. Match the attached
design sheet. One consistent look for everything:

STYLE: premium 2D painted dark-fantasy RPG concept art (gacha-game quality), semi-realistic
with anime-leaning clean shapes. Rich painterly shading, crisp refined silhouettes, intricate
sculpted filigree. Nothing flat, nothing cartoonish, nothing photoreal.

PALETTE: deep midnight navy and indigo shadows (#0b0d18 to #1c2140), antique brushed-gold
trim (#d8b36a), glowing cyan-blue crystal light (#5cc8ff), royal violet accents (#7b4fd6),
warm amber lantern/window light (#ffb04a). Dark, moody, but the focal point always glows.

LIGHT: one strong focal glow, soft rim light, volumetric haze, floating embers and tiny
star-like sparks. Strong value contrast so the image still reads at 96 px thumbnail size.

HARD RULES: no text, no letters, no numbers, no logo, no watermark, no signature, no UI,
no frame or border, no people unless the asset says so, no modern objects.
Keep the subject centered with 8% breathing room on every side so nothing is cropped.
Output PNG. Transparent background where the asset says "transparent", otherwise a full scene.
```

---

## 1. City hero panorama (the most visible mismatch)

Replaces `webapp/art/menu/builds.webp`. Save the source as `art-source/city/hero.png`.
Size **1536x1024** landscape. It is shown behind the title, fading out downward, so keep the
bottom 30% darker and calmer (a flat mist or a river), and the top 15% open night sky.

```
A sweeping fantasy royal city at night seen from a hillside, wide establishing shot.
CENTER: a colossal castle of pale stone and dark slate with many slender glowing blue crystal
spires, perched on a cliff, its windows warm amber, its towers lit from inside with cyan
crystal light. Two thin waterfalls pour from the cliff into a misty lake below.
LEFT: a huge ancient stone statue of a robed knight leaning on a giant sword, half in shadow,
moonlight on its shoulder. RIGHT: a small floating island with a second glowing castle
drifting in the sky, distant mountains and a few dragons as tiny silhouettes.
FOREGROUND: curved stone bridges and winding paved roads leading up to the castle, hundreds of
tiny amber lantern windows across the terraced city, purple banners with a gold tree emblem
(no text) hanging from towers, a few trees with glowing leaves. A huge pale moon behind veils
of cloud, scattered stars, drifting embers.
Composition: castle slightly left of center, empty open space in the middle of the lower third
(a game UI will sit there), vignette at the edges.
Mood: majestic, mysterious, welcoming. Dark navy sky, cyan and gold glow, no daylight.
```

---

## 2. Buildings (seven lots, three tiers each)

Folder `art-source/builds/<id>/<tier>.png`, **1120x1120**, **transparent** background
(the app fades the edges into the night sky itself). Naming: `<id>-small`, `<id>-grand`,
`<id>-royal` (levels 1-10, 11-20, 21-30).

Template, fill `{SUBJECT}` and `{TIER}`:

```
A single isometric-leaning fantasy building painted as a floating "diorama island" on a small
chunk of rock and grass, viewed from a slight 3/4 elevation. {SUBJECT}
TIER: {TIER}
Dark navy night lighting, glowing crystal accents, amber window light, a few embers.
The island's rock base fades softly at the bottom. Transparent background, no ground shadow
spilling to the canvas edge, nothing cropped.
```

| id | Russian name | `{SUBJECT}` |
|---|---|---|
| palace | Дворец / Башня магов | A tall slender mage palace with one central crystal spire glowing electric blue, curved buttresses, gold filigree balconies, floating crystal shards orbiting the tip. |
| academy | Академия | A grand domed academy of white stone with an observatory telescope, arched stained-glass windows glowing violet, an open book emblem carved over the door, small floating runes. |
| forge | Кузница | A titanic gothic forge with a huge anvil-shaped roof, a molten orange furnace mouth, chimneys with sparks, giant hammers and chains, black iron and brass. |
| goldMine | Золотая шахта | A cliffside gold mine: timber-framed entrance, mine carts of glittering gold, a pulley crane, veins of gold in the rock, warm yellow glow from the shaft. |
| crystalLake | Озеро кристаллов | A still lake ringed with tall glowing cyan crystals, a small stone shrine on a jetty, crystals reflected in the water, aurora-like light above. |
| ironDeposit | Залежи руды | A rocky ore deposit with scaffolding, iron-ore carts, glowing rust-orange veins, a rope bridge and a small smelter, steel-blue rock. |
| traineeArea | Казармы / тренировочный двор | A fortified barracks and training yard: stone watchtower, practice dummies, weapon racks, a banner with a gold tree emblem (no text), torches. |

`{TIER}` values:
- `small`: modest, newly built, one or two small lights, little ornament.
- `grand`: larger, more towers and ornament, more glow, flags, a stone wall.
- `royal`: the most majestic version, gold trim everywhere, crowned roofs, strong glow and floating embers.

---

## 3. Chests (screen "Открытие сундуков")

Folder `art-source/chests/`. Transparent unless noted.

**3a. Closed chest** (`chest-closed.png`, 1024x1024). Used 9 times in a grid, so it must be a clean, centered object:
```
A closed treasure chest, dark blackened iron bands over aged dark wood, a heavy ornate lock with
a faint blue glowing keyhole, small rivets, subtle gold inlay on the corners. Three-quarter
view from slightly above, transparent background, dramatic rim light.
```

**3b. Chest opening scene** (`chest-open-scene.png`, 1536x1024, full scene, becomes the backdrop):
```
The same dark chest, lid thrown open, erupting with brilliant golden light and rising sparkles,
inside a dim gothic vault with stone arches, hanging chains, cold blue ambient light and
warm gold bursting from the chest. Light rays fan upward. Chest centered low in the frame,
the upper half is dark ambient space.
```

**3c. Reward icons** (`reward-gold.png`, `reward-crystal.png`, `reward-scroll.png`,
`reward-gem.png`, `reward-ore.png`, `reward-armor.png`, each 512x512, transparent, one object, centered):
```
gold:    a heap of shiny gold coins with a few coins falling, warm glow
crystal: one large faceted cyan-blue crystal gem, inner glow, tiny sparks
scroll:  a rare rolled parchment scroll with gold ends and a purple wax seal (no writing)
gem:     a violet faceted gem in a small gold claw setting, inner glow
ore:     a lump of silver-blue iron ore with metallic veins
armor:   one ornate silver pauldron shoulder plate with gold trim and a small sapphire
```

---

## 4. Telegram Stars crystal packs (new shop)

Folder `art-source/stars/`, **512x512**, transparent, centered. Six pieces that visibly grow:

```
Same cyan-blue glowing crystals, escalating pack sizes. One object, centered, transparent.
pouch  (pouch.png):  a small velvet pouch spilling five small crystals
sack   (sack.png):   a plump leather sack tied with gold cord, crystals peeking out
casket (casket.png): a small ornate gold casket overflowing with crystals
chest  (chest.png):  an open treasure chest heaped with crystals, soft glow
trove  (trove.png):  a pile of large crystals on a gold-trimmed pedestal, magical sparks
vault  (vault.png):  a towering crystal cluster surrounded by floating crystals and gold rings,
                     the most majestic version, strong radiant glow
```

---

## 5. Hero renders (screen "Мой персонаж" and other players)

Folder `art-source/heroes/<class>-<gender>.png`, **1024x1536** portrait, transparent,
full body, standing in a confident relaxed pose, 3/4 front view, head near the top with margin,
feet near the bottom with margin, soft rim light.

Template: `{CLASS}` + `{GENDER}`:

```
Full-body character render of an original fantasy hero, {GENDER}, {CLASS}.
Detailed layered gear with gold filigree and glowing gems, a signature weapon held naturally.
Anime-leaning proportions, expressive but calm face, flowing hair and cloth.
Transparent background, no ground, no shadow plate.
```

| class | `{CLASS}` |
|---|---|
| noClass | a lightly armored wanderer in a worn dark cloak with a simple sword |
| warrior | a heavy knight in black and gold plate armor with a greatsword, winged pauldrons |
| archer | a ranger in dark leather with a recurve bow and a quiver, feathered cloak |
| mage | a mage in a midnight-blue robe with a glowing crystal staff and floating runes |
| priest | a holy priest in white and gold robes with a radiant scepter and a soft halo of light |

Design sheet examples to match: the white-haired black-and-gold knight with a long sword
(my character) and the dark-haired shadow rogue in black leather (another player).

---

## 6. Arena

Folder `art-source/arena/`.

**6a. Arena headers** (`arena-normal.png`, `arena-ranked.png`, **1536x768**, full scene).
```
A torch-lit ancient colosseum at night seen from the sand floor. A lone armored gladiator
silhouette stands center facing the camera, banners hanging from the stands, braziers burning
orange, crowd as dark shapes, dust in the air, strong cold blue backlight.
```
- `normal`: stone and bronze tones, plain banners.
- `ranked`: the same arena grander, gold trim, horned golden helmet motifs on the banners, a faint golden glow.

**6b. Rank emblems** (`rank-bronze.png`, `rank-silver.png`, `rank-gold.png`, `rank-platinum.png`,
`rank-diamond.png`, **512x512**, transparent, centered):
```
A heraldic rank emblem: a faceted shield with a raised border, a gem in the center, small
swept-back wings on both sides, polished metal in the rank's color (bronze / silver / gold /
platinum / glowing diamond-blue), subtle inner glow. No text, no numbers.
```

---

## 7. Clan

Folder `art-source/clan/`.
- `clan-banner-1.png` to `clan-banner-4.png`, **512x768**, transparent. A hanging heraldic banner, deep purple cloth with a gold embroidered tree of life (no text), gold tassels. Tiers: 1 simple stitched edge, 2 gold fringe, 3 gold frame and a gem, 4 crowned top with glowing runes.
- `clan-hero.png`, **1536x512**: a grand stone guild hall interior with long banners, a round table with a glowing map, warm candlelight; calm space in the center.

---

## 8. Mini-game backdrops

Folder `art-source/games/`, **1024x1024** scenes with the lower center left calm for game UI.
- `basketball.png`: a dark gothic indoor court at night, an old backboard and hoop with an orange net, hanging spotlights, a basketball lying on the floor lower center, dusty light shafts.
- `table21.png`: a dark green felt card table seen from above at an angle, gold trim, a wooden rail, soft candle glow, no cards drawn (the game draws cards).
- `event-winter.png` (**1200x500**): a snowy mountain fortress under an aurora, braziers lit, wind-blown snow, for the "Зимний поход" event card.

---

## 9. Shop icons (only if you want to match the design sheet's shop)

Folder `art-source/shop/`, **512x512**, transparent: `gold-small`, `gold-medium`, `gold-large`
(coin bags, three sizes), `crystal-pouch`, `resource-crate` (a wooden crate with ore, wood and
crystals), `boost-set` (three glowing potions on a velvet cloth), `special-set` (a gold-bound
gift chest). Same cyan/gold palette; one centered object each.

---

## Delivery checklist (for each batch)

1. Transparent assets really have alpha, with no white or checkered halo around glows.
2. Nothing is cropped: the glow fades before the canvas edge.
3. No text or symbols that look like letters anywhere (banners and shields stay emblem-only).
4. The subject reads at 96 px.
5. Save to the path shown, then tell Claude Code which folder is ready.
