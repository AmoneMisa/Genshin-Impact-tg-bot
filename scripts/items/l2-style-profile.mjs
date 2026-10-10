export function l2StyleProfile(key,catalog){
 const weapon=catalog?catalog.id.includes(':weapon:'):/^(sword|greatsword|dagger|staff|bow|crossbow|hammer|fists|epic-weapon-)/.test(key);
 const shield=catalog?catalog.id.includes(':shield:'):/^(shield|sigil)/.test(key);
 const cloak=/^cloak/.test(key);
 const jewelry=catalog?catalog.id.includes(':jewelry:'):/^(ring|earring|amulet|epic-)/.test(key);
 const group=weapon?'Оружие':shield?'Щиты':cloak?'Плащи':jewelry?'Бижутерия':'Броня и экипировка';
 const background=weapon||shield?'weapon':jewelry?'jewelry':'armor';
 const vertical=catalog?['oneHandedSword','twoHandedSword','mace','dagger'].includes(catalog.kind):/^(sword|greatsword|dagger|staff|epic-weapon-(shadow-scythe|solar-scythe|rainbow-scythe|prism-sword|astral-sword|eclipse-greatsword|lifeblade|wind-staff|song-staff|tide-trident))/.test(key);
 return {group,background,vertical};
}
