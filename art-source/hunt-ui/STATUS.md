# Hunting and item icon delivery

39 paintings planned, none generated or published yet. First finish the 20 pending epic weapon/potion paintings. Then 10 essential neutral icons + hunt menu card; 6 element emblems + 2 champion badges; 8 grade-band zone backdrops; 12 mob archetypes. Exact prompts and paths: jobs.json. Built-in imagegen only, one call per asset; stop at first quota response. Review true alpha, complete silhouettes, no text and 22/48/96px readability. Publish only reviewed converted assets. Icons are neutral gold and tinted by code. Optional polish deferred until these batches finish: three menu cards, six characteristics, 35 skills, vitality, clan RTA. Preserve other tasks. Archive only actually used Desktop references, never Temp attachments.

Build reviewed assets with `npm run art:build -- --painted`. Add keys to reviewed.json only after visual acceptance; this mode avoids replacing the already reviewed city/building art. Publish converted icons through the existing material renderer after both WebP sizes exist.

9 October: 11 essential paintings reviewed, converted and published. Real forge, shop, hunt charges, inventory material list and clan egg counters use paintings; quality and element tinting enabled. Elements and champion badges generating next.

Six element emblems and two champion badges reviewed, converted and integrated in hunting cards/lists and forge attribute display. Feedback stays plain text. Zone banners generating next.

User correction: NO SPIDER ARTWORK. Insect archetype must be a beetle, including art used for spider-type enemies. The unpublished spider image was rejected and retained outside delivery folders. Updated exact prompt in jobs.json. Do not publish or display the rejected painting.

Eight zone banners reviewed and integrated with lazy 480/960px delivery. All 200 unique mob IDs have catalogue-based approximate archetype mappings; the server exposes mob ID only as display metadata. Portrait URLs stay disabled until their corresponding paintings pass review.

All 39 paintings reviewed and published: 77 mobile WebP outputs (1400 KB total). All 200 unique hunting mobs explicitly mapped to 12 published archetypes. Insect artwork is a beetle; the unpublished spider draft is excluded from delivery. Gameplay names and mechanics are preserved.

Validation: browser checks passed at 320/390px for 256 equipment paintings, 13 potions, 18 icons and all 20 hunting zone/portrait images, without overflow or 3D item requests. Reduced motion verified. Used Epic collection references archived in Desktop/images/done.
