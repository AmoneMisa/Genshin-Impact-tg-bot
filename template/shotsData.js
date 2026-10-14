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
export const SHOTS_PER_CAST = Object.freeze({noGrade: 1, D: 2, C: 3, B: 3, A: 4, S: 5});

/** Shots exist only up to S: S80 and S84 weapons burn plain S charges, as in High Five. */
export const SHOT_CHARGE_GRADES = Object.freeze(['noGrade', 'D', 'C', 'B', 'A', 'S']);
export const chargeGrade = grade => (grade === 'S80' || grade === 'S84' ? 'S' : grade);

/** Gold for a pack of SHOT_PACK charges of a grade (plain shots; a blessed one costs `price` times more). */
export const SHOT_PACK = 100;
// High Five shop prices on the game's 0.25 gold scale (D 14, C 22, B 50, A 80, S 100 per shot).
export const SHOT_PACK_PRICE = Object.freeze({noGrade: 100, D: 350, C: 550, B: 1250, A: 2000, S: 2500});

// Blessed charges must never share a counter with generic blessed enchant scrolls.
export const shotKey = (kind, grade) => `${kind === 'blessed' ? 'blessedshot' : kind}_${chargeGrade(grade)}`;
export const gradeLabel = grade => (grade === 'noGrade' ? 'NG' : grade);
