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

## 5b. New classes and professions (portraits)

The class tree has two new base classes (`rogue`, `berserk`) and 24 professions. Until they
have their own portraits they borrow the base class's (`webapp/class-family.js`: rogue uses the
archer set, berserk the warrior set). Same folder and size as section 5; one set per base class
is enough to start, a set per profession later (the tier-3 ones read as the "final form").

| class | `{CLASS}` |
|---|---|
| rogue | a lithe rogue in dark teal leather with twin curved daggers, a half-mask, a short cloak |
| berserk | a scarred barbarian warrior in fur and iron with a huge battle axe, glowing red war paint |
| crusader / phoenixKnight | the black-and-gold knight with a flaming sword; tier 3 adds phoenix-wing pauldrons and ember trails |
| warden / bastion | the knight with a tower shield and heavy plate; tier 3 adds a glowing fortress emblem on the shield |
| elementalist / archmage | a mage wrapped in lightning and ice shards; tier 3 adds floating star constellations |
| warlock / soulReaper | a dark mage with violet flames and a skull-topped staff; tier 3 adds a scythe and drifting souls |
| cleric / saint | a healer in white-gold robes with a glowing chalice; tier 3 adds a radiant halo and wings of light |
| inquisitor / judicator | a stern priest with a flaming sword and a holy tome; tier 3 adds a golden scale of justice |
| ranger / hawkeye | a forest archer with a falcon on the shoulder; tier 3 adds a glowing eagle-eye monocle |
| sniper / phantomShot | a long-rifle-style marksman's bow with a scope lens; tier 3 adds ghostly translucent arrows |
| assassin / shadowBlade | a hooded killer in black with a long dagger; tier 3 adds blades made of shadow |
| trickster / phantomDancer | a playful thief with a theatrical mask and a coin; tier 3 adds trailing smoke and many masks |
| slayer / warbringer | a berserker with two axes; tier 3 adds a tattered war banner |
| ironclad / titan | an armored giant with a hammer; tier 3 adds molten-rock plates and a glowing core |

## 5c. New bosses (stage paintings)

Folder `art-source/bosses/<boss>.png`, same size and framing as the existing five boss
paintings (subject centered, a darker backdrop so the stage shader can sway it). New bosses
currently reuse a painting with a different tint (`BOSS_ART` in `webapp/boss-stage.js`).
Remove the `art` key there once the file exists.

| boss | prompt |
|---|---|
| zephyrion | a huge storm dragon in mid-air among spiralling wind and lightning clouds, pale cyan scales, gold-lit eye |
| terrax | a towering granite golem with glowing amber cracks, floating rock shards orbiting it |
| veraxis | a skeletal lich lord in a ruined crypt, violet soulfire in the ribcage, spectral skeletons in the haze |
| tiamara | a three-headed swamp hydra, the outer heads (one breathing fire, one dripping venom) larger than the middle |
| ignar | two fire twins back to back, a brutish brother with molten fists and a dancing sister with ember daggers (one wide painting) |
| selene | two sisters under a lunar eclipse, one made of silver light, one of living shadow (one wide painting) |

---

## 5d. Epic raid bosses (stage paintings)

Folder `art-source/bosses/<boss>.png`, **960x960**, same framing as section 5c: subject centered with 8%
margin, a darker backdrop the stage shader can sway. These are the biggest fights in the game, so they
should look clearly grander than the ordinary bosses: larger scale, a stronger focal glow, an
unmistakable silhouette. Names are Lineage 2 epic raids; paint an original interpretation, no text.
The code (`BOSS_ART` in `webapp/boss-stage.js`) borrows another painting until the file exists.

Template: paste the master style, then `{BOSS}`:

```
Boss stage painting, 960x960. {BOSS}
A colossal epic raid boss that dominates the frame, menacing and majestic, ancient and legendary.
Strong single focal glow on the eyes or core, volumetric haze, floating embers and sparks,
dark backdrop with depth so the silhouette reads at thumbnail size. No text, no UI, no frame.
```

| boss | `{BOSS}` |
|---|---|
| queenAnt | a gigantic armored queen ant with an engorged glowing amber abdomen, curved mandibles dripping acid, perched on a mound of eggs inside a dark underground hive, soldier ants swarming at her feet |
| core | a hulking rock-and-magma colossus with a glowing furnace in its chest, cracks of molten orange light across black basalt skin, standing in a fiery cavern with falling embers |
| orfen | an elegant dark-feathered harpy witch with huge black-violet wings spread wide, a crown of thorns, swirling wind and drifting feathers, cold violet-white eyes, a ruined cliff in the storm |
| zaken | a spectral pirate captain in a tattered coat and tricorn hat, half translucent with ghostly teal flames, a cursed cutlass in one hand, the hull of a sunken ghost ship and fog behind him |
| baium | a gaunt winged demon seated on a throne of giant crystals, long clawed fingers, stone-grey skin with glowing blue cracks, stone angel statues kneeling around the throne in a vast crystal crypt |
| frintezza | a lich maestro in ornate dark robes conducting with a bone baton, ghostly violin and cello floating around him, a spectral choir of translucent faces, a ruined grand hall lit by violet moonlight |
| antharas | an immense earth dragon, mountain-sized, scales like cracked boulders and moss, a long spiked tail, golden slit eyes, jaw open with a brown-gold breath of rock and dust, a ruined mountain lair |
| valakas | an immense volcano dragon with obsidian-black scales and glowing lava veins, wings spread like a burning sky, a molten maw, a volcano erupting behind it, a river of lava below |

---

## 5e. Epic jewellery (8 item icons)

Folder `art-source/items/epic/<id>.png`, **512x512**, transparent, one object centered, slightly
angled three-quarter view, a strong gem or magic glow, gold filigree in the master palette but with
the boss's own colour accent. These are the rarest pieces in the game: more ornate than any ordinary
ring, earring or necklace. No text, no runes that read as letters.

Template:

```
Game item icon, transparent background, centered, 512x512. {ITEM}
Legendary epic jewellery, intricate sculpted gold filigree, one large glowing centerpiece,
small floating sparks, soft rim light, no hand, no stand, no shadow plate, no text.
```

| id | `{ITEM}` |
|---|---|
| queenAnt | a ring shaped like an ant's armored head, a large amber gem held between curved mandibles, chitin-brown and gold |
| core | a ring of black basalt with a glowing molten-orange core gem and thin lava veins in gold setting |
| orfen | a pair of earrings (one shown, a second smaller behind it) of dark feathers in gold with violet moonstone drops |
| zaken | an earring of tarnished gold with a ghostly teal gem shaped like a tiny skull, a short chain with a coin |
| baium | a ring carved from a single blue-white crystal, a stone angel's wing wrapping the band, cold inner glow |
| antharas | an earring of sandstone-gold with a large golden dragon-eye gem, rough cracked scales around the setting |
| valakas | a necklace with a pendant of obsidian and glowing lava, a dragon-claw clasp, red-gold chain |
| frintezza | a necklace with a violin-scroll pendant holding a violet gem, a thin chain of silver notes, ghostly glow |

---

## 5f. Enchant and craft icons (tinted by grade in code)

Folder `art-source/icons/`, **256x256**, transparent, neutral/white-gold colouring because the game
tints them per grade (D, C, B, A, S, S80, S84). Centered, readable at 48 px, one object each.

```
Game inventory icon, transparent background, centered, 256x256, neutral light gold-and-parchment
colours so it can be tinted. {ICON}
Clean readable silhouette, soft glow, no text, no letters, no shadow plate.
```

| file | `{ICON}` |
|---|---|
| scroll.png | a rolled parchment scroll tied with a gold ribbon, faint glowing runes drawn as abstract strokes (not letters) |
| scroll-blessed.png | the same scroll with a bright holy radiance, small white wings of light on each side, a gentle halo |
| crystal.png | a faceted crystal shard, cold light inside, a few small floating fragments |
| binder.png | a small ceramic jar of varnish with a wooden stopper and a bone-powder pile beside it |
| leather.png | a folded roll of tanned leather with a stitched edge and a bone needle |
| fiber.png | a spool of shimmering thread with a small folded piece of silk cloth |
| gem.png | a cut gemstone in a small cluster of three smaller stones on a velvet cloth |

Optional banners, **1024x384**, full scene, no text:

```
forge-banner.png:  inside a dwarven forge, a glowing anvil with a half-finished sword, sparks,
                   hanging tongs and hammers, warm amber light against deep navy shadows.
epic-banner.png:   a dark stone hall with eight huge shadowy silhouettes (ant queen, golem,
                   winged witch, ghost captain, crystal demon, lich, two dragons) behind a
                   glowing gold crown at the center, ominous and grand.
```

---

## 5g. Fist and claw weapons (3 item variants)

Fist weapons currently reuse the gauntlet icon. Folder `art-source/items/`, **512x512**, transparent,
one object centered, three-quarter view, in the same style as the existing weapon icons.

```
Game item icon, transparent, centered, 512x512. A pair of fist weapons: {ITEM}.
Dark-fantasy gold filigree, soft rim light, small sparks, no hand, no text.
```

| file | `{ITEM}` |
|---|---|
| fists-low.png (no-grade, D, C) | simple iron knuckle claws with leather straps and short blades |
| fists-mid.png (B, A, S) | steel bagh-nakh claws with etched gold lines and a ruby in the knuckle guard |
| fists-high.png (S80, S84) | ornate gold-and-obsidian dragon claws with glowing cyan gems and curved blades |

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


City map composition follow-up (8 October 2026), city/map-portrait:

Premium painted 2D dark fantasy RPG kingdom map, semi-realistic painterly style. Use the supplied city design only as a composition and palette reference. Create an original continuous vertical landscape, NOT a screenshot or UI. Midnight navy mountains, antique gold stonework, cyan crystals and amber lit windows. Top quarter: giant knight statue holding an upright sword on LEFT cliff, a glowing blue-spired royal castle in CENTER DISTANCE, a floating castle island on RIGHT, bridges and waterfalls. Lower three quarters: descending terraced city streets with stone paths, connecting bridges, warm small rooftops, trees and a central round plaza with an elegant statue and fountain. Let the landscape flow naturally from distant skyline to near foreground. Keep seven broad calm areas with subdued detail for separately rendered buildings: one central upper terrace, three paired left/right lower terraces. No large foreground buildings in those areas, no isolated floating dioramas. No text, letters, words, labels, logos, borders, HUD, icons, UI, numbers or watermark anywhere. Portrait 2:3 composition, target 1024 x 1536, full environment to edges. Readable landscape at phone width.
Reference: art-source/city/reference.png, composition and palette only.


Actual server rank arena/rank-iron (8 October 2026):

Premium painted 2D dark fantasy RPG concept art, refined semi-realistic anime-leaning shapes and painterly shading. Midnight navy and indigo shadows, antique gold, cyan-blue crystal glow, violet accents, amber lantern light. One strong focal glow, crisp readable silhouette at 96 px. No text, letters, numbers, signatures, logos, watermarks, UI or border. References guide style only; invent original silhouettes. Subject centered with 8% breathing room.
Heraldic rank emblem, faceted shield with raised border, central gemstone and swept-back wings on both sides. dark brushed iron, neutral gray steel and pale blue gemstone. One centered symmetrical emblem, no stars or numerals.
Composition aspect 512:512, target 512x512. Actual transparent background, isolated subject, no ground plane or cast shadow at canvas edges.


Actual server rank arena/rank-ruby (8 October 2026):

Premium painted 2D dark fantasy RPG concept art, refined semi-realistic anime-leaning shapes and painterly shading. Midnight navy and indigo shadows, antique gold, cyan-blue crystal glow, violet accents, amber lantern light. One strong focal glow, crisp readable silhouette at 96 px. No text, letters, numbers, signatures, logos, watermarks, UI or border. References guide style only; invent original silhouettes. Subject centered with 8% breathing room.
Heraldic rank emblem, faceted shield with raised border, central gemstone and swept-back wings on both sides. antique silver border, deep ruby-red metal and brilliant red gemstone. One centered symmetrical emblem, no stars or numerals.
Composition aspect 512:512, target 512x512. Actual transparent background, isolated subject, no ground plane or cast shadow at canvas edges.
# Epic reference collection delivery

The current exact per-asset prompts and stable reference paths are in `art-source/epic-collection/jobs.json`; saved master provenance is alongside each PNG in `art-source/items/epic-collection/*.generation.json`. Delivery and quota status are in `art-source/epic-collection/STATUS.md` and `progress.json`. Finish these 14 weapons and 13 potions before avatar work. Potion effects use Lineage II buff concepts: Might, Shield, Haste, Focus, Death Whisper, Guidance and Wind Walk, with 20-minute durations and bonuses adapted to this game's stat scale. Only reviewed images enter the mobile WebP allowlist.



## 10. Hunting and item icons (9 October 2026)

Finish epic weapons/potions first. These exact prompts extend the master style from section 0. Neutral transparent gold icons are tinted in code; publish only reviewed files.

### lifestone — priority 1

Source: `art-source/icons/lifestone.png`. Outputs: `webapp/art/icons/lifestone-128.webp`, `webapp/art/icons/lifestone-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: polished irregular mineral with organic veins and a small inner glow. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### attr-stone — priority 1

Source: `art-source/icons/attr-stone.png`. Outputs: `webapp/art/icons/attr-stone-128.webp`, `webapp/art/icons/attr-stone-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: rough chunky attribute mineral with one central facet. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### attr-crystal — priority 1

Source: `art-source/icons/attr-crystal.png`. Outputs: `webapp/art/icons/attr-crystal-128.webp`, `webapp/art/icons/attr-crystal-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: tall angular crystal cluster with three distinct tips. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### attr-jewel — priority 1

Source: `art-source/icons/attr-jewel.png`. Outputs: `webapp/art/icons/attr-jewel-128.webp`, `webapp/art/icons/attr-jewel-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: refined faceted jewel in a thin gold setting. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### soulshot — priority 1

Source: `art-source/icons/soulshot.png`. Outputs: `webapp/art/icons/soulshot-128.webp`, `webapp/art/icons/soulshot-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: pointed physical weapon charge with solid gold casing and a bright core. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### spiritshot — priority 1

Source: `art-source/icons/spiritshot.png`. Outputs: `webapp/art/icons/spiritshot-128.webp`, `webapp/art/icons/spiritshot-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: rounded magic charge with a delicate cage around a pearl core. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### blessed-spiritshot — priority 1

Source: `art-source/icons/blessed-spiritshot.png`. Outputs: `webapp/art/icons/blessed-spiritshot-128.webp`, `webapp/art/icons/blessed-spiritshot-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: winged magical charge with a luminous pearl core. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### egg-wyvern — priority 1

Source: `art-source/icons/egg-wyvern.png`. Outputs: `webapp/art/icons/egg-wyvern-128.webp`, `webapp/art/icons/egg-wyvern-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: small leathery egg with fine scales. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### egg-dragon — priority 1

Source: `art-source/icons/egg-dragon.png`. Outputs: `webapp/art/icons/egg-dragon-128.webp`, `webapp/art/icons/egg-dragon-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: broad egg with overlapping dragon scales and gold seams. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### egg-ancient — priority 1

Source: `art-source/icons/egg-ancient.png`. Outputs: `webapp/art/icons/egg-ancient-128.webp`, `webapp/art/icons/egg-ancient-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: ancient fossil-like egg with heavy plates and glowing gold seams. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### hunt — priority 1

Source: `art-source/menu/hunt.png`. Outputs: `webapp/art/menu/hunt.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
A lone hunter seen from behind on a forest path, distant ruined royal tower, faint cyan monster silhouette and amber lantern. One focal subject and calm lower area for labels added by code. Square 1024x1024, delivery 480px.

### element-fire — priority 2

Source: `art-source/icons/element-fire.png`. Outputs: `webapp/art/icons/element-fire-128.webp`, `webapp/art/icons/element-fire-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: sculpted flame elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### element-water — priority 2

Source: `art-source/icons/element-water.png`. Outputs: `webapp/art/icons/element-water-128.webp`, `webapp/art/icons/element-water-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: curling wave and droplet elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### element-wind — priority 2

Source: `art-source/icons/element-wind.png`. Outputs: `webapp/art/icons/element-wind-128.webp`, `webapp/art/icons/element-wind-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: flowing wind spiral elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### element-earth — priority 2

Source: `art-source/icons/element-earth.png`. Outputs: `webapp/art/icons/element-earth-128.webp`, `webapp/art/icons/element-earth-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: layered mountain elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### element-holy — priority 2

Source: `art-source/icons/element-holy.png`. Outputs: `webapp/art/icons/element-holy-128.webp`, `webapp/art/icons/element-holy-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: sunburst and pearl elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### element-dark — priority 2

Source: `art-source/icons/element-dark.png`. Outputs: `webapp/art/icons/element-dark-128.webp`, `webapp/art/icons/element-dark-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: crescent enclosing a shadow pearl elemental emblem, distinct silhouette. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### champion-blue — priority 2

Source: `art-source/icons/champion-blue.png`. Outputs: `webapp/art/icons/champion-blue-128.webp`, `webapp/art/icons/champion-blue-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: single-winged gem shield medal; neutral gold for code to tint blue. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### champion-red — priority 2

Source: `art-source/icons/champion-red.png`. Outputs: `webapp/art/icons/champion-red-128.webp`, `webapp/art/icons/champion-red-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Subject: double-winged crowned shield medal; neutral gold for code to tint red. Neutral desaturated gold, ivory and parchment only; no saturated elemental colours (code tints the icon). True transparent background without shadow plane, halo or checkerboard. One complete centered subject with 10% breathing room. Readable at 22, 48 and 96px. Square 512x512.

### zone-ng-d — priority 2

Source: `art-source/hunt/zones/ng-d.png`. Outputs: `webapp/art/hunt/zones/ng-d-480.webp`, `webapp/art/hunt/zones/ng-d-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: moonlit woodland, stone path, ruined watchtower. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-c — priority 2

Source: `art-source/hunt/zones/c.png`. Outputs: `webapp/art/hunt/zones/c-480.webp`, `webapp/art/hunt/zones/c-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: misty marsh and half-sunken temple ruins. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-b — priority 2

Source: `art-source/hunt/zones/b.png`. Outputs: `webapp/art/hunt/zones/b-480.webp`, `webapp/art/hunt/zones/b-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: deep forest ravine and ancient overgrown pillars. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-a — priority 2

Source: `art-source/hunt/zones/a.png`. Outputs: `webapp/art/hunt/zones/a-480.webp`, `webapp/art/hunt/zones/a-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: ruined fortress courtyard under a stormy night sky. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-s — priority 2

Source: `art-source/hunt/zones/s.png`. Outputs: `webapp/art/hunt/zones/s-480.webp`, `webapp/art/hunt/zones/s-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: towering cathedral ruin with violet windows. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-s80 — priority 2

Source: `art-source/hunt/zones/s80.png`. Outputs: `webapp/art/hunt/zones/s80-480.webp`, `webapp/art/hunt/zones/s80-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: volcanic wasteland, obsidian cliffs, restrained molten rivers. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-s84 — priority 2

Source: `art-source/hunt/zones/s84.png`. Outputs: `webapp/art/hunt/zones/s84-480.webp`, `webapp/art/hunt/zones/s84-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: celestial ruin, broken royal spires and cyan fissures. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### zone-hellbound — priority 2

Source: `art-source/hunt/zones/hellbound.png`. Outputs: `webapp/art/hunt/zones/hellbound-480.webp`, `webapp/art/hunt/zones/hellbound-960.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
Wide environmental banner: cursed island coastline, shattered citadel, sand and dark mist. Distant focal landmark, calm edges for cropping, no foreground characters. Full painted backdrop, target 1536x512.

### mob-beast — priority 2

Source: `art-source/hunt/mobs/beast.png`. Outputs: `webapp/art/hunt/mobs/beast-128.webp`, `webapp/art/hunt/mobs/beast-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: powerful wolf with clear muzzle and alert ears. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-orc — priority 2

Source: `art-source/hunt/mobs/orc.png`. Outputs: `webapp/art/hunt/mobs/orc-128.webp`, `webapp/art/hunt/mobs/orc-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: tusked orc raider in weathered bronze armour. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-undead — priority 2

Source: `art-source/hunt/mobs/undead.png`. Outputs: `webapp/art/hunt/mobs/undead-128.webp`, `webapp/art/hunt/mobs/undead-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: skeletal knight with dented helmet and hollow eyes. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-insect — priority 2

Source: `art-source/hunt/mobs/insect.png`. Outputs: `webapp/art/hunt/mobs/insect-128.webp`, `webapp/art/hunt/mobs/insect-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: a majestic armoured beetle with rounded gold-and-navy carapace, compact antennae and small calm eyes; no spider or arachnid anatomy. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-lizardman — priority 2

Source: `art-source/hunt/mobs/lizardman.png`. Outputs: `webapp/art/hunt/mobs/lizardman-128.webp`, `webapp/art/hunt/mobs/lizardman-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: reptilian warrior with scales, crest and primitive armour. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-golem — priority 2

Source: `art-source/hunt/mobs/golem.png`. Outputs: `webapp/art/hunt/mobs/golem-128.webp`, `webapp/art/hunt/mobs/golem-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: massive stone golem with a small crystal core. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-bandit — priority 2

Source: `art-source/hunt/mobs/bandit.png`. Outputs: `webapp/art/hunt/mobs/bandit-128.webp`, `webapp/art/hunt/mobs/bandit-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: masked human outlaw with leather hood. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-plant — priority 2

Source: `art-source/hunt/mobs/plant.png`. Outputs: `webapp/art/hunt/mobs/plant-128.webp`, `webapp/art/hunt/mobs/plant-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: animated tree creature with bark face and fungal growth. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-demon — priority 2

Source: `art-source/hunt/mobs/demon.png`. Outputs: `webapp/art/hunt/mobs/demon-128.webp`, `webapp/art/hunt/mobs/demon-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: horned infernal demon with obsidian skin and violet eyes. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-dragon — priority 2

Source: `art-source/hunt/mobs/dragon.png`. Outputs: `webapp/art/hunt/mobs/dragon-128.webp`, `webapp/art/hunt/mobs/dragon-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: scaled drake with horns and wing shoulders. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-spirit — priority 2

Source: `art-source/hunt/mobs/spirit.png`. Outputs: `webapp/art/hunt/mobs/spirit-128.webp`, `webapp/art/hunt/mobs/spirit-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: spectral ghost with translucent shroud and pale cyan face. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

### mob-giant — priority 2

Source: `art-source/hunt/mobs/giant.png`. Outputs: `webapp/art/hunt/mobs/giant-128.webp`, `webapp/art/hunt/mobs/giant-256.webp`.

Use case: stylized-concept. Premium 2D painted dark-fantasy RPG art, semi-realistic forms, painterly shading, crisp silhouette. Midnight navy shadows, antique gold, restrained cyan, violet and amber focal glow. Original design. No text, letters, numbers, logos, signatures, watermark, UI, border or 3D render.
One head-and-shoulders portrait: ancient giant with heavy brow and weathered stone-like skin. Subdued navy backdrop, face centered with 12% margins for circular cropping, no weapon crossing face. Square 512x512, readable at 48/96px.

Optional polish deferred: passives/luckShop/auction, STR/DEX/CON/INT/WIT/MEN, 13 passive + 6 clan + 16 Life Stone skills, vitality, clan RTA. Inspect real skill definitions before specifying subjects.

Reviewed delivery: add accepted keys to `art-source/hunt-ui/reviewed.json`, then run `npm run art:build -- --painted`. This preserves existing world paintings and builds only accepted icon/hunt PNGs.

## 11. Painted mini-game scenes and animated objects

### football
Source: `art-source/arcade/football.png`

A painterly dark-fantasy royal football courtyard at night, landscape 3:2. Complete realistic goal with ivory net and worn bronze posts centered in upper half, midnight navy stone castle, antique gold torches, rich green grass in lower third, no ball, no people. Premium hand-painted RPG illustration, realistic volume and materials, dramatic clear lighting, no text, no numbers, no logos, no spiders, no UI or borders, no vector or flat SVG style.

### darts
Source: `art-source/arcade/darts.png`

Painterly royal dark fantasy tavern dart game backdrop landscape 3:2. One richly detailed circular ivory, black, crimson and emerald dartboard centered at 50% width 42% height, occupies 55% of image height, concentric scoring rings and radial sectors but NO numerals or letters. Carved dark walnut wood wall with brass candle sconces, midnight navy shadows and amber warm lighting. Board fully visible. No dart, no people, no text, no logos, no spiders, no UI, no flat vector style. Realistic dimensional painterly RPG illustration.

### slots
Source: `art-source/arcade/slots.png`

Painterly premium dark fantasy RPG slot machine artwork landscape 3:2. A complete ornate antique gold and dark walnut mechanical slot machine centered, front view, three EMPTY dark rectangular reel openings centered horizontally at mid-height, each matching width, framed in ivory and gold. Warm amber gem lights, midnight navy velvet background, dramatic rich realistic painted materials. NO symbols in reel openings, no text, no letters, no numbers, no UI buttons, no borders, no people, no spiders, no vector or flat style.

### dice
Source: `art-source/arcade/dice.png`

Painterly dark-fantasy RPG dice table background landscape 3:2. Overhead tilted view of emerald velvet gaming tray with ornate antique gold frame and carved walnut edge, warm amber light, midnight navy shadows. Center is calm clear dark green velvet for an animated dice object. No dice, no objects in the center, no people, no spiders, no text, no numbers, no logos, no interface, no flat vector art. Luxurious realistic hand painted texture and depth.

### basketball-ball
Source: `art-source/arcade/basketball-ball.png`

One realistic hand painted leather basketball sprite, centered front view, sphere orange brown worn pebbled leather with dark seams and strong dimensional lighting, highlights upper left, shadow lower right. Premium dark fantasy RPG object art matching warm amber and midnight navy palette. Entire object 80% of canvas, no cast shadow plane, no background, true transparent alpha, square. No text, no logo, no border, no flat SVG or vector style.

### football-ball
Source: `art-source/arcade/football-ball.png`

One realistic hand painted football soccer ball sprite, centered, ivory leather hexagonal panels and midnight black pentagonal panels, visible seams, strong volumetric upper left light with dark lower right shading, premium painterly RPG object art. Complete sphere 80% of canvas. Square true transparent alpha, no shadow plane, no text, no logo, no border, no flat SVG or vector style.

### bowling-ball
Source: `art-source/arcade/bowling-ball.png`

One realistic hand painted bowling ball sprite, centered, deep amethyst polished marble sphere, three finger holes in upper front, strong upper left light and dark lower right shading, antique fantasy RPG item art. Complete sphere 80% canvas, square true transparent alpha, no cast shadow plane, no background, no text, no logo, no border, no vector style.

### dart
Source: `art-source/arcade/dart.png`

Single hand painted realistic dart projectile sprite, vertical upward pointing, complete sharp steel point at TOP and red feather flight fins at BOTTOM, antique brass ridged grip middle. Dark fantasy RPG item art, dimensional painterly material lighting. Centered full silhouette 80% canvas height. Square true transparent alpha, no shadow plane, no background, no text, no letters, no logo, no vector style.

### pin
Source: `art-source/arcade/pin.png`

Single realistic painterly ivory bowling pin sprite, upright full frontal silhouette, rounded head narrow neck wide body with two crimson neck stripes, smooth polished aged ivory warm upper left light dark lower right shadow. Premium fantasy RPG object art. Entire pin 85% canvas height. Square true transparent alpha, no cast shadow plane, no text, no logo, no border, no flat SVG or vector style.

### die
Source: `art-source/arcade/die.png`

A single realistic hand painted cubical gaming die sprite, FRONT VIEW of square front face only with softly rounded beveled gold edges and ivory blank face with NO pips or marks, subtle dimensional shading and antique material texture, painterly premium dark fantasy RPG item art. Complete die fills 80% square canvas. True transparent alpha, no background, no shadow plane, no text, no numbers, no symbols, no logo, no flat vector style.

### bowling
Source: `art-source/arcade/bowling.png`

Edit this royal bowling hall image: remove ALL bowling pins and their reflections completely, leaving the lane empty. Preserve architecture, perspective, wood, flames, light, gold navy style, and landscape composition. No ball, no text, no spiders. The empty lane will receive separate animated bowling pins in code.

### basketball
Source: `art-source/arcade/basketball.png`

Edit this painted royal basketball court: remove the basketball on the floor and its shadow completely. Preserve the ornate hoop, board, architecture, antique gold, midnight navy and amber lighting. Recompose as landscape 3:2 with hoop centered at 50% width and 38% image height, whole hoop visible, empty foreground floor. No people, no balls, no text, no spiders. Separate animated basketball will be added in code.

## 12. Painted interface icons

The 26 exact delivered prompts are recorded in [art-source/ui-icons/prompts.md](../art-source/ui-icons/prompts.md), with job keys, source paths and original built-in imagegen output paths in [jobs.json](../art-source/ui-icons/jobs.json). These transparent paintings cover utility buttons, navigation, card suits, dice and crossed swords. No reference files were consumed in this batch.

Reviewed sources and shared aliases are in `art-source/ui-icons/catalog.json`; 95 icon names reuse 58 paintings. Build transparent 128/256 WebP delivery with `npm run ui-art:build`. See [STATUS.md](../art-source/ui-icons/STATUS.md) for verification and scope.

## 13. Deferred polish: menu cards

Three menu paintings delivered on 10 October 2026: `passives`, `luckShop`, `auction`. Exact master style, full prompts and generation paths: [menu/PROMPTS.md](../art-source/polish/menu/PROMPTS.md) and [menu/jobs.json](../art-source/polish/menu/jobs.json). Generated with the built-in imagegen tool, one call per asset, without external references. No text or spiders. Opaque paintings; quiet lower third preserves menu labels.

Default delivery is 480px WebP, with 960px siblings. Rebuild via `scripts/ui/build-menu-polish.py`. These paintings are integrated through the explicit `MENU_ART` allowlist. See [STATUS.md](../art-source/polish/STATUS.md) for local verification and remaining polish.

## 14. Deferred polish: characteristics, Vitality and clan RTA

Eight accepted transparent paintings: `stat-str`, `stat-dex`, `stat-con`, `stat-int`, `stat-wit`, `stat-men`, `vitality`, `clan-rta`. Exact prompts and built-in generation paths: [icons/PROMPTS.md](../art-source/polish/icons/PROMPTS.md) and [icons/jobs.json](../art-source/polish/icons/jobs.json). Reviewed keys in `art-source/polish/icons/reviewed.json`; mobile 128/256 WebP in `webapp/art/polish/v1/`. Build with `scripts/ui/build-polish-icons.py`.

Actual definitions were checked in `functions/game/player/baseStatsData.js`. No reference files consumed, no spiders or text. Icons retain transparent alpha and padded complete silhouettes. Character and RTA UI integration preserves server values and controls. Browser verification passed 320/390px; see [polish/STATUS.md](../art-source/polish/STATUS.md).

The 35 passive/clan/Life Stone skill mappings already use existing original L2 paintings added by ongoing work; responsive URLs were verified and no duplicate skill artwork generated. Next scope: authorized avatar references.



## 15. Reference-derived avatar outfits

Five accepted transparent adult full-body paintings: mage-female, priest-female, rogue-male, mage-male and berserk-male. Clothing references only; server equipment and stats unchanged. Exact prompts, stable references and built-in outputs: [avatars/PROMPTS.md](../art-source/avatars/PROMPTS.md) and [avatars/jobs.json](../art-source/avatars/jobs.json). Sources art-source/avatars/*.png, reviewed list reviewed.json; mobile WebP 256/512 with optional 1024px sibling. Build scripts/ui/build-avatar-art.py. No spiders or embedded text. See [avatar status](../art-source/avatars/STATUS.md) for reviewed transparency, mobile checks and reference archival.


### 15b. Decorative outfit continuation

Three new transparent paintings: crimson-dawn (Багряный рассвет), malachite-warden (Хранитель малахита), dawn-emissary (Посланник зари). Exact prompts and reference metadata: art-source/avatars/PROMPTS.md and jobs.json. Eight total outfits have distinct custom IDs and names, never original L2 item-name aliases. Class-based full-body integration only. Default 512px mobile files 69–84 KiB; padded 256/512/1024 variants preserve alpha. Rebuild only new keys with scripts/ui/build-avatar-art.py --keys rogue-female warrior-male priest-male. See avatars/STATUS.md for browser checks and reference archive.


## 16. Race-specific decorative outfits (supersedes class-based defaults)

User correction: each of the six High Five races has its own male and female outfit. Ten new drawings plus two existing human drawings = twelve mappings. Original L2 item names/client icons unchanged. Exact prompts and stable clothing references: art-source/avatars/races/PROMPTS.md and jobs.json. Accepted keys reviewed.json; 256/512/1024 delivery in webapp/art/avatars/races/v1. Server and client race inheritance checked against template/l2ClassMeta.js. Current status art-source/avatars/races/STATUS.md. No new Desktop references consumed; no spiders. Full-body equipment artwork resolves by race/gender. Compact portrait continuation is delivered in section 17.

## 17. Compact race/gender portraits matching decorative outfits

Twelve head-and-shoulders paintings, generated through built-in imagegen identity-preserve edits of the approved full-body masters, one call per asset. Exact prompts and edit targets: [portrait prompts](../art-source/avatars/portraits/PROMPTS.md) and [portrait jobs](../art-source/avatars/portraits/jobs.json). Sources art-source/avatars/portraits/*.png. Preserve face, eyes, hair, skin tone, racial ears/beard and costume details; centered square portrait with clear alpha, no text, borders, new weapons or spiders.

Reviewed allowlist reviewed.json. Delivery 128/256/512 WebP in webapp/art/avatars/portraits/v1; builder scripts/ui/build-avatar-portraits.py. HUD 128px, ordinary cards 256px, large profile 512px. Shared resolver covers identity/profile previews, friends, arena, raid, table seats, transfers, profession quests and theft targets. Unique custom outfits remain independent from original L2 equipment icons and mechanics. See [portrait status](../art-source/avatars/portraits/STATUS.md).

### 17b. Female dwarf silhouette correction

13 October 2026 user correction: female dwarf should have a petite, light-framed silhouette inspired by classic Lineage II, rather than a broad stocky fantasy body. Revised full-body painting and matching portrait preserve auburn braids, amber eyes and red/antique-gold fire embroidery. Dress refitted with closed bodice, reduced skirt bulk and knee-length hem. Built-in imagegen edit prompts and previous-source references: [revision record](../art-source/avatars/revisions/dwarf-female-v2.json). Previous PNGs preserved in revisions/dwarf-female-v1. Only this outfit publishes under races/v2 and portraits/v2 to avoid stale cached images; all other outfits unchanged. Delivery alpha, mobile widths, equipment controls and gender switching verified.

### 17c. Dwarf reference revision v3
Authoritative anatomy: three user-provided L2 screenshots saved in art-source/avatars/revisions/dwarf-reference-v3/references/. Costume palette only from prior avatars; replace human-like proportions with compact racial silhouettes. Exact generation prompts:

**dwarf-female body**

Use case: style-transfer and racial anatomy correction. Create ONE full-body FEMALE dwarf decorative avatar. Images 1-3 are authoritative Lineage II dwarf MODEL ANATOMY references, specifically the FEMALE figures: match their large head relative to the compact body, short neck, narrow shoulders, small torso, slender short arms and legs, short stature and small flat boots. Image 4 is ONLY the RED-GOLD decorative clothing palette and embroidery reference, NOT anatomy; its human-like body proportions must be replaced. Female is clearly different from the stocky bearded males in images 1-3. This is an adult fantasy dwarf, nonsexual, clothed modestly: short compact silhouette around 4.5 head lengths tall, friendly round face, large amber eyes, small nose, natural small lips, auburn twin ponytails and neat bangs inspired by references. Slim petite build, no hourglass curves, no chest emphasis, no muscular bulk. Wear a fully closed high-neck crimson dress with antique gold flame-leaf embroidery, fitted flat bodice, knee-length skirt with a few light ruffles, long sleeves, small flat red-gold boots. Do not copy the reference armor sets, weapons, game logo or background. Hand-painted anime royal fantasy style consistent with image 4; silhouette and head/body ratio MUST follow images 1-3. Neutral standing pose, empty hands, front three-quarter view. Portrait 1024x1536 TRUE transparent alpha, no haze or floor. Full head, ponytails, hands and feet inside 8 percent breathing room. No text, watermarks, spiders, extra limbs. Do not produce a tall human or a miniaturized curvy adult human.

**dwarf-female portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders avatar portrait of the EXACT female dwarf in the input full-body painting. Preserve the round face, large amber eyes, small natural nose and lips, auburn twin ponytails with bangs, narrow petite shoulders, closed high collar and red-gold flame embroidered dress. Do not make her face long or human-supermodel shaped, do not enlarge her body or add makeup. Faithfully reframe the same image identity and hand-painted quality. Center face, eyes at around 38 percent canvas height; BOTH ponytails and head fully inside with a small margin, shoulders fill lower corners. True transparent background with clean alpha; no haze, floor, text, border, weapon, spider or extra limbs. Change only framing.

**dwarf-male body**

Use case: style-transfer and racial anatomy correction. Create ONE full-body MALE dwarf decorative avatar. Images 1-3 are authoritative Lineage II dwarf MODEL ANATOMY references, specifically the MALE figures: a mature elderly bald-topped dwarf with gray-white hair at sides, thick bushy white eyebrows, broad weathered face, large nose and thick rounded white beard. Match their head/body ratio, short neck, very broad barrel chest, thick short arms and large hands, broad waist, short sturdy legs and broad flat boots. Around FOUR head lengths tall total excluding beard. Image 4 is ONLY the ivory-and-antique-gold decorative costume palette and embroidery reference; its tall elegant long-haired anatomy must be replaced. This is the strong stocky male dwarf silhouette shown in the references, visibly different from the petite female. Wear an ornate ivory formal coat ending at mid thigh so the short sturdy legs are visible, golden botanical/geometric embroidery, heavy gold clasps, dark ivory trousers and broad ivory-gold flat boots. Keep outfit as decorative clothing, not a copy of an original L2 armor set. No long sweeping robes hiding the proportions, no long elf-like flowing hair. Hand-painted anime royal fantasy consistent with image 4. Neutral standing pose, empty hands, front three-quarter view. Portrait 1024x1536 TRUE transparent alpha, entire head, beard, hands, coat and both feet visible with 8 percent padding. No weapons, floor, backdrop, haze, text, watermark, spiders or extra limbs. Model proportions follow images 1-3, never tall human proportions.

**dwarf-male portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders avatar portrait of the EXACT male dwarf in the input full-body painting. Preserve the bald top and short white side hair, wide weathered face, broad nose, bushy white eyebrows, thick rounded white beard, short neck and broad shoulders. Keep the ivory-and-gold embroidered coat collar and shoulder details. Do not add flowing hair or make the face slender/elf-like. Faithfully reframe the same identity and hand-painted quality. Center face, eyes at around 38 percent canvas height; whole bald head and beard inside with a small top margin, shoulders fill lower corners. True transparent background, clean alpha, no haze, floor, text, border, weapon, spider or extra limbs. Change only framing.

### 17d. Classic elf and dark elf revision v2
Anatomy references: https://legacy-lineage2.com/Knowledge/race_elf.html and https://legacy-lineage2.com/Knowledge/race_darkelf.html (archive official artwork, not a claim of exact High Five mesh reproduction). Images saved under art-source/avatars/revisions/elf-reference-v2/references/. Custom clothing maintained. Built-in imagegen only, one call per asset.

**elf-male body**

Use case: precise-object-edit. One full-body decorative race avatar, 1024x1536 true transparent background. Images 1-3 are archival Lineage II official client artwork ANATOMY references, use head, ears, skin, build and posture only; they are cropped website slices, NOT desired cropping. Final image is the EDIT TARGET for custom clothing theme only. Replace its wearer anatomy and face substantially with classic Lineage II / High Five racial appearance: adult male light elf; pale ivory skin, delicate youthful clean-shaven face, almond eyes, fine straight nose, small thin natural lips, shoulder-length straight light platinum blond hair with center part tucked behind BOTH long slender pointed ears; slim narrow ribcage/shoulders, lean arms, long slim legs, graceful slender hands. Keep a calm composed expression. No broad human warrior chest, rugged jaw, beard, exaggerated anime eyes or gigantic ears. Keep the existing emerald botanical gold formal coat and matching boots, color identity and embroidery motifs; refit cloth to the revised slim build, reduce bulky shoulders, do not copy official reference armor or weapons. Hand-painted elegant Korean fantasy illustration with natural classic-client face proportions, consistent with current game art. Full body neutral front-three-quarter standing, empty hands. Entire head, ears, hands, hem and both feet inside 8% safe padding. Clean alpha, no backdrop or floor, no fog, no aura outside silhouette, no text/watermark/logo/spiders/extra limbs. This is custom cosmetic art, not a named original L2 armor item.

**elf-male portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders portrait of the EXACT elf-male adult character in the input revised full-body painting. Preserve the face, natural almond eyes, fine nose and lips, pale ivory skin and straight platinum blond hair, BOTH long pointed ears and clothing collar/shoulder details exactly. Natural classic Lineage II racial face proportions; no doll eyes, no makeup, no redesign. Center face, eyes around 38 percent canvas height, whole hair and BOTH ear tips INSIDE a generous 8 percent safe margin. Shoulders fill lower corners. Transparent alpha, no backdrop/aura/haze, text, border, watermark, weapons, spiders or extra limbs. Change framing only.

**elf-female body**

Use case: precise-object-edit. One full-body decorative race avatar, 1024x1536 true transparent background. Images 1-3 are archival Lineage II official client artwork ANATOMY references, use head, ears, skin, build and posture only; they are cropped website slices, NOT desired cropping. Final image is the EDIT TARGET for custom clothing theme only. Replace its wearer anatomy and face substantially with classic Lineage II / High Five racial appearance: adult female light elf; porcelain ivory skin, delicate oval face, small natural mouth, fine nose, almond-shaped softly focused eyes, straight pale blond hair with side part tucked behind BOTH long pointed ears; fine narrow shoulders, slender ribcage, long slender legs, light graceful posture. Natural understated facial features like the classic client model. No voluptuous human silhouette, heavy makeup, doll eyes, giant ears or gigantic fluffy hairstyle. Keep the existing pale cyan silk botanical gold embroidered dress and boots, color identity and embroidery motifs; refit cloth to the revised slim build, reduce bulky shoulders, do not copy official reference armor or weapons. Hand-painted elegant Korean fantasy illustration with natural classic-client face proportions, consistent with current game art. Full body neutral front-three-quarter standing, empty hands. Entire head, ears, hands, hem and both feet inside 8% safe padding. Clean alpha, no backdrop or floor, no fog, no aura outside silhouette, no text/watermark/logo/spiders/extra limbs. This is custom cosmetic art, not a named original L2 armor item.

**elf-female portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders portrait of the EXACT elf-female adult character in the input revised full-body painting. Preserve the face, natural almond eyes, fine nose and lips, pale ivory skin and straight platinum blond hair, BOTH long pointed ears and clothing collar/shoulder details exactly. Natural classic Lineage II racial face proportions; no doll eyes, no makeup, no redesign. Center face, eyes around 38 percent canvas height, whole hair and BOTH ear tips INSIDE a generous 8 percent safe margin. Shoulders fill lower corners. Transparent alpha, no backdrop/aura/haze, text, border, watermark, weapons, spiders or extra limbs. Change framing only.

**darkElf-male body**

Use case: precise-object-edit. One full-body decorative race avatar, 1024x1536 true transparent background. Images 1-3 are archival Lineage II official client artwork ANATOMY references, use head, ears, skin, build and posture only; they are cropped website slices, NOT desired cropping. Final image is the EDIT TARGET for custom clothing theme only. Replace its wearer anatomy and face substantially with classic Lineage II / High Five racial appearance: adult male dark elf; distinct cool BLUE-GRAY skin (not pink/lavender), sleek silver white straight hair, narrow stern adult face, angular cheekbones, almond eyes, thin lips, fine pointed chin, long pointed ears swept backward. Taller lean athletic torso with sinewy arms and very long legs; masculine V silhouette but not bodybuilder human bulk. Slight characteristic forward poised stance, controlled expression. No soft youthful boy face, purple anime complexion, spiky anime fringe or huge ears. Keep the existing black amethyst gold formal tailored suit with violet organic coat tails and boots, color identity and embroidery motifs; refit cloth to the revised slim build, reduce bulky shoulders, do not copy official reference armor or weapons. Hand-painted elegant Korean fantasy illustration with natural classic-client face proportions, consistent with current game art. Full body neutral front-three-quarter standing, empty hands. Entire head, ears, hands, hem and both feet inside 8% safe padding. Clean alpha, no backdrop or floor, no fog, no aura outside silhouette, no text/watermark/logo/spiders/extra limbs. This is custom cosmetic art, not a named original L2 armor item.

**darkElf-male portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders portrait of the EXACT darkElf-male adult character in the input revised full-body painting. Preserve the face, natural almond eyes, fine nose and lips, cool blue-gray skin and sleek straight silver hair, BOTH long pointed ears and clothing collar/shoulder details exactly. Natural classic Lineage II racial face proportions; no doll eyes, no makeup, no redesign. Center face, eyes around 38 percent canvas height, whole hair and BOTH ear tips INSIDE a generous 8 percent safe margin. Shoulders fill lower corners. Transparent alpha, no backdrop/aura/haze, text, border, watermark, weapons, spiders or extra limbs. Change framing only.

**darkElf-female body**

Use case: precise-object-edit. One full-body decorative race avatar, 1024x1536 true transparent background. Images 1-2 are archival Lineage II official client artwork ANATOMY references, use head, ears, skin, build and posture only; they are cropped website slices, NOT desired cropping. Final image is the EDIT TARGET for custom clothing theme only. Replace its wearer anatomy and face substantially with classic Lineage II / High Five racial appearance: adult female dark elf; distinctive cool BLUE-GRAY skin, sleek straight silver white hair, long narrow mature face, almond eyes, defined cheekbones and fine nose, thin natural lips, long pointed ears swept backward. Tall lean graceful body, narrow shoulders, long legs, subtle slightly forward classic-client poised stance. Keep mature natural proportions and expression, not a doll or pale-purple human anime girl. No heavy makeup, gigantic hair or huge ears. Keep the existing midnight navy violet star embroidered gown with layered cloth skirt and boots, color identity and embroidery motifs; refit cloth to the revised slim build, reduce bulky shoulders, do not copy official reference armor or weapons. Hand-painted elegant Korean fantasy illustration with natural classic-client face proportions, consistent with current game art. Full body neutral front-three-quarter standing, empty hands. Entire head, ears, hands, hem and both feet inside 8% safe padding. Clean alpha, no backdrop or floor, no fog, no aura outside silhouette, no text/watermark/logo/spiders/extra limbs. This is custom cosmetic art, not a named original L2 armor item.

**darkElf-female portrait**

Use case: identity-preserve. Create a square 1024x1024 head-and-shoulders portrait of the EXACT darkElf-female adult character in the input revised full-body painting. Preserve the face, natural almond eyes, fine nose and lips, cool blue-gray skin and sleek straight silver hair, BOTH long pointed ears and clothing collar/shoulder details exactly. Natural classic Lineage II racial face proportions; no doll eyes, no makeup, no redesign. Center face, eyes around 38 percent canvas height, whole hair and BOTH ear tips INSIDE a generous 8 percent safe margin. Shoulders fill lower corners. Transparent alpha, no backdrop/aura/haze, text, border, watermark, weapons, spiders or extra limbs. Change framing only.

### 17e. Kamael reference revision v2 and high ponytail
Five user supplied screenshot/illustration references copied under art-source/avatars/revisions/kamael-reference-v2/references/. Temp originals never moved. Anatomy and wing references only; custom outfit identities retained. Built-in imagegen, one call per asset/edit.

**kamael-male prompt**

Use case: precise-object-edit. One full-body ADULT male Kamael decorative avatar, 1024x1536 TRUE transparent alpha. Images 1-3 are user-provided Lineage II Kamael race anatomy references: prioritize the male character in these pairs for facial proportions, pointed ears, hair, slim athletic anatomy and natural feathered wing. Image 4 is the EDIT TARGET, retain its custom clothing palette and embroidery identity ONLY. Substantially replace its wearer anatomy. Pale cool skin, naturally small almond-shaped eyes with a stern composed gaze, narrower angular face and cheekbones, fine nose, natural thin lips, visibly pointed ears protruding from short white hair with a subtle blush-pink tint. Masculine defined jaw, compact swept side-part haircut, lean athletic torso, long slim legs, no broad human chest. Retain black navy violet gold tailored suit and organic embroidered coat tails. ONE AND ONLY ONE natural IVORY-WHITE feathered wing growing anatomically from the LEFT shoulder blade (viewer-right in frontal pose), long layered feathers with a faint pink tint matching references. Replace existing decorated black wing: no metal on feathers, chains, gemstones or gilding; do not add a second wing. No weapon or original armor copied. Neutral standing front three-quarter pose, empty hands. Hand-painted Korean royal fantasy art compatible with target, natural classic-client facial proportions, not oversized anime eyes or generic angel. Entire head, ears, hands, both feet and whole wing INSIDE 8 percent safe canvas margin. No background, floor, haze or glow outside subject, text, watermark, spiders or extra limbs. Custom cosmetic identity unchanged; refit clothes to corrected anatomy.

**kamael-male portraitPrompt**

Use case: identity-preserve. Square 1024x1024 head-and-shoulders portrait of the EXACT adult kamael-male in the input revised full-body painting. Preserve the exact angular face, pale cool skin, natural small almond eyes, stern composed expression, visibly pointed ears and compact swept short white hair with subtle pink tint, custom black navy violet gold suit collar and shoulder details. Keep only a small visible root/section of the SAME single ivory-white feather wing behind anatomical LEFT shoulder. Do not add a second wing or ornaments to feathers. Reframe only; no redesign. Whole hair, BOTH ears and face inside 8% canvas margin, eyes around 38% height, shoulders at bottom. TRUE transparent alpha. No backdrop, haze, exterior glow, text, borders, watermark, weapon, spiders or extra limbs.

**kamael-female prompt**

Use case: precise-object-edit. One full-body ADULT female Kamael decorative avatar, 1024x1536 TRUE transparent alpha. Images 1-3 are user-provided Lineage II Kamael race anatomy references: prioritize the female character in these pairs for facial proportions, pointed ears, hair, slim athletic anatomy and natural feathered wing. Image 4 is the EDIT TARGET, retain its custom clothing palette and embroidery identity ONLY. Substantially replace its wearer anatomy. Pale cool skin, naturally small almond-shaped eyes with a stern composed gaze, narrower angular face and cheekbones, fine nose, natural thin lips, visibly pointed ears protruding from short white hair with a subtle blush-pink tint. Mature delicate yet sharp face, compact short side-part bob, narrow shoulders, lean athletic slender torso and long legs. Retain crimson amber gold ceremonial dress, lighter more fitted cloth and boots; reduce enormous skirt/hair volume to make racial build visible. ONE AND ONLY ONE natural IVORY-WHITE feathered wing growing anatomically from the LEFT shoulder blade (viewer-right in frontal pose), long layered feathers with a faint pink tint matching references. Replace existing decorated white wing: no metal on feathers, chains, gemstones or gilding; do not add a second wing. No weapon or original armor copied. Neutral standing front three-quarter pose, empty hands. Hand-painted Korean royal fantasy art compatible with target, natural classic-client facial proportions, not oversized anime eyes or generic angel. Entire head, ears, hands, both feet and whole wing INSIDE 8 percent safe canvas margin. No background, floor, haze or glow outside subject, text, watermark, spiders or extra limbs. Custom cosmetic identity unchanged; refit clothes to corrected anatomy.

**kamael-female hairEditPrompt**

Use case: precise-object-edit. Image 1 is the EDIT TARGET revised adult female Kamael full-body painting. Images 2 and 3 are HAIRSTYLE REFERENCES ONLY: use the female Kamael hair, not male hair or clothing. Change ONLY the hairstyle: replace the short bob by a HIGH PONYTAIL gathered at the crown, white with subtle pale pink tint, sleek swept-back sides, a substantial visible ponytail falling behind head to upper back, and the distinctive diagonal side-swept fringe over part of the forehead shown in refs. Small simple hair tie, not a bun, not loose curls, not low ponytail. Keep face, pointed ears, eyes, lean adult body, red-gold dress, pose, boots and SAME SINGLE ivory-white feathered wing rooted at anatomical LEFT shoulder EXACTLY unchanged. Entire ponytail and all original silhouette inside canvas with safe padding. 1024x1536 true transparent alpha. No background or haze, text, watermark, spiders or additional wing.

**kamael-female portraitPrompt**

Use case: identity-preserve. Square 1024x1024 head-and-shoulders portrait of the EXACT adult kamael-female in the input revised full-body painting. Preserve the exact angular face, pale cool skin, natural small almond eyes, stern composed expression, visibly pointed ears and compact HIGH ponytail gathered at the crown, white with faint pink tint and diagonal side-swept fringe white hair with subtle pink tint, custom crimson amber gold dress collar and shoulder details. Keep only a small visible root/section of the SAME single ivory-white feather wing behind anatomical LEFT shoulder. Do not add a second wing or ornaments to feathers. Reframe only; no redesign. Whole hair, BOTH ears and face inside 8% canvas margin, eyes around 38% height, shoulders at bottom. TRUE transparent alpha. No backdrop, haze, exterior glow, text, borders, watermark, weapon, spiders or extra limbs.


## 17g. Continuing Desktop reference costumes — 13–14 October 2026

Two additional custom themes generated with built-in imagegen from the user's `C:/Users/kubai/Desktop/images` references: **Иней звёздного двора** (`starfrost-court`, male) and **Опаловый прилив** (`opal-tide`, female). Each covers all six races of its gender. Stable clothing copies are in `art-source/avatars/collections/next-references`; source files on Desktop are untouched. Exact prompts, references, output paths and revision history are in the corresponding twelve entries of `art-source/avatars/collections/jobs.json`.

On 14 October the user allowed hairstyles, hair colours and poses to suit each skin. Opal human and dwarf revisions apply this preference; their preceding sources remain preserved. Racial anatomy, dwarf proportions and exactly one natural Kamael wing stay recognizable. Future generation guidance: `art-source/avatars/collections/GENERATION.md`.

The expanded catalogue has 60 full-body variants across ten themes and 180 responsive WebP files. Alpha reviewed on navy and ivory; catalogue delivery details and browser verification are recorded under `art-source/avatars/collections/`.

## 17f. Every decorative costume on all six races

User-confirmed matrix: each female costume on female human/elf/darkElf/orc/dwarf/kamael; each male costume on male members of the same six races. Eight custom themes, 48 full-body variants. Preserve the reviewed wearer identity and refit the same clothing theme to race anatomy. Use the built-in imagegen tool, one call per missing variant, true transparent alpha. Reuse existing matching paintings rather than generate duplicates.

Themes: Veil of Constellations, Azure Benediction, Crimson Dawn (female); Violet Courtier, Amethyst Envoy, Gilded Dragon Mantle, Malachite Warden, Dawn Emissary (male).

The complete exact prompt set, per-variant source paths, clothing-reference and wearer-reference paths are in `art-source/avatars/collections/jobs.json`. Dwarf female azure and constellation variants use closed high-neck, short opaque dresses without slits; their accepted one-reference prompts replace the general template and are also recorded in `dwarf-azure-review.md` and `dwarf-veil-review.md`. Keep slim short dwarf proportions, classic L2 elf/dark-elf features, and exactly one natural ivory-white Kamael wing. Female Kamael keeps her requested high white/pink ponytail with side-swept fringe. Never include spiders, embedded text, weapons or external background glow.

Delivery: 48 reviewed paintings (18 reused, 30 generated), 144 mobile WebP files at 256/512/1024 in `webapp/art/avatars/collections/v1/`; allowlisted catalogue `webapp/art/avatar-costume-art.js`. Exact delivery checks and bytes in `art-source/avatars/collections/delivery.json`; previews and browser checks in the same folder. Existing game racial defaults remain unchanged; the full-body catalogue does not add a wardrobe selector or gameplay mechanics.

## 17h. Вельвет сумеречного бала — 14 October 2026

Built-in imagegen continuation from the user's Desktop reference `codex-clipboard-f41a06af-158c-42dd-9b07-d2ff56ee58b5.png`: ivory-white formal coat/trousers, plum waistcoat and ruffled cravat, gold buttons/cuffs, blackberry velvet cape with scalloped edges and lavender lining. Stable reference copy: `art-source/avatars/collections/next-references/dusk-velvet.png`. Desktop original unchanged.

Six male racial variants (`dusk-velvet-ball-*`) use skin-specific hairstyles and poses as authorized by the user. Preserve classic racial face/skin/build, short dwarf anatomy and exactly one natural Kamael wing. Dwarf initial long-legged attempt was superseded by an anatomy edit; previous source retained as `dusk-velvet-ball-dwarf-male-v1.png`. Exact initial/edit prompts, references, paths and revision history: `art-source/avatars/collections/jobs.json`. Alpha composites on navy/ivory: `dusk-velvet-ball-review.jpg` in the same folder.

Delivery now has eleven themes, 66 variants and 198 WebP files across 256/512/1024 widths. Seven catalogue/race/avatar tests passed; all 66 images decoded on 320/390/1100 px with reduced motion, no horizontal overflow or failed requests. Default character appearances and gameplay remain unchanged.

## 17i. Звёздный картограф and authorized accessories — 14 October 2026

User authorized appropriate hats, spectacles and hand-held objects to support costume themes. Generated six female racial variants with built-in imagegen from `C:/Users/kubai/Desktop/images/codex-clipboard-be428654-55e2-4ed9-8674-0c0685b7e9fa.png`. Stable copy: `art-source/avatars/collections/next-references/celestial-cartographer.png`; original untouched. Follow the right-hand midnight-blue/silver hooded celestial outfit with geometric embroidery and matching boots; adapt an opaque knee-length tunic-dress, with short closed dwarf tailoring.

Accessories: human book and oval spectacles; elf celestial staff and crescent hairpin; dark elf silver astrolabe; orc armillary globe and bangles; dwarf book, round spectacles and scholar hat; Kamael antique telescope. They are decorative painting details, not inventory or gameplay changes. Preserve recognizable racial features, faces, dwarf proportions and exactly one natural Kamael wing; allow skin-specific hair and poses.

Exact prompts, original and wearer reference paths, accessory descriptions and built-in output paths: six `celestial-cartographer-*` entries in `art-source/avatars/collections/jobs.json`. Accepted PNGs and navy/ivory review sheet are in the same folder. Delivery now has twelve themes, 72 variants and 216 mobile WebP files. Seven tests passed; all 72 paintings decoded at 320/390/1100 px, no overflow or failed requests, reduced motion enabled. New 512px files are 75–100 KB.
