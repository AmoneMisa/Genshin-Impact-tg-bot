# Current delivery: racial decorative outfits

13 October 2026 user correction implemented: six races × male/female = twelve reviewed full-body outfit mappings. Ten new paintings created with built-in imagegen one call per asset; existing human male/female paintings reused. Class-based custom defaults are superseded. Original class outfit masters retained, not deleted or repurposed as L2 item icons.

Server race in miniapp/state.js follows raceOf(classIdOf(...)) from real High Five class ancestry. webapp/class-race.js mirrors actual definitions; tests check every class and server snapshot. Outfits resolve by race and gender; professions in a race share appearance. Unknown legacy class data without a race keeps existing fallback artwork rather than an invented racial identity. No gameplay, price, ownership or persistence changes. Compact portraits now also use these race/gender identities; see ../portraits/STATUS.md for the subsequent portrait delivery.

AVATAR_OUTFITS is an explicit twelve-entry allowlist with unique custom outfit IDs/names. Ten new transparent masters under races/*.png, exact prompts/references/outputs in jobs.json and PROMPTS.md. Navy/ivory composite and 48px review in review.jpg. Pointed elf ears, dark elf lavender skin, green orc anatomy, short adult dwarf proportions and one-wing kamael anatomy reviewed. No text or spiders; both feet/hem/wing retained. Dwarves display at 72% stage height.

Thirty new padded mobile WebP files at 256/512/1024; default 512px max 114192 bytes. Build via scripts/ui/build-avatar-art.py --source art-source/avatars/races/jobs.json --reviewed art-source/avatars/races/reviewed.json --output webapp/art/avatars/races/v1. Atomic publication prevents partial files.

Validation: 20 relevant tests passed, including all real profession ancestry, twelve unique outfits, male/female mappings and existing server profile behavior. Real equipment dialog checks passed for all twelve at 320/390/1100px (36 scenarios): decode, no failed requests/overflow, slot selection/focus, open/close, reduced motion, dwarf geometry. Screenshots docs/avatar-<race>-<gender>-<width>.png. No Desktop or Temp references moved in this race adaptation; all references are stable project sources. Unrelated work preserved. No push/deploy. Automation remains paused.


13 October 2026 correction: dwarf-female replaced with a petite, lighter-framed adult silhouette at user request; matching portrait updated. Stable red-gold costume theme and auburn braids retained, bodice refitted and skirt reduced. Previous sources archived under avatars/revisions/dwarf-female-v1. Only this outfit rebuilt. Revision v2 URLs prevent old cached artwork from being reused. Exact edit prompts: revisions/dwarf-female-v2.json.

## Dwarf reference revision v3 — 2026-10-13
Both dwarf appearances corrected using the three supplied L2 anatomy screenshots. Female: petite compact body, large relative head, narrow shoulders and twin ponytails. Male: broad short torso/limbs, bald head and white beard. Custom red/gold and ivory/gold costume themes retained. Versioned full-body and portrait WebP delivery; other races preserved. Exact prompts and backups: ../revisions/dwarf-reference-v3/. Temp attachments copied, never moved.

Validation v3: 20 tests passed; 12 equipment/profile browser scenarios (both genders at 320/390/1100 px), reduced motion, decoded art URLs, selection/focus, gender switch and cooldown, open/close, no horizontal overflow. All mobile asset budgets passed. Local changes; not pushed.

## Elf and dark elf reference revision v2 — 2026-10-13
Four body paintings and four matching portraits generated with built-in imagegen. Archived official race/client artwork used for anatomy: pale/slender light elves; taller lean blue-gray dark elves with silver hair and angular mature features. Existing custom costume identities retained. This is an artistic adaptation, not original client armor/mesh. Backups, exact prompts, reference images and preview in ../revisions/elf-reference-v2/. Mobile WebP widths unchanged; other eight race/gender identities unaffected. No Desktop references consumed or moved.

Elf v2 validation: 20 tests passed; 24 equipment/profile scenarios at 320/390/1100 px. All URLs decoded, no overflow, reduced motion and gender/focus/cooldown/open-close passed. Full body mobile 512px files 71–104 KB, portraits 128px 7–9 KB. Local integration only; not pushed.

## Kamael reference v2 — 2026-10-13
Both full bodies and portraits updated from five user references. Pointed ears, angular faces, lean build, natural single ivory/pink feather wing on anatomical left; female high ponytail and swept fringe requested subsequently. Custom costume themes retained. Prior sources preserved under ../revisions/kamael-reference-v2/. Exact prompts/outputs in accepted.json. Temp screenshots copied, never moved; no Desktop references consumed. Built-in imagegen only; mobile WebP widths unchanged.

Kamael v2 checks passed: 20 tests, 12 equipment/profile scenarios at 320/390/1100px, reduced motion, decoding, focus/close, gender/cooldown, no overflow. Mobile 512px bodies 92–95 KB; HUD 128px portraits 8–9 KB. Local only.
