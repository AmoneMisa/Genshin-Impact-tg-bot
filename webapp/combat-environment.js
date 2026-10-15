// Art direction for adapted local rooms. These are not original client textures or geodata.
const themes={
  catacomb:{floor:0x363b3c,light:0x42484a,top:0x797669,front:0x484e4b,side:0x292f31,trim:0xaaa080,accent:0xd5a35b,indoor:true},
  necropolis:{floor:0x343143,light:0x403b51,top:0x757182,front:0x494354,side:0x282633,trim:0xa9a1b8,accent:0x98c5b4,indoor:true},
  ship:{floor:0x4a3b30,light:0x514135,top:0x81725b,front:0x594c3c,side:0x2c2823,trim:0xaa9774,accent:0xc5ab77,indoor:true},
  ice:{floor:0x364653,light:0x405262,top:0x829da9,front:0x526e80,side:0x2a3949,trim:0xa5c7d4,accent:0x9ed8e7,indoor:true},
  woodland:{floor:0x303e2a,light:0x394630,top:0x61704a,front:0x414d32,side:0x24301f,trim:0x8c9169,accent:0xa9c580},
  marsh:{floor:0x263c39,light:0x2c4540,top:0x5a6d5b,front:0x354f42,side:0x1c302d,trim:0x829b7c,accent:0x81c5ba},
  springs:{floor:0x4f5345,light:0x5b5f50,top:0x8b8e79,front:0x606759,side:0x363f3a,trim:0xb1b79e,accent:0x7dc9ce},
  desert:{floor:0x796847,light:0x82704b,top:0xac9569,front:0x7d6b4d,side:0x514631,trim:0xc9b687,accent:0xd7b476},
  cavern:{floor:0x373d43,light:0x41474f,top:0x737e85,front:0x4a555d,side:0x29323a,trim:0x9ba8b0,accent:0x84b1cc},
  volcanic:{floor:0x3c3030,light:0x483537,top:0x75615b,front:0x51403c,side:0x2e2628,trim:0x987b67,accent:0xf09a55},
};
export const combatTheme=name=>themes[name]||themes.woodland;
export const colorHex=n=>'#'+n.toString(16).padStart(6,'0');
