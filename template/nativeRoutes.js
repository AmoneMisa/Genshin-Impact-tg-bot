// Native H5 ground routes. Every segment verified against original 16-unit cells and ground exclusions.
// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.
export default {
  "geodataCommit": "378672ee9bffa47b37956911040fc7d5b1a7258e",
  "worldCommit": "9fb01cb20513e55190cdde8d91e41be2c0914f84",
  "barriersSha256": "a8d5c25223f54add9fb9359ec09bf9bdda6dcbcbf29c52af0066e8f76674a057",
  "routes": {
    "angel-waterfall": {
      "city": "aden",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "visited": 30000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 4,
          "visited": 30000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 2,
          "visited": 50000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 1,
          "visited": 60000,
          "reason": "geodata_search_limit"
        }
      ]
    },
    "enchanted-valley": {
      "city": "hunters",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "visited": 5010,
          "reason": "path_blocked"
        },
        {
          "stride": 4,
          "visited": 20201,
          "reason": "path_blocked"
        },
        {
          "stride": 2,
          "visited": 50000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 1,
          "visited": 60000,
          "reason": "geodata_search_limit"
        }
      ]
    },
    "beast-farm": {
      "city": "rune",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "visited": 2118,
          "reason": "path_blocked"
        },
        {
          "stride": 4,
          "visited": 8658,
          "reason": "path_blocked"
        },
        {
          "stride": 2,
          "visited": 36078,
          "reason": "path_blocked"
        },
        {
          "stride": 1,
          "visited": 60000,
          "reason": "geodata_search_limit"
        }
      ]
    },
    "plains-of-the-lizardmen": {
      "city": "oren",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "visited": 1184,
          "reason": "path_blocked"
        },
        {
          "stride": 4,
          "visited": 4888,
          "reason": "path_blocked"
        },
        {
          "stride": 2,
          "visited": 19863,
          "reason": "path_blocked"
        },
        {
          "stride": 1,
          "visited": 60000,
          "reason": "geodata_search_limit"
        }
      ]
    }
  }
};
