// Pinned High Five quest 130, Warpgate and original fixed NPC positions.
export default {
  "source": {
    "commit": "9fb01cb20513e55190cdde8d91e41be2c0914f84",
    "repository": "https://gitlab.com/MobiusDevelopment/L2J_Mobius",
    "files": {
      "Q00130_PathToHellbound.java": {
        "file": "scripts/quests/Q00130_PathToHellbound/Q00130_PathToHellbound.java",
        "sha256": "003bc4129df1c5b31e9c60d682bda219b5da3e5deabe5280d74b790f26cf257b"
      },
      "Warpgate.java": {
        "file": "scripts/ai/areas/Hellbound/AI/NPC/Warpgate/Warpgate.java",
        "sha256": "083f5df673cf3e41918ccc1d5824357300017aee32ba0fcf8c3c7e3e79bc6834"
      },
      "Hellbound.xml": {
        "file": "spawns/Hellbound/Hellbound.xml",
        "sha256": "d339b08a12b2d70a00e180712a3338a3d663a906387738d7ec7eb58c0f8519f4"
      },
      "19_23.xml": {
        "file": "spawns/Others/19_23.xml",
        "sha256": "149fb1592c27f125f3432b31dbc4c4411d70b8cf55d98de2a36aa6bb0db82007"
      },
      "Npc.java": {
        "file": "java/org/l2jmobius/gameserver/entity/actor/Npc.java",
        "sha256": "aee78740b649630e4a80a3bc554519b8a615f9968a9d3473f10a8426b019524e"
      },
      "General.ini": {
        "file": "config/General.ini",
        "sha256": "b3db41e77b95be588aac9bf75a93fbf01019714c6e1ad58619e55f948c6178fe"
      },
      "30320.xml": {
        "file": "teleporters/town/30320.xml",
        "sha256": "ec6a8a6c51cf147a8c955a374d45c064c10364a5ad9304e06b8a80988d9ec35b"
      },
      "miscs.xml": {
        "file": "mapregion/miscs.xml",
        "sha256": "eca4a72e2283b5e720773642a8964d97f734a68626347c0489203431402a6099"
      }
    }
  },
  "quest": {
    "id": 130,
    "name": "Path to Hellbound",
    "minimumLevel": 78,
    "itemId": 12823,
    "itemName": "Casian's Blue Crystal"
  },
  "requiresQuest": true,
  "interactionDistance": 250,
  "entry": {
    "x": -11272,
    "y": 236464,
    "z": -3248
  },
  "remove": {
    "x": -16555,
    "y": 209375,
    "z": -3670
  },
  "npcs": [
    {
      "npcId": 32314,
      "x": -16899,
      "y": 209827,
      "z": -3640,
      "file": "spawns/Hellbound/Hellbound.xml",
      "id": "hellbound:western-gate",
      "name": "Warpgate",
      "region": "gludio"
    },
    {
      "npcId": 32292,
      "x": 112017,
      "y": 219528,
      "z": -3671,
      "file": "spawns/Hellbound/Hellbound.xml",
      "id": "hellbound:galate",
      "name": "Galate",
      "region": "heine"
    },
    {
      "npcId": 32314,
      "x": 112080,
      "y": 219568,
      "z": -3664,
      "file": "spawns/Hellbound/Hellbound.xml",
      "id": "hellbound:heine-gate",
      "name": "Warpgate",
      "region": "heine"
    },
    {
      "npcId": 30612,
      "x": -16895,
      "y": 194229,
      "z": -4207,
      "file": "spawns/Others/19_23.xml",
      "id": "hellbound:casian",
      "name": "Casian",
      "region": "gludio"
    }
  ],
  "escape": {
    "file": "mapregion/miscs.xml",
    "regions": [
      "19_25",
      "20_25"
    ],
    "points": [
      {
        "x": -16434,
        "y": 208803,
        "z": -3691
      },
      {
        "x": -16929,
        "y": 209712,
        "z": -3691
      },
      {
        "x": -16219,
        "y": 210056,
        "z": -3691
      },
      {
        "x": -15686,
        "y": 209285,
        "z": -3691
      },
      {
        "x": -17067,
        "y": 208965,
        "z": -3691
      },
      {
        "x": -17463,
        "y": 209659,
        "z": -3691
      }
    ]
  },
  "approach": {
    "city": "gludin",
    "npcId": 30320,
    "name": "Wastelands",
    "fee": 3400,
    "x": -16526,
    "y": 208032,
    "z": -3664,
    "file": "teleporters/town/30320.xml"
  }
};
