export default {
  "kind": "custom-environment-art",
  "generator": "OpenAI imagegen, built-in tool",
  "notOriginalL2ClientArt": true,
  "created": "2026-10-15",
  "desktopSize": [
    1536,
    1024
  ],
  "mobileSize": [
    768,
    512
  ],
  "groundAnchors": {
    "north": [
      768,
      150
    ],
    "east": [
      1408,
      520
    ],
    "south": [
      768,
      890
    ],
    "west": [
      128,
      520
    ]
  },
  "sharedPrompt": "Use case: stylized-concept. Asset type: production painted background for an isometric mobile fantasy RPG battlefield, complete FULL AREA, not a screenshot or UI. Landscape 1536x1024. Rich realistic hand-painted materials, believable volume, atmospheric lighting, detailed large environment like polished classic MMORPG background art. Asymmetric organic design. NO text, NO characters, NO interface, NO grid, NO floating board, NO vignette fading into black. No pictograms or simple vector geometry.\nCRITICAL CAMERA AND WALKABILITY: fixed orthographic isometric view, 30 degree elevation. The entire playable ground is a diamond with four ground anchor points at pixel (768,150) north, (1408,520) east, (768,890) south, (128,520) west in the 1536x1024 image. Continue the environment OUTSIDE this invisible diamond to ALL FOUR rectangular image edges so it looks like a crop from a larger world, never an isolated platform. The diamond is NOT outlined or explicitly visible. ALL ground inside diamond must be traversable: low surface texture, shallow mud, small loose stones, grass, roots, worn tracks. No large rocks, trees, holes, walls, stairs, deep water, columns, chasms or impassable obstacles INSIDE the diamond. Tall volumetric cliffs/trees/architecture belong only to the outermost perimeter OUTSIDE diamond, cast natural soft shadows inward. Irregular low details provide depth inside. Broad natural winding routes must connect the north/east/south/west diamond anchor points, readable branching paths across the full area; no perfectly symmetric cross or circle. Keep routes walkable and no obstacles on anchors. Lighting comes from upper left. Detail must remain legible at 700px displayed width. Do not add sharp glowing straight lines or repetitive tiles. Theme: ",
  "scenes": {
    "volcanic": {
      "theme": "Blazing Swamp, a smouldering wetland: charcoal black damp soil, rust-red scorched grass, intricate charred root textures, dark shallow reflective muddy patches, scattered orange embers, subtle fissures with dull red heat beneath crust. Meandering ash and dried-mud paths. Smoky orange light, burnt trunks and layered basalt ridges OUTSIDE playable diamond. Mostly earthy burnt wetland, not a sea of lava.",
      "source": "exec-b8c1392f-22f3-4dc5-8aea-c7d619d74c03.png",
      "desktop": "volcanic-v1.webp",
      "mobile": "volcanic-mobile-v1.webp"
    },
    "catacomb": {
      "theme": "Ancient subterranean catacomb hall: deeply textured chipped limestone flagstones, winding worn processional routes, sections of broken low mosaic and scattered grit, moss in mortar, candles and rubble along outer boundary. Massive carved stone arches and layered masonry, shadowy tomb recesses OUTSIDE playable diamond; entrance gaps aligned to all four anchor points. Warm amber torchlight grazing relief, cool shadows. No central ritual circle or symmetry.",
      "source": "exec-60d6bf1e-ed91-4ffb-8f16-5e1cd09cb9f2.png",
      "desktop": "catacomb-v1.webp",
      "mobile": "catacomb-mobile-v1.webp"
    },
    "necropolis": {
      "theme": "Ancient necropolis, cold violet-grey polished but cracked burial hall flagstones, worn asymmetrical funerary mosaics, shallow dust piles and pale mineral veins, low scattered grave fragments. Processional paths from all four anchor points winding around a damaged off-center mosaic. Massive carved tomb facades, ancient arches and green spectral braziers OUTSIDE the playable diamond only, doorway gaps at anchor points. Deep layered shadows, jade-green reflected light, richly carved stone.",
      "source": "exec-f7abdd9d-f3b2-4d42-8a23-aba1eb6e3afe.png",
      "desktop": "necropolis-v1.webp",
      "mobile": "necropolis-mobile-v1.webp"
    },
    "woodland": {
      "theme": "Old temperate woodland clearing, naturally undulating but entirely walkable mossy forest ground, intricate leaf litter, tiny ferns and knotted root textures, asymmetrical winding dirt trails connected to all four anchors. Enormous volumetric oak trunks, layered forest canopy, rocky embankments OUTSIDE playable diamond only. Dappled warm afternoon sunlight and cool forest shadows; ground slopes subtly, no stairs or obstructing roots.",
      "source": "exec-0afdc27d-4ae4-43d6-9903-cf2c9adaff32.png",
      "desktop": "woodland-v1.webp",
      "mobile": "woodland-mobile-v1.webp"
    },
    "marsh": {
      "theme": "Misty dark green swamp clearing, entirely walkable shallow marsh mud with low tufts of reeds and tiny ferns, glossy shallow puddle reflections, sunken flat timber traces along winding earthen paths to all four anchor points. No deep water within diamond. Gnarled trees, layered reed banks and foggy dead roots outside diamond only, rich organic muted greens, cool teal reflected light.",
      "source": "exec-dae99cd2-6e69-4700-810d-22b9023480dc.png",
      "desktop": "marsh-v1.webp",
      "mobile": "marsh-mobile-v1.webp"
    },
    "springs": {
      "theme": "Geothermal hot springs plateau. Entire diamond a walkable warm ochre mineral-crusted rocky ground with delicate turquoise staining, white calcite ripples and small steaming surface puddles, meandering worn paths from all four anchors. Deep luminous turquoise pools, mineral terrace ledges, dense bamboo and jagged ridges OUTSIDE diamond only. Diffused sun through faint steam, naturally asymmetric terraces, no obstructing pools on playing ground.",
      "source": "exec-d08f6f25-fb03-4198-9f0b-8222beb87f97.png",
      "desktop": "springs-v1.webp",
      "mobile": "springs-mobile-v1.webp"
    },
    "desert": {
      "theme": "Desolate ancient desert ruins. Walkable weathered ochre sandstone ground with rippled sand, pebbles, intricate wind-carved strata and tracks branching organically to all four anchors. Dramatic sculpted sandstone outcrops, leaning ruined structures and dry scrub OUTSIDE diamond only, warm raking late-afternoon sunlight and deep amber shadows, believable depth, asymmetry, no isolated platform.",
      "source": "exec-f0db0a9a-44c9-4e96-9bff-1411d2384f72.png",
      "desktop": "desert-v1.webp",
      "mobile": "desert-mobile-v1.webp"
    },
    "cavern": {
      "theme": "Deep cavern chamber, slate-grey and muted blue weathered walkable bedrock with natural cracks, low mineral ridges, tiny gravel and shallow reflective damp areas. Broad irregular worn paths connecting all four anchors. Massive layered jagged cave walls, clusters of stalactites, stone shelves and faint mineral glow OUTSIDE playable diamond only. Cool reflected light, warm faint glow from one distant opening, realistic rough stone volume.",
      "source": "exec-3cceb12f-b8cd-4a78-b5f5-190e354e3ca3.png",
      "desktop": "cavern-v1.webp",
      "mobile": "cavern-mobile-v1.webp"
    },
    "ship": {
      "theme": "Full pirate ship deck area seen isometrically, continuous walkable weathered wooden deck filling diamond, long uneven oak planks, salt stains, worn grain, flat iron plates and tiny scattered rope scraps. Clear asymmetrical worn paths leading through each anchor. Raised ship bulwarks, rope rigging, cabin walls, railings and distant sea ONLY OUTSIDE playable diamond; clear passages at each anchor. Warm low sunlight, deep wooden relief and convincing naval construction. No tall deck objects inside diamond.",
      "source": "exec-ee14c35a-8a91-48ed-b542-fa484c7e2673.png",
      "desktop": "ship-v1.webp",
      "mobile": "ship-mobile-v1.webp"
    },
    "ice": {
      "theme": "Frozen ancient palace courtyard, entire diamond a walkable icy stone surface with subtle frost veins, patches of blue translucent ice and swept snow, irregular worn stone paths connecting all four anchors. Tall ice-encrusted architectural ruins and layered snowbanks ONLY OUTSIDE playable diamond. Cool blue moonlight, warm faint reflected light from one distant brazier, intricate realistic ice reflections, majestic volumetric framing.",
      "source": "exec-36100c24-9fe2-4048-a4a4-8ec4d41ac060.png",
      "desktop": "ice-v1.webp",
      "mobile": "ice-mobile-v1.webp"
    }
  },
  "locationStudies": {
    "hot-springs": {
      "desktop": "hot-springs-v2.webp",
      "mobile": "hot-springs-mobile-v2.webp",
      "metadata": "hot-springs-v2.source.js"
    },
    "outlaw-forest": {
      "desktop": "outlaw-forest-v2.webp",
      "mobile": "outlaw-forest-mobile-v2.webp",
      "metadata": "outlaw-forest-v2.source.js"
    },
    "blazing-swamp": {
      "desktop": "blazing-swamp-v2.webp",
      "mobile": "blazing-swamp-mobile-v2.webp",
      "metadata": "blazing-swamp-v2.source.js"
    }
  }
};
