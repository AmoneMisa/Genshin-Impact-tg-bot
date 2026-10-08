# Painted chests

Closed and open transparent PNG masters were generated with the built-in imagegen tool
from the supplied gothic treasury UI design. Exact prompts are in prompts.md.
These source images are offline only; the browser receives six compressed WebP files.

Rebuild: `python scripts/chests/build-art.py` (Pillow required).
Production: webapp/art/chests/v1, 128/256/512 square assets, alpha preserved.
Budgets: 18/45/130 kB per image. Actual total: about 151 KiB for all six files.
Grid images cap at 256 px even on high-density phones; only the selected reveal loads
512 px. Nine slots share the same cached closed painting. Open artwork loads on demand.
Versioned assets receive one-year immutable caching; increment the folder version when
changing artwork. Depleted chests reuse the closed image in grayscale.

The runtime has no Three.js, canvas or permanent frame loop. A short CSS crossfade and
gold light effect accompany rewards, with no gold effect for empty chests. Reduced-motion
users see immediate state changes. Missing images display a fallback chest symbol.
The original server-side rewards and three selections per daily attempt remain unchanged.

Visual checks: `node scripts/chests/browser-check.js` with PLAYWRIGHT_MODULE and
ITEM_ART_BROWSER when needed. Screenshots: docs/chests-mobile.webp and
docs/chests-open-mobile.webp. Checks cover 320/390 px, DPR 3, all selections, summary,
empty reward, retry, history, daily unavailability, close during a request and image errors.
