// Boss phases: when the boss's hp share drops below a phase's `at`, that phase
// fires once - it announces itself, summons minions, enrages the boss (more
// damage) and/or heals it. Checked after every player hit and on each boss tick,
// so a phase can never be skipped by a big hit (several can fire at once).
import {bossTemplateFor, spawnMinions} from './bossUnits.js';

export const EVENT_LOG_SIZE = 6;

export function addBossEvent(boss, event, now = Date.now()) {
    boss.eventLog = [{at: now, ...event}, ...(Array.isArray(boss.eventLog) ? boss.eventLog : [])].slice(0, EVENT_LOG_SIZE);
    boss.markModified?.('eventLog');
}

/** Fires every phase the boss has dropped below; returns the events (oldest first). */
export function advanceBossPhases(boss, now = Date.now(), template = bossTemplateFor(boss)) {
    const phases = template?.phases || [];
    const events = [];
    if (!boss?.hp || boss.currentHp <= 0) return events;

    let index = Number(boss.phaseIndex) || 0;
    while (index < phases.length && boss.currentHp / boss.hp <= phases[index].at) {
        const phase = phases[index];
        const event = {icon: phase.icon || '⚠️', text: phase.say || 'Босс меняет тактику!'};
        if (phase.summon?.length) {
            event.summoned = spawnMinions(boss, phase.summon, now, template).map(unit => unit.name);
        }
        if (phase.enrage) {
            boss.enrage = (Number(boss.enrage) || 0) + phase.enrage;
            event.enrage = phase.enrage;
        }
        if (phase.heal) {
            boss.currentHp = Math.min(boss.hp, boss.currentHp + Math.round(boss.hp * phase.heal));
            event.heal = phase.heal;
        }
        events.push(event);
        addBossEvent(boss, event, now);
        index++;
    }
    boss.phaseIndex = index;
    return events;
}
