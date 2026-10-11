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
};
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
  let zoneKind=initialZoneKind==='catacomb'?'catacomb':'field';
  let skillTab = 'skills'; let editBar = false; let barDraft = [];
  let pending = false;
  let feedback = '';
  let lastLog = state.log?.[0]?.text || '';
  let dropOpen = false;
  let playerTarget = null;
  let forceAttack = false;

  const overlay = document.createElement('section');
  overlay.className = 'game-overlay hunt-overlay';
  overlay.innerHTML = `
    <div class="overlay-backdrop"></div>
    <div class="overlay-panel glass hunt-panel">
      <header class="ds-head">
        <button class="overlay-close ds-round" type="button" aria-label="Закрыть">←</button>
        <h2>Охотничьи поля</h2>
        <span class="ds-round" aria-hidden="true">${icon('swords')}</span>
      </header>
      <div data-hunt-content></div>
      <div class="boss-feedback" data-hunt-feedback aria-live="polite"></div>
    </div>`;
  const content = overlay.querySelector('[data-hunt-content]');
  const feedbackNode = overlay.querySelector('[data-hunt-feedback]');
  let animation=0,receivedAt=Date.now();
  let timer = 0;
  let pollTimer = 0;
  const close = () => {
    cancelAnimationFrame(animation);window.clearInterval(timer);
    pollTimer?.stop();
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  // the system chat floats over the screen instead of taking room in the page
  const say = text => { feedback = ''; systemToast(text); };
  let lastLogAt = null;
  function floatNewLog() {
    const rows = [...(state?.log || []), ...(state?.pvpLog || [])].filter(row => Number(row.at) > 0).sort((a, b) => a.at - b.at);
    if (!rows.length) return;
    // the first state only sets the mark: the old journal is not replayed
    if (lastLogAt !== null) {
      for (const row of rows.filter(row => row.at > lastLogAt)) {
        systemToast(row.text, icon(row.icon === '⚑' ? 'flag' : emojiIconName(row.icon) || 'swords'));
      }
    }
    lastLogAt = Math.max(lastLogAt || 0, rows.at(-1).at);
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
      statusElement.textContent = `Охота: ${feedback}`;
      haptic('light');
      return null;
    } finally {
      pending = false;
      overlay.classList.remove('busy');
    }
  }

  function describeResult(payload) {
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
      text = `${r.champion ? `${CHAMPION[r.champion].label} · ` : ''}Враг повержен: +${formatNumber(r.exp)} опыта${r.bonus > 1 ? ` (Vitality ×${r.bonus})` : ''}, +${formatNumber(r.sp)} ОП${r.gold ? `, +${formatNumber(r.gold)} адены` : ''}${items ? `, ${items}` : ''}${r.leveledUp ? ' · НОВЫЙ УРОВЕНЬ!' : ''}`;
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
      else say(describeResult(payload));
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
      <button type="button" class="hunt-toggle" data-shots>${shots.enabled ? 'Авто: вкл' : 'Авто: выкл'}</button>
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
    <section class="mmo-frame target-frame hunt-mob ${mob.champion ? `champion ${mob.champion}` : ''}">
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
  function fieldHtml() {
    const field=state.field;if(!field)return '';
    const zone=state.zones.find(z=>z.id===state.zone),art=huntZoneUrl(zone);
    const room=field.room||{};
    return '<section class="hunt-battlefield"><div class="hunt-field-head"><strong>'+escapeHtml(field.title)+(field.map?' · '+escapeHtml(room.name||''):'')+'</strong><small>'+field.mobs.filter(m=>m.aggro).length+' в бою · монстров: '+field.mobs.length+(room.cap?'/'+room.cap:'')+'</small></div>'+mapHtml(field)+'<div class="hunt-ground" style="'+(art?'--field-art:url('+art+');':'')+'height:'+(room.height||260)+'px">'
      +(field.walls||[]).map(w=>'<span class="hunt-wall" style="left:'+w.x*100+'%;top:'+w.y*100+'%;width:'+w.w*100+'%;height:'+w.h*100+'%"></span>').join('')
      +(state.players||[]).map(p=>'<button class="hunt-player-marker" data-pvp-target="'+p.userId+'" style="left:'+p.x*100+'%;top:'+p.y*100+'%"><img src="'+classArtUrl(p.className,p.gender)+'" alt=""><small>'+escapeHtml(p.name)+'</small></button>').join('')
      +field.mobs.map(m=>'<button type="button" class="hunt-actor '+(!playerTarget&&m.instanceId===field.target?'selected ':'')+(m.aggro?'aggro':'')+'" data-target="'+escapeHtml(m.instanceId)+'" style="left:'+m.x*100+'%;top:'+m.y*100+'%" aria-pressed="'+(!playerTarget&&m.instanceId===field.target)+'"><span class="hunt-actor-portrait">'+(huntMobUrl(m)?'<img src="'+huntMobUrl(m)+'" alt="">':icon('ghost'))+'<i>'+m.level+'</i></span><span class="hunt-actor-hp"><i style="width:'+m.hpPercent+'%"></i></span><strong>'+escapeHtml(m.name)+'</strong><small>'+(m.stunned?'Оглушён':m.aggro?'Атакует':m.aggressive?'Агрессивный':m.role||'Мирный')+'</small></button>').join('')
      +'<span class="hunt-hero-marker" style="left:'+field.x*100+'%;top:'+field.y*100+'%"><img src="'+classArtUrl(state.player.className,state.player.gender)+'" alt=""><small>Ты</small></span>'
      +(field.mobs.length?'':'<div class="hunt-field-cleared">'+(field.map?'В комнате пусто':'Поле зачищено')+'<br><small>'+(field.respawning?'Новые монстры появятся через '+Math.max(1,Math.ceil(field.nextSpawnMs/1000))+' с.':'Забери добычу и выбери следующую локацию.')+'</small></div>')
      +'</div><p>Тап по полу — бежать к точке. Тап по монстру — выбрать цель.</p><button data-world-exit>Пешком к городу</button><button data-world-stairs="-1">Этаж ниже</button><button data-world-stairs="1">Этаж выше</button><span> · Этаж '+field.floor+' / '+field.floors+'</span></section>';
  }

  function peersHtml() {
    if(!state.field)return '';
    return '<section class="hunt-peers"><div class="mmo-section-title"><strong>'+icon('users')+' Игроки в локации</strong><small>'+ (state.players?.length || 0)+'</small></div>'
      +(state.players?.length?'<div class="hunt-peer-list">'+state.players.map(p=>'<button class="hunt-peer pvp-'+p.pvp.status+' '+(String(p.userId)===String(playerTarget)?'selected':'')+'" data-pvp-target="'+p.userId+'" aria-pressed="'+(String(p.userId)===String(playerTarget))+'"><img src="'+classArtUrl(p.className,p.gender)+'" alt=""><span><strong>'+escapeHtml(p.name)+'</strong><small>'+p.level+' ур. · '+(p.pvp.status==='pk'?'PK':p.pvp.status==='flagged'?'PvP':'Мирный')+'</small></span>'+icon(p.pvp.status==='pk'?'skull':p.pvp.status==='flagged'?'flag':'user')+'</button>').join('')+'</div>':'<p>Других игроков рядом нет.</p>')+'</section>';
  }

  function pvpTargetHtml(peer) {
    if(peer.hp<=0)return '<section class="hunt-pvp-target">'+playerFrame(peer)+(state.resurrections||[]).map(s=>`<button data-revive="${escapeHtml(s.id)}" ${pending||s.cooldownUntil>state.now||state.player.mp<s.cost?'disabled':''}>${escapeHtml(s.name)}</button>`).join('')+'</section>';
    return '<section class="hunt-pvp-target"><small>Выбран игрок</small>'+playerFrame(peer)+'<label class="hunt-force"><input type="checkbox" data-force-attack '+(forceAttack?'checked':'')+'> Принудительная атака (Ctrl)</label>'
      +(peer.pvp.status==='neutral'?'<p>Убийство мирного игрока даёт PK и карму. Если он ответит атакой, бой станет PvP.</p>':'<p>Игрок доступен для атаки без принудительного режима.</p>')+'</section>';
  }

  function zonesHtml() {
    const zones = state.zones.filter(z=>(z.kind||'field')===zoneKind);
    return `<div class="equipment-filters"><button data-zone-kind="field" class="equipment-filter ${zoneKind==='field'?'active':''}">Поля</button><button data-zone-kind="catacomb" class="equipment-filter ${zoneKind==='catacomb'?'active':''}">Катакомбы · 6 локаций</button></div><div class="hunt-zones">${zones.map(zone => `
      <article class="hunt-zone ${zone.recommended ? 'recommended' : ''} ${zone.reachable ? '' : 'far'}">
        ${huntZoneUrl(zone)?`<img class="hunt-zone-art" src="${huntZoneUrl(zone)}" srcset="${huntZoneUrl(zone)} 1x, ${huntZoneUrl(zone,960)} 2x" width="480" height="160" alt="" loading="lazy" decoding="async">`:''}
        <div class="hunt-zone-head"><strong>${escapeHtml(zone.title)}</strong><small>ур. ${zone.min}–${zone.max}${zone.recommended ? ' · для тебя' : ''}</small></div>
        <details class="hunt-zone-loot" data-loot-zone="${escapeHtml(zone.id)}" ${lootOpen.has(zone.id)?'open':''}><summary>Монстры и дроп · ${zone.mobs.length}</summary>${lootOpen.has(zone.id)?zoneLootHtml(zone):''}</details>
        <button type="button" class="equipment-action forge-action" data-zone="${escapeHtml(zone.id)}" ${zone.reachable ? '' : 'disabled'}>${zone.reachable ? 'Войти на поле боя' : 'Опыт не даётся'}</button>
      </article>`).join('')}</div>`;
  }

  function soulHtml(){const soul=state.soulCrystals;if(!soul)return '';const names={red:'Красный',green:'Зелёный',blue:'Синий'},active=soul.active;return '<section class="mmo-frame hunt-soul"><strong>'+materialIcon(active?'soul_'+active.color+'_'+active.stage:'soul_red_0')+' Кристалл души '+(active?'· '+names[active.color]+' '+active.stage+' ур.':'· не выбран')+'</strong><p>С 40 уровня. Используй на подходящем монстре при HP ≤ 50%, затем победи. 10+ — прокачка на рейдах.</p><div class="select-row"><label for="hunt-soul-select">Кристалл</label><select id="hunt-soul-select" data-soul-select><option value="">Не выбран</option>'+soul.stock.map(o=>'<option value="'+o.color+':'+o.stage+'" '+(active?.color===o.color&&active?.stage===o.stage?'selected':'')+'>'+names[o.color]+' · '+o.stage+' ур. ×'+o.count+'</option>').join('')+'</select></div>'+(state.mob?'<button class="equipment-action forge-action" data-soul-charge '+(soul.charge?.ok?'':'disabled')+'>Поглотить душу</button><small>'+escapeHtml(soul.charge?.ok?'Готов к использованию':REASONS[soul.charge?.reason]||'')+'</small>':'')+'<p>Камни печати → AA · баланс '+formatNumber(soul.aa)+'</p><div>'+Object.entries(soul.seals).map(([c,o])=>materialIcon('seal_'+c)+' '+formatNumber(o.count)+' × '+o.rate+' AA').join(' · ')+'</div><button class="equipment-action forge-action" data-seal-exchange '+(Object.values(soul.seals).some(o=>o.count>0)?'':'disabled')+'>Обменять все камни на AA</button></section>';}
  function lastHtml() {
    const last = state.last;
    if (!last) return '';
    const items = (last.items || []).map(item => `${materialIcon(item.item)} ${escapeHtml(item.name)} ×${item.amount}`).join(', ');
    return `<section class="mmo-frame hunt-last">
      <div class="mmo-section-title"><strong>${last.champion ? `${CHAMPION[last.champion].icon} ` : ''}Последняя добыча: ${escapeHtml(last.name)}</strong><small>убито: ${formatNumber(state.kills)}</small></div>
      <p>+${formatNumber(last.exp)} опыта · +${formatNumber(last.sp)} ОП${last.gold ? ` · +${formatNumber(last.gold)} ${icon('coin')}` : ''}${items ? `<br>${items}` : ''}</p>
    </section>`;
  }

  // The skill bar: the skills the player put on it (up to 16), and a second tab with Life Stone and toggle skills.
  function skillBarHtml(player) {
    const max = player.hotbarMax || 16;
    const tabs = `<div class="hunt-bar-tabs" role="tablist">
      <button type="button" role="tab" aria-selected="${skillTab === 'skills'}" class="${skillTab === 'skills' ? 'active' : ''}" data-bar-tab="skills">Умения</button>
      <button type="button" role="tab" aria-selected="${skillTab === 'special'}" class="${skillTab === 'special' ? 'active' : ''}" data-bar-tab="special" title="Навыки ЛС, призывы и переключаемые">Особые</button>
    </div>`;
    if (skillTab === 'special') {
      const rows = (player.special || []).map(row => `
        <button type="button" class="mmo-skill boss-skill special ${row.running ? 'on' : ''}" data-special="${escapeHtml(row.id)}" ${row.canUse && !pending ? '' : 'disabled'} title="${escapeHtml(row.name+' — '+(row.description||''))}" aria-label="${escapeHtml(row.name)}">
          <span class="mmo-skill-icon">${l2EffectIcon(row.id) || l2SkillIcon(row.iconId) || l2SkillIcon(row.name) || icon('sparkles')}</span>
          <small class="mmo-skill-cost">${formatNumber(row.costMp||0)}</small>
          <span class="mmo-skill-cooldown">${row.cooldownMs > 0 && row.type === 'ls' ? formatDuration(row.cooldownMs) : ''}</span>
        </button>`).join('');
      return `${tabs}<div class="mmo-hotbar icons-only">${rows || '<p class="party-note">Нет особых умений: нужен камень жизни на оружии, призывы или переключаемые умения класса.</p>'}</div>`;
    }
    if (editBar) {
      const all = player.skills.map(skill => hotbarChoice(skill, {className: player.className, on: barDraft.includes(skill.index), position: barDraft.indexOf(skill.index) + 1})).join('');
      return `${tabs}<div class="hunt-bar-edit"><small>Выбрано ${barDraft.length} из ${max}. Порядок — по очереди нажатия.</small>
        <div class="mmo-hotbar icons-only">${all}</div>
        <div class="hunt-bar-actions"><button type="button" class="hunt-toggle" data-bar-save ${barDraft.length ? '' : 'disabled'}>Сохранить</button><button type="button" class="hunt-toggle" data-bar-cancel>Отмена</button></div></div>`;
    }
    return `${tabs}${hotbar(player.skills, {className: player.className, chosen: player.hotbar})}
      <div class="hunt-bar-actions"><button type="button" class="hunt-toggle" data-bar-edit>Настроить панель · ${(player.hotbar || []).length}/${max}</button></div>`;
  }

  function render() {
    const player = state.player;
    const dead = player.hp<=0 || player.respawnRemainMs > 0;
    updateDeathPopup({dead:player.hp<=0,world:state.world,api,onResolved:next=>{if(next.hunt)state=next.hunt;render();}});
    const peer=state.players?.find(p=>String(p.userId)===String(playerTarget));
    if(!peer)playerTarget=null;
    const body = [];
    if (state.mob || state.field) {
      body.push(fieldHtml());
      body.push(peersHtml());
      if(peer)body.push(pvpTargetHtml(peer));
      else if(state.mob){body.push(mobFrame(state.mob));body.push('<details class="hunt-target-drops" '+(dropOpen?'open':'')+'><summary>Дроп выбранного монстра · '+(state.mob.drops?.length||0)+'</summary>'+dropsHtml(state.mob.drops)+'<small>Шансы с учётом уровня и типа чемпиона. Каждый предмет разыгрывается отдельно.</small></details>');}
      body.push(playerFrame(player));
      if (dead&&!state.world?.mode) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push('<section class="hunt-controls">');
      body.push(skillBarHtml(player));
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push(shotsHtml());
      if(!peer)body.push(vitalityHtml());
      body.push('<button type="button" class="hunt-flee" data-flee>Свиток возвращения</button>');
      body.push('</section>');
      if(!peer){
        body.push(lastHtml());
        body.push('<details class="hunt-extra"><summary>Кристалл души и камни печати</summary>'+soulHtml()+'</details>');
      }
    } else {
      body.push(soulHtml());
      body.push(playerFrame(player));
      body.push(vitalityHtml());
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push(shotsHtml());
      if (dead&&!state.world?.mode) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push(lastHtml());
      body.push(`<div class="mmo-section-title"><strong>Зоны</strong><small>🔵 синий: ×3 опыта · 🔴 красный: ×8 опыта и добычи</small></div>`);
      body.push(zonesHtml());
    }
    floatNewLog();
    content.innerHTML = body.join('');
    if (!feedback) feedbackNode.textContent = '';
    bind();
  }

  function bind() {
    content.querySelectorAll('[data-revive]').forEach(b=>b.addEventListener('click',async()=>{await run('/api/world/action',{action:'revive',skillId:b.dataset.revive,userId:playerTarget});render();}));
    content.querySelectorAll('[data-pvp-target]').forEach(b=>b.addEventListener('click',()=>{playerTarget=b.dataset.pvpTarget;forceAttack=false;render();}));
    content.querySelector('[data-force-attack]')?.addEventListener('change',e=>{forceAttack=e.target.checked;});
    content.querySelector('.hunt-target-drops')?.addEventListener('toggle', e=>{dropOpen=e.target.open;});
    content.querySelectorAll('[data-loot-zone]').forEach(d=>d.addEventListener('toggle',e=>{if(e.target!==d)return;const id=d.dataset.lootZone;if(d.open){if(lootOpen.has(id))return;lootOpen.add(id);if(lootCache[id])render();else{lootOpen.add(id);d.insertAdjacentHTML('beforeend','<p class="hunt-loot-wait">Загружаю таблицу дропа…</p>');loadZoneLoot(id);}}else lootOpen.delete(id);}));
    content.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',async()=>{playerTarget=null;forceAttack=false;await run('/api/hunt/target',{targetId:b.dataset.target});render();}));
    content.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',async()=>{playerTarget=null;await run('/api/hunt/move',{direction:'room:'+b.dataset.room});render();}));
    content.querySelector('.hunt-ground')?.addEventListener('click',async e=>{
      if(e.target.closest('button'))return;
      const rect=e.currentTarget.getBoundingClientRect();
      await run('/api/hunt/move',{point:{x:(e.clientX-rect.left)/rect.width,y:(e.clientY-rect.top)/rect.height}});render();
    });
    content.querySelector('[data-world-exit]')?.addEventListener('click',async()=>{await run('/api/world/action',{action:'walk_exit'});render();});
    content.querySelectorAll('[data-world-stairs]').forEach(b=>b.addEventListener('click',async()=>{await run('/api/world/action',{action:'floor',floor:(state.field?.floor||1)+Number(b.dataset.worldStairs)});render();}));
    content.querySelectorAll('[data-zone-kind]').forEach(b=>b.addEventListener('click',()=>{zoneKind=b.dataset.zoneKind;render();}));
    content.querySelector('[data-soul-select]')?.addEventListener('change',async e=>{const [color,stage]=e.target.value.split(':');await run('/api/soul/select',{color:color||null,stage:Number(stage)});render();});
    content.querySelector('[data-soul-charge]')?.addEventListener('click',async()=>{const p=await run('/api/hunt/soul');if(p)say('Кристалл использован. Победи монстра для попытки прокачки.');render();});
    content.querySelector('[data-seal-exchange]')?.addEventListener('click',async()=>{const counts=Object.fromEntries(Object.entries(state.soulCrystals.seals).map(([c,o])=>[c,o.count]));const p=await run('/api/catacombs/exchange',{counts});if(p)say('Получено '+formatNumber(p.aa)+' AA.');render();});
    content.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', e => skill(button.dataset.skill,e.ctrlKey)));
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
    if (pending || document.hidden || !overlay.isConnected || (!state.mob && !state.field)) return;
    try {
      const next = await api('/api/hunt', {signal});
      if (!current() || pending || !overlay.isConnected) return;
      // Countdowns tick locally; only real changes re-render.
      const clockless = value => JSON.stringify(value, (key, v) => (/Ms$/.test(key) ? 0 : v));
      if (clockless(next) === clockless(state)) { state = next; return; }
      const top = next.log?.[0]?.text || '';
      state = next;
      if (top && top !== lastLog) {
        lastLog = top;
          if(!playerTarget)say(top);
        if (/бьёт/.test(top)) haptic('medium');
      }
      render();
    } catch (error) { throw error; }
  }

  function tick() {
    content.querySelectorAll('[data-pvp-flag]').forEach(node=>{node.textContent=formatDuration(Math.max(0,Number(node.dataset.until)-Date.now()));});
    content.querySelectorAll('[data-skill-cooldown]').forEach(node => {
      const remain = Math.max(0, Number(node.dataset.until || 0) - Date.now());
      node.textContent = remain > 0 ? formatDuration(remain) : '';
      const total = Number(node.dataset.total) || remain;
      node.closest('.mmo-skill')?.style.setProperty('--cd', total > 0 ? String(remain / total) : '0');
      if (remain <= 0) node.closest('.boss-skill')?.removeAttribute('disabled');
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

  function animate(){if(!document.hidden&&state.field){const actor=displayedPosition(state.field,Date.now()-receivedAt);const node=content.querySelector('.hunt-hero-marker');if(node){node.style.left=actor.x*100+'%';node.style.top=actor.y*100+'%';}}animation=requestAnimationFrame(animate);}
  render();
  document.body.appendChild(overlay);animation=requestAnimationFrame(animate);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 200);
  pollTimer = createPoller(poll, {interval:2000,enabled:()=>!pending && overlay.isConnected && !overlay.classList.contains('closing')});
}
