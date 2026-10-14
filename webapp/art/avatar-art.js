import { playerRace } from '../class-race.js';

// Custom decorative race/gender outfits. Original equipment icons and stats are independent.
export const AVATAR_OUTFITS = Object.freeze([
  {
    "id": "violet-courtier",
    "name": "Кавалер сумерек",
    "key": "human-male",
    "race": "human",
    "gender": "male",
    "artPath": "/art/avatars/v1/rogue-male"
  },
  {
    "id": "crimson-dawn",
    "name": "Багряный рассвет",
    "key": "human-female",
    "race": "human",
    "gender": "female",
    "artPath": "/art/avatars/v1/rogue-female"
  },
  {
    "id": "racial-elf-male",
    "name": "Серебряный лист",
    "key": "elf-male",
    "race": "elf",
    "gender": "male",
    "artPath": "/art/avatars/races/v2/elf-male",
    "portraitPath": "/art/avatars/portraits/v2/elf-male"
  },
  {
    "id": "racial-elf-female",
    "name": "Роса серебряной рощи",
    "key": "elf-female",
    "race": "elf",
    "gender": "female",
    "artPath": "/art/avatars/races/v2/elf-female",
    "portraitPath": "/art/avatars/portraits/v2/elf-female"
  },
  {
    "id": "racial-darkElf-male",
    "name": "Аметист ночной рощи",
    "key": "darkElf-male",
    "race": "darkElf",
    "gender": "male",
    "artPath": "/art/avatars/races/v2/darkElf-male",
    "portraitPath": "/art/avatars/portraits/v2/darkElf-male"
  },
  {
    "id": "racial-darkElf-female",
    "name": "Ночное созвездие",
    "key": "darkElf-female",
    "race": "darkElf",
    "gender": "female",
    "artPath": "/art/avatars/races/v2/darkElf-female",
    "portraitPath": "/art/avatars/portraits/v2/darkElf-female"
  },
  {
    "id": "racial-orc-male",
    "name": "Страж нефритового пламени",
    "key": "orc-male",
    "race": "orc",
    "gender": "male",
    "artPath": "/art/avatars/races/v1/orc-male"
  },
  {
    "id": "racial-orc-female",
    "name": "Багряное сердце клана",
    "key": "orc-female",
    "race": "orc",
    "gender": "female",
    "artPath": "/art/avatars/races/v1/orc-female"
  },
  {
    "id": "racial-dwarf-male",
    "name": "Золотой мастер гор",
    "key": "dwarf-male",
    "race": "dwarf",
    "gender": "male",
    "artPath": "/art/avatars/races/v3/dwarf-male",
    "portraitPath": "/art/avatars/portraits/v3/dwarf-male"
  },
  {
    "id": "racial-dwarf-female",
    "name": "Искра горного янтаря",
    "key": "dwarf-female",
    "race": "dwarf",
    "gender": "female",
    "artPath": "/art/avatars/races/v3/dwarf-female",
    "portraitPath": "/art/avatars/portraits/v3/dwarf-female"
  },
  {
    "id": "racial-kamael-male",
    "name": "Крыло сумеречного посланника",
    "key": "kamael-male",
    "race": "kamael",
    "gender": "male",
    "artPath": "/art/avatars/races/v2/kamael-male",
    "portraitPath": "/art/avatars/portraits/v2/kamael-male"
  },
  {
    "id": "racial-kamael-female",
    "name": "Крыло багряной зари",
    "key": "kamael-female",
    "race": "kamael",
    "gender": "female",
    "artPath": "/art/avatars/races/v2/kamael-female",
    "portraitPath": "/art/avatars/portraits/v2/kamael-female"
  }
].map(Object.freeze));
export const AVATAR_ART_KEYS = Object.freeze(AVATAR_OUTFITS.map(outfit => outfit.key));
export function avatarOutfit(player = {}) {
  const race = playerRace(player);
  const gender = player.gender === 'female' ? 'female' : 'male';
  return AVATAR_OUTFITS.find(outfit => outfit.race === race && outfit.gender === gender) || null;
}
export function avatarArtUrl(player = {}, width = 512) {
  const outfit = avatarOutfit(player);
  return outfit && [256,512,1024].includes(width) ? outfit.artPath + '-' + width + '.webp' : null;
}
