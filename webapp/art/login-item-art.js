// Each voucher has its own visual identity built from original raster client icons.
// Keep this small allowlist independent of the full item atlas.
const ART=Object.freeze({
  shots:['l2','icon-etc_mechanic_box_i00','icon-etc_spell_shot_gold_i00'],
  fame:['l2-extra','icon-etc_ticket_i00','icon-accessory_crown_i00'],
  fishing:['l2-extra','icon-etc_ticket_i00','icon-etc_rune_fish_scale_i00'],
  buff:['l2-extra','icon-etc_ticket_i00','icon-etc_potion_scarlet_i00'],
  shadow_weapon:['l2-extra','icon-etc_treasure_box_i01','icon-weapon_homunkuluss_sword_i00'],
  shadow_armor:['l2-extra','icon-etc_treasure_box_i02','icon-armor_t33_u_i00'],
  shadow_jewelry:['l2','icon-etc_jewel_box_i00','icon-accessary_blessed_ring_i00'],
  box:['l2-extra','icon-etc_box_of_adventure_1_i00'],
  resurrection:['l2','icon-etc_scroll_of_resurrection_i01'],
  rune_drop:['l2','icon-etc_water_rune_i00'],
  rune_exp:['l2','icon-etc_wind_rune_i00'],
  rune_craft:['l2','icon-etc_fire_rune_i00'],
});
export function loginItemArt(key) {
  const match=/^login_(.+)_(noGrade|NG|D|C|B|A|S|S80|S84)$/.exec(String(key));
  if(!match||!Object.hasOwn(ART,match[1]))return '';
  const [kind,grade]=match.slice(1),[folder,base,contents]=ART[kind];
  const image=(dir,name,cls)=>`<img class="${cls}" src="/art/${dir}/${name}-128.webp" width="32" height="32" alt="" decoding="async" draggable="false">`;
  return `<span class="login-pack-icon${kind.startsWith('shadow_')?' is-shadow-item':''}" data-login-art="${kind}">${image(folder,base,'login-pack-base')}${contents?image('l2',contents,'login-pack-contents'):''}<small class="login-pack-grade">${grade==='noGrade'?'NG':grade}</small></span>`;
}
