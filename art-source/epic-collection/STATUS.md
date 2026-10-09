# Epic weapon and potion collection

14 epic weapon definitions cover 8 existing weapon kinds. Their stats, slots and class rules match the S84 catalogue. Epic raids have a separate 10% weapon roll among eligible level-84 contributors, weighted by damage. Unpainted weapons use existing type artwork until their own paintings pass review.

7 of 14 weapon paintings reviewed and published at 128/256/512 WebP. Masters and exact prompts: art-source/items/epic-collection. Contact sheet: docs/epic-collection-review-1.webp. All published images passed dark/light, 48/96px and transparency review; browser gallery passed at 320/390px without overflow or model requests, including reduced-motion checks.

7 Lineage II buff concepts implemented: Might, Shield, Haste, Focus, Death Whisper, Guidance, Wind Walk. Duration 20 minutes; the same potion refreshes its timer; different effects coexist. Numeric bonuses are adapted to this game's combat scale, not claimed as exact Lineage II patch values. Values are resolved server-side from template/buffPotions.js. Purchases, consumption, expiry, combat modifiers and active-effect UI are implemented. Mongo potion/shop seed versions bumped to 2. Potion images are pending and use the existing flask fallback.

Official source for buff concepts and 20-minute duration: https://www.lineage2.com/en-us/news/azure-treasure-chests

Generation stopped immediately at the first quota response, on epic-weapon-solar-bow. Reset: 9 October 2026 10:29:37 Moscow. Existing heartbeat reactivated for 10:35 Moscow. Remaining: 7 weapon paintings, then 13 potion paintings (6 HP/MP + 7 buffs). Do not retry until quota resets. Read jobs.json and progress.json; skip published assets, use the built-in image tool, one asset per call. Stable reference copies remain in references. Only the 5 references actually used for these 7 paintings were moved from Desktop/images to Desktop/images/done. No temporary attachments moved.

After every batch review and mobile conversion, publish only accepted keys in webapp/art/special-item-art.js. Update progress, archive only newly consumed original references, and continue weapons/potions before avatars. Do not overwrite jobs.json by rerunning the plan. Do not regenerate the already completed 224-item catalogue or world artwork. Optional shop illustrations remain outside scope.

9 October heartbeat: allowance restored. All 14 epic weapon paintings reviewed and published at 128/256/512 WebP. Trident double-design draft rejected and replaced with one staff; rejected original retained separately. Potion generation now in progress. Read progress.json for current pending keys.

9 October: all 27 Epic collection paintings (14 weapons + 13 potions) reviewed, converted and published. Shop and inventory use actual potion paintings, with lazy decoding, responsive 128/256 sizes and reduced-motion drinking. Exact prompts are saved beside masters. Next scope: art-source/hunt-ui/jobs.json.
