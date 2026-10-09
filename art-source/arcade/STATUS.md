# Painted arcade delivery

12 reviewed paintings: six game settings and six transparent object sprites. Optimized 480/960px backgrounds, 128/256px sprites. No spiders, text or flat vector game objects. Slots reuse reviewed painted inventory and mob symbols, preserving the server symbol sequence. Settings use an explicit allowlist; mail/help/news/admin live in Hero, trading in Shop. Exact prompts: jobs.json and docs/imagegen-prompts.md.

Verification: all 685 game tests passed. Browser checks passed at 320 and 390px for all six scenes and throw/reel animations, reduced motion, chest artwork, shop purchases and currency exchange. No horizontal overflow or SVG objects in game stages/tabs. Screenshots: docs/painted-*-390.png. Local implementation only; not deployed.
