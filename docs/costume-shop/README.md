# Costumes: shop, inventory and temporary prizes

All 61 reviewed custom themes are available under Shop → Костюмы for 50–125 CoL.
`template/costumeCatalog.js` is the server price and gender allowlist. The nine new
themes have 54 individually painted racial variants and nine shared shop icons.

Purchases create separate version-2 equipment items with unique `uid`,
`mainType: costume`, `slots: [costume]`, no combat stats and no expiration. They
occupy ordinary bag slots. There is no separate collection or unlock ledger.
Duplicate purchases create duplicate physical items, suitable for gifting or sale.
Buying never equips automatically.

The normal equipment action validates the definition's gender on the server in
both directions. Inventory disables incompatible items; direct requests are also
rejected. Gender changes unequip an incompatible costume and leave it in the bag.
The current race selects the corresponding painting. Other equipment remains worn.

The ten prize designs are Meadow Flutter, Chrome District, Obsidian Gloss, Neon
Afterglow, Moonveil Phantom, Brass Meridian, Off-Duty Avenue, Midnight Formal,
Last Bell Reaper and Hollow Lantern Rider. Chests and the Daily Bonus wheel each
have a 5% costume chance. Each draw uses the five designs matching the character's
gender. Duration is a uniformly selected integer from one through seven days,
starting when the server grants the reward. Each prize is a separate item; repeat
wins never extend an existing item's clock. A full bag preserves the attempt.

Only permanent costumes can be traded, mailed or auctioned while unequipped.
All temporary and shadow equipment is character-bound, including costume prizes:
`bound: true`, `noTrade: true`, `tradeable: false`. Server guards also reject old
timed/shadow copies with missing or incorrect binding flags. Existing temporary
auction lots cannot be bought and can be taken back by their sellers. Old player
mail cannot deliver a temporary attachment or charge COD; deleting or expiring
the letter returns its attachments only to the original sender. The standard
timed-item cleanup removes an expired costume and its slot.
Open character/inventory screens also return to the base appearance on expiration.

Shop selection, inventory item details, daily prizes and chest prizes show the full
racial costume preview. Shared controls, item grids and popup behavior are reused.
Only two visible previews animate, with a maximum 384px rendering buffer and 20fps;
hidden/closed views stop. Reduced motion, low-power devices and renderer failures
retain the static image and working actions. The wheel uses seven light SVG sectors
with exact probabilities and original material icons, including a distinct costume
sector. Closing or hiding the page stops its finite spin.

Validation: `test/costume-items.test.js` covers all 61 prices, both gender guards,
physical purchases, capacity, equipment replacement, expiration, auction and regular
/ COD mail. `test/daily-ui.test.js` verifies exact sector proportions.
`scripts/ui/check-costume-shop.mjs` checks 320/390/1100 widths, images, purchase,
wearing, preview dialogs, focus, disabled buying and reduced motion. Screenshots are
saved beside this file. The existing costume motion, gallery, cape and equipment
checks also pass.

Art was generated using the built-in imagegen tool. Full prompts, original inputs,
accepted sources and revisions: `art-source/avatars/collections/jobs.json`;
icon prompts and outputs: `art-source/avatars/shop-icons/jobs.json`. User corrections
are applied to all six Pumpkin Rider and Phantom paintings: an actual pumpkin head
on the shoulders, and torn luminous spectral clothes with a visible mature face.
