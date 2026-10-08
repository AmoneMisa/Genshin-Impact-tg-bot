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

