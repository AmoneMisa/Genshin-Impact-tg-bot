# Расовые портреты

13 October 2026. Twelve reviewed head-and-shoulders portraits derived from the corresponding approved full-body race/gender paintings using built-in imagegen, one call per asset. No new Desktop reference files consumed. No spiders. No quota response in this batch.

Sources: this folder's twelve PNG files. Exact identity-preserve prompts and input roles: PROMPTS.md and jobs.json. reviewed.json is the delivery allowlist. The navy/ivory contact sheet review.jpg includes 48px thumbnails. Hair, faces, racial skin/ears, beard and costume details checked against the existing full-body masters; transparent alpha checked. Shoulders intentionally run to the bottom/lateral portrait edges.

Delivery: webapp/art/avatars/portraits/v1, 128/256/512px WebP. scripts/ui/build-avatar-portraits.py only resizes and encodes reviewed sources; framing was produced by the built-in image tool. Maximum budget 160 bytes per output pixel of width. HUD uses 128px, ordinary cards 256px, the large profile hero 512px.

Integration: menu-art.js central race/gender resolver serves HUD, character identity, profile and class/gender previews, arena, friends, table seats, transfers, profession quests and theft targets. Boss-stage and raid HUD reuse the same resolver. Unknown legacy class data retains the existing fallback. Gender now included in profession and theft DTOs. Skill animations still resolve by profession; appearance never changes stats, prices, equipment, ownership or server cooldowns.

Validation is recorded in progress.json. Browser screenshots: docs/avatar-portraits/. Tested actual profile opening/closing, gender switches, class cooldown disabled state, keyboard focus, decoded URLs, no horizontal overflow and reduced motion at 320/390/1100px. Equipment view uses the existing full-body paintings.


13 October 2026 correction: dwarf-female updated to match the lighter-framed adult body; v2 URLs bypass the previous cached portrait. Previous sources preserved in avatars/revisions/dwarf-female-v1. Exact prompts: revisions/dwarf-female-v2.json.

## Dwarf reference revision v3 — 2026-10-13
Both dwarf appearances corrected using the three supplied L2 anatomy screenshots. Female: petite compact body, large relative head, narrow shoulders and twin ponytails. Male: broad short torso/limbs, bald head and white beard. Custom red/gold and ivory/gold costume themes retained. Versioned full-body and portrait WebP delivery; other races preserved. Exact prompts and backups: ../revisions/dwarf-reference-v3/. Temp attachments copied, never moved.

Validation v3: 20 tests passed; 12 equipment/profile browser scenarios (both genders at 320/390/1100 px), reduced motion, decoded art URLs, selection/focus, gender switch and cooldown, open/close, no horizontal overflow. All mobile asset budgets passed. Local changes; not pushed.

## Elf and dark elf reference revision v2 — 2026-10-13
Four body paintings and four matching portraits generated with built-in imagegen. Archived official race/client artwork used for anatomy: pale/slender light elves; taller lean blue-gray dark elves with silver hair and angular mature features. Existing custom costume identities retained. This is an artistic adaptation, not original client armor/mesh. Backups, exact prompts, reference images and preview in ../revisions/elf-reference-v2/. Mobile WebP widths unchanged; other eight race/gender identities unaffected. No Desktop references consumed or moved.

Elf v2 validation: 20 tests passed; 24 equipment/profile scenarios at 320/390/1100 px. All URLs decoded, no overflow, reduced motion and gender/focus/cooldown/open-close passed. Full body mobile 512px files 71–104 KB, portraits 128px 7–9 KB. Local integration only; not pushed.

## Kamael reference v2 — 2026-10-13
Both full bodies and portraits updated from five user references. Pointed ears, angular faces, lean build, natural single ivory/pink feather wing on anatomical left; female high ponytail and swept fringe requested subsequently. Custom costume themes retained. Prior sources preserved under ../revisions/kamael-reference-v2/. Exact prompts/outputs in accepted.json. Temp screenshots copied, never moved; no Desktop references consumed. Built-in imagegen only; mobile WebP widths unchanged.

Kamael v2 checks passed: 20 tests, 12 equipment/profile scenarios at 320/390/1100px, reduced motion, decoding, focus/close, gender/cooldown, no overflow. Mobile 512px bodies 92–95 KB; HUD 128px portraits 8–9 KB. Local only.
