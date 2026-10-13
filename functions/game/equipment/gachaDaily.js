export const DAILY_GACHA_SPINS=3;
export function gachaDay(now=Date.now()){return new Date(now).toISOString().slice(0,10);}
export function dailyGacha(session,now=Date.now()){
 const day=gachaDay(now),game=session.game;
 if(!game.gachaDaily||game.gachaDaily.day!==day)game.gachaDaily={day,remaining:DAILY_GACHA_SPINS};
 game.gachaDaily.remaining=Math.max(0,Math.min(DAILY_GACHA_SPINS,Math.floor(Number(game.gachaDaily.remaining)||0)));
 return game.gachaDaily;
}
