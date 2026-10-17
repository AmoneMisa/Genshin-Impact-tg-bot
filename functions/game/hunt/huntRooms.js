import {explorationZone,explorationSection} from '../../../template/huntExploration.js';
// Rooms of a zone. A catacomb is a grid of rooms (columns x rows, like a dungeon map): the hero walks between
// neighbouring rooms, every room holds its own monsters and they come back some time after they were killed.
// A big hall holds 11-12 monsters, a small chamber 3-5. Each open-field section holds FIELD_CAP monsters.
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

// Visual themes and local collision layouts are an explicit adaptation, not L2 geodata.
export function roomEnvironment(zone){
    const id=zone?.id||'';
    if(id.startsWith('necropolis'))return 'necropolis';
    if(/forge|gods|volcan|blazing/.test(id))return 'volcanic';
    if(/hot-springs/.test(id))return 'springs';
    if(/swamp|marsh|spores/.test(id))return 'marsh';
    if(/hellbound|desert|varka|wall-of-argos/.test(id))return 'desert';
    if(/devils|cave|antharas/.test(id))return 'cavern';
    if(zone?.kind==='catacomb'||/tower|temple|monastery/.test(id))return 'catacomb';
    return 'woodland';
}

/** {cols, rows, startId, rooms: [{id, row, col, big, cap, name}]} of a zone; reviewed fields have a local fork. */
export function roomLayout(zone) {
    const key = zone?.id || 'none';
    if (layouts.has(key)) return layouts.get(key);
    let layout;
    if(zone?.instance?.kind==='rift'){const rooms=(zone.riftRooms||[]).map((r,i)=>({...r,row:Math.floor(i/3),col:i%3,big:r.cap>=10,name:'Комната Разлома '+(i+1),walls:[{x:.35,y:.45,w:.3,h:.08}]}));layout={cols:3,rows:Math.ceil(rooms.length/3),startId:rooms[0].id,map:false,rooms};}
    else if (zone?.instance && zone.instance.kind !== 'rift') {
        layout={cols:1,rows:1,startId:roomId(0,0),map:false,rooms:[{id:roomId(0,0),row:0,col:0,big:true,cap:zone.instance.kind==='labyrinth'?8:1,name:zone.title,walls:zone.instance.kind==='labyrinth'?[{x:.35,y:.4,w:.3,h:.08}]:[]}]};
    } else if (explorationZone(key) && zone?.kind !== 'catacomb') {
        // A local fork, not an invented extension of the authoritative world map.
        const cells=[{row:0,col:0},{row:0,col:1},{row:1,col:0}];
        layout={cols:2,rows:2,startId:roomId(0,0),map:true,exploration:true,rooms:cells.map(({row,col})=>({
            id:roomId(row,col),row,col,big:false,cap:FIELD_CAP,name:explorationSection(key,roomId(row,col)).name
        }))};
    } else if (zone?.kind !== 'catacomb') {
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
            const name = start ? (key.startsWith('necropolis')?'Вход в некрополь':'Вход в катакомбы') : big ? `${HALL_NAMES[hall++ % HALL_NAMES.length]}` : `${CHAMBER_NAMES[chamber++ % CHAMBER_NAMES.length]}`;
            return {id: roomId(row, col), row, col, big, cap, name, walls: big ? [{x:.38,y:.12,w:.13,h:.08},{x:.83,y:.53,w:.08,h:.12}] : []};
        });
        layout = {cols: GRID_COLS, rows: GRID_ROWS, startId: roomId(0, 0), map: true, rooms};
    }
    const environment=roomEnvironment(zone),indoor=['catacomb','necropolis'].includes(environment);
    for(const room of layout.rooms){
        room.environment=environment;room.layoutSource='adapted';
        const section=explorationSection(key,room.id);
        if(section){room.landmark=section.name;room.sceneVariant=section.index;}
        // Stable per-room variation, with clear central aisles and cardinal doorways.
        const random=seeded(`scenery:${key}:${room.id}`);
        const features=(indoor?[[.26,.17],[.7,.37],[.17,.76]]:[[.12,.39],[.77,.64],[.65,.1],[.23,.77]])
            .map(([x,y])=>({x:x+(random()-.5)*.06,y:y+(random()-.5)*.06,
                w:indoor?.065:.055+random()*.03,h:indoor?.065:.055+random()*.03,
                kind:indoor?'pillar':['woodland','marsh'].includes(environment)?'tree':'rock'}));
        // World bounds already contain actors. Painted perimeter architecture needs
        // no additional wall strips protruding into otherwise traversable entrances.
        room.walls=[...(room.walls||[]).map(w=>({...w,kind:w.kind||'stone'})),...features];
        if(environment==='necropolis')room.walls.push({x:.1,y:.54,w:.07,h:.13,kind:'sarcophagus'},{x:.8,y:.18,w:.1,h:.07,kind:'sarcophagus'});
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
