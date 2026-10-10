# Deferred artwork polish

10 October 2026: three menu paintings completed, visually reviewed, converted and integrated locally: passives, luckShop and auction. Exact prompts and built-in output paths are in menu/jobs.json and menu/PROMPTS.md; masters in menu/*.png. No Desktop references used or moved. No spiders. No server gameplay changes. No push or deployment this run.

Default menu WebP uses 480px (45–52 KB per card); 960px files retained for larger displays. Build with bundled Python and scripts/ui/build-menu-polish.py. Only the three explicit menu IDs were added to webapp/menu-art.js.

Validation: 13 relevant menu/class tests passed. Existing browser audit passed all six tabs and seven windows at 320/390px with reduced motion, no broken requests and no horizontal overflow.

Next: six characteristic paintings, actual passive/clan/Life Stone skill icons, vitality and clan RTA; then authorized avatar references. Confirmed 13 passive IDs from functions/game/player/passiveSkills.js (weapon-mastery, magic-mastery, heavy-armor-mastery, robe-mastery, light-armor-mastery, boost-hp, boost-mana, critical-power, critical-chance, accuracy, quick-recovery, healing-power, toughness). Inspect actual clan and augment skill definitions before recording their jobs; do not invent skills or redo reviewed artwork.

