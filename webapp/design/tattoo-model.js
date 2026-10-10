// Proposed WhitesLove rules for the design prototype, not live character mutations.
export const TATTOO_RULES = Object.freeze({ slots:3, dyesPerSymbol:10, refund:5, bonusCap:5, minimumStat:1, applyFee:145000, removeFee:72500 });
export const DYES = Object.freeze([
  { id:'int-men', name:'Краска интеллекта', plus:'INT', minus:'MEN', amount:4, color:'#9473b5', glyph:'✧' },
  { id:'wit-men', name:'Краска мудрости', plus:'WIT', minus:'MEN', amount:4, color:'#718dbe', glyph:'✦' },
  { id:'con-str', name:'Краска выносливости', plus:'CON', minus:'STR', amount:4, color:'#b58265', glyph:'❖' },
  { id:'dex-con', name:'Краска ловкости', plus:'DEX', minus:'CON', amount:4, color:'#91a95d', glyph:'ϟ' },
  { id:'str-dex', name:'Краска силы', plus:'STR', minus:'DEX', amount:4, color:'#b16c69', glyph:'⋈' },
]);

export function tattooStats(base, symbols) {
  const gains = {}, losses = {};
  for (const id of symbols) {
    const dye = DYES.find(dye => dye.id === id);
    if (!dye) continue;
    gains[dye.plus] = (gains[dye.plus] || 0) + dye.amount;
    losses[dye.minus] = (losses[dye.minus] || 0) + dye.amount;
  }
  return Object.fromEntries(Object.entries(base).map(([stat,value]) => [stat,value + Math.min(TATTOO_RULES.bonusCap,gains[stat] || 0) - (losses[stat] || 0)]));
}

export function tattooPreview(state, id) {
  const dye = DYES.find(dye => dye.id === id);
  const before = tattooStats(state.base,state.symbols);
  const after = tattooStats(state.base,[...state.symbols,id]);
  let reason = '';
  if (!dye) reason = 'Выберите краску.';
  else if (state.symbols.length >= TATTOO_RULES.slots) reason = 'Все три слота заняты. Сначала снимите символ.';
  else if ((state.stock[id] || 0) < TATTOO_RULES.dyesPerSymbol) reason = 'Нужно 10 красок одного типа.';
  else if (state.gold < TATTOO_RULES.applyFee) reason = 'Недостаточно золота для нанесения.';
  else if (Object.values(after).some(value => value < TATTOO_RULES.minimumStat)) reason = 'Характеристика не может стать ниже 1.';
  else if (after[dye.plus] <= before[dye.plus]) reason = 'Для этой характеристики уже достигнут бонус +5.';
  return { before,after,reason,allowed:!reason };
}

export function applyTattoo(state, id) {
  const preview = tattooPreview(state,id);
  if (!preview.allowed) return { ok:false,reason:preview.reason };
  state.symbols.push(id);
  state.stock[id] -= TATTOO_RULES.dyesPerSymbol;
  state.gold -= TATTOO_RULES.applyFee;
  return { ok:true };
}

export function removeTattoo(state, index) {
  const id = state.symbols[index];
  if (!Number.isInteger(index) || !id) return { ok:false,reason:'Символ не найден.' };
  if (state.gold < TATTOO_RULES.removeFee) return { ok:false,reason:'Недостаточно золота для снятия.' };
  state.symbols.splice(index,1);
  state.stock[id] = (state.stock[id] || 0) + TATTOO_RULES.refund;
  state.gold -= TATTOO_RULES.removeFee;
  return { ok:true };
}
