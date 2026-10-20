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
    "dragon-valley": {
      "city": "giran",
      "available": true,
      "from": {
        "x": 83396,
        "y": 147904,
        "z": -3400
      },
      "to": {
        "x": 73024,
        "y": 118485,
        "z": -3696
      },
      "sourceTown": {
        "npcId": 30080,
        "name": "Clarissa",
        "x": 83396,
        "y": 147904,
        "z": -3404,
        "file": "spawns/Others/22_22.xml"
      },
      "sourceEntry": {
        "name": "Dragon Valley",
        "x": "73024",
        "y": "118485",
        "z": "-3696",
        "feeCount": "1800",
        "type": "NORMAL",
        "npc": "30233",
        "file": "teleporters/town/30233.xml"
      },
      "distance": 37148.47867332176,
      "path": [
        {
          "x": 83528,
          "y": 147912,
          "z": -3400
        },
        {
          "x": 83912,
          "y": 147016,
          "z": -3400
        },
        {
          "x": 83784,
          "y": 141512,
          "z": -3528
        },
        {
          "x": 82120,
          "y": 139976,
          "z": -3568
        },
        {
          "x": 80200,
          "y": 139976,
          "z": -3480
        },
        {
          "x": 78536,
          "y": 139336,
          "z": -3488
        },
        {
          "x": 76104,
          "y": 138312,
          "z": -3616
        },
        {
          "x": 75592,
          "y": 138184,
          "z": -3672
        },
        {
          "x": 74696,
          "y": 137672,
          "z": -3576
        },
        {
          "x": 74440,
          "y": 137288,
          "z": -3552
        },
        {
          "x": 72008,
          "y": 130504,
          "z": -3536
        },
        {
          "x": 72008,
          "y": 129608,
          "z": -3392
        },
        {
          "x": 71496,
          "y": 128968,
          "z": -3576
        },
        {
          "x": 71624,
          "y": 120776,
          "z": -3664
        },
        {
          "x": 71752,
          "y": 120648,
          "z": -3664
        },
        {
          "x": 71880,
          "y": 119752,
          "z": -3672
        },
        {
          "x": 73024,
          "y": 118485,
          "z": -3696
        }
      ],
      "returnPath": [
        {
          "x": 71880,
          "y": 119752,
          "z": -3672
        },
        {
          "x": 71752,
          "y": 120648,
          "z": -3664
        },
        {
          "x": 71624,
          "y": 120776,
          "z": -3664
        },
        {
          "x": 71496,
          "y": 128968,
          "z": -3576
        },
        {
          "x": 72008,
          "y": 129608,
          "z": -3392
        },
        {
          "x": 72008,
          "y": 130504,
          "z": -3536
        },
        {
          "x": 74440,
          "y": 137288,
          "z": -3552
        },
        {
          "x": 74696,
          "y": 137672,
          "z": -3576
        },
        {
          "x": 75592,
          "y": 138184,
          "z": -3672
        },
        {
          "x": 76104,
          "y": 138312,
          "z": -3616
        },
        {
          "x": 78536,
          "y": 139336,
          "z": -3488
        },
        {
          "x": 80200,
          "y": 139976,
          "z": -3480
        },
        {
          "x": 82120,
          "y": 139976,
          "z": -3568
        },
        {
          "x": 83784,
          "y": 141512,
          "z": -3528
        },
        {
          "x": 83912,
          "y": 147016,
          "z": -3400
        },
        {
          "x": 83528,
          "y": 147912,
          "z": -3400
        },
        {
          "x": 83396,
          "y": 147904,
          "z": -3400
        }
      ],
      "attempts": [
        {
          "stride": 8,
          "visited": 11979,
          "reason": null
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
