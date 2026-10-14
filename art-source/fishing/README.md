# Painted fishing animation

The original artwork was generated with the built-in imagegen tool. `painted-frames.png` contains 24 painted keyframes for idle, casting, bite, reeling, success and failure. Each game asset is an animated WebP assembled from these drawn poses, without CSS/vector rasterization or crossfade interpolation.

Run `node scripts/ui/build-fishing-webp.mjs` with Python and Pillow available to rebuild the six animations and reduced-motion poster. The encoder uses actual panel boundaries and contains the full illustration without cutting off the character or fishing rod. Idle and waiting loop; casting, reeling and result animations play once and hold their final pose.

## Generation prompt

Use case: illustration-story.
Create a professionally painted 2D game ANIMATION CONTACT SHEET for a fantasy MMORPG fishing scene. EXACT layout: FOUR columns and SIX rows, 24 equal rectangular cells, edge-to-edge with NO gutters, NO borders, NO text. Overall canvas square; each tile has landscape 3:2 proportions. Every cell is a consecutive animation frame with exactly the same fixed camera, identical background, same scale and same character identity. Hand-painted realistic fantasy game art, rich subtle detail like classic Lineage II loading illustrations, not schematic, not vector, not flat silhouettes.
Scene in every cell: an elegant silver-haired elf adventurer wearing dark green leather fishing clothes and a short cape, full body visible on the LEFT bank of a luminous blue forest pond. Holds a slender wooden fishing rod toward the RIGHT. Mossy rocks, reeds, soft moonlight, distant forest; water ripples. Readable character and rod motion at small display sizes. Keep every part of person, rod and fish safely inside each tile.
Rows are six separate animation sequences, each with 4 consecutive keyframes progressing left to right:
ROW 1: idle loop: adventurer holding rod, subtle breathing and water ripples, relaxed.
ROW 2: casting: rod pulled back above shoulder; forward swing; line flying over pond; float lands in pond with small splash. Clearly different arm and rod poses.
ROW 3: waiting and bite loop: line in water, float bobbing; float dips; splash tugging line; fisher leans forward at bite.
ROW 4: reeling in: rod bends under tension; adventurer pulls backward with both hands; silver fish emerges splashing near bank; fish arcs out of water on taut line.
ROW 5: success: fish held by line above bank; adventurer raises shining silver fish; smiles proudly; happy relaxed pose with fish glistening.
ROW 6: failure: fish slips off hook; fish splashes back into water; adventurer looks at empty hook; mild disappointed shrug with lowered rod.
This is actual drawn animation artwork, not UI. All 24 cells must contain the same coherent painted scene with articulated body, hands, rod, line and fish changing between frames. Uniform rectangular grid boundaries at exact quarter width and sixth height. NO labels, numbers, captions, logos, UI buttons, decorative frames, SVG look, abstract geometry, flat-color symbols.
