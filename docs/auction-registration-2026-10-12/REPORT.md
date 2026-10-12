# Auction registration reference alignment

Replaced the large mail-style item cards and separate full-screen form with the reference layout: a compact allowed-item icon grid, selected item preview, quantity and unit-price fields, sale period, total price, seller commission and net proceeds. A side table shows the player's registered lots, their grades, quantities, total prices and remaining time, with pagination. Desktop uses two columns; mobile stacks the registration form and registered-lot table.

The reference's arbitrary seven-day duration and separate tax are not invented game rules. The form displays the actual 48-hour duration and the existing 5% commission, withheld on sale. The existing API still receives the total price (`quantity × unit price`). Client validation rejects fractional/nonpositive quantities and prices, quantities above inventory, totals above one billion adena, and listings above the active-lot cap.

The auction uses the shared `createGamePopup` shell. Requests disable controls until complete, failed listings retain the draft, and successful listings appear in the registration table without navigating away.

Validation:

- `test/auction-registration.test.js`: unit-to-total conversion, seller-fee rounding, invalid inputs and total-price limits.
- `test/auction.test.js`: existing escrow, sale, fee and return mechanics.
- `scripts/ui/check-auction-registration.mjs`: 320px, 390px and 1100px layouts; raster icon decoding; no horizontal overflow; live total/fee/net preview; inventory and price limits; draft retention after failed requests; correct listing payload; refreshed table; shared popup close; no browser errors.

Screenshots: `registration-320.png`, `registration-390.png`, `registration-1100.png`, plus `listed-*` after a successful listing.

Final validation: all 1,016 project tests passed; all three browser viewport checks passed.
