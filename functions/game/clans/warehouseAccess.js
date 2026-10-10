export const MAX_CO_LEADERS=2;
export function coLeaders(clan){return (clan?.members||[]).filter(m=>m.role==='officer').slice(0,MAX_CO_LEADERS);}
export function canWithdrawClan(clan,userId){return Boolean(clan)&& (String(clan.owner)===String(userId)||coLeaders(clan).some(m=>String(m.userId)===String(userId)));}
export function canDepositClan(clan,userId){return Boolean(clan?.members?.some(m=>String(m.userId)===String(userId)));}
