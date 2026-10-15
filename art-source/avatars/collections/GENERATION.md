# Continuing costume generation

Use the user's original clothing references in `C:/Users/kubai/Desktop/images`. Copy each used reference into `next-references/`; leave Desktop originals untouched. Existing reviewed themes and racial variants are recorded in `jobs.json`. Do not regenerate an already completed theme unless revising it at the user's request.

Each male costume covers men of all six races; each female costume covers women of all six races. Preserve the recognisable clothing design and palette across racial tailoring. Give custom costumes unique names independent of original L2 items.

User preference, 14 October 2026: hairstyles, hair colours and poses may be changed to suit a skin. Wearer images guide racial anatomy and painting style; hairstyle and stance need not be identical between costumes. Preserve racial proportions, faces, ears, skin, dwarf geometry and exactly one natural Kamael wing. The previously requested high Kamael ponytail remains a useful choice for compatible looks. Refine accessories to match the new clothing palette instead of borrowing unrelated costume decorations.

User preference, 14 October 2026: suitable accessories are allowed, including hats, spectacles and objects held in hands. Add them when they support the costume; retain visible racial features and readable silhouettes. These are decorative painting details, not newly equipped items or gameplay rewards. Do not borrow original L2 item names or invent item properties for them.

Use built-in imagegen, one asset per call, transparent alpha and full silhouettes. Short closed tailoring for dwarf women. Review the actual alpha composites on navy and ivory, not just tool previews. Preserve previous source versions when editing.

Deliver reviewed PNG sources and 256/512/1024 WebP through the existing build and publishing scripts. Complete a theme's six-race matrix before registering it. Check the catalogue tests and the 320/390/1100 px browser gallery. Store exact prompts, original-reference paths, generated paths and revision history in `jobs.json`. Catalogue delivery does not change gameplay or implement wardrobe selection.


## Lightweight costume motion

User requested subtle sway and animated glow, then specifically hair movement, blinking, breathing and cloth movement on 2026-10-14. Shared renderer and visibility controller: webapp/avatar-costume-view.js and .css; internal motion: webapp/avatar-costume-rig.js, with calibrated painting coordinates in webapp/art/avatar-costume-rigs.js. Character equipment, inventory and catalogue previews use it. Only two visible views animate at once, up to 20 fps; hidden pages, closed/covered overlays, modal dialogs, reduced motion and low-power devices use static art. Canvas 2D uses continuous sampling, soft eye-local eyelid masks and the original painting's skin/lash colours. No WebGL or video assets. One throttled requestAnimationFrame loop exists only while a visible rig is active; hidden rigs release their buffers. Browser checks: motion-review.json and ../motion-review/rig-review.json, including narrow and wide layouts, touch, focus, disabled, popup/tab/close, rendering failure and cleanup. Source paintings and game mechanics remain unchanged. New costumes need their own eye-coordinate calibration before internal motion is published; see ../motion-review/README.md.


## October 15 additions and Kamael revision

Thirteen requested themes are delivered on six races each (78 new variants), with English display names. The first five continue the saved clothing-reference queue. Eight additional themes come from the user brief: pirates, hooded assassins, city clothing, swimsuits and shark/cat/raccoon/butterfly outfits. Original briefs and generation references are stored per job. These names are custom and do not claim original L2 item identity.

The user supplied two wing-cape construction screenshots and requested that design for every Kamael: a small rigid wing ornament above a narrow hanging fabric banner beside the natural white wing. The revision queue, exact edit prompts, originals, base aliases and measured animation regions are in ../kamael-capes/. All sources before revision are retained. The 50 unique published costume paintings also cover the two matching base bodies; no new shop products or prices are introduced.

Every new pose has its own reviewed arms, eyes, feet, hair and cloth coordinates in ../motion-review/additional-pose-reviews.json. Cape edits additionally use ../kamael-capes/motion.json. Rendering remains shared and lightweight, with static fallback, reduced motion and hidden-view cleanup.

## Beach additions

Coral Bay Breeze (opaque coral bikini, straw sunhat and teal/ivory inflatable ring) and High Tide Rider (navy swimming briefs, straw hat and ivory/teal surfboard) each cover six races: twelve new paintings, 36 responsive WebP files. These are original user briefs, with English custom names. Exact built-in generation/edit prompts, references and preserved revisions are recorded in jobs.json.

For this swimwear brief the female dwarf is a clearly mature adult with a petite slender frame and shorter limbs. Her revised v2 source replaces the broader initial draft; no juvenile identity reference was used. Her eyelid proportions are individually calibrated. The male Kamael v3 keeps the natural white wing at viewer right, with the small metal ornament and narrow hanging banner at viewer left beside the surfboard. Both new Kamael capes were generated within the full costume paintings.

Twelve measured pose reviews are retained in ../motion-review/beach-pose-reviews.json. Hat, ring and board bounds remain rigid; bare skin does not receive cloth-wave regions. Foreground ring bounds are explicitly excluded from the feather-wing rotation field. Hair, loose ribbons and the hanging Kamael banners have separate motion regions.
# City and Halloween delivery, 2026-10-15

Nine new English-named themes (Chrome District, Obsidian Gloss, Neon Afterglow,
Brass Meridian, Off-Duty Avenue, Midnight Formal, Last Bell Reaper, Hollow Lantern
Rider and Moonveil Phantom), each on six races: 54 built-in imagegen paintings.
Their exact prompts, input references, accepted source paths and revisions are in
jobs.json; city-halloween-theme-ids.json identifies this batch. Sources retain true
alpha and complete silhouettes. Female dwarves have petite, clearly mature adult
proportions. Masked Reapers and pumpkin heads explicitly have no visible eyelids.

The user corrections replace the Rider's head with a carved glowing pumpkin on the
shoulders, with empty hands, and the Phantom's bedsheet concept with a ragged luminous
robe and visible adult face. Corrected human masters and all ten racial derivatives
were accepted; rejected drafts remain as provenance. Every new Kamael painting has
one natural wing and a rigid wing-shaped fitting with a narrow hanging cloth banner.
All 54 poses were individually measured, including final eye calibration from open
and closed face sheets. Nine compact brown/violet icons were generated and reviewed.

Current delivery: 61 themes / 366 costume variants, plus 12 base bodies. Cosmetics
now use physical inventory items and the costume slot; shop and temporary
reward behavior are documented in docs/costume-shop/README.md.
