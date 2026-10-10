# Warehouses and player exchange

Personal storage is available from Character and Inventory. Clan storage is available from Clan → Warehouse and Clan Hall → Warehouse. It holds up to 250 stacks, including equipment, potions, materials, adena, crystals and iron ore. Equipped, temporary and bound equipment cannot be transferred. Augmented equipment cannot be deposited into clan storage; personal storage and player trades remain available. Legacy augmented items already in clan storage can still be withdrawn by authorized members. Stored equipment retains all its metadata. Icons fill 48-pixel cells without an additional frame. Selecting an item opens a quantity popup; cancellation changes nothing.

Every member can deposit into the clan warehouse. The leader and the first two members assigned the existing `officer` role can withdraw. New promotions are limited to two co-leaders; legacy extra officers retain their other rights but cannot withdraw. Leadership transfer does not create a third co-leader. The latest 100 successful clan transfers are recorded, with the latest 20 displayed.

Player exchange is available from Character, Inventory and another player's card. Participants must belong to the same game chat. An invitation and exchange expire after ten minutes. Each side may offer up to 12 stacks. Changing either offer clears both confirmations. Completion validates the current inventory, equipment metadata, balances and both players' reserved gold. Cancellation and expiry transfer nothing.

Warehouse mutations and trade completion use MongoDB transactions. The deployment needs a replica set, already configured in docker-compose.yml for the Clan Hall auction. Database transaction integration was not run locally because the Docker daemon is stopped; automated tests cover transfer rules and rollback behavior in memory. Browser checks exercise deposit, withdrawal, offer editing and both confirmations at 320, 390 and 1100 pixels.

Preview: [warehouses and trade](storage-trade-preview.html), [Clan Hall auction](clan-hall-preview.html).
