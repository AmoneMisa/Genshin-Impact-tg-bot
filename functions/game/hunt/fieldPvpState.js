import {isMagicClass} from '../classes/classFamily.js';
import {l2ActionBlock} from '../player/l2Effects.js';

export const PVP_FLAG_MS = 120000;
export const FIELD_PRESENCE_MS = 20000;

export function ensureFieldPvp(session) {
    return session.game.worldPvp ||= {flagUntil:0, karma:0, pkKills:0, pvpKills:0, log:[], effects:{}};
}

export function fieldPvpStatus(session, now = Date.now()) {
    const state = session.game.worldPvp || {};
    const karma = Math.max(0, Number(state.karma) || 0);
    return {status:karma > 0 ? 'pk' : state.flagUntil > now ? 'flagged' : 'neutral', karma, pkKills:state.pkKills || 0, pvpKills:state.pvpKills || 0, flagRemainMs:Math.max(0,(state.flagUntil || 0)-now)};
}

export function fieldPvpEffect(session, kind, now = Date.now()) {
    return (session.game.worldPvp?.effects?.debuffs || []).find(e => e.kind === kind && e.until > now)?.amount || 0;
}

export function fieldPvpSkillBlock(session, skill, now) {
    const abnormal=l2ActionBlock(session,{magic:isMagicClass(session.game.gameClass?.stats?.name),attack:Boolean(skill?.isDealDamage)},now);
    if(abnormal)return abnormal;
    if ((session.game.worldPvp?.effects?.stunUntil || 0) > now) return 'pvp_stunned';
    if (fieldPvpEffect(session, 'mute', now) > 0 && isMagicClass(session.game.gameClass?.stats?.name)) return 'pvp_silenced';
    return null;
}

export function fieldIsPresent(session, now) {
    const hunt = session.game?.hunt;
    return Boolean(hunt?.field && now - (hunt.field.seenAt ?? hunt.lastActionAt ?? 0) <= FIELD_PRESENCE_MS &&
        session.game.gameClass?.stats?.hp > 0 && !(session.game.respawnTime > now));
}

export function fieldPvpLog(session, text, now) {
    const state = ensureFieldPvp(session);
    state.log = [{at:now,text}, ...(state.log || [])].slice(0,8);
}

/** Only a rewarded PvE kill can reduce karma; PK count is permanent here. */
export function reduceHuntKarma(session, rewards) {
    const state = session.game.worldPvp;
    if (!state?.karma || !(rewards.exp > 0)) return 0;
    const amount = Math.min(state.karma, 25);
    state.karma -= amount;
    return amount;
}
