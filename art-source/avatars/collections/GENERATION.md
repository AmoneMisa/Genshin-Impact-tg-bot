# Continuing costume generation

Use the user's original clothing references in `C:/Users/kubai/Desktop/images`. Copy each used reference into `next-references/`; leave Desktop originals untouched. Existing reviewed themes and racial variants are recorded in `jobs.json`. Do not regenerate an already completed theme unless revising it at the user's request.

Each male costume covers men of all six races; each female costume covers women of all six races. Preserve the recognisable clothing design and palette across racial tailoring. Give custom costumes unique names independent of original L2 items.

User preference, 14 October 2026: hairstyles, hair colours and poses may be changed to suit a skin. Wearer images guide racial anatomy and painting style; hairstyle and stance need not be identical between costumes. Preserve racial proportions, faces, ears, skin, dwarf geometry and exactly one natural Kamael wing. The previously requested high Kamael ponytail remains a useful choice for compatible looks. Refine accessories to match the new clothing palette instead of borrowing unrelated costume decorations.

User preference, 14 October 2026: suitable accessories are allowed, including hats, spectacles and objects held in hands. Add them when they support the costume; retain visible racial features and readable silhouettes. These are decorative painting details, not newly equipped items or gameplay rewards. Do not borrow original L2 item names or invent item properties for them.

Use built-in imagegen, one asset per call, transparent alpha and full silhouettes. Short closed tailoring for dwarf women. Review the actual alpha composites on navy and ivory, not just tool previews. Preserve previous source versions when editing.

Deliver reviewed PNG sources and 256/512/1024 WebP through the existing build and publishing scripts. Complete a theme's six-race matrix before registering it. Check the catalogue tests and the 320/390/1100 px browser gallery. Store exact prompts, original-reference paths, generated paths and revision history in `jobs.json`. Catalogue delivery does not change gameplay or implement wardrobe selection.


## Lightweight costume motion

User requested subtle sway and animated glow, then specifically hair movement, blinking, breathing and cloth movement on 2026-10-14. Shared renderer and visibility controller: webapp/avatar-costume-view.js and .css; internal motion: webapp/avatar-costume-rig.js, with calibrated painting coordinates in webapp/art/avatar-costume-rigs.js. Character equipment, inventory and catalogue previews use it. Only two visible views animate at once, up to 20 fps; hidden pages, closed/covered overlays, modal dialogs, reduced motion and low-power devices use static art. Canvas 2D uses continuous sampling, soft eye-local eyelid masks and the original painting's skin/lash colours. No WebGL or video assets. One throttled requestAnimationFrame loop exists only while a visible rig is active; hidden rigs release their buffers. Browser checks: motion-review.json and ../motion-review/rig-review.json, including narrow and wide layouts, touch, focus, disabled, popup/tab/close, rendering failure and cleanup. Source paintings and game mechanics remain unchanged. New costumes need their own eye-coordinate calibration before internal motion is published; see ../motion-review/README.md.
