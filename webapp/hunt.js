import {COMBAT_REASONS as REASONS,POTION_REASONS} from './combat-errors.js';
import {enhanceSelects} from './design/select.js';
import { castSkill } from './audio.js';
import {createPoller} from './polling.js';
import {materialIcon} from './material-icons.js';
import {updateDeathPopup} from './death-popup.js';
import {displayedPosition} from './map-rendering.js';
import {l2CategoryIcon,l2IconHtml} from './art/l2-icon-art.js';
import {huntZoneUrl,huntMobUrl} from './art/hunt-art.js';
import {shotIcon,elementIcon,championIcon} from './art/painted-icon-art.js';
import { bar, escapeHtml, formatDuration, formatNumber, hotbar, hotbarChoice, statusIcons } from './boss-hud.js';
import { l2SkillIcon } from './art/l2-extra-art.js';
import {l2EffectIcon} from './art/l2-effects-art.js';
import {icon,controlIcon} from './icons.js';
import {classArtUrl} from './boss-stage.js';
import {dialogHeading} from './dialog-heading.js';
import {installOverlayA11y} from './overlay-a11y.js';
import {installGameRules} from './game-rules.js';
import {isoMatrix,isoPoint,isoPick,isoTerrain,isoLabelOffsets,clampRoomCamera} from './hunt-isometric.js';
import {createHuntRenderer} from './hunt-phaser.js';
import {showLootDetails,showDropPreview} from './loot-notice.js';
import {shortMobName,targetCon,mobDisposition} from './combat-target.js';
import {COMBAT_ACTIONS,combatActionButton} from './combat-actions.js';
import {combatSuppliesHtml} from './combat-supplies.js';
import {createCombatSocial} from './combat-social.js';
import {l2NavigationIcon} from './art/l2-navigation-art.js';
import {ensureFeatureStyles} from './feature-styles.js';
import {visibleFieldMobs,visibleFieldPlayers} from './hunt-visible-actors.js';

// Hunting fields (Lineage II style): pick a zone, fight one mob at a time in real time with skills,
// potions and shots. Blue and red champions are tougher and pay much more.

const ELEMENT_ICONS = Object.fromEntries(['fire','water','wind','earth','holy','dark'].map(element=>[element,elementIcon(element)]));
const CHAMPION = { blue: { icon: championIcon('blue'), label: 'Синий чемпион' }, red: { icon: championIcon('red'), label: 'Красный чемпион' } };

export async function openHuntGame({ api, renderState, haptic, statusElement,initialZoneKind='field',onOpenAtlas }) {
  let state = await api('/api/hunt');
  if(!state.field||state.field.native){const {openWorldMap}=await import('./world-map.js');return openWorldMap({api,renderState,haptic,statusElement,initialLayer:initialZoneKind==='catacomb'?'dungeons':'hunt'});}
  let zoneKind=initialZoneKind==='catacomb'?'catacomb':'field';
  let skillTab = 'skills'; let editBar = false; let barDraft = [];
  let draggedSlot=null;
  let shotsCollapsed=false;
  try{shotsCollapsed=(localStorage.getItem('hunt:supplies-collapsed')??localStorage.getItem('hunt:shots-collapsed'))==='1';}catch{}
  let pending = false;
  let openingWindow=false;
  let travelDialog=null;
  let feedback = '';
  let lastLog = state.log?.[0]?.text || '';
  let dropOpen = false;
  let playerTarget = null;
  let forceAttack = false;
  let previewSkill=null,closed=false,lastFrame=0;
  let viewport={width:320,height:400},camera={zoom:1,x:0,y:0},labelOffsets=new Map(),drag=null,ignoreMapClick=false;
  let displayedRoom=null;
  let followedPoint=null,followedSpace=null;
  const fieldRenderer=createHuntRenderer();
  const mapObserver=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box&&Math.abs(box.width-viewport.width)+Math.abs(box.height-viewport.height)>2){viewport={width:box.width,height:box.height};followedPoint=null;render();}});
  const detailsOpen=new Set();
  installOverlayA11y();installGameRules();

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay hunt-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel game-dialog-panel combat-dialog hunt-panel" role="dialog" aria-modal="true" aria-labelledby="hunt-heading">
      ${dialogHeading('Бой',{id:'hunt-heading',compact:true,rules:'Нажми на противника, чтобы выбрать цель. Атака — подойти и атаковать оружием; повторное нажатие выключает автоатаку. Нажатие на своего персонажа останавливает движение и применение умения. Умение — подойти на его дальность и применить. Нажатие на землю отменяет действие и ведёт к точке. Выходы на краях поля ведут в соседние комнаты. Tab — следующая цель, Escape — остановиться. Массовые атаки зависят от оружия и самого умения.'})}
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
    travelDialog?.close();
    cancelAnimationFrame(animation);window.clearInterval(timer);mapObserver.disconnect();fieldRenderer.destroy();
    document.removeEventListener('visibilitychange',visibility);
    overlay.removeEventListener('keydown',keyboard);
    overlay.removeEventListener('overlay-escape',escapeAction);
    pollTimer?.stop();
    social.destroy();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('[data-dismiss]').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  // the system chat floats over the screen instead of taking room in the page
  const say = text => { feedback = ''; social.notice(text); };
  const social=createCombatSocial({api,onTarget:choosePeer,onManage:async()=>{const {openPartyGame}=await import('./party.js');openPartyGame({api,haptic,statusElement});}});
  overlay.querySelector('.hunt-panel').appendChild(social.element);
  const selectedPeer=()=>state.players?.find(p=>String(p.userId)===String(playerTarget))||state.party?.members?.find(p=>String(p.userId)===String(playerTarget));
  let lastLogKeys = null;
  function floatNewLog() {
    const rows = [...(state?.log || []).map(row=>({...row,source:'hunt'})), ...(state?.pvpLog || []).map(row=>({...row,source:'pvp'}))].filter(row => Number(row.at) > 0).sort((a, b) => a.at - b.at || (a.source===b.source?(Number(a.id)||0)-(Number(b.id)||0):0));
    if (!rows.length) return;
    // the first state only sets the mark: the old journal is not replayed
    const key=row=>row.id?`${row.source}:${row.id}`:`${row.at}:${row.icon}:${row.text}`;
    if (lastLogKeys !== null) {
      for (const row of rows.filter(row => !lastLogKeys.has(key(row)))) {
        if(row.combat)social.combat({...row.combat,at:row.at});
        else if(row.loot)social.loot(row.loot);
        else social.notice(row.text);
      }
    }else for(const row of rows.slice(-150)){
      if(row.combat)social.combat({...row.combat,at:row.at});
      else if(row.loot)social.loot(row.loot);
      else social.notice(row.text);
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
      if(payload.world&&!payload.hunt)take({hunt:await api('/api/hunt')});
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
      castSkill(state.player?.skills?.[Number(index)]?.l2Id,payload.result?.type==='heal'?'heal':payload.result?.type==='shield'?'buff':'hit');
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
      say(`Выпито: ${payload.potion?.name || 'зелье'} (+${formatNumber(payload.healing||payload.restored)} ${payload.resource === 'cp'?'CP':payload.resource === 'mp' ? 'MP' : 'HP'}).`);
    } catch (error) {
      say(POTION_REASONS[error.payload?.reason] || error.message);
    } finally {
      pending = false;
      render();
    }
  }

  async function toggleShots(kind=null) {
    const selected=kind||state.shots.selected;
    const payload = await run('/api/shots/auto', { enabled: kind&&kind!==state.shots.selected?true:!state.shots.enabled,kind:selected });
    if (payload) say(state.shots.enabled ? 'Автозаряды включены.' : 'Автозаряды выключены.');
    render();
  }

  function shotsHtml() {
    const shots = state.shots;
    if (!shots?.grade) return '<div class="hunt-shots off"><span>'+shotIcon('spiritshot','noGrade')+' Заряды</span><small>Надень оружие, чтобы использовать заряды.</small></div>';
    const kinds = shots.kinds.map(kind => `<em title="${escapeHtml(kind.label)}">${shotIcon(kind.id,shots?.grade||'noGrade',kind.icon)} ${formatNumber(kind.count)}</em>`).join('');
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
      const label=(r.visited?escapeHtml(r.name):'Не исследовано')+(r.passages?.length?' · '+escapeHtml(r.passages.join(', ')):'');
      const count=r.mobs===null?'?':r.mobs+'/'+r.cap;
      const cls='hunt-room'+(r.current?' current':'')+(r.big?' big':'')+(r.visited?' visited':'')+(r.adjacent?' near':'');
      return '<button type="button" class="'+cls+'" '+(r.adjacent?'data-room="'+escapeHtml(r.id)+'"':'disabled')+' style="grid-column:'+(r.col+1)+';grid-row:'+(r.row+1)+'" title="'+label+(map.exploration?'':' · '+(r.big?'большая':'малая')+' комната')+'" aria-label="'+label+(r.current?' (ты здесь)':'')+'"><b>'+(r.current?icon('flag'):r.big?'▣':'▫')+'</b><small>'+count+'</small></button>';
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
  function worldStyle(point,id=null,layer=null){const p=isoPoint(point,viewport),offset=labelOffsets.get(id)||{x:0,y:0};return `--label-x:${offset.x}px;--label-y:${offset.y}px;left:${p.x}px;top:${p.y}px;--map-marker-anchor:translate(-50%,-100%);z-index:${layer??10+Math.round((point.x+point.y)*10)}`;}
  function playerMarker(player,self=false){
    const selected=!self&&String(player.userId)===String(playerTarget);
    return `<button type="button" class="${self?'hunt-hero-marker':'hunt-player-marker'} hunt-iso-actor ui-map-marker ui-player-presence ui-pvp-${player.pvp?.status||'neutral'} ${selected?'selected':''}" ${self?'data-hunt-halt':`data-pvp-target="${player.userId}"`} style="${worldStyle(player,self?'self':String(player.userId))}" aria-label="${escapeHtml(player.name||'Ты')}${player.clanName?' · '+escapeHtml(player.clanName):''}" ${self?'':'aria-pressed="'+selected+'"'}><span class="hunt-actor-label"><span class="hunt-presence-name ui-pvp-name">${escapeHtml(player.name||'Ты')}</span>${player.clanName?`<span class="hunt-presence-clan">${escapeHtml(player.clanName)}</span>`:''}</span><span class="hunt-iso-avatar"><img src="${classArtUrl(player.className,player.gender)}" alt=""></span></button>`;
  }
  function levelMarkers(field){
    const seen=new Set(),markers=[];
    const marker=(point,label,symbol,attribute)=>`<button type="button" class="ui-map-marker hunt-iso-actor" ${attribute} style="${worldStyle(point,null,40)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}"><span class="hunt-actor-label"><span class="hunt-mob-name">${escapeHtml(label)}</span></span><span class="hunt-iso-avatar" aria-hidden="true">${symbol}</span></button>`;
    for(const [index,d] of (field.level?.destinations||[]).entries())if(d.room===field.room.id){
      const key=d.point.x+':'+d.point.y;if(seen.has(key))continue;seen.add(key);
      markers.push(marker(d.point,d.mode==='teleport'?d.name:d.floor>field.floor?'Лестница вверх':'Лестница вниз',d.mode==='teleport'?'◇':'↟',`data-level-marker="${index}"`));
    }
    for(const npc of field.level?.npcs||[])if(!seen.has(npc.x+':'+npc.y))markers.push(marker(npc,npc.name,'◇',`data-level-npc="${escapeHtml(npc.name)}"`));
    for(const candle of field.ship?.candles||[])markers.push(marker(candle,`Свеча ${candle.id} · ${{unlit:'не зажжена',burning:'разгорается',red:'красная',blue:'синяя'}[candle.state]}`,{unlit:'♧',burning:'♨',red:'🔴',blue:'🔵'}[candle.state],`data-ship-candle="${candle.id}"`));
    for(const [i,link] of (field.links||[]).entries())if(link.room===field.room.id)markers.push(marker(link.point,link.title,'↗',`data-region-link="${i}"`));
    const boss=field.ship?.boss||field.level?.boss&&{id:field.level.boss,point:{x:.5,y:.5}};
    for(const c of field.treasure?.chests||[])markers.push(marker(c.point,`${c.name} · ${c.level} ур.`,'◇',`data-treasure-chest="${escapeHtml(c.id)}"`));
    for(const v of field.vortices||[])if(v.here)markers.push(marker(v.point,v.name,'⚔',`data-dragon-vortex="${v.id}"`));
    for(const raid of field.raids||field.level?.raids||[])markers.push(marker(raid.point,raid.name,'⚔',`data-location-boss="${escapeHtml(raid.name)}"`));
    if(boss)markers.push(marker(boss.point,boss.id==='zaken'?'Закен найден':'Вход к боссу','⚔',`data-location-boss="${boss.id}"`));
    return markers.join('');
  }
  async function showTreasureChest(id){
    const t=state.field?.treasure,c=t?.chests.find(c=>c.id===id);if(!c)return;
    if(!c.near){await run('/api/hunt/move',{point:c.point});render();return;}
    const dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window';travelDialog?.close();travelDialog=dialog;
    const u=t.unlock,busy=Boolean(t.casting),allowed=c.levelAllowed;
    dialog.innerHTML=dialogHeading(c.name+' · '+c.level+' ур.')+`<p>Разница уровней для открытия: не больше ${state.player.level<=77?6:5}.</p><p>Внутри могут быть заточки и другие припасы. Награда не гарантирована.</p><div class="ui-action-stack"><button class="ui-button primary" data-chest-method="key" ${!allowed||busy||!t.keyReady||t.keyCount<1?'disabled':''}>${materialIcon('l2_21746')}Maestro’s Key ×1 · ${t.keyCount}</button>${u.eligible?`<button class="ui-button" data-chest-method="unlock" ${!allowed||busy||!u.level||!u.ready||t.thiefKeys<u.keyCost||state.player.mp<u.mpCost?'disabled':''}>${l2SkillIcon(27)}Unlock · Thief Key ×${u.keyCost} · ${u.mpCost} MP</button>${u.next?`<button class="ui-button" data-chest-method="learn" ${!allowed||busy||!u.canLearn?'disabled':''}>Изучить Unlock · ${u.next.level} ур. · ${formatNumber(u.next.sp)} SP</button>`:''}`:''}</div><p>Ключи продаются в Лавке мастеров.</p>`;
    document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();
    dialog.addEventListener('click',async event=>{
      const button=event.target.closest('[data-chest-method]');if(!button||button.disabled)return;const method=button.dataset.chestMethod;dialog.close();
      const result=await run('/api/world/action',{action:'treasure_open',chest:id,method});render();
      if(result?.ok&&method==='learn')showTreasureChest(id);else if(result?.casting)say('Открываем сундук…');
    });
  }
  async function showDragonVortex(id){
    const v=state.field?.vortices?.find(v=>v.id===id);if(!v?.here)return;
    if(!v.near){await run('/api/hunt/move',{point:v.point});render();return;}
    const payload=await run('/api/world/action',{action:'vortex_list',vortex:id});if(!payload?.ok||closed)return;
    const dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window';
    travelDialog?.close();travelDialog=dialog;
    dialog.innerHTML=dialogHeading('Dragon Vortex')+'<p>Одна Large Dragon Bone призывает случайного дракона. Повторный призыв — через минуту.</p><button class="ui-button primary" data-vortex-summon>Призвать дракона · Large Dragon Bone ×1</button>'+payload.encounters.map(e=>`<button class="ui-button" data-vortex-join="${escapeHtml(e.id)}">${escapeHtml(e.name)}</button>`).join('');
    dialog.querySelector('[data-vortex-summon]').disabled=!(state.field.vortexBoneCount>0);
    document.body.append(dialog);dialog.showModal();dialog.addEventListener('close',()=>dialog.remove(),{once:true});
    dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();
    dialog.addEventListener('click',async event=>{
      const button=event.target.closest('[data-vortex-summon],[data-vortex-join]');if(!button)return;
      dialog.close();const result=await run('/api/world/action',{action:'dragon_vortex',vortex:id,encounter:button.dataset.vortexJoin});
      if(!result?.ok||closed)return;
      const {openBossGame}=await import('./boss.js');await openBossGame({api,renderState,haptic,statusElement,initialBoss:result.bossName,fromLocation:true});close();
    });
  }
  function showLevelTravel(){
    const field=state.field;if(!field?.level)return;
    const dialog=document.createElement('dialog');dialog.className='game-dialog-panel l2-window';dialog.setAttribute('aria-label','Переходы между этажами');
    travelDialog?.close();travelDialog=dialog;
    dialog.innerHTML=dialogHeading(field.level.title)+(field.continuous?'<p>По соседним участкам можно идти прямо по земле.</p>':`<p>Подойди к лестнице или хранителю портала. Их комнаты отмечены на карте.</p>`)+(field.ship?`<p>Синих свечей: ${field.ship.blue}/4. Найди четыре синие свечи, чтобы обнаружить Закена.</p>`:'')+field.level.destinations.map((d,i)=>`<button type="button" class="ui-button" data-travel-choice="${i}" ${pending||d.room!==field.room.id?'disabled':''}>${escapeHtml(d.title)}${d.gold?' · '+formatNumber(d.gold)+' аден':''}${d.room!==field.room.id?' · в другом зале':d.near?'':' · подойти'}</button>`).join('')+(field.map?`<details><summary>${field.continuous?'Карта окрестностей':'Карта этажа'}</summary>${mapHtml(field)}</details>`:'');
    const actions=document.createElement('div');actions.className='ui-action-stack';
    if(field.phase){const phase=document.createElement('p');phase.textContent=field.phase.locked?'Хеллбаунд ещё закрыт. Освобождение острова не началось.':`Этап освобождения: ${field.phase.stage}`;dialog.append(phase);}
    actions.innerHTML=(field.links||[]).map((l,i)=>`<button type="button" class="ui-button" data-link-choice="${i}" ${l.room!==field.room.id?'disabled':''}>${escapeHtml(l.title)}${l.near?'':' · подойти'}</button>`).join('');
    if(field.nativeExit)actions.innerHTML+=`<button type="button" class="ui-button" data-native-exit ${pending||field.nativeExit.room!==field.room.id||field.nativeExit.floor!==field.floor?'disabled':''}>${field.nativeExit.near?'Выход · выбрать путь в Атласе':'Подойти к выходу'}</button>`;
    if(field.seed&&field.floor===1){
      const assemblyModes=field.seed.modes.filter(m=>m.commandChannel);
      actions.innerHTML+=field.seed.modes.filter(m=>!m.commandChannel).map(m=>`<p>${escapeHtml(m.title)} · ${m.partyMin===m.partyMax?m.partyMin:m.partyMin+'–'+m.partyMax} игроков · ${m.minLevel}–${m.maxLevel} ур.</p>`).join('');
      if(assemblyModes.length)actions.innerHTML+=`<details><summary>Экспедиция в Семя</summary><div class="ui-action-stack"><label>Маршрут<select data-seed-mode>${assemblyModes.map(m=>`<option value="${m.key}">${escapeHtml(m.title)} · ${m.partyMin}–${m.partyMax} игроков · ${m.minLevel}–${m.maxLevel} ур.</option>`).join('')}</select></label>${field.seed.assembly?`<p>Собрано ${field.seed.assembly.count} игроков.</p><label>Код объединения<input readonly value="${escapeHtml(field.seed.assembly.id)}"></label>`:''}<button class="ui-button" type="button" data-seed-create>Создать объединение групп</button><label>Код лидера<input data-seed-code maxlength="160" autocomplete="off"></label><button class="ui-button" type="button" data-seed-join>Присоединить свою группу</button></div></details>`;
      if(state.zone==='seed-of-infinity')actions.innerHTML+=`<details><summary>Задания Тепиоса</summary><div class="ui-action-stack"><button class="ui-button" type="button" data-seed-quest="694">Пройти Зал Страданий · 75–82</button><button class="ui-button" type="button" data-seed-quest="696">Завоевать Зал Гибели · знак Кецеруса</button></div></details>`;
    }
    dialog.append(actions);enhanceSelects(dialog);
    document.body.append(dialog);dialog.showModal();
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.querySelector('[data-dismiss]').onclick=()=>dialog.close();
    dialog.addEventListener('click',async event=>{
      if(event.target.closest('[data-native-exit]')){
        dialog.close();
        if(field.nativeExit.near)await start();else{await run('/api/hunt/move',{point:field.nativeExit.point});render();}
        return;
      }
      const seedButton=event.target.closest('[data-seed-create],[data-seed-join],[data-seed-quest]'),linkButton=event.target.closest('[data-link-choice]');
      if(seedButton){
        const seedMode=dialog.querySelector('[data-seed-mode]')?.value,assembly=dialog.querySelector('[data-seed-code]')?.value;
        dialog.close();
        if(Math.hypot(field.x-.9,field.y-.1)>.1)await run('/api/hunt/move',{point:{x:.9,y:.1}});
        else await run('/api/world/action',seedButton.hasAttribute('data-seed-quest')?{action:'seed_quest',quest:Number(seedButton.dataset.seedQuest)}:{action:seedButton.hasAttribute('data-seed-create')?'seed_assembly':'seed_join',seedMode,assembly});
        render();return;
      }
      if(linkButton){const l=field.links[Number(linkButton.dataset.linkChoice)];dialog.close();await run(l.near?'/api/world/action':'/api/hunt/move',l.near?{action:'location_link',location:l.location}:{point:l.point});render();return;}
      const choice=event.target.closest('[data-travel-choice]'),room=event.target.closest('[data-room]');
      if(choice){const d=field.level.destinations[Number(choice.dataset.travelChoice)];dialog.close();await run(d.near?'/api/world/action':'/api/hunt/move',d.near?{action:'floor',floor:d.floor}:{point:d.point});render();}
      else if(room){dialog.close();await run('/api/hunt/move',{direction:'room:'+room.dataset.room});render();}
    });
    dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  }
  function fieldHtml() {
    const field=state.field;if(!field)return '';
    const room=field.room||{};
    const visibleMobs=visibleFieldMobs(field,viewport.width<500?8:16);
    const visiblePlayers=visibleFieldPlayers(state.players||[],field,viewport.width<500?8:16,playerTarget);
    const actors=[...visiblePlayers.map(p=>({...p,id:String(p.userId),labelHeight:p.clanName?28:14})),{...state.player,x:field.x,y:field.y,id:'self',labelHeight:state.player.clanName?28:14},...visibleMobs.map(m=>({...m,id:m.instanceId,labelHeight:38}))];
    const selected=playerTarget?String(playerTarget):field.target;
    actors.sort((a,b)=>Number(b.id===selected)-Number(a.id===selected));
    labelOffsets=isoLabelOffsets(actors,viewport);
    const arrows={north:'↗',south:'↙',east:'↘',west:'↖'};
    const sides={north:{x:.5,y:.025},south:{x:.5,y:.975},east:{x:.975,y:.5},west:{x:.025,y:.5}};
    const exits=(field.exits||[]).map(exit=>{const p=isoPoint(sides[exit.side],viewport);return `<button type="button" class="ui-button ui-compact hunt-exit ${exit.side}" data-room="${escapeHtml(exit.id)}" style="left:${p.x}px;top:${p.y}px" aria-label="Пройти: ${escapeHtml(exit.name)}" title="${escapeHtml(exit.name)}" ${pending?'disabled':''}>${arrows[exit.side]}</button>`;}).join('');
    return `<section class="hunt-battlefield ui-hud-content" aria-label="Поле боя">
      <div class="hunt-ground hunt-isometric" tabindex="0" role="group" aria-label="Изометрическая комната: нажми на землю для движения, потяни для обзора.">
      <div class="hunt-world" style="transform:translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})">
      ${isoTerrain(field,viewport)}${areaHtml()}${strikeHtml()}
      ${levelMarkers(field)}
      ${visiblePlayers.map(p=>playerMarker(p)).join('')}
      ${visibleMobs.map(m=>`<button type="button" class="hunt-actor hunt-iso-actor ui-map-marker ${!playerTarget&&m.instanceId===field.target?'selected ':''}${m.aggro?'aggro':''}" data-target="${escapeHtml(m.instanceId)}" style="${worldStyle(m,m.instanceId)}" aria-label="${escapeHtml(m.name)} · ${Math.round(m.hpPercent)}% HP" aria-pressed="${!playerTarget&&m.instanceId===field.target}"><span class="hunt-actor-label"><span class="hunt-mob-name ui-npc-name" data-disposition="${mobDisposition(m)}">${escapeHtml(m.name)}</span><span class="hunt-mob-percent">${Math.round(m.hpPercent)}%</span></span><span class="hunt-iso-avatar">${huntMobUrl(m)?`<img src="${huntMobUrl(m)}" alt="" decoding="async">`:icon('ghost')}</span></button>`).join('')}
      ${playerMarker({...state.player,x:field.x,y:field.y},true)}
      ${field.action?.phase==='cast'?`<span class="hunt-cast" style="${worldStyle(field)}" role="progressbar" aria-label="${escapeHtml(field.action.name||'Применение умения')}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100*(1-Math.max(0,field.action.until-state.now)/Math.max(1,field.action.spatial?.windup||1)))}"><span>${escapeHtml(field.action.name||'Применение умения')}</span><i style="--cast-time:${Math.max(0,field.action.until-state.now)}ms"></i></span>`:''}
      ${field.path?.length?`<span class="hunt-destination" style="${worldStyle(field.path.at(-1))}" aria-hidden="true">＋</span>`:''}
      ${exits}
      </div>
      ${field.mobs.length||field.level?.npcs?.length||field.ship?'':`<div class="hunt-field-cleared">${field.phase?.locked?'Хеллбаунд ещё закрыт. Освобождение острова не началось.':'Здесь нет монстров'}</div>`}
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
    const vitality=state.vitality||{},atCap=player.level>=player.maxLevel;
    const xp=atCap?100:Math.max(0,Math.min(100,player.needExp>0?player.currentExp/player.needExp*100:0));
    return `<section class="hunt-vitals ui-hud ui-combat-readout" aria-label="Состояние персонажа"><small class="hunt-self-status ui-pvp-${player.pvp?.status||'neutral'}"><span class="hunt-player-level" title="Уровень персонажа">${escapeHtml(player.level)}</span><span class="ui-pvp-name" title="${escapeHtml(player.name||'Ты')}">${escapeHtml(player.name||'Ты')}</span></small><div class="hunt-player-resources">${player.maxCp?bar('cp',player.cp,player.maxCp,{text:formatNumber(player.cp)+"/"+formatNumber(player.maxCp),variant:'l2',labelInside:true}):''}${bar('hp',player.hp,player.maxHp,{text:formatNumber(player.hp)+"/"+formatNumber(player.maxHp),variant:'l2',labelInside:true})}${bar('mp',player.mp,player.maxMp,{text:formatNumber(player.mp)+"/"+formatNumber(player.maxMp),variant:'l2',labelInside:true})}<div class="hunt-player-progress hunt-player-vitality" title="Vitality: ${formatNumber(vitality.points)} / ${formatNumber(vitality.max)} · ступень ${vitality.stage||0} · опыт ×${vitality.bonus||1}" aria-label="Vitality: ступень ${vitality.stage||0}">${bar('vit',vitality.points,vitality.max,{label:'',text:'',variant:'l2'})}</div><div class="hunt-player-progress" title="${atCap?'Максимальный уровень':`Опыт: ${formatNumber(player.currentExp)} / ${formatNumber(player.needExp)}`}" aria-label="Опыт: ${xp.toFixed(2)}%">${bar('xp',player.currentExp,player.needExp,{label:'',percent:xp,text:xp.toFixed(2)+'%',variant:'l2'})}</div></div></section>`;
  }
  function targetHud(){
    const peer=selectedPeer(),mob=state.mob,target=peer||mob;
    if(!target)return '';
    const effects=peer?target.effects||[]:[...(target.buffs||[]).map(e=>({id:e.kind,label:e.kind,count:Math.ceil(e.remainMs/1000)})),...(target.debuffs||[]).map(e=>({id:e.kind,label:e.kind,count:Math.ceil(e.remainMs/1000)}))];
    const current=peer?target.hp:target.currentHp,max=peer?target.maxHp:target.hp;
    return `<section class="hunt-target-hud ui-hud ui-combat-readout ${peer?'':'ui-con-'+targetCon(target.level,state.player.level)}" aria-label="Выбранная цель"><div class="hunt-target-title"><strong class="${peer?'':'ui-target-name ui-npc-name'}" ${peer?'':'data-disposition="'+mobDisposition(target)+'"'} title="${escapeHtml(target.name)}">${escapeHtml(peer?target.name:shortMobName(target.name))}</strong>${peer?'':`<button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-mini" data-target-drop="${escapeHtml(target.instanceId)}" aria-label="Посмотреть дроп" title="Посмотреть дроп" ${pending?'disabled':''}><span aria-hidden="true">?</span></button>`}</div><div class="${peer?'':'hunt-mob-target-hp'}">${bar('hp',current,max,{text:Math.round(max>0?current/max*100:0)+'%',variant:'l2',labelInside:true})}</div>${statusIcons(effects,{strip:true,compact:true,interactive:true})}</section>`;
  }
  function effectsHud(){
    const toggles=(state.player.special||[]).filter(s=>s.type==='toggle'&&s.running);
    const toggleIds=new Set(toggles.map(s=>s.id)),effects=(state.player.effects||[]).filter(e=>!toggleIds.has(e.id));
    const list=['buff','debuff','toggle'].flatMap(kind=>{
      const list=kind==='toggle'?toggles.map(s=>({id:s.id,iconKey:s.id,label:s.name,description:s.description})):effects.filter(e=>(e.kind==='debuff'?'debuff':'buff')===kind);
      return list.map(effect=>({...effect,kind}));
    });
    return `<div class="hunt-effects-hud" aria-label="Баффы, дебаффы и тогглы">${statusIcons(list,{strip:true,compact:true,interactive:true})}</div>`;
  }
  function supplyBar(){return combatSuppliesHtml(state,{pending,collapsed:shotsCollapsed});}
  const actionDisabled=action=>pending||state.player.hp<=0||(action.target&&!playerTarget)||(action.id==='attack'&&Boolean(playerTarget||!state.mob||!state.field?.attack))||(action.id==='next-target'&&!state.field?.mobs.length&&!state.players?.length);
  function actionCatalogue(){
    return `<div class="hunt-action-list">${COMBAT_ACTIONS.map(action=>`<div class="ui-content-row hunt-action-row" draggable="true" data-drag-action="action:${action.id}">${combatActionButton(action,{disabled:actionDisabled(action),active:Boolean(state.field?.autoAttack)})}<button class="ui-button ui-compact" data-pin-action="${action.id}" aria-label="${(state.player.hotbar||[]).includes('action:'+action.id)?'Убрать с панели':'На панель'}: ${action.label}">${(state.player.hotbar||[]).includes('action:'+action.id)?'Убрать':'На панель'}</button></div>`).join('')}</div>`;
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
    const toggleLabel=shotsCollapsed?'Развернуть соски и банки':'Свернуть соски и банки';
    const tabs = `<div class="hunt-bar-header"><div class="hunt-bar-tabs ui-folder-tabs ui-icon-tabs ui-combat-tabs" role="tablist" aria-label="Панель боя">
      <button type="button" role="tab" aria-label="Умения" title="Умения" aria-selected="${skillTab === 'skills'}" class="${skillTab === 'skills' ? 'active' : ''}" data-bar-tab="skills">${icon('book-open')}</button>
      <button type="button" role="tab" aria-label="Особые умения" aria-selected="${skillTab === 'special'}" class="${skillTab === 'special' ? 'active' : ''}" data-bar-tab="special" title="Особые умения: ЛС, призывы и переключаемые">${icon('sparkles')}</button>
      <button type="button" role="tab" aria-label="Действия" title="Действия" aria-selected="${skillTab === 'actions'}" class="${skillTab === 'actions' ? 'active' : ''}" data-bar-tab="actions">${icon('swords')}</button>
    </div><div class="hunt-bar-tools" role="group" aria-label="Игровые окна">
      ${!editBar?`<button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-bar-edit aria-label="Настройки панели" title="Настройки панели и припасов">${icon('settings')}</button>`:''}
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-shots-collapse aria-label="${toggleLabel}" title="${toggleLabel}" aria-expanded="${!shotsCollapsed}" aria-controls="hunt-supply-items">${controlIcon(shotsCollapsed?'chevron-up':'chevron-down')}</button>
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-hunt-open="inventory" aria-label="Инвентарь" title="Инвентарь">${l2NavigationIcon('inventory')}</button>
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-hunt-open="mail" aria-label="Почта" title="Почта">${icon('mail')}</button>
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-hunt-open="character" aria-label="Персонаж" title="Персонаж">${l2NavigationIcon('character')}</button>
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-hunt-open="clan" aria-label="Клан" title="Клан">${l2NavigationIcon('clan')}</button>
      <button type="button" class="ui-button ui-icon-button ui-hud-icon ui-hud-toolbar" data-hunt-open="auction" aria-label="Аукцион" title="Аукцион">${l2NavigationIcon('auction')}</button>
    </div></div>`;
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
      const all = player.skills.filter(s=>s.name!=='Attack').map(skill => hotbarChoice(skill, {className: player.className, on: barDraft.includes(skill.index), position: barDraft.indexOf(skill.index) + 1})).join('')+COMBAT_ACTIONS.map(a=>`<button class="ui-button ui-compact" data-hotbar-action="action:${a.id}" aria-pressed="${barDraft.includes('action:'+a.id)}">${a.label}</button>`).join('');
      return `${tabs}<div class="hunt-bar-edit"><small>Выбрано ${barDraft.length} из ${max}. Порядок — по очереди нажатия.</small>
        <div class="mmo-hotbar icons-only">${all}</div>
        <div class="hunt-bar-actions"><button type="button" class="ui-button ui-compact hunt-toggle" data-bar-save ${barDraft.length ? '' : 'disabled'}>Сохранить</button><button type="button" class="ui-button ui-compact hunt-toggle" data-bar-cancel>Отмена</button></div></div>`;
    }
    const actions=Object.fromEntries(COMBAT_ACTIONS.map(a=>['action:'+a.id,combatActionButton(a,{compact:true,disabled:actionDisabled(a),active:Boolean(state.field?.autoAttack)})]));
    return `${tabs}${skillTab==='actions'?actionCatalogue():''}${hotbar(player.skills, {className: player.className, chosen: player.hotbar,slotCount:16,actions,attackAction:{enabled:state.field?.autoAttack,canUse:player.hp>0&&!playerTarget&&Boolean(state.mob&&state.field?.attack)}})}
`;
  }

  function render() {
    if(closed)return;
    const player = state.player;
    const dead = player.hp<=0 || player.respawnRemainMs > 0;
    updateDeathPopup({dead:player.hp<=0,world:state.world,api,onResolved:next=>{if(next.hunt)state=next.hunt;render();}});
    const peer=selectedPeer();
    if(!peer)playerTarget=null;
    const body = [];
    const focused=document.activeElement;
    const focusKey=focused&&content.contains(focused)?['data-skill','data-attack','data-next-target','data-hunt-halt','data-target','data-room','data-bar-tab','data-supply','data-target-drop','data-level-travel','data-level-marker','data-ship-candle','data-location-boss','data-level-npc','data-region-link','data-shots-collapse','data-shots','data-acp','data-acp-threshold','data-combat-action','data-pin-action','data-hunt-open','data-system-chat'].find(key=>focused.hasAttribute(key)):null;
    const focusValue=focusKey?focused.getAttribute(focusKey):null;
    const titleParts=state.field?.title?.split(' · ')||[];
    const displayTitle=state.field?.level&&titleParts.length>1?[...titleParts.slice(1),titleParts[0]].join(' · '):state.field?.title;
    const locationTitle=[displayTitle,state.field?.room?.landmark].filter(Boolean).join(' · ')||'Бой';
    if(state.field?.continuous){
      if(followedSpace!==state.field.continuous.space){followedPoint=null;followedSpace=state.field.continuous.space;displayedRoom=null;}
      followContinuous(state.field);
    }else {followedPoint=null;followedSpace=null;}
    if(state.field&&displayedRoom!==state.field.sceneKey&&!state.field.continuous){
      const entry=isoPoint(state.field,viewport);
      camera={zoom:camera.zoom,x:(viewport.width/2-entry.x)*camera.zoom,y:(viewport.height/2-entry.y)*camera.zoom};
      displayedRoom=state.field.sceneKey;drag=null;
    }
    camera=clampRoomCamera(camera,viewport,state.field?.continuous);
    overlay.querySelector('#hunt-heading').textContent=locationTitle;
    overlay.querySelector('#hunt-heading').title=locationTitle;
    if (state.mob || state.field) {
      body.push('<section class="hunt-scene" aria-label="Бой в локации">',fieldHtml(),'<div class="hunt-top-hud">',playerVitals(player),targetHud(),'<div class="hunt-status-side">',effectsHud(),'</div></div><div class="hunt-scene-dock ui-combat-dock">');
      if (dead&&!state.world?.mode) body.push(`<div class="boss-dead">Воскрешение · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push('<section class="hunt-controls ui-hud-content" aria-label="Боевые действия">');
      if(state.field?.level)body.push(`<button type="button" class="ui-button ui-compact" data-level-travel>${state.field.continuous?'Карта окрестностей':'Переходы и карта этажа'}</button>`);
      const action=state.field?.action;
      const actionText=action?escapeHtml(action.name||'Умение')+' · '+(action.phase==='cast'?'Применение…':'Подходим к цели'):state.field?.pendingRoom?'Идём к выходу':state.field?.autoAttack?'Автоатака оружием':state.field?.path?.length?'Перемещение':'';
      if(actionText)body.push(`<div class="hunt-action-state" role="status">${actionText}</div>`);
      if(peer&&peer.hp>0&&peer.pvp?.status==='neutral')body.push(`<label class="hunt-force"><input type="checkbox" data-force-attack ${forceAttack?'checked':''}>Принудительная атака · убийство даст PK</label>`);
      if(peer&&peer.hp<=0)body.push((state.resurrections||[]).map(s=>`<button class="ui-button ui-compact" data-revive="${escapeHtml(s.id)}" ${pending||s.cooldownUntil>state.now||player.mp<s.cost?'disabled':''}>${escapeHtml(s.name)}</button>`).join(''));
      body.push(supplyBar(),skillBarHtml(player));
      body.push(`</section></div><button type="button" class="ui-button ui-icon-button ui-system-chat-toggle hunt-system-chat" data-system-chat title="Системный чат" aria-label="Открыть системный чат" aria-haspopup="dialog" aria-controls="combat-chat-body">${controlIcon('system-chat')}</button><div class="hunt-combat-settings" ${editBar?'':'hidden'}>`);
      body.push(`<p>${escapeHtml(state.field?.room?.name||state.field?.title||'')}</p>`);
      if(state.field?.map)body.push(`<details data-combat-details="rooms"><summary>${state.field.map.exploration?'Участки':'Комнаты'} · ${escapeHtml(state.field.room.name)}</summary>${mapHtml(state.field)}</details>`);
      body.push('<details class="hunt-extra" data-combat-details="travel"><summary>Перемещение и припасы</summary><div class="hunt-utility">');
      body.push('<button type="button" class="ui-button ui-compact" data-world-exit>Пешком к городу</button><button type="button" class="ui-button ui-compact" data-flee>Свиток возвращения</button>');
      if(state.field?.floors>1&&!state.field.level)body.push(`<div class="hunt-field-actions"><button type="button" class="ui-button ui-compact" data-world-stairs="-1" ${state.field.floor<=1?'disabled':''}>Этаж ниже</button><span>Этаж ${state.field.floor}/${state.field.floors}</span><button type="button" class="ui-button ui-compact" data-world-stairs="1" ${state.field.floor>=state.field.floors?'disabled':''}>Этаж выше</button></div>`);
      body.push(shotsHtml(),vitalityHtml(),'</div></details><div class="hunt-view-controls"><button class="ui-button ui-compact" data-view-zoom="-1" aria-label="Уменьшить масштаб">−</button><button class="ui-button ui-compact" data-view-reset>Вернуть обзор</button><button class="ui-button ui-compact" data-view-zoom="1" aria-label="Увеличить масштаб">+</button></div>');
      if(state.lastLoot)body.push('<button type="button" class="ui-button ui-compact" data-last-loot>Последняя добыча</button>');
      body.push(`<details data-combat-details="acp"><summary>ACP · автозелья</summary><div class="hunt-utility"><label><input type="checkbox" data-acp ${state.supplies?.enabled?'checked':''}> Автоиспользование банок</label><label>Использовать ниже, % <input type="number" min="1" max="99" step="1" data-acp-threshold value="${state.supplies?.threshold||70}"></label><small>При включённом ACP кнопки банок над панелью включают и выключают их автоиспользование. HP повторяется после завершения лечения, MP — не чаще раза в секунду. Только пока открыт бой.</small></div></details>`);
      if(state.players?.length)body.push(`<details class="hunt-extra" data-combat-details="players"><summary>Игроки рядом · ${state.players.length}</summary>${peersHtml()}</details>`);
      if(!peer){
        body.push('<details class="hunt-extra" data-combat-details="soul"><summary>Кристалл души</summary>'+soulHtml()+'</details>');
      }
      body.push('</div></section>');
    } else {
      close();import('./world-map.js').then(({openWorldMap})=>openWorldMap({api,renderState,haptic,statusElement}));return;
    }
    floatNewLog();
    content.innerHTML = body.join('');
    const settings=content.querySelector('.hunt-combat-settings');
    if(editBar&&settings)content.querySelector('.hunt-bar-edit')?.append(settings);
    social.update(state,playerTarget);
    const scene=content.querySelector('.hunt-scene'),effects=content.querySelector('.hunt-effects-hud'),dock=content.querySelector('.hunt-scene-dock');
    scene?.classList.toggle('with-party',Boolean(state.party));
    if(scene&&effects&&dock){
      Object.assign(social.element.style,{left:scene.offsetLeft+'px',top:scene.offsetTop+'px',width:scene.clientWidth+'px',height:scene.clientHeight+'px',right:'auto',bottom:'auto'});
      const top=content.querySelector('.hunt-top-hud'),vitals=content.querySelector('.hunt-vitals');
      social.element.style.setProperty('--party-top',`${top.offsetTop+vitals.offsetHeight+8}px`);
      social.element.style.setProperty('--social-bottom',`${scene.clientHeight-dock.offsetTop+8}px`);
    }
    for(const node of content.querySelectorAll('[data-combat-details]'))node.open=detailsOpen.has(node.dataset.combatDetails);
    if(focusKey)content.querySelector(`[${focusKey}="${CSS.escape(focusValue)}"]`)?.focus({preventScroll:true});
    enhanceSelects(content);
    if (!feedback) feedbackNode.textContent = '';
    bind();
  }

  function bind() {
    content.querySelector('[data-system-chat]')?.addEventListener('click',event=>social.openChat('system',event.currentTarget));
    content.querySelectorAll('[data-hunt-open]').forEach(button=>button.addEventListener('click',async()=>{
      if(button.disabled||openingWindow)return;openingWindow=true;button.disabled=true;
      try{
        await ensureFeatureStyles();
        const options={api,renderState,haptic,statusElement};
        if(button.dataset.huntOpen==='inventory'){const {openInventoryGame}=await import('./inventory.js');await openInventoryGame(options);}
        if(button.dataset.huntOpen==='mail'){const {openMailGame}=await import('./mail.js');await openMailGame(options);}
        if(button.dataset.huntOpen==='character'){const {openCharacterPage}=await import('./character.js');await openCharacterPage(options);}
        if(button.dataset.huntOpen==='clan'){const {openClanGame}=await import('./clan.js');await openClanGame(options);}
        if(button.dataset.huntOpen==='auction'){const {openAuctionGame}=await import('./auction.js');await openAuctionGame(options);}
      }catch(error){say(error.message);}finally{openingWindow=false;button.disabled=false;}
    }));
    content.querySelector('[data-shots-collapse]')?.addEventListener('click',()=>{
      shotsCollapsed=!shotsCollapsed;
      try{localStorage.setItem('hunt:supplies-collapsed',shotsCollapsed?'1':'0');}catch{}
      render();
    });
    content.querySelector('[data-target-drop]')?.addEventListener('click',async e=>{
      const result=await run('/api/hunt/drop',{targetId:e.currentTarget.dataset.targetDrop});
      render();if(!closed&&result?.dropPreview)showDropPreview(result.dropPreview,{onClose:()=>content.querySelector('[data-target-drop]')?.focus({preventScroll:true})});
    });
    content.querySelectorAll('[data-combat-action]').forEach(b=>b.addEventListener('click',()=>performAction(b.dataset.combatAction)));
    content.querySelectorAll('[data-pin-action]').forEach(b=>b.addEventListener('click',()=>pinAction('action:'+b.dataset.pinAction)));
    content.querySelector('[data-acp]')?.addEventListener('change',async e=>{await run('/api/hunt/supplies',{enabled:e.target.checked});render();});
    content.querySelector('[data-acp-threshold]')?.addEventListener('change',async e=>{if(e.target.checkValidity())await run('/api/hunt/supplies',{threshold:Number(e.target.value)});render();});
    content.querySelectorAll('[data-supply]').forEach(b=>b.addEventListener('click',async()=>{
      const p=state.supplies.rows.find(p=>p.slot===b.dataset.supply);
      if(state.supplies.enabled){await run('/api/hunt/supplies',{slot:p.slot,active:!p.auto});render();}
      else if(p.key!=null)await drink(p.key);
    }));
    content.querySelectorAll('[data-status-info]').forEach(n=>n.addEventListener('click',()=>say(n.title)));
    content.querySelectorAll('[data-drag-action]').forEach(n=>n.addEventListener('dragstart',e=>{draggedSlot=n.dataset.dragAction;e.dataTransfer.setData('text/plain',draggedSlot);}));
    content.querySelectorAll('.mmo-hotbar[data-slot-count]>.mmo-skill').forEach((n,index)=>{
      n.addEventListener('dragover',e=>{e.preventDefault();});
      n.addEventListener('drop',async e=>{e.preventDefault();const action=e.dataTransfer.getData('text/plain')||draggedSlot;if(COMBAT_ACTIONS.some(a=>'action:'+a.id===action))await pinAction(action,index);draggedSlot=null;});
    });
    content.querySelector('[data-last-loot]')?.addEventListener('click',()=>showLootDetails(state.lastLoot));
    for(const node of content.querySelectorAll('[data-combat-details]'))node.addEventListener('toggle',()=>{if(node.open)detailsOpen.add(node.dataset.combatDetails);else detailsOpen.delete(node.dataset.combatDetails);});
    content.querySelectorAll('[data-attack]:not([data-combat-action])').forEach(b=>b.addEventListener('click',()=>performAction('attack')));
    content.querySelector('[data-hunt-halt]')?.addEventListener('click',stop);
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
        if(!state.field?.continuous&&(point.x<.02||point.x>.98||point.y<.02||point.y>.98))return;
        await run('/api/hunt/move',{point});render();
      });
      ground.addEventListener('click',e=>{if(ignoreMapClick){ignoreMapClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
      ground.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.75,Math.min(1.65,camera.zoom+(e.deltaY<0?.1:-.1)));applyCamera();},{passive:false});
    }
    content.querySelectorAll('[data-view-zoom]').forEach(b=>b.addEventListener('click',()=>{camera.zoom=Math.max(.75,Math.min(1.65,camera.zoom+Number(b.dataset.viewZoom)*.15));applyCamera();}));
    content.querySelector('[data-view-reset]')?.addEventListener('click',()=>{camera={zoom:1,x:0,y:0};applyCamera();});
    content.querySelector('[data-world-exit]')?.addEventListener('click',async()=>{await run('/api/world/action',{action:'walk_exit'});render();});
    content.querySelector('[data-level-travel]')?.addEventListener('click',showLevelTravel);
    content.querySelectorAll('[data-level-marker]').forEach(b=>b.addEventListener('click',async()=>{const d=state.field.level.destinations[Number(b.dataset.levelMarker)];if(d.near)showLevelTravel();else {await run('/api/hunt/move',{point:d.point});render();}}));
    content.querySelectorAll('[data-treasure-chest]').forEach(b=>b.addEventListener('click',()=>showTreasureChest(b.dataset.treasureChest)));
    content.querySelectorAll('[data-dragon-vortex]').forEach(b=>b.addEventListener('click',()=>showDragonVortex(b.dataset.dragonVortex)));
    content.querySelectorAll('[data-region-link]').forEach(b=>b.addEventListener('click',showLevelTravel));
    content.querySelectorAll('[data-level-npc]').forEach(b=>b.addEventListener('click',()=>say(b.dataset.levelNpc)));
    content.querySelectorAll('[data-ship-candle]').forEach(b=>b.addEventListener('click',async()=>{const c=state.field.ship.candles.find(c=>c.id===Number(b.dataset.shipCandle));if(c.state!=='unlit')return;if(c.near)await run('/api/world/action',{action:'ship_candle',candle:c.id});else await run('/api/hunt/move',{point:{x:c.x,y:c.y}});render();}));
    content.querySelectorAll('[data-location-boss]').forEach(b=>b.addEventListener('click',async()=>{
      if(Math.hypot(state.field.x-.5,state.field.y-.5)>.1){await run('/api/hunt/move',{point:{x:.5,y:.5}});render();return;}
      if(pending)return;pending=true;
      try{const {openBossGame}=await import('./boss.js');await openBossGame({api,renderState,haptic,statusElement,initialBoss:b.dataset.locationBoss,fromLocation:true});close();}catch(error){say(error.message);}finally{pending=false;}
    }));
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
    content.querySelectorAll('[data-hotbar-action]').forEach(button=>button.addEventListener('click',()=>{
      const action=button.dataset.hotbarAction;
      if(barDraft.includes(action))barDraft=barDraft.filter(v=>v!==action);
      else if(barDraft.length<(state.player.hotbarMax||16))barDraft.push(action);
      else say('На панели нет свободного места.');
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
    content.querySelectorAll('[data-shots]').forEach(b=>b.addEventListener('click',()=>toggleShots(b.dataset.shots||null)));
  }
  async function pinAction(action,position=null){
    const slots=[...(state.player.hotbar||[])],index=slots.indexOf(action),max=state.player.hotbarMax||16;
    if(position!==null){
      if(index>=0)slots.splice(index,1);
      if(slots.length>=max)slots.splice(Math.min(position,slots.length-1),1);
      slots.splice(Math.min(position,slots.length),0,action);
    }else if(index>=0)slots.splice(index,1);
    else if(slots.length<max)slots.push(action);
    else {say('На панели нет свободного места. Открой настройку умений.');return;}
    if(!slots.length){say('Оставь на панели хотя бы одно действие или умение.');return;}
    await run('/api/hunt/hotbar',{slots});render();
  }
  async function performAction(id){
    if(pending)return;
    if(id==='attack'){await run('/api/hunt/attack',{enabled:!state.field?.autoAttack});render();return;}
    if(id==='next-target')return nextTarget();
    if(id==='trade'){
      if(!playerTarget){say('Выбери игрока для обмена.');return;}
      const {openTradeGame}=await import('./trade.js');
      return openTradeGame({api,renderState,haptic,targetId:playerTarget});
    }
    const action=({'party-invite':'invite','party-leave':'leave','party-transfer':'transfer'})[id];
    if(action){
      if(action!=='leave'&&!playerTarget){say('Выбери игрока.');return;}
      const result=await run('/api/party/action',{action,userId:playerTarget});
      if(result){say(action==='invite'?'Приглашение в группу отправлено.':action==='leave'?'Ты вышел из группы.':'Лидерство передано.');state=await api('/api/hunt');}
      render();
    }
  }

  // The mob swings in real time: poll while a fight is on, show new swings, and tick the timers locally.
  async function poll({signal,current}) {
    if (pending || drag || document.hidden || !overlay.isConnected || (!state.mob && !state.field)) return;
    try {
      const next = await api('/api/hunt', {signal});
      if (!current() || pending || drag || closed || !overlay.isConnected) return;
      social.refresh();
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
    social.tick();
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

  function followContinuous(point){
    const current=isoPoint(point,viewport);
    if(followedPoint){const previous=isoPoint(followedPoint,viewport);camera.x+=(previous.x-current.x)*camera.zoom;camera.y+=(previous.y-current.y)*camera.zoom;}
    else {camera.x=(viewport.width/2-current.x)*camera.zoom;camera.y=(viewport.height/2-current.y)*camera.zoom;}
    followedPoint={x:point.x,y:point.y};
  }
  function applyCamera(){camera=clampRoomCamera(camera,viewport,state.field?.continuous);const world=content.querySelector('.hunt-world');if(world)world.style.transform=`translate(${camera.x}px,${camera.y}px) scale(${camera.zoom})`;}
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

  function escapeAction(event){if(social.closeChat()){event.preventDefault();return;}if(state.field?.autoAttack||state.field?.action||state.field?.path?.length){event.preventDefault();stop();}}
  function keyboard(event){
    if(event.target.closest('input,select,textarea,[contenteditable]'))return;
    if(event.key==='Escape'&&(state.field?.autoAttack||state.field?.action||state.field?.path?.length)){event.preventDefault();event.stopPropagation();stop();}
    if(event.key==='Tab'&&event.target.closest('.hunt-ground')){event.preventDefault();nextTarget();}
  }
  function animate(at){
    if(closed||document.hidden)return;
    if(!overlay.isConnected){close();return;}
    if(at-lastFrame>=50&&state.field){lastFrame=at;const actor=displayedPosition(state.field,Date.now()-receivedAt),point=isoPoint(actor,viewport);if(state.field.continuous){followContinuous(actor);applyCamera();}const node=content.querySelector('.hunt-hero-marker');if(node){node.style.left=point.x+'px';node.style.top=point.y+'px';node.style.zIndex=10+Math.round((actor.x+actor.y)*10);fieldRenderer.moveSelf();}}
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
