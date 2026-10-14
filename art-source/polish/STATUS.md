# Deferred artwork polish

10 October 2026: three menu paintings completed, visually reviewed, converted and integrated locally: passives, luckShop and auction. Exact prompts and built-in output paths are in menu/jobs.json and menu/PROMPTS.md; masters in menu/*.png. No Desktop references used or moved. No spiders. No server gameplay changes. No push or deployment this run.

Default menu WebP uses 480px (45–52 KB per card); 960px files retained for larger displays. Build with bundled Python and scripts/ui/build-menu-polish.py. Only the three explicit menu IDs were added to webapp/menu-art.js.

Validation: 13 relevant menu/class tests passed. Existing browser audit passed all six tabs and seven windows at 320/390px with reduced motion, no broken requests and no horizontal overflow.

Next: six characteristic paintings, actual passive/clan/Life Stone skill icons, vitality and clan RTA; then authorized avatar references. Confirmed 13 passive IDs from functions/game/player/passiveSkills.js (weapon-mastery, magic-mastery, heavy-armor-mastery, robe-mastery, light-armor-mastery, boost-hp, boost-mana, critical-power, critical-chance, accuracy, quick-recovery, healing-power, toughness). Inspect actual clan and augment skill definitions before recording their jobs; do not invent skills or redo reviewed artwork.


11 October 2026: eight additional paintings completed and integrated locally: six characteristics (STR, DEX, CON, INT, WIT, MEN), Vitality and clan RTA rating. Exact prompts and generation paths: icons/jobs.json and icons/PROMPTS.md. Accepted keys: icons/reviewed.json. Built-in imagegen, one call per asset; no reference files used, none moved. No spiders or embedded text. True alpha, full silhouettes and small-size readability reviewed. Mobile 128/256 WebP outputs total 294320 bytes, with padding to preserve silhouettes. Rebuild: scripts/ui/build-polish-icons.py.

Client-only integration in webapp/character.js and webapp/clan.js, via allowlisted webapp/art/polish-icon-art.js. Existing stat names, values, controls and server calculations preserved. Actual character renderer passed browser checks at 320/390px (reduced motion, six displayed stat paintings, decoded images, no overflow or broken requests); screenshots docs/polish-icons-320.png and -390.png. Character/clan relevant tests: 10 passed, followed by 5 character tests after final rendering adjustment. No push/deploy.

Important recovery update: other ongoing work has already replaced skill art with original L2 paintings through webapp/art/l2-extra-art.js. All 13 real passive IDs, six clan aliases and 16 actual Life Stone skill IDs resolve to existing responsive files (35 mappings verified). Keep those definitions and artworks; do not generate competing skill replacements. Next authorized remaining scope is avatar dress/suit/monster references from Desktop/images. Inspect current avatar pipeline first, skip completed work and preserve other changes.


13 October 2026: remaining avatar reference batch completed (five paintings: two female dresses, two male suits, one male dragon costume), integrated and verified locally. See ../avatars/STATUS.md, jobs.json and progress.json. All authorized deferred polish covered; equipment audit reports no gaps. Original L2 skill paintings retained. No push/deployment.
