# Costumes on all races

516 planned variants: 86 custom costume themes on six races of their own gender.
366 reviewed and delivered; 18 reused paintings and 348 generated paintings. Generation used the built-in imagegen tool, one call per missing variant. All accepted originals are in the workspace.

WebP: `webapp/art/avatars/collections/v1/`, widths 256/512/1024; allowlisted catalogue: `webapp/art/avatar-costume-art.js`. Delivery checks and byte sizes: `delivery.json`. Contact sheets: `<costumeId>-preview.jpg` here.

Prompts and source/reference paths: `jobs.json`. Dwarf azure and constellation variants use closed, short racial tailoring; their exact accepted prompts are in `dwarf-azure-review.md` and `dwarf-veil-review.md`. Rejected open-bodice azure attempts are not published.

Preserved racial anatomy: elves lean, dark elves blue-gray, dwarves compact, Kamael one natural white wing; female Kamael high ponytail. No spiders or embedded text. Costume props follow the user's accessory guidance. Temporary references untouched.

Generation continues: 150 unrelated variants remain in the saved queue. Both base Kamael bodies also receive the user-requested wing-capes. Permanent costumes are ordinary tradeable inventory items worn in the costume slot, with server gender validation. Shop prices are 50–125 CoL. Ten designs drop as 24h–7d items from chests and the daily wheel, 5% per source. Temporary and shadow costumes are character-bound and cannot be traded, auctioned or mailed. Compact portrait variants for each costume are not part of this body catalogue.

Verification records: delivery.json and browser-review.json. Browser asset-gallery checks cover 320, 390 and 1100 px, decoding, horizontal overflow and broken URLs, using reduced motion. Functional shop, inventory slot and prize preview checks are in scripts/ui/check-costume-shop.mjs; screenshots and behavior notes are in docs/costume-shop/.
