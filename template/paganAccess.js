// Original PaganTeleporters.java and fixed NPC spawns. Door metadata is not an implemented world scenario.
export default {
  "source": {
    "commit": "9fb01cb20513e55190cdde8d91e41be2c0914f84",
    "files": {
      "scripts/ai/areas/PaganTemple/PaganTeleporters/PaganTeleporters.java": "b75cd4f86100a9899a582dab425c8ce8b5c16d17a7655189d4582c57ae089695",
      "spawns/Others/19_16.xml": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695",
      "spawns/Others/21_16.xml": "2a5f9862d8fcbe2908737d8d8fd0a22783b7feafbf27e64b5c7174b2ab1be570"
    }
  },
  "npcs": {
    "32034": {
      "point": {
        "x": -15934,
        "y": -36605,
        "z": -10693
      },
      "source": {
        "file": "spawns/Others/19_16.xml",
        "sha256": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695"
      }
    },
    "32035": {
      "point": {
        "x": -16722,
        "y": -36928,
        "z": -10725
      },
      "source": {
        "file": "spawns/Others/19_16.xml",
        "sha256": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695"
      }
    },
    "32036": {
      "point": {
        "x": -15853,
        "y": -43811,
        "z": -10685
      },
      "source": {
        "file": "spawns/Others/19_16.xml",
        "sha256": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695"
      }
    },
    "32037": {
      "point": {
        "x": -16629,
        "y": -44290,
        "z": -10725
      },
      "source": {
        "file": "spawns/Others/19_16.xml",
        "sha256": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695"
      }
    },
    "32040": {
      "point": {
        "x": -11986,
        "y": -35903,
        "z": -10857
      },
      "source": {
        "file": "spawns/Others/19_16.xml",
        "sha256": "db3161a76c100488c28f5a6e6bf033e190f49407e8b77ed00607a685c6a7c695"
      }
    },
    "32039": {
      "point": {
        "x": 34842,
        "y": -49756,
        "z": -763
      },
      "source": {
        "file": "spawns/Others/21_16.xml",
        "sha256": "2a5f9862d8fcbe2908737d8d8fd0a22783b7feafbf27e64b5c7174b2ab1be570"
      }
    }
  },
  "mirrors": {
    "32039": {
      "from": {
        "x": 34842,
        "y": -49756,
        "z": -763
      },
      "to": {
        "x": -12766,
        "y": -35840,
        "z": -10856
      },
      "event": "onFirstTalk",
      "fee": 0
    },
    "32040": {
      "from": {
        "x": -11986,
        "y": -35903,
        "z": -10857
      },
      "to": {
        "x": 36640,
        "y": -51218,
        "z": 718
      },
      "event": "onFirstTalk",
      "fee": 0
    }
  },
  "doors": [
    {
      "npcId": 32034,
      "doorIds": [
        19160001
      ],
      "anyCarriedItem": [
        8064,
        8065,
        8067
      ],
      "consumeItem": false,
      "openMs": 10000,
      "worldScenarioImplemented": false
    },
    {
      "npcId": 32035,
      "doorIds": [
        19160001
      ],
      "anyCarriedItem": [],
      "consumeItem": false,
      "openMs": 10000,
      "worldScenarioImplemented": false
    },
    {
      "npcId": 32036,
      "doorIds": [
        19160010,
        19160011
      ],
      "anyCarriedItem": [
        8067
      ],
      "consumeItem": false,
      "openMs": 10000,
      "worldScenarioImplemented": false
    },
    {
      "npcId": 32037,
      "doorIds": [
        19160010,
        19160011
      ],
      "anyCarriedItem": [],
      "consumeItem": false,
      "openMs": 10000,
      "worldScenarioImplemented": false
    }
  ],
  "churchDrop": {
    "sourcePosition": null,
    "implementedInNativeWorld": false,
    "reason": "client_jump_geometry_not_verified"
  }
};
