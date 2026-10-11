// Rooms of a catacomb. A catacomb is a grid of rooms (columns x rows, like a dungeon map): the hero walks between
// neighbouring rooms, every room holds its own monsters and they come back some time after they were killed.
// A big hall holds 11-12 monsters, a small chamber 3-5. An open field is one wide area of FIELD_CAP monsters.
// The layout is derived from the zone id, so it is the same for every hero and needs no storage.

export const GRID_COLS = 4;
export const GRID_ROWS = 3;
export const FIELD_CAP = 5;
export const START_CAP = 3;
const BIG_ROOMS = 3;

function seeded(text) {
    let hash = 2166136261;
    for (const char of String(text)) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
    let state = hash >>> 0;
    return () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export const roomId = (row, col) => `r${row}c${col}`;
const HALL_NAMES = ['Большой зал', 'Зал склепов', 'Тронный зал', 'Зал павших', 'Зал свечей'];
const CHAMBER_NAMES = ['Малый склеп', 'Келья', 'Ниша', 'Погребальная камера', 'Кладовая', 'Караулка', 'Ход', 'Усыпальница'];

const layouts = new Map();

/** {cols, rows, startId, rooms: [{id, row, col, big, cap, name}]} of a zone; an open field is a single room. */
export function roomLayout(zone) {
    const key = zone?.id || 'none';
    if (layouts.has(key)) return layouts.get(key);
    let layout;
    if (zone?.kind !== 'catacomb') {
        layout = {cols: 1, rows: 1, startId: roomId(0, 0), map: false,
            rooms: [{id: roomId(0, 0), row: 0, col: 0, big: false, cap: FIELD_CAP, name: zone?.title || 'Поле'}]};
    } else {
        const random = seeded(`rooms:${key}`);
        const cells = [];
        for (let row = 0; row < GRID_ROWS; row += 1) for (let col = 0; col < GRID_COLS; col += 1) cells.push({row, col});
        const candidates = cells.filter(cell => cell.row !== 0 || cell.col !== 0).map(cell => roomId(cell.row, cell.col));
        const bigIds = new Set();
        while (bigIds.size < BIG_ROOMS) bigIds.add(candidates[Math.floor(random() * candidates.length)]);
        let hall = 0, chamber = 0;
        const rooms = cells.map(({row, col}) => {
            const start = row === 0 && col === 0;
            const big = bigIds.has(roomId(row, col));
            const cap = start ? START_CAP : big ? 11 + Math.floor(random() * 2) : 3 + Math.floor(random() * 3);
            const name = start ? 'Вход в катакомбы' : big ? `${HALL_NAMES[hall++ % HALL_NAMES.length]}` : `${CHAMBER_NAMES[chamber++ % CHAMBER_NAMES.length]}`;
            return {id: roomId(row, col), row, col, big, cap, name};
        });
        layout = {cols: GRID_COLS, rows: GRID_ROWS, startId: roomId(0, 0), map: true, rooms};
    }
    layouts.set(key, layout);
    return layout;
}

export const roomById = (zone, id) => roomLayout(zone).rooms.find(room => room.id === id) || null;

/** True when the two rooms share a wall (one step along a row or a column). */
export const adjacent = (a, b) => Boolean(a && b) && Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

/**
 * Where `count` monsters stand: the three of a small entrance in a row like the first fields, more of them in rows
 * of four in the upper part of the area (the hero enters from the bottom).
 */
export function slotPositions(count) {
    if (count === 3) return [{x: .2, y: .3}, {x: .5, y: .5}, {x: .8, y: .3}];
    const perRow = count <= 5 ? 3 : 4;
    const rows = Math.ceil(count / perRow);
    const result = [];
    for (let index = 0; index < count; index += 1) {
        const row = Math.floor(index / perRow);
        const inRow = Math.min(perRow, count - row * perRow);
        const column = index % perRow;
        const x = .12 + (column + .5) / inRow * .76 + (row % 2 ? .04 : -.04);
        const y = rows === 1 ? .35 : .12 + row * (.43 / (rows - 1));
        result.push({x: Math.max(.1, Math.min(.9, x)), y});
    }
    return result;
}

/** How tall the battle area is drawn for that many monsters (px). */
export const groundHeight = count => (count > 8 ? 400 : count > 5 ? 330 : 260);
