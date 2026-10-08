# Individual equipment paintings

Authorized goal: replace shared equipment paintings with individual named-item art.
Initial catalogue: 224 items, 81 used paintings, 143 additional paintings required.
Retain one named item for each existing painting, including eight epic jewellery
pieces. Exact jobs and item identities: catalog-art-jobs.json. Built-in imagegen,
one call per new painting. No grade recolours masquerading as new designs.

Sources: art-source/items/catalog. Reviewed sources are converted through
scripts/items/build-art.py to responsive 128/256/512 WebP with existing byte budgets.
Publish only after visual review and successful conversion using
scripts/items/approve-catalog-art.mjs. Registry: webapp/art/catalog-item-art.js.
The registry matches name + grade + kind + category, which the inventory API already
returns; it does not rely on a new gameplay field or turn names into asset URLs.
Unfinished items keep their existing paintings until their replacement is reviewed.

Status: COMPLETE, 8 October 2026. All 143 additional paintings were generated with
the built-in image tool, visually reviewed, converted and published. All 224
catalogue items now select distinct paintings; zero shared assignments, missing
files or pending jobs. Exact counts: catalog-art-progress.json and catalogue audit:
catalog-art-audit.json. All 70 armour replacements and 73 weapon, shield and
jewellery replacements are integrated.

Final verification: 11 targeted tests passed; 726 allowlisted WebP files passed
format and byte-budget checks. Browser checks at 320 and 390 px passed for all
242 available paintings, with no overflow, no model requests, correct mappings,
256 px thumbnail cap, lazy loading, reduced motion and missing-image fallback.
The browser run required localhost access outside the restricted sandbox and
passed when rerun with that access. No deployment or gameplay changes were made.

Reference folder: C:/Users/kubai/Desktop/images, confirmed again during this task.
Three actually used references were moved into its done folder: d478cfd3 (metal
armour), e622ccf9 (leather/rogue design), 7ca97a69 (woven coat/robe). Stable copies
are in art-source/catalog-references. The four weapon references (bow, blades,
celestial staffs and water blade) were also used and moved into done on 8 October.
Each generated
asset has a .generation.json recording its exact prompt and reference provenance.
The first five accepted paintings predate the folder clarification and have no
direct image reference; their records explicitly list an empty reference array.

Rejected first gaiter draft (looked like boots) is isolated in the source rejected
subfolder and never converted or published. Corrected gaiters include upper legs
and the waist with no feet. Mobile browser checks passed at 320/390 px with
reduced motion, lazy thumbnails capped at 256 px, no overflow and no 3D requests.
Run scripts/items/audit-catalog-art.mjs for current counts and exact pending IDs.

Review also rejected the initial Majestic Sigil because it looked like a physical
shield, and the initial small Nightmare shield because it lacked a distinct
compact silhouette. Neither was converted or published. Updated prompts specify
an arcane focus for sigils and a compact round buckler for small shields; sigil
jobs also reference the existing approved sigil painting as a category example.

The first Dragon Grinder draft looked like gauntlets and was rejected before
conversion. Claw weapon prompts now reference approved knuckle weapons and
explicitly require open finger holes and exposed blades, with no glove fingers.
