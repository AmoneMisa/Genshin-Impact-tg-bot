// The retired premium crystals are now moon dew. Equipment/attribute crystals remain materials.
const amount=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
export function migrateCurrencyWallet(wallet) {
 if(!wallet||typeof wallet!=='object')return false;
 if(!Object.hasOwn(wallet,'crystals'))return false;
 wallet.moonDew=amount(wallet.moonDew)+amount(wallet.crystals);
 delete wallet.crystals;
 return true;
}
export function migrateCharacterCurrency(session) {
 const game=session?.game;
 if(!game)return false;
 let changed=migrateCurrencyWallet(game.inventory);
 changed=migrateCurrencyWallet(game.warehouse)||changed;
 for(const letter of game.mailbox||[])for(const reward of letter.rewards||[])if(reward.kind==='crystals'){reward.kind='moonDew';changed=true;}
 return changed;
}
export function migrateClanCurrency(clan) {
 if(!clan)return;
 migrateCurrencyWallet(clan.warehouse);
 migrateCurrencyWallet(clan.investigations?.active?.progress);
}
export function migrateCurrencyCost(cost) {
 if(!cost||typeof cost!=='object')return cost;
 const result={...cost};migrateCurrencyWallet(result);return result;
}
