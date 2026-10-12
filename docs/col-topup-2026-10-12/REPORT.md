# CoL top-up and adena shop product

The former exchange window now contains only Telegram Stars top-up packs. Removed the gold/crystal altar, crystal purchase form, crystal shield descriptions and donation-store button. The shared game popup owns the close button. Payment quantities, prices and first-purchase bonuses are unchanged.

Six distinct transparent raster illustrations are generated with the built-in image_gen tool and exported as 128px and 256px WebP files. The complete responsive set is 181,058 bytes. Original images and exact prompts: `art-source/col-topup/README.md`. No SVG or emoji icons are introduced.

The ordinary shop now sells “15 000 адены” for 1 CoL in “Адена за CoL”. The price is defined in `template/adenaOffer.js`. It follows the existing base value: 10 CoL buys 100 crystals, with the old gold/crystal price at 1,500 adena each. The item has no bundle bonus or cooldown. Repeated purchases spend CoL and credit adena through the existing shop save path. Insufficient CoL and unsafe balances do not mutate inventory; crystals are unaffected.

The shared store card now constrains nested item art to its 40px column, preventing the icon from covering the item title.

Validation: `test/col-topup-shop.test.js` covers currency affordability, repeated purchases, insufficient funds, overflow protection, unchanged crystals, escaped labels and unique raster art under 250 KB. `scripts/ui/check-col-topup.mjs` verifies 320px/390px layouts, image decoding, invoice cancellation, a right-side shared close button, navigation from the shop, purchase submission, updated balances and absence of browser errors or horizontal overflow.

Screenshots: `topup-320.png`, `topup-390.png`, `adena-320.png`, `adena-390.png`.

Final validation: all 1,014 tests passed; browser checks passed at both mobile widths.
