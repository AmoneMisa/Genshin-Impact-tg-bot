// SP is stored and charged in original High Five units. Only legacy/custom data uses conversion.
export const LEGACY_SP_UNIT = 20000;
export const SP_ECONOMY_VERSION = 1;
export const legacySp = amount => Math.max(0, Math.round((Number(amount) || 0) * LEGACY_SP_UNIT));
export function migrateSpEconomy(session) {
 const game=session?.game;
 if(!game?.inventory || game.spEconomyVersion >= SP_ECONOMY_VERSION) return false;
 game.inventory.sp=legacySp(game.inventory.sp);
 // Pending prizes and attached SP were created before the unit change.
 const reward=game.gachaTempItem;
 if(reward?.rewardRef==='sp') reward.amount=legacySp(reward.amount);
 for(const letter of game.mailbox||[]) for(const reward of letter.rewards||[]) if(reward.kind==='sp') reward.amount=legacySp(reward.amount);
 game.spEconomyVersion=SP_ECONOMY_VERSION;
 session.needsSave=true;
 return true;
}

// Budget for custom academy/build rewards; retains their pre-migration purchasing power.
export const customSpBudget = level => legacySp(20 + Math.floor(1.5 * (Math.max(1, Number(level)||1) - 1)));
