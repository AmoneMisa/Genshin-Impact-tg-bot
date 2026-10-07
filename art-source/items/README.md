# Painted equipment artwork

88 original transparent paintings generated with the built-in imagegen tool from the user's fantasy-art references. Approved full-resolution PNG sources are kept here; only responsive WebP files under webapp/art/items/v1 are served to players.

Used references were moved to C:/Users/kubai/Desktop/images/done on the user's request. The other references remain in C:/Users/kubai/Desktop/images.

## Generation prompt set

Common direction: one original exquisite 2D painted fantasy RPG inventory item, isolated on an actual transparent background. Entire object centered with 8% breathing room, rich anime concept-art shadows, crisp refined silhouette, intricate sculpted filigree and jewel highlights, readable at mobile thumbnail sizes. No text, signature, frame, person, mannequin, floor or scene. References guide the aesthetic; create an original silhouette.

| Source / subject prompt | Reference filename suffix |
| --- | --- |
| staff: midnight indigo shaft, silver leaf filigree, asymmetric crescent crown around luminous lavender crystal, hanging star gems | 85414294-622f-4057-b039-00c471df3724 |
| mantle: flowing midnight navy mage longcoat, curved embroidered gold lapels, soft asymmetric fabric tails, sapphire clasp; coat only | 2cf08c23-ceb4-4f2c-8887-187d411cb351 |
| sword: tapered pale blue moon-crystal blade, silver crescent guard, violet gem, indigo grip; blade upright | 06c37b5e-dd2f-46d6-9270-41de7edd5861 |
| dagger: curved obsidian-blue assassin blade, crystalline edge, crescent silver guard and amethyst pommel | 06c37b5e-dd2f-46d6-9270-41de7edd5861 |
| greatsword: broad two-handed sapphire blade, engraved silver spine, double wing guard and long wrapped grip | 06c37b5e-dd2f-46d6-9270-41de7edd5861 |
| bow: sweeping feather-carved silver limbs, sapphire fittings, vine filigree and taut visible bowstring | 0063ff43-4534-4b04-96f6-7fba111905ec |
| crossbow: feather-carved silver limbs, polished indigo wood stock, bowstring and sapphire fittings; three-quarter view | 0063ff43-4534-4b04-96f6-7fba111905ec |
| ring: silver band in three-quarter view, deep violet gem in a leaf-carved setting | 3c4368b4-6f78-4521-8915-84fc81d1fd76 |
| armor: white-silver curved cuirass plates and pauldrons, navy underlayer, sapphire breastplate; torso only | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| hammer: two sculpted silver striking faces, blue crystal core, gold collars, long leather grip | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| shield: navy enamel kite shield, silver dragon-wing relief, sapphire center and thin golden vine border | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| helmet: closed silver knight helmet, wing crests, sapphire visor and etched brows; three-quarter view | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| gloves: matching navy gloves with articulated fingers, embroidered cuffs and sapphire clasps | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| bracers: matching tapered silver/navy forearm guards, inset flowing vine filigree and blue gems | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| gauntlets: matching silver combat gauntlets, articulated knuckle plates, layered cuffs and sapphire insets | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| greaves: matching silver leg guards, sculpted knees, layered shin plates and golden vines | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| leg-wraps: navy mage trousers, gold constellations, layered hip cloth and soft folds; no boots or torso | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| boots: tall navy armored boots, silver sabatons and shin guards, blue gems | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| anklets: navy mage ankle boots, gold vine embroidery, sapphire clasps and star chains | 3f3df862-5a2a-406c-a3af-27380f5a9daf |
| amulet: oval silver necklace chain, large blue moonstone pendant, small stars and leaf carving | 3c4368b4-6f78-4521-8915-84fc81d1fd76 |
| earring: matching celestial silver earrings, asymmetric moon/star motifs, blue-violet crystal drops and chains | 3c4368b4-6f78-4521-8915-84fc81d1fd76 |
| tiara: silver openwork moon tiara, five sapphire peaks and opal droplets; no head | 3c4368b4-6f78-4521-8915-84fc81d1fd76 |
| sigil: sapphire crystal in a crescent and interlocking gold astrolabe rings; compact handheld mage focus | 85414294-622f-4057-b039-00c471df3724 |
| relic: faceted lavender-blue crystal in a silver lotus mount, gold star points and small floating fragments | 85414294-622f-4057-b039-00c471df3724 |
| cloak: navy velvet with softly curved layered fabric, silver constellation edging, golden sapphire clasp and chains | 2cf08c23-ceb4-4f2c-8887-187d411cb351 |

All reference filenames have the prefix codex-clipboard- and extension .png.

## Build and validate

With Python and Pillow installed: npm run items:build. Validate with npm run items:check. The builder trims transparent margins and packs art into portrait canvases at widths 128, 256 and 512. File budgets are 18 KB, 45 KB and 130 KB respectively. The builder starts at quality 82 and, when necessary, lowers compression quality as far as 70 while preserving dimensions and transparency. All 264 WebP files stay within the per-size budgets.

Inventory uses lazy-loaded 128/256 images; reveals can use 512. Image dimensions reserve layout space. Reveal float/glow uses transform and opacity, runs only while visible, pauses when the app is hidden and respects reduced motion. Thumbnails and forged-card effects remain static. Missing images show a neutral placeholder.

Versioned artwork gets an immutable browser cache. When replacing an approved painting, use a new version directory and update the URL mapping before deployment. Do not overwrite a version already deployed.

Optional browser check: node scripts/items/browser-check.js with Playwright installed. PLAYWRIGHT_MODULE and ITEM_ART_BROWSER can select existing installations.

## Grade variants

The sixty-three additional paintings are selected by item grade, including lowercase grades from existing UI data. Only the selected image downloads; there is no variant preloading. Two-handed swords keep the greatsword art, and heavy armor keeps its own silhouette. Forge level changes never select a different painting. Every equipment-template type now has a variant for B, A, S, SS and SSS grades.

| Artwork | Grades |
| --- | --- |
| staff-sun | SS, SSS staff |
| sword-prismatic | SS, SSS one-handed sword |
| ring-filigree | B, A, S ring |
| ring-winged | SS, SSS ring |
| bow-rose | SS, SSS bow |
| mantle-royal | SS, SSS robe torso |
| armor-prismatic | SS, SSS heavy/medium armor |
| gauntlets-raven | SS, SSS gauntlets |
| boots-raven | SS, SSS heavy/medium boots |
| tiara-night | SS, SSS tiara |
| earring-sun | SS, SSS earrings |
| amulet-butterfly | SS, SSS amulet |
| helmet-obsidian | SS, SSS heavy/medium helmet |
| greaves-obsidian | SS, SSS heavy/medium greaves |
| shield-dragon | SS, SSS shield |
| hammer-dragon | SS, SSS hammer |
| cloak-starfield | SS, SSS cloak |
| sigil-nebula | SS, SSS mage sigil |
| dagger-shadow | SS, SSS dagger |
| crossbow-shadow | SS, SSS crossbow |
| greatsword-solar | SS, SSS two-handed sword |
| bracers-crystal | SS, SSS robe gloves |
| anklets-crystal | SS, SSS robe boots |
| leg-wraps-tidal | SS, SSS robe greaves |
| gloves-alchemist | SS, SSS heavy/medium gloves |
| relic-eclipse | SS, SSS relic |
| sword-opal | B, A, S one-handed sword |
| armor-opal | B, A, S heavy armor |
| bow-verdant | B, A, S bow |
| mantle-astral | B, A, S robe torso |
| staff-jade | B, A, S staff |
| shield-seraph | B, A, S shield |
| helmet-seraph | B, A, S heavy helmet |
| amulet-ruby | B, A, S amulet |
| earring-ruby | B, A, S earrings |
| tiara-crescent | B, A, S tiara |
| gauntlets-dusk | B, A, S gauntlets |
| greaves-dusk | B, A, S heavy greaves |
| boots-dusk | B, A, S heavy boots |
| cloak-dusk | B, A, S cloak |
| dagger-tide | B, A, S dagger |
| hammer-opal | B, A, S hammer |
| greatsword-dawn | B, A, S two-handed sword |
| sigil-dawn | B, A, S mage sigil |
| crossbow-spectral | B, A, S crossbow |
| relic-spectral | B, A, S relic |
| bracers-ruby | B, A, S robe gloves |
| anklets-ruby | B, A, S robe boots |
| gloves-sapphire | B, A, S gloves except robes |
| leg-wraps-pearl | B, A, S robe greaves |
| helmet-shadowleather | B, A, S light helmet |
| armor-shadowleather | B, A, S light torso armor |
| greaves-shadowleather | B, A, S light greaves |
| boots-shadowleather | B, A, S light boots |
| helmet-sapphireguard | B, A, S medium helmet |
| armor-sapphireguard | B, A, S medium torso armor |
| greaves-sapphireguard | B, A, S medium greaves |
| boots-sapphireguard | B, A, S medium boots |
| helmet-nightweave | SS, SSS light helmet |
| armor-nightweave | SS, SSS light torso armor |
| gloves-nightweave | SS, SSS light gloves |
| greaves-nightweave | SS, SSS light greaves |
| boots-nightweave | SS, SSS light boots |

Exact prompts and reference paths: [grade-variants.md](grade-variants.md). There are now 42 used references in the done folder.

Build only new sources with: python scripts/items/build-art.py --only staff-sun sword-prismatic ring-filigree ring-winged bow-rose mantle-royal.
