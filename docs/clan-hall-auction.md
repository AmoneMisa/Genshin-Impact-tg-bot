# Clan Hall auction

The Clan → Clan Hall section contains Clan Hall development and the estate auction. These are separate: purchasing an estate does not replace the clan's five development levels.

- Six halls, ranks C–A; starting bids 300,000 / 600,000 / 1,000,000 adena.
- Clan level 3 is required. Leaders and officers bid from the warehouse.
- A new auction lasts 24 hours. Each higher bid must increase by at least 5%. Increasing your own bid reserves only the difference. Outbid funds return fully to the previous clan's warehouse.
- The winner receives a seven-day lease and 5 / 8 / 12 extra Glory per hour. A clan can lead one auction or own one leased hall. Disbanding is blocked while a bid or lease is active.
- Expiry is settled when the auction is visited or a bid is submitted, including after restarts. Unvisited leases retain their earned Glory. Empty or expired halls reopen for another 24-hour auction.
- These timings, prices and hall labels are adapted game rules, rather than a complete reproduction of the original L2 residence catalog.

Money, refunds, the winner and lease are persisted together in MongoDB transactions. The bundled Docker MongoDB initializes a single-node `rs0` replica set; the existing data volume stays in place. External MongoDB must support transactions (replica set or Atlas). Standalone external MongoDB cannot accept auction bids. Docker was unavailable in the development session; live database transactions and deployment must be checked on a running replica set.

Artwork was generated with the built-in imagegen tool and converted to WebP at 256 and 512 pixels. Masters: `art-source/clan/clan-hall.png` and `art-source/clan/clan-hall-auction.png`. Delivered assets: `webapp/art/world/v1/clan/clan-hall-{256,512}.webp` and `clan-hall-auction-{256,512}.webp`.

Prompts:

1. Grand empty medieval fantasy stone guild hall, vaulted ceiling, oak council table, hearth, unmarked cloth banners, stairs and arched stained glass. Painted realistic Lineage II inspired atmosphere, dark purple shadows and antique gold illumination. Wide 3:2 full bleed, no text, people, UI or logos.
2. Medieval fantasy Clan Hall auction chamber, ornate oak desk, gold gavel, wax-sealed unlettered parchment and coins. Arched windows overlooking a guild house. Same painterly dark purple and gold atmosphere, wide 3:2 full bleed, no text, people, UI or logos.
