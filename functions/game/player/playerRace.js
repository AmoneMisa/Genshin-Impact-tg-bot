import {RACE_TITLES, classIdOf, raceOf} from '../../../template/l2ClassMeta.js';

// A purchased race change preserves the class template and all combat values.
export function playerRace(session) {
  return Object.hasOwn(RACE_TITLES, session?.game?.race) ? session.game.race
    : raceOf(classIdOf(session?.game?.gameClass?.stats?.name));
}
