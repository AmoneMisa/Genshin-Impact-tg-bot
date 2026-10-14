# Economy audit — 2026-10-14

Status: P1–P3 below are implemented (builds template v5); the Alchemy Lab and other new buildings are not. Numbers come from the live templates and functions
(`scripts/economy/*.mjs`, run from the repo root with `node scripts/economy/<name>.mjs`). There is **no player telemetry** in
this audit, so every "per hour/day" figure assumes the stated play pattern. It complements
`docs/economy-stabilization-plan-2026-10-13.md` (which already lists the dew curve as P0) and adds hunt margins and building ROI.

## 1. Findings

| # | Finding | Evidence | Severity |
|---|---|---|---|
| 1 | **Moon dew is worthless after ~day 40.** Lake yield is `ceil(50·1.05·L²)` per hour: L30 = 47 250/h. Maxing every building needs 1.0 M dew in total; the lake makes 1.1 M per day. | `lake-variants`: 168 M produced, 1.0 M spent, 99% unused | High |
| 2 | **Gold mine upgrades pay back in about an hour.** L30 yields 30 300/h (727 k/day, 1.09 M per 36 h collection); the whole mine L2→L30 costs 176 k gold. The level is not an economic decision. | `build-tables` | High |
| 3 | **Passive mine out-earns hunting by a wide margin.** Average value per kill (adena ×0.25 + NPC sale of x3 drops): 56 at lvl 19, 270 at lvl 52, ~490 at lvl 63, ~1 100 at lvl 78. A L30 mine equals 1 500 kills a day at lvl 63. | `hunt-margins` | High |
| 4 | **Shots cost more than a kill pays from grade C up.** `SHOT_PACK_PRICE` per shot: D 3, C 8, B 20, A 50, S 120, S80 200, S84 300; a skill burns 2–6 shots. One cast costs 24 (C), 60 (B), 200 (A), 600 (S), 1 200 (S80). A bare hero needs `HUNT.killCasts = 7` casts per kill. | `hunt-margins`, `template/shotsData.js` | High |
| 5 | **Shot prices are above the project's own rule** (High Five prices on the 0.25 gold scale). Real HF soulshot: D 14, C 22, B 50, A 80, S 100 → ×0.25 = 3.5 / 5.5 / 12.5 / 20 / 25. Ours are +45% (C), +60% (B), +150% (A), +380% (S). S80/S84 shots do not exist in HF (those weapons use S shots). | `lootTable.l2MaterialInfo` ids 1463–1467 | Medium |
| 6 | **Ore is the true gate.** Forge needs 471 k city ore and 79 M gold to reach L30; L30 iron deposit gives 153/h (3.7 k/day) → forge L30 on day ~167 even with unlimited gold and dew. | `build-progression` | Info (intended?) |
| 7 | **CoL is nearly worthless for adena.** 1 CoL = 15 000 adena = 30 min of a L30 mine. CoL items (blessed S scroll 12 CoL = 180 k adena, epic rental 70 CoL = 1.05 M) are priced below 2 days of free mine output. | `template/adenaOffer.js`, `luckShop.js` | Medium |
| 8 | **Daily chest is small.** 40.8 k expected per full attempt, below a L3 mine's day. Not a problem. | `miniapp/chest.js` | Low |

Not verified here: actual kills per hour, real wallets, auction prices, SP/skill enchant sinks, craft margins, gacha EV, calendar
value. These need the telemetry from stage A of the 2026-10-13 plan.

## 2. Simulation: building progression (passive only, one collection per day)

Greedy upgrades, prerequisites and build times ignored (they only add delay). All seven producers/services to L30:

| Lake formula (L30/h) | Forge L30 day | Dew unused | Comment |
|---|---|---|---|
| current `50·1.05·L²` (47 250) | 167 | 99% | Dew never matters |
| `50·L^1.2` (2 962) | 167 | 91% | Still no pressure |
| `50·L` (1 500) | 167 | 82% | Never a gate, still ~5× the need |
| H1 `50·(1+0.15(L−1))` (268) | 169 | 0% | Delays palace to day 81, trainee to 120 — too tight |

## 3. Proposals

### P1 — Dew: linear lake, give dew a purpose
- Lake yield `50 × L` per hour (L10 500, L20 1 000, L30 1 500). Same early game, 31× less late oversupply, no gate.
- Dew sinks (not mandatory chores): see Alchemy Lab below.
- Migration: per the 2026-10-13 plan — accrual before the switch uses the old rate; existing stock stays.

### P2 — Gold mine: concave yield and real upgrade cost
- Yield `1 000 × L^0.85` (L10 7 100, L20 12 700, L30 18 000/h; 432 k/day at cap).
- Upgrade cost growth 1.17 → 1.26 per level (L30 ≈ 206 k instead of 26 k): the last levels pay back in about two weeks, not an hour.
- Keeps mine ≈ a passive baseline that supports shots, with hunting still better per hour from lvl 40.

### P3 — Shots: original High Five prices
- Per shot: D 3, C 5, B 12, A 20, S 25; S80 and S84 weapons use S shots (custom 200/300 removed).
- Blessed spiritshot keeps the ×3 multiplier. Effect: cost per cast A 80, S 125; break-even casts per kill A ≥ 6 (valley of saints), S ≥ 9 (Ketra), S80 ≥ 38 — all reachable with gear.
- Stored S80/S84 charges (inventory, warehouse, mail) are merged 1:1 into S on load (`migrateShotGrades`).

### P4 — CoL value
- Keep the one-way 1 CoL → 15 000 adena; do not raise it. Value of CoL should come from time-limited gear and convenience, not adena.
- Re-price only after telemetry shows whether CoL sells; do not move it in the same patch as P2.

### New buildings (optional, after P1–P3)
| Building | Role | Rule |
|---|---|---|
| **Alchemy Lab** | The dew sink. Converts dew + adena into shots and HP/MP potions in bulk. | Illustrative rate 1 dew + 10 adena → 5 shots of the player's grade (calibrate with P3 prices); daily cap = 200 shots per lab level; shots are bound to the character. |
| **Trade House** | Already planned: shell over the chat auction. | History first, then partial buys; no new currency. |
| **Warehouse annex** | Gold sink with a real benefit: +slots in the palace bag. | Cost scales 1.3× per slot pack; no production. |

A smelter (dew → ore) is **not** recommended: ore is the pacing resource and city ore must stay separate from hunted iron ore.

## 4. Order of work
1. Telemetry: the journal and 14-day baseline from stage A of the 2026-10-13 plan.
2. P3 (shot prices) — smallest change, directly fixes hunting margins; low migration risk.
3. P1 (lake) with an announced switch time.
4. P2 (mine yield and cost) — after seeing real gold per active hour.
5. Alchemy Lab and Trade House.

## 5. Implemented (builds template v5)

| Parameter | Before | After |
|---|---|---|
| Gold mine yield/h | `1000·1.01·L` (L30 30 300) | `1000·L^0.85` (L30 18 012) |
| Gold mine gold cost growth | 1.17 per level (L30 26 k) | 1.26 (L30 207 k); ore and dew costs unchanged |
| Gold mine upgrade time growth | 1.15 (L30 8 h) | 1.22 (L30 36 h) |
| Lake yield/h | `50·1.05·L²` (L30 47 250) | `50·L` (L30 1 500) |
| Lake and iron deposit upgrade time growth | 1.15 (L30 18 h / 8 h) | 1.19 (L30 43 h / 19 h) |
| Shot price per pack of 100 | D 300, C 800, B 2 000, A 5 000, S 12 000, S80 20 000, S84 30 000 | D 350, C 550, B 1 250, A 2 000, S 2 500; S80/S84 grades removed (S80/S84 weapons burn S charges) |

Passive-only simulation after the change: all producers L30 by day 43 as before, forge L30 on day 215 (was 167; now gold-bound, not ore-bound).
Longer timers also raise the CoL price of speed-ups (`ceil(level/2)` CoL per remaining hour from the CoL threshold): CoL pricing was
deliberately left unchanged, because CoL is a donate currency whose value the players set.

Not done: Alchemy Lab (needs a building, UI and art), Trade House, Warehouse annex, dew-priced speed-ups.

## 6. Alchemy Lab and lab runes (implemented)

Building `alchemyLab` (10 levels, brewing opens at palace level 8). One attempt brews a random rune from the dew:

| | |
|---|---|
| Result | 30% fizzle, otherwise one of 8 kinds equally likely (8.75% each) |
| Strength | small 50% (2 h), medium 35% (6 h), great 15% (12 h) |
| Cost of the n-th attempt of the UTC day | `300 · 2^(n−1)` dew + `2 000 · n` adena |
| Attempts a day | `min(5, 1 + floor(level / 2))` |
| No pity | each attempt rolls independently |

| Kind | Small / medium / great |
|---|---|
| EXP, SP, item drop chance, adena drop, quest-item drop chance | +15% / +25% / +35% |
| Teleport price | −15% / −25% / −35% |
| Damage to monsters | +5% / +7% / +10% |
| Damage from monsters | −3% / −4% / −5% |

Runes of different kinds work together; several runes of one kind may exist, only the strongest applies. The calendar
runes stay at +50% (exp, drop) and compete with the lab rune of the same kind by "strongest wins". Code:
`functions/game/runes/labRunes.js`, screen `webapp/alchemy-lab.js`, API `GET /api/alchemy` and `POST /api/alchemy/brew`.

Applied in: `vitality.js` (EXP), `huntRewards.js` (SP, adena, drops), `academy.js` (epic-pass quest items), `world.js` (teleport price),
`huntFight.js` and `calcDamage.js` (damage). Not covered: adena from bosses and non-hunt sources; art for the lab building is missing
(the card uses the fallback picture).
