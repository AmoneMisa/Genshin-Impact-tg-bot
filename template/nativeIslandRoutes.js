// Separate island shores: these paths never imply a mainland ground connection.
// L2J High Five geodata (GPL-3.0); see data/l2j-geodata/LICENSE.
export default {
  "geodataCommit": "378672ee9bffa47b37956911040fc7d5b1a7258e",
  "worldCommit": "9fb01cb20513e55190cdde8d91e41be2c0914f84",
  "routes": {
    "primeval-isle": {
      "available": true,
      "island": "primeval-isle",
      "isolatedPort": "primeval-rune",
      "city": "rune",
      "from": {
        "x": 10304,
        "y": -25024,
        "z": -3680
      },
      "to": {
        "x": 11235,
        "y": -24026,
        "z": -3640
      },
      "path": [
        {
          "x": 11235,
          "y": -24026,
          "z": -3640
        }
      ],
      "returnPath": [
        {
          "x": 10304,
          "y": -25024,
          "z": -3680
        }
      ],
      "distance": 1364.8314914303523,
      "sourceEntry": {
        "file": "teleporters/town/31320.xml",
        "npcId": 31320,
        "type": "NORMAL",
        "name": "Primeval Isle Wharf"
      }
    }
  }
};
