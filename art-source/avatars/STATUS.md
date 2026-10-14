# Current scope: race/gender outfits

The latest user correction supersedes the historical class-based integration below. Twelve race/gender outfits are delivered. See races/STATUS.md and races/progress.json for the active mapping, verification and remaining legacy portrait limitation.

# Reference-derived avatars

13 October 2026: five accepted full-body paintings integrated locally: mage-female and priest-female dresses, rogue-male and mage-male suits, berserk-male dragon costume. Recovered four interrupted 12 October outputs; generated only the missing fifth via built-in imagegen. Exact prompts and generation paths: jobs.json and PROMPTS.md. Stable reference copies under references/. No spiders, text, weapons, or environment; clean alpha reviewed on navy and ivory at 48/96px. Conversion adds silhouette padding.

Client-only cosmetic class illustrations through webapp/art/avatar-art.js and fullBodyHeroUrl. Advanced rogue/berserk classes now use their own silhouettes rather than borrowed archer/warrior full-body art. Other family/gender combinations retain reviewed world paintings; compact HUD portraits unchanged. Equipment slots, stats and gameplay stay server-driven. This is a class outfit illustration, not dynamic rendering of equipped armor.

Mobile delivery: 256/512px WebP; default 512px (max 122390 bytes). 1024px retained as optional larger sibling, not requested by the current mobile UI. Build: scripts/ui/build-avatar-art.py. Reviewed keys: reviewed.json. All 15 files decode with alpha.

Verification: 17 relevant tests pass. Actual openCharacterPage equipment dialog passed 320/390/1100px for all five paintings: 13 slots, keyboard focus, open/close, reduced motion, no horizontal overflow or failed image requests. Equipment slot geometry remains within the doll. Review screenshots docs/avatar-<key>-<width>.png. Equipment catalogue audit: 768 WebP files, no missing art reported.

Only the five used Desktop/images original references are archived into Desktop/images/done; stable project copies retained. No Temp attachments moved. Other working-tree changes preserved. No push or deployment this run.

Authorized deferred polish complete: three menu paintings, eight characteristic/Vitality/RTA paintings, existing original L2 mappings for all 35 real skills, and these five reference-derived avatars. Existing completed Epic/hunt/world/equipment batches skipped.

## 13 October continuation: decorative outfit batch 2

Three more accepted paintings integrated: Багряный рассвет (crimson-dawn, rogue-female), Хранитель малахита (malachite-warden, warrior-male), Посланник зари (dawn-emissary, priest-male). Total eight custom class/gender full-body outfits. All eight now have unique custom names and IDs in AVATAR_OUTFITS; original L2 item names/icons untouched. Artwork source briefs remain only metadata in jobs/PROMPTS. Visible alt text describes the costume by its own name.

The current integration continues class-based outfit illustrations; no persistent wardrobe selector, ownership, pricing or stat changes added. Separate costume selection was asked as an optional preference and has not been confirmed. Further unused clothing references remain in Desktop/images. Automation remains paused; no push/deploy.

Only new three outputs built (256/512/1024), keeping completed files unchanged. Default 512px downloads: 86010 / 80934 / 70516 bytes respectively. Builder supports --keys and atomically publishes WebP files, avoiding partially written live images. Reviewed composites on navy/ivory and 48px thumbnails: review-batch2.jpg. No spiders or embedded text.

Validation: 17 relevant tests passed; actual character dialog tested for all three at 320/390/1100px, reduced motion, decoded images, 13 selectable slots within the doll, keyboard focus and close. No failed URLs or horizontal overflow. Three used original references archived under Desktop/images/done; project copies retained.
