// Soulshots and Spiritshots (Lineage II): charges of the weapon's grade that boost the damage of a
// skill. Soulshots are for fighters, Spiritshots for mage and priest lines, a Blessed Spiritshot hits
// harder than a plain Spiritshot. See functions/game/shots/shots.js.
export const SHOT_GRADES = Object.freeze(['noGrade', 'D', 'C', 'B', 'A', 'S', 'S80', 'S84']);

export const SHOT_KINDS = Object.freeze([
    {id: 'soulshot', label: 'Заряд души', icon: '🔸', boost: 1.5, price: 1},
    {id: 'spiritshot', label: 'Заряд духа', icon: '🔹', boost: 1.5, price: 1},
    {id: 'blessed', label: 'Благословенный заряд духа', icon: '💠', boost: 1.8, price: 3},
]);

/** Charges one damage skill burns, by the grade of the weapon (heavier weapons burn more). */
export const SHOTS_PER_CAST = Object.freeze({noGrade: 1, D: 2, C: 3, B: 3, A: 4, S: 5, S80: 6, S84: 6});

/** Gold for a pack of SHOT_PACK charges of a grade (plain shots; a blessed one costs `price` times more). */
export const SHOT_PACK = 100;
export const SHOT_PACK_PRICE = Object.freeze({noGrade: 100, D: 300, C: 800, B: 2000, A: 5000, S: 12000, S80: 20000, S84: 30000});

export const shotKey = (kind, grade) => `${kind}_${grade}`;
export const gradeLabel = grade => (grade === 'noGrade' ? 'NG' : grade);
