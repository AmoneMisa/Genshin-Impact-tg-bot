import {MAX_LEVEL} from '../../../template/levelsTemplate.js';
export const SUBCLASS_START_LEVEL = 40;
export const SUBCLASS_MAX_LEVEL = 80;
export const MAX_SUBCLASSES = 3;
export const activeProfessionIndex = session => Number.isInteger(session?.game?.professions?.activeIndex) ? session.game.professions.activeIndex : 0;
export const playerLevelCap = session => activeProfessionIndex(session)>0 ? SUBCLASS_MAX_LEVEL : MAX_LEVEL;
export const playerLevelFloor = session => activeProfessionIndex(session)>0 ? SUBCLASS_START_LEVEL : 1;
