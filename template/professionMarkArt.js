import {L2_CLASS_META} from './l2ClassMeta.js';

// Original High Five race testimonies used by second-profession trials.
const marks = {humanFighter:'icon-etc_jewel_green_i00',humanMystic:'icon-etc_jewel_green_i00',elvenFighter:'icon-etc_herb_green_i00',elvenMystic:'icon-etc_herb_green_i00',darkFighter:'icon-etc_jewel_blue_i00',darkMystic:'icon-etc_jewel_blue_i00',orcFighter:'icon-etc_badge_gold_i00',orcMystic:'icon-etc_badge_gold_i00',dwarvenFighter:'icon-etc_coins_gold_i00'};
export function secondProfessionMarkArt(name) {
  let cls=Object.values(L2_CLASS_META).find(c=>c.key===name);
  while(cls?.parent!=null) cls=L2_CLASS_META[cls.parent];
  return marks[cls?.key] || 'icon-etc_letter_red_i00';
}
