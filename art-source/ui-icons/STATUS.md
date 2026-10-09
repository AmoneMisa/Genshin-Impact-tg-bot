# Painted interface icons

Completed and verified locally on 9 October 2026. Not deployed.

- 95 interface icon names use 58 shared reviewed paintings. 26 new utility, card-suit and navigation paintings were generated with the built-in imagegen tool, one call per asset; existing reviewed item, reward, clan and element artwork supplies the remainder.
- Exact prompts and original generation paths: jobs.json and prompts.md. Sources and aliases: catalog.json. No Desktop references were used or moved.
- Transparent responsive delivery: webapp/art/ui/v1/<painting>-128.webp and -256.webp. Rebuild with npm run ui-art:build. Related actions reuse the same cached asset; fresh outputs are skipped.
- Shared icon rendering, navigation, HUD, card suits, action buttons and legacy server emoji now use painted images. Unknown UI emoji receive a painted fallback. Editable user input is preserved.
- Back/close CSS SVG masks were replaced with WebP. Legacy SVG definitions are no longer imported by the interface icon renderer. The character paperdoll illustration remains separate from UI icons.
- Common mobile overlays have outer gutters and internal padding, safe-area limits and reduced-motion handling.
- All 685 tests passed. check-painted-icons.mjs passed at 320 and 390 px: six navigation tabs, seven real feature windows, card suits, all mapped images, no horizontal overflow. check-game-screens.mjs passed at both widths: nine chest buttons, six animated arcade games, shop purchase and currency exchange, no horizontal overflow.
- Screenshots: docs/painted-ui-games-390.png, docs/painted-ui-icons-390.png and docs/painted-ui-*-390.png. Fixtures use synthetic player state; these are local verification screenshots.
