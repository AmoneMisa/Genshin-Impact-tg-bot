// Original H5 town links. All segments verified in both directions against native cells.
// Derived from L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.
export default {
  "geodataCommit": "378672ee9bffa47b37956911040fc7d5b1a7258e",
  "worldCommit": "9fb01cb20513e55190cdde8d91e41be2c0914f84",
  "barriersSha256": "a8d5c25223f54add9fb9359ec09bf9bdda6dcbcbf29c52af0066e8f76674a057",
  "towns": {
    "gludio": {
      "npcId": 30256,
      "name": "Bella",
      "x": -12736,
      "y": 122816,
      "z": -3114,
      "file": "spawns/Others/19_21.xml"
    },
    "gludin": {
      "npcId": 30320,
      "name": "Richlin",
      "x": -80752,
      "y": 149776,
      "z": -3044,
      "file": "spawns/Others/17_22.xml"
    },
    "dion": {
      "npcId": 30059,
      "name": "Trisha",
      "x": 15631,
      "y": 142885,
      "z": -2704,
      "file": "spawns/Others/20_22.xml"
    },
    "floran": {
      "npcId": 30078,
      "name": "Pano",
      "x": 16970,
      "y": 170391,
      "z": -3496,
      "file": "spawns/Others/20_23.xml"
    },
    "giran": {
      "npcId": 30080,
      "name": "Clarissa",
      "x": 83396,
      "y": 147904,
      "z": -3404,
      "file": "spawns/Others/22_22.xml"
    },
    "heine": {
      "npcId": 30899,
      "name": "Flauen",
      "x": 111386,
      "y": 219413,
      "z": -3536,
      "file": "spawns/Others/23_24.xml"
    },
    "oren": {
      "npcId": 30177,
      "name": "Valentina",
      "x": 82992,
      "y": 53171,
      "z": -1492,
      "file": "spawns/Others/22_19.xml"
    },
    "hunters": {
      "npcId": 30233,
      "name": "Esmeralda",
      "x": 117129,
      "y": 76917,
      "z": -2689,
      "file": "spawns/Others/23_20.xml"
    },
    "aden": {
      "npcId": 30848,
      "name": "Elisa",
      "x": 146737,
      "y": 25807,
      "z": -2013,
      "file": "spawns/Others/24_18.xml"
    },
    "goddard": {
      "npcId": 31275,
      "name": "Tatiana",
      "x": 147966,
      "y": -55228,
      "z": -2728,
      "file": "spawns/Others/24_16.xml"
    }
  },
  "routes": {
    "dion:gludio": {
      "fromCity": "gludio",
      "toCity": "dion",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "maxNodes": 40000,
          "heuristicWeight": 1,
          "margin": 256,
          "visited": 29564,
          "reason": "path_blocked"
        },
        {
          "stride": 8,
          "maxNodes": 120000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 120000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 4,
          "maxNodes": 120000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 120000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 2,
          "maxNodes": 80000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 80000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 8,
          "maxNodes": 180000,
          "heuristicWeight": 2,
          "margin": 2048,
          "visited": 180000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 8,
          "maxNodes": 180000,
          "heuristicWeight": 4,
          "margin": 2048,
          "visited": 180000,
          "reason": "geodata_search_limit"
        }
      ]
    },
    "aden:goddard": {
      "fromCity": "aden",
      "toCity": "goddard",
      "available": false,
      "reason": "geodata_search_limit",
      "attempts": [
        {
          "stride": 8,
          "maxNodes": 40000,
          "heuristicWeight": 1,
          "margin": 256,
          "visited": 5853,
          "reason": "path_blocked"
        },
        {
          "stride": 8,
          "maxNodes": 120000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 120000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 4,
          "maxNodes": 120000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 120000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 2,
          "maxNodes": 80000,
          "heuristicWeight": 2,
          "margin": 1024,
          "visited": 80000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 8,
          "maxNodes": 180000,
          "heuristicWeight": 2,
          "margin": 2048,
          "visited": 180000,
          "reason": "geodata_search_limit"
        },
        {
          "stride": 8,
          "maxNodes": 180000,
          "heuristicWeight": 4,
          "margin": 2048,
          "visited": 180000,
          "reason": "geodata_search_limit"
        }
      ]
    }
  }
};
