import {enhanceSelects} from './design/select.js';
import {createPoller} from './polling.js';
import {materialIcon} from './material-icons.js';
import {updateDeathPopup} from './death-popup.js';
import {displayedPosition} from './map-rendering.js';
import {l2CategoryIcon,l2IconHtml} from './art/l2-icon-art.js';
import {huntZoneUrl,huntMobUrl} from './art/hunt-art.js';
import {shotIcon,elementIcon,championIcon} from './art/painted-icon-art.js';
import { bar, escapeHtml, formatDuration, formatNumber, hotbar, hotbarChoice, playerFrame, potionBar, statusIcons } from './boss-hud.js';
import { l2SkillIcon } from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import {icon,emojiIconName} from './icons.js';
import {classArtUrl} from './boss-stage.js';
import {systemToast} from './system-toasts.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {installGameRules} from './game-rules.js';
import {originalIcon} from './art/l2-gameplay-icons.js';
import {isoMatrix,isoPoint,isoPick,isoTerrain,isoLabelOffsets} from './hunt-isometric.js';
import {createHuntRenderer} from './hunt-phaser.js';
import {lootToast,showLootDetails} from './loot-notice.js';

// Hunting fields (Lineage II style): pick a zone, fight one mob at a time in real time with skills,
// potions and shots. Blue and red champions are tougher and pay much more.

const REASONS = {room_in_combat:'Нельзя уйти из комнаты, пока монстры в бою: сначала победи их или отступи.',room_not_adjacent:'В эту комнату нельзя пройти напрямую.',no_active_crystal:'Выбери кристалл души.',no_soul_crystal:'Этот кристалл уже израсходован.',soul_level:'Прокачка кристаллов доступна с 40 уровня.',soul_max_stage:'Кристалл достиг 17 уровня.',soul_wrong_mob:'Душа этого монстра не подходит для текущей ступени.',soul_hp:'Используй кристалл, когда HP монстра будет не выше 50%.',soul_already_charged:'Кристалл уже использован на этом монстре.',invalid_seals:'Недостаточно камней печати.',
  effect_betray:'На тебе предательство.',effect_distrust:'На тебе смятение.',
  pvp_invalid_target:'Игрок недоступен для нападения.',pvp_not_here:'Игрок покинул локацию.',pvp_out_of_range:'Подойди ближе к игроку.',pvp_force_required:'Для атаки мирного игрока включи принудительную атаку.',pvp_stunned:'Ты оглушён.',pvp_silenced:'Магия заблокирована молчанием.',
  unknown_zone: 'Такой зоны нет.',
  already_fighting: 'Ты уже сражаешься.',
  dead: 'Персонаж погиб и ещё не воскрес.',
  no_combat_class: 'Сначала выбери класс.',
  no_mob: 'Врага уже нет.',
  invalid_skill: 'Навык больше недоступен.',
  skill_locked: 'Навык откроется на более высоком уровне.',
  not_enough_resource: 'Недостаточно HP или MP для навыка.',
  cooldown: 'Навык ещё в откате.',
  no_ammo:'Закончились стрелы или болты.',
  effect_blocked:'Состояние персонажа не позволяет выполнить действие.',
  path_blocked:'К этой точке нельзя пройти.',
  combat_data_missing:'Для этого действия ещё нет проверенных данных дальности.',
};
REASONS.pvp_line_of_sight='Цель скрыта за препятствием.';
const POTION_REASONS = {
  potion_empty: 'Это зелье закончилось.',
  player_dead: 'Нельзя пить зелье, пока персонаж мёртв.',
  hp_full: 'HP уже полное.',
  mp_full: 'MP уже полное.',
};
const ELEMENT_ICONS = Object.fromEntries(['fire','water','wind','earth','holy','dark'].map(element=>[element,elementIcon(element)]));
const CHAMPION = { blue: { icon: championIcon('blue'), label: 'Синий чемпион' }, red: { icon: championIcon('red'), label: 'Красный чемпион' } };

export async function openHuntGame({ api, renderState, haptic, statusElement,initialZoneKind='field',onOpenAtlas }) {
  let state = await api('/api/hunt');
  if(!state.field){const {openWorldMap}=await import('./world-map.js');return openWorldMap({api,renderState,haptic,statusElement,initialLayer:initialZoneKind==='catacomb'?'dungeons':'hunt'});}
  let zoneKind=initialZoneKind==='catacomb'?'catacomb':'field';
  let skillTab = 'skills'; let editBar = false; let barDraft = [];
  let pending = false;
  let feedback = '';
  let lastLog = state.log?.[0]?.text || '';
  let dropOpen = false;
  let playerTarget = null;
  let forceAttack = false;
  let previewSkill=null,closed=false,lastFrame=0;
  let viewport={width:320,height:400},camera={zoom:1,x:0,y:0},labelOffsets=new Map(),drag=null,ignoreMapClick=false;
  const fieldRenderer=createHuntRenderer();
  const mapObserver=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box&&Math.abs(box.width-viewport.width)+Math.abs(box.height-viewport.height)>2){viewport={width:box.width,height:box.height};render();}});
  const detailsOpen=new Set();
  installOverlayA11y();installGameRules();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay hunt-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel hunt-panel" role="dialog" aria-modal="true" aria-labelledby="hunt-heading">
      ${dialogHeading('Бой',{id:'hunt-heading',rules:'Нажми на противника, чтобы выбрать цель. Атака — подойти и атаковать оружием; повторное нажатие выключает автоатаку. Нажатие на своего персонажа останавливает движение и применение умения. Умение — подойти на его дальность и применить. Нажатие на землю отменяет действие и ведёт к точке. Выходы на краях поля ведут в соседние комнаты. Tab — следующая цель, Escape — остановиться. Массовые атаки зависят от оружия и самого умения.'})}
      <div data-hunt-content></div>
      <div class="boss-feedback" data-hunt-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-hunt-content]');
  const feedbackNode = overlay.querySelector('[data-hunt-feedback]');
  let animation=0,receivedAt=Date.now();
  let timer = 0;
  let pollTimer = 0;
  const close = () => {
    if(closed)return;closed=true;
    cancelAnimationFrame(animation);window.clearInterval(timer);mapObserver.disconnect();fieldRenderer.destroy();
    document.removeEventListener('visibilitychange',visibility);
    overlay.removeEventListener('keydown',keyboard);
    overlay.removeEventListener('overlay-escape',escapeAction);
    pollTimer?.stop();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('[data-dismiss]').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  // the system chat floats over the screen instead of taking room in the page
  const say = text => { feedback = ''; systemToast(text); };
  let lastLogKeys = null;
  function floatNewLog() {
    const rows = [...(state?.log || []), ...(!state.field?(state?.pvpLog || []):[])].filter(row => Number(row.at) > 0).sort((a, b) => a.at - b.at);
    if (!rows.length) return;
    // the first state only sets the mark: the old journal is not replayed
    const key=row=>row.id?`hunt:${row.id}`:`${row.at}:${row.icon}:${row.text}`;
    if (lastLogKeys !== null) {
      for (const row of rows.filter(row => !lastLogKeys.has(key(row)))) {
        if(row.loot)lootToast(row.loot);
        else systemToast(row.text, icon(row.icon === '⚑' ? 'flag' : emojiIconName(row.icon) || 'swords'));
      }
    }
    lastLogKeys = new Set(rows.map(key));
  }

  function take(payload) {
    if (payload?.hunt){state = payload.hunt;receivedAt=Date.now();}
    if (payload?.state) renderState(payload.state);
  }

  async function run(path, body, { heavy = false } = {}) {
    if (pending) return null;
    pollTimer?.invalidate();
    pending = true;
    overlay.classList.add('busy');
    haptic(heavy ? 'heavy' : 'light');
    try {
      const payload = await api(path, { method: 'POST', body: JSON.stringify(body || {}) });
      take(payload);
      return payload;
    } catch (error) {
      take(error.payload);
      say(REASONS[error.payload?.reason] || error.message);
      statusElement.textContent = `Бой: ${REASONS[error.payload?.reason] || error.message}`;
      haptic('light');
      return null;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function describeResult(payload) {
    if(payload.queued)return payload.phase==='approach'?'Подходим к цели.':'Применяем умение.';
    const result = payload.result || {};
    let text = 'Навык использован.';
    if(result.missed)return 'Промах.';
    if (result.type === 'damage') {
      text = `Урон: ${formatNumber(result.dmg)}${result.isHasCritical ? ' · КРИТ' : ''}`;
      if (result.hits?.length > 1) text += ` · ${result.hits.length} удара`;
      if (result.vampire) text += ` · вампиризм ${formatNumber(result.vampire)}`;
    } else if (result.type === 'heal') text = `Восстановлено ${formatNumber(result.heal)} HP`;
    else if (result.type === 'shield') text = `Щит: ${formatNumber(result.shield)}`;
    else if (result.type === 'buff') text = 'Усиление наложено';
    else if (result.type === 'debuff') text = result.debuffs?.some(item => item.kind === 'stun' && item.applied) ? 'Враг оглушён!' : 'Враг ослаблен';
    else if (result.type === 'restore') text = `Мана +${formatNumber(result.restoredMp)}`;
    if (payload.shots) text += ` · заряды −${payload.shots.spent}`;
    if (payload.killed && payload.rewards) {
      const r = payload.rewards;
      const items = (r.items || []).map(item => `${item.name} ×${item.amount}`).join(', ');
      text = `${r.champion ? `${CHAMPION[r.champion].label} · ` : ''}Враг повержен: +${formatNumber(r.exp)} опыта${r.bonus > 1 ? ` (Vitality ×${r.bonus})` : ''}, +${formatNumber(r.sp)} SP${r.gold ? `, +${formatNumber(r.gold)} адены` : ''}${items ? `, ${items}` : ''}${r.leveledUp ? ' · НОВЫЙ УРОВЕНЬ!' : ''}`;
    }
    if(payload.rewards?.soulCrystal){const r=payload.rewards.soulCrystal;text+=' · Кристалл души: '+(r.outcome==='success'?r.from+' → '+r.stage:'ступень не изменилась');}
    if(playerTarget){const loss=[[result.cpLost,'CP'],[result.hpLost,'HP']].filter(([amount])=>amount>0).map(([amount,resource])=>'−'+formatNumber(amount)+' '+resource).join(' · ');if(loss)text=loss;if(payload.killed)text+=payload.pk?' · Убийство мирного игрока: PK и карма':' · Игрок повержен';}
    return text;
  }

  async function start(zone) {
    if(state.world?.mode){close();if(onOpenAtlas)onOpenAtlas();else{const {openWorldMap}=await import('./world-map.js');openWorldMap({api,renderState,haptic,statusElement});}return;}
    const payload = await run('/api/hunt/start', { zone }, { heavy: true });
    if (payload) say('Ты на поле боя. Выбери цель и используй навык, либо подойди к монстрам.');
    render();
  }

  async function skill(index, ctrlKey=false) {
    const payload = await run('/api/hunt/skill', { skillIndex: Number(index), ...(playerTarget?{targetUserId:playerTarget,force:forceAttack || ctrlKey}:{}) }, { heavy: true });
    if (payload) {
      if(playerTarget && payload.result?.type==='damage')say(payload.killed?(payload.pk?'Убийство мирного игрока: PK и карма':'Игрок повержен'):'');
      else if(!state.field)say(describeResult(payload));
      if (payload.killed && payload.rewards?.champion) haptic('heavy');
    }
    render();
  }

  async function flee() {
    const payload = await run('/api/hunt/flee');
    if (payload) say('Свиток применяется 15 секунд. Движение и урон прерывают применение.');
    render();
  }

  async function drink(key) {
    if (pending) return;
    pollTimer?.invalidate();
    pending = true;
    try {
      haptic('light');
      const payload = await api('/api/inventory/use', { method: 'POST', body: JSON.stringify({ key }) });
      if (payload.state) renderState(payload.state);
      state = await api('/api/hunt');
      say(`Выпито: ${payload.potion?.name || 'зелье'} (+${formatNumber(payload.restored)} ${payload.resource === 'mp' ? 'MP' : 'HP'}).`);
    } catch (error) {
      say(POTION_REASONS[error.payload?.reason] || error.message);
    } finally {
      pending = false;
      render();
    }
  }

  async function toggleShots() {
    const payload = await run('/api/shots/auto', { enabled: !state.shots.enabled });
    if (payload) say(state.shots.enabled ? 'Автозаряды включены.' : 'Автозаряды выключены.');
    render();
  }

  function shotsHtml() {
    const shots = state.shots;
    if (!shots?.grade) return '<div class="hunt-shots off"><span>'+shotIcon('spiritshot','noGrade')+' Заряды</span><small>Надень оружие, чтобы использовать заряды.</small></div>';
    const kinds = shots.kinds.map(kind => `<em title="${escapeHtml(kind.label)}">${shotIcon(kind.id,shots.grade,kind.icon)} ${formatNumber(kind.count)}</em>`).join('');
    return `<div class="hunt-shots ${shots.enabled ? 'on' : ''}">
      <span>Заряды ${shots.grade === 'noGrade' ? 'NG' : escapeHtml(shots.grade)} · ${shots.perCast}/удар</span>${kinds}
      <button type="button" class="ui-button ui-compact hunt-toggle" data-shots>${shots.enabled ? 'Авто: вкл' : 'Авто: выкл'}</button>
    </div>`;
  }

  function vitalityHtml() {
    const vit = state.vitality;
    if (!vit) return '';
      return `<div class="hunt-vitality" title="${formatNumber(vit.points)} / ${formatNumber(vit.max)} · Vitality усиливает опыт, пока полоса не опустеет"><span>Vitality</span><div class="hunt-vit-track"><i style="width:${Math.max(0,Math.min(100,vit.max>0?vit.points/vit.max*100:0))}%"></i><b>Опыт ×${Math.round(vit.rate * vit.bonus * 10) / 10}</b></div></div>`;
  }

  function mobFrame(mob) {
    const champion = mob.champion ? CHAMPION[mob.champion] : null;
    const statuses = [];
    if (mob.stunned) statuses.push({ id: 'stun', label: 'Оглушён' });
    for (const buff of mob.buffs || []) statuses.push({id:'damageUp',label:'Атака усилена',count:Math.ceil(buff.remainMs/1000)});
    for (const debuff of mob.debuffs || []) {
      if (debuff.kind === 'stun') continue;
      statuses.push({ id: debuff.kind, label: debuff.kind === 'armorBreak' ? 'Броня разбита' : 'Ослаблен', description: `−${Math.round(debuff.amount * 100)}%`, count: Math.ceil(debuff.remainMs / 1000) });
    }
    return `
    <section class="mmo-frame target-frame hunt-mob ui-hud-content ${mob.champion ? `champion ${mob.champion}` : ''}">
      <span class="mmo-portrait boss hunt-mob-icon"><em>${formatNumber(mob.level)}</em>${huntMobUrl(mob)?`<img class="hunt-mob-art" src="${huntMobUrl(mob)}" srcset="${huntMobUrl(mob)} 1x, ${huntMobUrl(mob,256)} 2x" width="64" height="64" alt="" decoding="async">`:icon('ghost')}${champion?`<span class="hunt-champion-badge">${champion.icon}</span>`:''}</span>
      <span class="mmo-frame-body">
        <span class="mmo-frame-title"><strong>${escapeHtml(mob.name)}</strong><small>${champion ? escapeHtml(champion.label) : escapeHtml(mob.role || 'Моб')}${mob.element ? ` · ${ELEMENT_ICONS[mob.element] || ''}` : ''}</small></span>
        ${bar('hp', mob.currentHp, mob.hp)}
        ${!state.field||mob.aggro?`<span class="hunt-swing"><small data-hunt-next data-until="${Date.now() + mob.nextAttackMs}" data-total="${mob.attackMs}">…</small><i data-hunt-swing></i></span>`:'<small class="hunt-peace">Не в бою · выбор цели не вызывает агрессию</small>'}
        ${statusIcons(statuses)}
      </span>
    </section>`;
  }

  const LOOT_GROUPS = [['gold','Адена'],['full','Снаряжение целиком'],['piece','Части и камни для сборки'],['recipe','Рецепты'],['scroll','Свитки заточки'],['lifestone','Камни жизни'],['attribute','Камни атрибутов'],['seal','Камни печати'],['dye','Краски'],['crystal','Кристаллы'],['material','Материалы'],['consumable','Расходники'],['herb','Травы'],['other','Прочее']];
  const OPEN_LOOT = ['gold','full','piece','scroll','lifestone','seal'];
  const lootCache = {}, lootOpen = new Set();
  let armorSets = [];
  const chanceText = value => value >= 100 ? '×' + new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value/100) : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:value < 1 ? 3 : 2}).format(value)+'%';
  // the custom set part has no item id of its own: it shows the client icon of the Lineage II set of its grade and type
  function customPartIcon(d) {
    const match = /^custom:([^:]+):([^:]+)$/.exec(String(d.key));
    if (!match) return '';
    const grade = match[1] === 'noGrade' ? 'NONE' : match[1], armor = {heavy:'HEAVY', light:'LIGHT', robe:'MAGIC'}[match[2]];
    const set = armorSets.find(row => row.grade === grade && row.armor === armor);
    const part = set?.parts.find(row => row.slot === 'chest') || set?.parts[0];
    return (part && l2IconHtml(part.art)) || l2CategoryIcon('full');
  }
  function dropRow(d) {
    return '<div>'+(customPartIcon(d)||materialIcon(d.key,escapeHtml(d.icon)))+'<span>'+escapeHtml(d.name)+'<small>×'+formatNumber(d.min)+(d.min===d.max?'':'–'+formatNumber(d.max))+'</small></span><b>'+chanceText(d.chance)+'</b></div>';
  }
  function dropsHtml(drops = []) {
    return '<div class="hunt-drop-groups">'+LOOT_GROUPS.map(([kind,label])=>{
      const rows = drops.filter(d=>(d.kind||'other')===kind);
      if (!rows.length) return '';
      return '<details class="hunt-drop-group" '+(OPEN_LOOT.includes(kind)?'open':'')+'><summary>'+l2CategoryIcon(kind)+' '+escapeHtml(label)+' · '+rows.length+'</summary><div class="hunt-drop-table">'+rows.map(dropRow).join('')+'</div></details>';
    }).join('')+'</div>';
  }
  function zoneLootHtml(zone) {
    const loot = lootCache[zone.id];
    if (!loot) return '<p class="hunt-loot-wait">Загружаю таблицу дропа…</p>';
    return loot.mobs.map(mob=>'<details><summary>'+escapeHtml(mob.name)+' · '+mob.level+' ур. · '+mob.drops.length+' предметов</summary>'+dropsHtml(mob.drops)+'</details>').join('');
  }
  // The armor sets (230 KB) are only needed for the loot tables, so they load with the first one, not at startup.
  async function loadZoneLoot(zoneId) {
    if (lootCache[zoneId]) return;
    if (!armorSets.length) await import('./art/l2-hf-armor-sets.js').then(m => { armorSets = m.L2_HF_ARMOR_SETS; }, () => {});
    try { lootCache[zoneId] = await api('/api/hunt/loot', { method: 'POST', body: JSON.stringify({ zone: zoneId }) }); } catch (error) { return; }
    render();
  }

  // The map of a catacomb: a grid of rooms, the neighbours of the current one are the way forward.
  function mapHtml(field){
    const map=field.map;if(!map)return '';
    const cells=map.rooms.map(r=>{
      const label=r.visited?escapeHtml(r.name):'Не исследовано';
      const count=r.mobs===null?'?':r.mobs+'/'+r.cap;
      const cls='hunt-room'+(r.current?' current':'')+(r.big?' big':'')+(r.visited?' visited':'')+(r.adjacent?' near':'');
      return '<button type="button" class="'+cls+'" '+(r.adjacent?'data-room="'+escapeHtml(r.id)+'"':'disabled')+' style="grid-column:'+(r.col+1)+';grid-row:'+(r.row+1)+'" title="'+label+' · '+(r.big?'большая':'малая')+' комната" aria-label="'+label+(r.current?' (ты здесь)':'')+'"><b>'+(r.current?icon('flag'):r.big?'▣':'▫')+'</b><small>'+count+'</small></button>';
    }).join('');
    return '<div class="hunt-map" style="grid-template-columns:repeat('+map.cols+',1fr)">'+cells+'</div>';
  }
  function areaHtml() {
    if(playerTarget)return '';
    const field=state.field;
    const geometry=previewSkill?.spatial||field.action?.spatial||(field.autoAttack&&field.attack?{target:'ONE',range:field.attack.range,radius:field.attack.type==='POLE'?field.attack.radius:0,angle:field.attack.angle,weapon:true}:null);
    if(!geometry||!field)return '';
    const mob=field.mobs.find(m=>m.instanceId===field.target);
    const aura=geometry.target?.endsWith('AURA')||geometry.weapon;
    const center=aura||!geometry.radius?field:mob;
    const radius=geometry.radius||geometry.range;
    if(!center||!radius)return '';
    let shape=`<circle cx="${center.x*1000}" cy="${center.y*1000}" r="${radius/2}"/>`;
    if(geometry.radius&&/FRONT|BEHIND/.test(geometry.target)||geometry.weapon&&geometry.radius){
      const heading=Math.atan2((mob?.y??field.y)-field.y,(mob?.x??field.x+1)-field.x)+(geometry.target?.startsWith('BEHIND')?Math.PI:0);
      const half=(geometry.angle||180)*Math.PI/360, r=radius/2,x=center.x*1000,y=center.y*1000;
      shape=`<path d="M ${x} ${y} L ${x+Math.cos(heading-half)*r} ${y+Math.sin(heading-half)*r} A ${r} ${r} 0 ${half>Math.PI/2?1:0} 1 ${x+Math.cos(heading+half)*r} ${y+Math.sin(heading+half)*r} Z"/>`;
    }
    const m=isoMatrix(viewport);
    return `<svg class="hunt-range" viewBox="0 0 ${viewport.width} ${viewport.height}" aria-hidden="true"><g transform="matrix(${m.a/1000},${m.b/1000},${m.c/1000},${m.d/1000},${m.e},${m.f})">${shape}</g></svg>`;
  }
  function worldStyle(point,id=null){const p=isoPoint(point,viewport),offset=labelOffsets.get(id)||{x:0,y:0};return `--label-x:${offset.x}px;--label-y:${offset.y}px;left:${p.x}px;top:${p.y}px;--map-marker-anchor:translate(-50%,-100%);z-index:${10+Math.round((point.x+point.y)*10)}`;}
  function playerMarker(player,self=false){
    const selected=!self&&String(player.userId)===String(playerTarget);
    return `<button type="button" class="${self?'hunt-hero-marker':'hunt-player-marker'} hunt-iso-actor ui-map-marker ui-player-presence ui-pvp-${player.pvp?.status||'neutral'} ${selected?'selected':''}" ${self?'data-hunt-halt':`data-pvp-target="${player.userId}"`} style="${worldStyle(player,self?'self':String(player.userId))}" aria-label="${escapeHtml(player.name||'Ты')}${player.clanName?' · '+escapeHtml(player.clanName):''}" ${self?'':'aria-pressed="'+selected+'"'}><span class="hunt-actor-label"><span class="hunt-presence-name ui-pvp-name">${escapeHtml(player.name||'Ты')}</span>${player.clanName?`<span class="hunt-presence-clan">${escapeHtml(player.clanName)}</span>`:''}</span><span class="hunt-iso-avatar"><img src="${classArtUrl(player.className,player.gender)}" alt=""></span></button>`;
  }
  function fieldHtml() {
    const field=state.field;if(!field)return '';
    const room=field.room||{};
    const actors=[...(state.players||[]).map(p=>({...p,id:String(p.userId),labelHeight:p.clanName?28:14})),{...state.player,x:field.x,y:field.y,id:'self',labelHeight:state.player.clanName?28:14},...field.mobs.map(m=>({...m,id:m.instanceId,labelHeight:38}))];
    const selected=playerTarget?String(playerTarget):field.target;
    actors.sort((a,b)=>Number(b.id===selected)-Number(a.id===selected));
    labelOffsets=isoLabelOffsets(actors,viewport);
    const arrows={north:'↗',south:'↙',east:'↘',west:'↖'};
    const sides={north:{x:.5,y:.025},south:{x:.5,y:.975},east:{x:.975,y:.5},west:{x:.025,y:.5}};
    const exits=(field.exits||[]).map(exit=>{const p=isoPoint(sides[exit.side],viewport);return `<button type="button" class="ui-button ui-compact hunt-exit ${exit.side}" data-room="${escapeHtml(exit.id)}" style="left:${p.x}px;top:${p.y}px" aria-label="Пройти: ${escapeHtml(exit.name)}" title="${escapeHtml(exit.name)}" ${pending?'disabled':''}>${arrows[exit.side]}</button>`;}).join('');
    return `<section class="hunt-battlefield ui-hud-content" aria-label="Поле боя">
      <div class="hunt-field-head"><strong>${escapeHtml(field.map?room.name:field.title)}</strong></div>
      <div class="hunt-ground hunt-isometric" tabindex="0" role="group" aria-label="Изометрическая комната: нажми на землю для движения, потяни для обзора.">
      <div class="hunt-world" style="transform:translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})">
      ${isoTerrain(field,viewport)}${areaHtml()}${strikeHtml()}
      ${(state.players||[]).map(p=>playerMarker(p)).join('')}
      ${field.mobs.map(m=>`<button type="button" class="hunt-actor hunt-iso-actor ui-map-marker ${!playerTarget&&m.instanceId===field.target?'selected ':''}${m.aggro?'aggro':''}" data-target="${escapeHtml(m.instanceId)}" style="${worldStyle(m,m.instanceId)}" aria-label="${escapeHtml(m.name)} · ${Math.round(m.hpPercent)}% HP" aria-pressed="${!playerTarget&&m.instanceId===field.target}"><span class="hunt-actor-label"><span class="hunt-mob-name">${escapeHtml(m.name)}</span><span class="hunt-mob-percent">${Math.round(m.hpPercent)}%</span></span><span class="hunt-iso-avatar">${huntMobUrl(m)?`<img src="${huntMobUrl(m)}" alt="" decoding="async">`:icon('ghost')}</span></button>`).join('')}
      ${playerMarker({...state.player,x:field.x,y:field.y},true)}
      ${field.action?.phase==='cast'?`<span class="hunt-cast" style="${worldStyle(field)}" role="progressbar" aria-label="${escapeHtml(field.action.name||'Применение умения')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100*(1-Math.max(0,field.action.until-state.now)/Math.max(1,field.action.spatial?.windup||1)))}"><span>${escapeHtml(field.action.name||'Применение умения')}</span><i style="--cast-time:${Math.max(0,field.action.until-state.now)}ms"></i></span>`:''}
      ${field.path?.length?`<span class="hunt-destination" style="${worldStyle(field.path.at(-1))}" aria-hidden="true">＋</span>`:''}
      ${exits}
      </div>
      ${state.pvpLog?.[0]&&state.now-state.pvpLog[0].at<8000?`<div class="hunt-scene-notice ui-hud" role="status">${escapeHtml(state.pvpLog[0].text)}</div>`:''}
      ${field.mobs.length?'':`<div class="hunt-field-cleared">Здесь нет монстров</div>`}
      </div>
    </section>`;
  }
  function strikeHtml(){
    const hit=state.field?.lastStrike;if(!hit)return '';
    const elapsed=Math.max(0,state.now-hit.at),remaining=Math.max(0,900-elapsed),from=isoPoint(hit,viewport),g=hit.spatial;
    const supportive=hit.kind!=='damage',kind=supportive?(hit.kind==='heal'?'heal':'buff'):hit.magic?'magic':'physical';
    const origin=g?.target?.endsWith('AREA')&&hit.targets?.[0]?hit.targets[0]:hit,center=isoPoint(origin,viewport),m=isoMatrix(viewport);
    let area=g?.radius>0?`<ellipse class="hunt-fx-area" cx="${center.x}" cy="${center.y}" rx="${m.a*Math.SQRT2*g.radius/2000}" ry="${m.b*Math.SQRT2*g.radius/2000}"/>`:'';
    if(g?.radius&&(g.weapon||/FRONT|BEHIND/.test(g.target))){
      const heading=(hit.facing||0)+(g.target?.startsWith('BEHIND')?Math.PI:0),half=(g.angle||180)*Math.PI/360;
      const arc=Array.from({length:17},(_,i)=>{const angle=heading-half+i*half/8;return isoPoint({x:origin.x+Math.cos(angle)*g.radius/2000,y:origin.y+Math.sin(angle)*g.radius/2000},viewport);});
      area=`<path class="hunt-fx-area" d="M${center.x},${center.y} ${arc.map(p=>`L${p.x},${p.y}`).join(' ')} Z"/>`;
    }
    const self=supportive?`<ellipse class="hunt-fx-area" cx="${from.x}" cy="${from.y-10}" rx="29" ry="35"/>`:'';
    return `<svg class="hunt-strike hunt-skill-fx ${kind}" style="--fx-delay:-${elapsed}ms" data-strike-until="${Date.now()+remaining}" viewBox="0 0 ${viewport.width} ${viewport.height}" aria-hidden="true">${area}${self}${(hit.targets||[]).map(t=>{const p=isoPoint(t,viewport);return `<path class="hunt-fx-trail" d="M${from.x},${from.y-24} Q${(from.x+p.x)/2},${Math.min(from.y,p.y)-55} ${p.x},${p.y-24}"/><circle class="hunt-fx-impact" cx="${p.x}" cy="${p.y-24}" r="25"/><text x="${p.x}" y="${p.y-60}">${t.missed?'Промах':(t.critical?'Крит ':'')+'−'+formatNumber(t.damage)}</text>`;}).join('')}<text class="hunt-fx-name" x="${from.x}" y="${from.y+30}">${escapeHtml(hit.name)}</text></svg>`;
  }

  function playerVitals(player){
    return `<section class="hunt-vitals ui-hud-content" aria-label="Состояние персонажа"><small class="hunt-self-status ui-pvp-${player.pvp?.status||'neutral'}"><span class="ui-pvp-name">${escapeHtml(player.name||'Ты')}</span>${player.pvp?.status==='pk'?' · PK · карма '+formatNumber(player.pvp.karma):player.pvp?.status==='flagged'?' · PvP':''}</small>${player.maxCp?bar('cp',player.cp,player.maxCp):''}${bar('hp',player.hp,player.maxHp)}${bar('mp',player.mp,player.maxMp)}${statusIcons(player.effects||[])}</section>`;
  }
  function combatActions(dead,peer){
    const field=state.field;
    const hasAttack=skillTab==='skills'&&!editBar&&state.player.skills.some(s=>s.name==='Attack'&&state.player.hotbar?.includes(s.index));
    return `<div class="hunt-quick-actions">${hasAttack?'':`<button type="button" class="mmo-skill boss-skill" data-attack aria-label="Автоатака" title="Автоатака: повторное нажатие выключает" aria-pressed="${Boolean(field?.autoAttack)}" ${dead||peer||!state.mob||!field?.attack?'disabled':''}>${originalIcon('icon-action003')}</button>`}<button type="button" class="mmo-skill boss-skill" data-next-target aria-label="Next Target" title="Следующая цель" ${dead||!field?.mobs.length?'disabled':''}>${originalIcon('icon-action006')}</button></div>`;
  }

  function peersHtml() {
    if(!state.field)return '';
    return '<section class="hunt-peers"><div class="mmo-section-title"><strong>'+icon('users')+' Игроки в локации</strong><small>'+ (state.players?.length || 0)+'</small></div>'
      +(state.players?.length?'<div class="hunt-peer-list">'+state.players.map(p=>'<button class="hunt-peer pvp-'+p.pvp.status+' '+(String(p.userId)===String(playerTarget)?'selected':'')+'" data-pvp-target="'+p.userId+'" aria-pressed="'+(String(p.userId)===String(playerTarget))+'"><img src="'+classArtUrl(p.className,p.gender)+'" alt=""><span><strong>'+escapeHtml(p.name)+'</strong><small>'+p.level+' ур. · '+(p.pvp.status==='pk'?'PK':p.pvp.status==='flagged'?'PvP':'Мирный')+'</small></span>'+icon(p.pvp.status==='pk'?'skull':p.pvp.status==='flagged'?'flag':'user')+'</button>').join('')+'</div>':'<p>Других игроков рядом нет.</p>')+'</section>';
  }


  function soulHtml(){const soul=state.soulCrystals;if(!soul)return '';const names={red:'Красный',green:'Зелёный',blue:'Синий'},active=soul.active;
    return '<section class="mmo-frame hunt-soul"><strong>'+materialIcon(active?'soul_'+active.color+'_'+active.stage:'soul_red_0')+' Кристалл души '+(active?'· '+names[active.color]+' '+active.stage+' ур.':'')+'</strong><p>'+(soul.quest?.active?(soul.multiple?'Для прокачки оставьте в сумке только один кристалл души.':active?'Души поглощаются автоматически после победы над подходящими монстрами. Шансы и предел стадии зависят от монстра.':'Возьмите один кристалл души для прокачки.'):'Получите квест «Улучшение оружия» в Академии с 40 уровня.')+'</p></section>';
  }
  // The skill bar: the skills the player put on it (up to 16), and a second tab with Life Stone and toggle skills.
  function skillBarHtml(player) {
    const max = player.hotbarMax || 16;
    const tabs = `<div class="hunt-bar-header"><div class="hunt-bar-tabs ui-folder-tabs ui-compact" role="tablist">
      <button type="button" role="tab" aria-selected="${skillTab === 'skills'}" class="${skillTab === 'skills' ? 'active' : ''}" data-bar-tab="skills">Умения</button>
      <button type="button" role="tab" aria-selected="${skillTab === 'special'}" class="${skillTab === 'special' ? 'active' : ''}" data-bar-tab="special" title="Навыки ЛС, призывы и переключаемые">Особые</button>
      ${!editBar?`<button type="button" class="ui-button ui-compact" data-bar-edit aria-label="Настроить умения" title="Настроить умения">${icon('settings')}</button>`:''}
    </div>${combatActions(player.hp<=0||player.respawnRemainMs>0,playerTarget)}</div>`;
    if (skillTab === 'special') {
      const rows = (player.special || []).map(row => `
        <button type="button" class="mmo-skill boss-skill special ${row.running ? 'on' : ''}" data-special="${escapeHtml(row.id)}" ${row.canUse && !pending ? '' : 'disabled'} title="${escapeHtml(row.name+' — '+(row.description||''))}" aria-label="${escapeHtml(row.name)}">
          <span class="mmo-skill-icon">${l2EffectIcon(row.id) || l2SkillIcon(row.iconId) || l2SkillIcon(row.name) || icon('sparkles')}</span>
          <small class="mmo-skill-cost">${formatNumber(row.costMp||0)}</small>
          <span class="mmo-skill-cooldown">${row.cooldownMs > 0 && row.type === 'ls' ? formatDuration(row.cooldownMs) : ''}</span>
        </button>`).join('');
      return `${tabs}<div class="mmo-hotbar icons-only">${rows || '<p class="party-note hunt-bar-empty">Нет особых умений: нужен камень жизни на оружии, призывы или переключаемые умения класса.</p>'}</div>`;
    }
    if (editBar) {
      const all = player.skills.map(skill => hotbarChoice(skill, {className: player.className, on: barDraft.includes(skill.index), position: barDraft.indexOf(skill.index) + 1})).join('');
      return `${tabs}<div class="hunt-bar-edit"><small>Выбрано ${barDraft.length} из ${max}. Порядок — по очереди нажатия.</small>
        <div class="mmo-hotbar icons-only">${all}</div>
        <div class="hunt-bar-actions"><button type="button" class="ui-button ui-compact hunt-toggle" data-bar-save ${barDraft.length ? '' : 'disabled'}>Сохранить</button><button type="button" class="ui-button ui-compact hunt-toggle" data-bar-cancel>Отмена</button></div></div>`;
    }
    return `${tabs}${hotbar(player.skills, {className: player.className, chosen: player.hotbar,slotCount:16,attackAction:{enabled:state.field?.autoAttack,canUse:player.hp>0&&!playerTarget&&Boolean(state.mob&&state.field?.attack)}})}
`;
  }

  function render() {
    if(closed)return;
    const player = state.player;
    const dead = player.hp<=0 || player.respawnRemainMs > 0;
    updateDeathPopup({dead:player.hp<=0,world:state.world,api,onResolved:next=>{if(next.hunt)state=next.hunt;render();}});
    const peer=state.players?.find(p=>String(p.userId)===String(playerTarget));
    if(!peer)playerTarget=null;
    const body = [];
    const focused=document.activeElement;
    const focusKey=focused&&content.contains(focused)?['data-skill','data-attack','data-next-target','data-hunt-halt','data-target','data-room','data-bar-tab'].find(key=>focused.hasAttribute(key)):null;
    const focusValue=focusKey?focused.getAttribute(focusKey):null;
    overlay.querySelector('#hunt-heading').textContent=state.field?.title||'Бой';
    if (state.mob || state.field) {
      body.push('<section class="hunt-scene" aria-label="Бой в локации">',fieldHtml(),'<div class="hunt-scene-dock ui-hud">');
      body.push(playerVitals(player));
      if (dead&&!state.world?.mode) body.push(`<div class="boss-dead">Воскрешение · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push('<section class="hunt-controls ui-hud-content" aria-label="Боевые действия">');
      const action=state.field?.action;
      body.push(`<div class="hunt-action-state" role="status">${action?escapeHtml(action.name||'Умение')+' · '+(action.phase==='cast'?'Применение…':'Подходим к цели'):state.field?.pendingRoom?'Идём к выходу':state.field?.autoAttack?'Автоатака оружием':state.field?.path?.length?'Перемещение':'Готов к действию'}</div>`);
      if(peer&&peer.hp>0&&peer.pvp?.status==='neutral')body.push(`<label class="hunt-force"><input type="checkbox" data-force-attack ${forceAttack?'checked':''}>Принудительная атака · убийство даст PK</label>`);
      if(peer&&peer.hp<=0)body.push((state.resurrections||[]).map(s=>`<button class="ui-button ui-compact" data-revive="${escapeHtml(s.id)}" ${pending||s.cooldownUntil>state.now||player.mp<s.cost?'disabled':''}>${escapeHtml(s.name)}</button>`).join(''));
      body.push(skillBarHtml(player));
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push('</section></div><details class="hunt-scene-menu" data-combat-details="menu"><summary class="ui-button ui-compact">Ещё</summary><div class="hunt-scene-menu-body ui-hud ui-hud-floating">');
      if(state.field?.map)body.push(`<details data-combat-details="rooms"><summary>Комнаты · ${escapeHtml(state.field.room.name)}</summary>${mapHtml(state.field)}</details>`);
      body.push('<details class="hunt-extra" data-combat-details="travel"><summary>Перемещение и припасы</summary><div class="hunt-utility">');
      body.push('<button type="button" class="ui-button ui-compact" data-world-exit>Пешком к городу</button><button type="button" class="ui-button ui-compact" data-flee>Свиток возвращения</button>');
      if(state.field?.floors>1)body.push(`<div class="hunt-field-actions"><button type="button" class="ui-button ui-compact" data-world-stairs="-1" ${state.field.floor<=1?'disabled':''}>Этаж ниже</button><span>Этаж ${state.field.floor}/${state.field.floors}</span><button type="button" class="ui-button ui-compact" data-world-stairs="1" ${state.field.floor>=state.field.floors?'disabled':''}>Этаж выше</button></div>`);
      body.push(shotsHtml(),vitalityHtml(),'</div></details><div class="hunt-view-controls"><button class="ui-button ui-compact" data-view-zoom="-1" aria-label="Уменьшить масштаб">−</button><button class="ui-button ui-compact" data-view-reset>Вернуть обзор</button><button class="ui-button ui-compact" data-view-zoom="1" aria-label="Увеличить масштаб">+</button></div>');
      if(state.lastLoot)body.push('<button type="button" class="ui-button ui-compact" data-last-loot>Последняя добыча</button>');
      if(state.players?.length)body.push(`<details class="hunt-extra" data-combat-details="players"><summary>Игроки рядом · ${state.players.length}</summary>${peersHtml()}</details>`);
      if(!peer){
        if(state.mob)body.push('<details class="hunt-target-drops" data-combat-details="drops"><summary>Дроп выбранного монстра</summary>'+dropsHtml(state.mob.drops)+'</details>');
        body.push('<details class="hunt-extra" data-combat-details="soul"><summary>Кристалл души</summary>'+soulHtml()+'</details>');
      }
      body.push('</div></details></section>');
    } else {
      close();import('./world-map.js').then(({openWorldMap})=>openWorldMap({api,renderState,haptic,statusElement}));return;
    }
    floatNewLog();
    content.innerHTML = body.join('');
    for(const node of content.querySelectorAll('[data-combat-details]'))node.open=detailsOpen.has(node.dataset.combatDetails);
    if(focusKey)content.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`)?.focus({preventScroll:true});
    enhanceSelects(content);
    if (!feedback) feedbackNode.textContent = '';
    bind();
  }

  function bind() {
    content.querySelector('[data-last-loot]')?.addEventListener('click',()=>showLootDetails(state.lastLoot));
    for(const node of content.querySelectorAll('[data-combat-details]'))node.addEventListener('toggle',()=>{if(node.open)detailsOpen.add(node.dataset.combatDetails);else detailsOpen.delete(node.dataset.combatDetails);});
    content.querySelector('[data-attack]')?.addEventListener('click',async()=>{await run('/api/hunt/attack',{enabled:!state.field?.autoAttack});render();});
    content.querySelector('[data-hunt-halt]')?.addEventListener('click',stop);
    content.querySelector('[data-next-target]')?.addEventListener('click',nextTarget);
    content.querySelectorAll('[data-revive]').forEach(b=>b.addEventListener('click',async()=>{await run('/api/world/action',{action:'revive',skillId:b.dataset.revive,userId:playerTarget});render();}));
    content.querySelectorAll('[data-pvp-target]').forEach(b=>b.addEventListener('click',()=>choosePeer(b.dataset.pvpTarget)));
    content.querySelector('[data-force-attack]')?.addEventListener('change',e=>{forceAttack=e.target.checked;});
    content.querySelector('.hunt-target-drops')?.addEventListener('toggle', e=>{dropOpen=e.target.open;});
    content.querySelectorAll('[data-loot-zone]').forEach(d=>d.addEventListener('toggle',e=>{if(e.target!==d)return;const id=d.dataset.lootZone;if(d.open){if(lootOpen.has(id))return;lootOpen.add(id);if(lootCache[id])render();else{lootOpen.add(id);d.insertAdjacentHTML('beforeend','<p class="hunt-loot-wait">Загружаю таблицу дропа…</p>');loadZoneLoot(id);}}else lootOpen.delete(id);}));
    content.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',async()=>{playerTarget=null;forceAttack=false;await run('/api/hunt/target',{targetId:b.dataset.target});render();}));
    content.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',async()=>{playerTarget=null;await run('/api/hunt/move',{direction:'room:'+b.dataset.room});render();}));
    const ground=content.querySelector('.hunt-ground');
    if(ground){
      mapObserver.disconnect();mapObserver.observe(ground);
      fieldRenderer.mount(ground.querySelector('.hunt-world'),state.field,viewport);
      ground.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,panX:camera.x,panY:camera.y,moved:false};});
      ground.addEventListener('pointermove',e=>{
        if(!drag||drag.id!==e.pointerId)return;
        const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
        if(!drag.moved&&Math.hypot(dx,dy)<6)return;
        drag.moved=true;ground.setPointerCapture(e.pointerId);
        camera.x=Math.max(-viewport.width,Math.min(viewport.width,drag.panX+dx));camera.y=Math.max(-viewport.height,Math.min(viewport.height,drag.panY+dy));
        applyCamera();
      });
      ground.addEventListener('pointerup',()=>{ignoreMapClick=Boolean(drag?.moved);drag=null;});
      ground.addEventListener('pointercancel',()=>{drag=null;ignoreMapClick=true;});
      ground.addEventListener('click',async e=>{
        if(e.target.closest('button'))return;
        const rect=ground.getBoundingClientRect(),point=isoPick({x:e.clientX-rect.left,y:e.clientY-rect.top},viewport,camera);
        if(point.x<.02||point.x>.98||point.y<.02||point.y>.98)return;
        await run('/api/hunt/move',{point});render();
      });
      ground.addEventListener('click',e=>{if(ignoreMapClick){ignoreMapClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
      ground.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.75,Math.min(1.65,camera.zoom+(e.deltaY<0?.1:-.1)));applyCamera();},{passive:false});
    }
    content.querySelectorAll('[data-view-zoom]').forEach(b=>b.addEventListener('click',()=>{camera.zoom=Math.max(.75,Math.min(1.65,camera.zoom+Number(b.dataset.viewZoom)*.15));applyCamera();}));
    content.querySelector('[data-view-reset]')?.addEventListener('click',()=>{camera={zoom:1,x:0,y:0};applyCamera();});
    content.querySelector('[data-world-exit]')?.addEventListener('click',async()=>{await run('/api/world/action',{action:'walk_exit'});render();});
    content.querySelectorAll('[data-world-stairs]').forEach(b=>b.addEventListener('click',async()=>{await run('/api/world/action',{action:'floor',floor:(state.field?.floor||1)+Number(b.dataset.worldStairs)});render();}));
    content.querySelectorAll('[data-zone-kind]').forEach(b=>b.addEventListener('click',()=>{zoneKind=b.dataset.zoneKind;render();}));
    content.querySelector('[data-soul-select]')?.addEventListener('change',async e=>{const [color,stage]=e.target.value.split(':');await run('/api/soul/select',{color:color||null,stage:Number(stage)});render();});
    content.querySelectorAll('[data-skill]').forEach(button => {
      button.addEventListener('click',e=>{previewSkill=null;skill(button.dataset.skill,e.ctrlKey);});
      const preview=()=>{previewSkill=state.player.skills.find(s=>String(s.index)===button.dataset.skill);drawRange();};
      button.addEventListener('pointerenter',preview);button.addEventListener('focus',preview);
      button.addEventListener('pointerleave',()=>{previewSkill=null;drawRange();});
      button.addEventListener('blur',()=>{previewSkill=null;drawRange();});
    });
    content.querySelectorAll('[data-bar-tab]').forEach(button => button.addEventListener('click', () => { skillTab = button.dataset.barTab; editBar = false; render(); }));
    content.querySelector('[data-bar-edit]')?.addEventListener('click', () => { editBar = true; barDraft = [...(state.player.hotbar || [])]; render(); });
    content.querySelector('[data-bar-cancel]')?.addEventListener('click', () => { editBar = false; render(); });
    content.querySelectorAll('[data-hotbar-toggle]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.hotbarToggle), max = state.player.hotbarMax || 16;
      if (barDraft.includes(index)) barDraft = barDraft.filter(item => item !== index);
      else if (barDraft.length < max) barDraft.push(index);
      else say(`На панели не больше ${max} умений.`);
      render();
    }));
    content.querySelector('[data-bar-save]')?.addEventListener('click', async () => {
      const payload = await run('/api/hunt/hotbar', { slots: barDraft });
      if (payload) { editBar = false; say('Панель умений сохранена.'); }
      render();
    });
    content.querySelectorAll('[data-special]').forEach(button => button.addEventListener('click', async () => {
      const payload = await run('/api/hunt/special', { id: button.dataset.special });
      if (payload) say(payload.name ? `${payload.name}: включено.` : payload.toggledOff ? 'Умение выключено.' : 'Умение включено.');
      render();
    }));
    content.querySelectorAll('[data-boss-potion]').forEach(button => button.addEventListener('click', () => drink(button.dataset.bossPotion)));
    content.querySelectorAll('[data-zone]').forEach(button => button.addEventListener('click', () => start(button.dataset.zone)));
    content.querySelector('[data-flee]')?.addEventListener('click', flee);
    content.querySelector('[data-shots]')?.addEventListener('click', toggleShots);
  }

  // The mob swings in real time: poll while a fight is on, show new swings, and tick the timers locally.
  async function poll({signal,current}) {
    if (pending || drag || document.hidden || !overlay.isConnected || (!state.mob && !state.field)) return;
    try {
      const next = await api('/api/hunt', {signal});
      if (!current() || pending || drag || closed || !overlay.isConnected) return;
      // Countdowns tick locally; only real changes re-render.
      const clockless = value => JSON.stringify(value, (key, v) => (/Ms$/.test(key)||key==='now' ? 0 : v));
      if (clockless(next) === clockless(state)) { state = next;receivedAt=Date.now(); return; }
      const top = next.log?.[0]?.text || '';
      state = next;receivedAt=Date.now();
      if (top && top !== lastLog) {
        lastLog = top;
        if (/бьёт/.test(top)) haptic('medium');
      }
      render();
    } catch (error) { throw error; }
  }

  function tick() {
    for(const node of content.querySelectorAll('[data-strike-until]'))if(Date.now()>Number(node.dataset.strikeUntil))node.remove();
    content.querySelectorAll('[data-pvp-flag]').forEach(node=>{node.textContent=formatDuration(Math.max(0,Number(node.dataset.until)-Date.now()));});
    content.querySelectorAll('[data-skill-cooldown]').forEach(node => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? formatDuration(remain) : '';
      const total = Number(node.dataset.total) || remain;
      node.closest('.mmo-skill')?.style.setProperty('--cd', total > 0 ? String(remain / total) : '0');
      const button=node.closest('.boss-skill'),skill=state.player.skills.find(s=>String(s.index)===button?.dataset.skill);
      if (remain <= 0&&skill?.canUse&&!pending)button?.removeAttribute('disabled');
    });
    const next = content.querySelector('[data-hunt-next]');
    if (next) {
      const remain = Math.max(0, Number(next.dataset.until) - Date.now());
      const total = Number(next.dataset.total) || 1;
      next.textContent = remain > 0 ? `удар через ${(remain / 1000).toFixed(1)} с` : 'бьёт!';
      const fill = content.querySelector('[data-hunt-swing]');
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, (1 - remain / total) * 100))}%`;
    }
  }

  function applyCamera(){const world=content.querySelector('.hunt-world');if(world)world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;}
  function drawRange(){const world=content.querySelector('.hunt-world');if(!world)return;world.querySelector('.hunt-range')?.remove();world.insertAdjacentHTML('beforeend',areaHtml());}
  async function stop(){await run('/api/hunt/attack',{enabled:false});render();}
  async function choosePeer(id){
    if(state.field?.autoAttack||state.field?.action||state.field?.path?.length)await run('/api/hunt/attack',{enabled:false});
    playerTarget=String(id);forceAttack=false;render();
  }
  async function nextTarget(){
    const candidates=[...(state.field?.mobs||[]).map(m=>({id:m.instanceId,player:false})),...(state.players||[]).filter(p=>p.hp>0&&p.pvp?.status!=='neutral').map(p=>({id:String(p.userId),player:true}))];
    if(!candidates.length)return;
    const index=candidates.findIndex(c=>c.id===(playerTarget?String(playerTarget):state.field.target));
    const next=candidates[(index+1)%candidates.length];
    if(next.player)return choosePeer(next.id);
    playerTarget=null;forceAttack=false;await run('/api/hunt/target',{targetId:next.id});render();
  }

  function escapeAction(event){if(state.field?.autoAttack||state.field?.action||state.field?.path?.length){event.preventDefault();stop();}}
  function keyboard(event){
    if(event.target.closest('input,select,textarea,[contenteditable]'))return;
    if(event.key==='Escape'&&(state.field?.autoAttack||state.field?.action||state.field?.path?.length)){event.preventDefault();event.stopPropagation();stop();}
    if(event.key==='Tab'&&event.target.closest('.hunt-ground')){event.preventDefault();nextTarget();}
  }
  function animate(at){
    if(closed||document.hidden)return;
    if(!overlay.isConnected){close();return;}
    if(at-lastFrame>=50&&state.field){lastFrame=at;const actor=displayedPosition(state.field,Date.now()-receivedAt),point=isoPoint(actor,viewport);const node=content.querySelector('.hunt-hero-marker');if(node){node.style.left=point.x+'px';node.style.top=point.y+'px';node.style.zIndex=10+Math.round((actor.x+actor.y)*10);fieldRenderer.moveSelf();}}
    animation=requestAnimationFrame(animate);
  }
  function visibility(){
    cancelAnimationFrame(animation);window.clearInterval(timer);overlay.classList.toggle('paused',document.hidden);
    if(!document.hidden&&!closed){fieldRenderer.refresh();animation=requestAnimationFrame(animate);timer=window.setInterval(tick,200);}
  }
  render();
  document.body.appendChild(overlay);animation=requestAnimationFrame(animate);
  document.addEventListener('visibilitychange',visibility);overlay.addEventListener('keydown',keyboard);overlay.addEventListener('overlay-escape',escapeAction);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 200);
  pollTimer = createPoller(poll, {interval:700,enabled:()=>!pending && overlay.isConnected && !overlay.classList.contains('closing')});
}
