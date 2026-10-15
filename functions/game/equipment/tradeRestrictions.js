// Time-limited and shadow equipment is character-bound, including old copies
// saved before explicit binding flags were introduced.
export const equipmentTransferBlocked = item => Boolean(item?.timed || item?.shadow
  || item?.bound || item?.noTrade || item?.tradeable === false || item?.canTrade === false);
