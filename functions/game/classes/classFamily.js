import classStats from '../../../template/classStatsTemplate.js';

/** The base class a class belongs to (crusader -> warrior). Unknown names stay as they are. */
export function classFamily(className) {
    return classStats.find(item => item.name === className)?.family || className;
}

/** Mage and priest lines (including every profession) never miss with skills. */
export function isMagicClass(className) {
    return ['mage', 'priest'].includes(classFamily(className));
}
