import {materialIcon} from './material-icons.js';
import {l2CategoryIcon} from './art/l2-icon-art.js';
import {huntZoneUrl,huntMobUrl} from './art/hunt-art.js';
import {shotIcon,elementIcon,championIcon} from './art/painted-icon-art.js';
import { bar, escapeHtml, formatDuration, formatNumber, hotbar, playerFrame, potionBar, statusIcons } from './boss-hud.js';
import {icon,emojiIconName} from './icons.js';
import {classArtUrl} from './boss-stage.js';

// Hunting fields (Lineage II style): pick a zone, fight one mob at a time in real time with skills,
// potions and shots. Blue and red champions are tougher and pay much more.

const REASONS = {no_active_crystal:'Выбери кристалл души.',no_soul_crystal:'Этот кристалл уже израсходован.',soul_level:'Прокачка кристаллов доступна с 40 уровня.',soul_max_stage:'Кристалл достиг 17 уровня.',soul_wrong_mob:'Душа этого монстра не подходит для текущей ступени.',soul_hp:'Используй кристалл, когда HP монстра будет не выше 50%.',soul_already_charged:'Кристалл уже использован на этом монстре.',invalid_seals:'Недостаточно камней печати.',
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

export async function openHuntGame({ api, renderState, haptic, statusElement,initialZoneKind='field' }) {
  let state = await api('/api/hunt');
  let zoneKind=initialZoneKind==='catacomb'?'catacomb':'field';
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
  let timer = 0;
  let pollTimer = 0;
  const close = () => {
    window.clearInterval(timer);
    window.clearInterval(pollTimer);
    overlay.classList.add('closing');
    window.setTimeout(() => overlay.remove(), 180);
  };
  overlay.querySelector('.overlay-close').addEventListener('click', close);
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);

  const say = text => { feedback = text; feedbackNode.textContent = text; };

  function take(payload) {
    if (payload?.hunt) state = payload.hunt;
    if (payload?.state) renderState(payload.state);
  }

  async function run(path, body, { heavy = false } = {}) {
    if (pending) return null;
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
    if (payload) say('Ты покинул поле боя.');
    render();
  }

  async function drink(key) {
    if (pending) return;
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
  const chanceText = value => value >= 100 ? '×' + new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(value/100) : new Intl.NumberFormat('ru-RU',{maximumFractionDigits:value < 1 ? 3 : 2}).format(value)+'%';
  function dropRow(d) {
    return '<div>'+materialIcon(d.key,escapeHtml(d.icon))+'<span>'+escapeHtml(d.name)+'<small>×'+formatNumber(d.min)+(d.min===d.max?'':'–'+formatNumber(d.max))+'</small></span><b>'+chanceText(d.chance)+'</b></div>';
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
  async function loadZoneLoot(zoneId) {
    if (lootCache[zoneId]) return;
    try { lootCache[zoneId] = await api('/api/hunt/loot', { method: 'POST', body: JSON.stringify({ zone: zoneId }) }); } catch (error) { return; }
    render();
  }

  function fieldHtml() {
    const field=state.field;if(!field)return '';
    const zone=state.zones.find(z=>z.id===state.zone),art=huntZoneUrl(zone);
    return '<section class="hunt-battlefield"><div class="hunt-field-head"><strong>'+escapeHtml(field.title)+'</strong><small>'+field.mobs.filter(m=>m.aggro).length+' в бою</small></div><div class="hunt-ground" '+(art?'style="--field-art:url('+art+')"':'')+'>'
      +field.mobs.map(m=>'<button type="button" class="hunt-actor '+(!playerTarget&&m.instanceId===field.target?'selected ':'')+(m.aggro?'aggro':'')+'" data-target="'+escapeHtml(m.instanceId)+'" style="left:'+m.x*100+'%;top:'+m.y*70+'%" aria-pressed="'+(!playerTarget&&m.instanceId===field.target)+'"><span class="hunt-actor-portrait">'+(huntMobUrl(m)?'<img src="'+huntMobUrl(m)+'" alt="">':icon('ghost'))+'<i>'+m.level+'</i></span><span class="hunt-actor-hp"><i style="width:'+m.hpPercent+'%"></i></span><strong>'+escapeHtml(m.name)+'</strong><small>'+(m.stunned?'Оглушён':m.aggro?'Атакует':m.aggressive?'Агрессивный':m.role||'Мирный')+'</small></button>').join('')
      +'<span class="hunt-hero-marker" style="left:'+field.x*100+'%;top:'+Math.min(90,field.y*70+30)+'%"><img src="'+classArtUrl(state.player.className,state.player.gender)+'" alt=""><small>Ты</small></span>'
      +(field.mobs.length?'':'<div class="hunt-field-cleared">Поле зачищено!<br><small>Забери добычу и выбери следующую локацию.</small></div>')
      +'</div><div class="hunt-movement"><button data-move="left" aria-label="Влево">'+icon('chevron-left')+'</button><button data-move="forward">'+icon('arrow-up')+'<span>Подойти</span></button><button data-move="back">'+icon('chevron-right','hunt-move-down')+'<span>Отойти</span></button><button data-move="right" aria-label="Вправо">'+icon('chevron-right')+'</button></div><p>Близкие агрессивные мобы нападают сами. Соседи помогают атакованной цели.</p></section>';
  }

  function peersHtml() {
    if(!state.field)return '';
    return '<section class="hunt-peers"><div class="mmo-section-title"><strong>'+icon('users')+' Игроки в локации</strong><small>'+ (state.players?.length || 0)+'</small></div>'
      +(state.players?.length?'<div class="hunt-peer-list">'+state.players.map(p=>'<button class="hunt-peer pvp-'+p.pvp.status+' '+(String(p.userId)===String(playerTarget)?'selected':'')+'" data-pvp-target="'+p.userId+'" aria-pressed="'+(String(p.userId)===String(playerTarget))+'"><img src="'+classArtUrl(p.className,p.gender)+'" alt=""><span><strong>'+escapeHtml(p.name)+'</strong><small>'+p.level+' ур. · '+(p.pvp.status==='pk'?'PK':p.pvp.status==='flagged'?'PvP':'Мирный')+'</small></span>'+icon(p.pvp.status==='pk'?'skull':p.pvp.status==='flagged'?'flag':'user')+'</button>').join('')+'</div>':'<p>Других игроков рядом нет.</p>')+'</section>';
  }

  function pvpTargetHtml(peer) {
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

  function logHtml() {
    const rows=[...(state.log||[]),...(state.pvpLog||[]).map(row=>({...row,icon:'⚔️'}))].sort((a,b)=>a.agoMs-b.agoMs).slice(0,8);
    if (!rows.length) return '';
    return `<section class="hunt-journal"><small>Журнал боя</small><ol class="hunt-log">${rows.map(row => `<li><i>${icon(row.icon==='⚑'?'flag':emojiIconName(row.icon)||'swords')}</i><span>${escapeHtml(row.text)}</span></li>`).join('')}</ol></section>`;
  }

  function render() {
    const player = state.player;
    const dead = player.respawnRemainMs > 0;
    const peer=state.players?.find(p=>String(p.userId)===String(playerTarget));
    if(!peer)playerTarget=null;
    const body = [];
    if (state.mob || state.field) {
      body.push(fieldHtml());
      body.push(peersHtml());
      if(peer)body.push(pvpTargetHtml(peer));
      else if(state.mob){body.push(mobFrame(state.mob));body.push('<details class="hunt-target-drops" '+(dropOpen?'open':'')+'><summary>Дроп выбранного монстра · '+(state.mob.drops?.length||0)+'</summary>'+dropsHtml(state.mob.drops)+'<small>Шансы с учётом уровня и типа чемпиона. Каждый предмет разыгрывается отдельно.</small></details>');}
      body.push(playerFrame(player));
      if (dead) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push('<section class="hunt-controls">');
      body.push(hotbar(player.skills,{className:player.className}));
      body.push(potionBar(player.potions, { disabled: pending || dead }));
      body.push(shotsHtml());
      if(!peer)body.push(vitalityHtml());
      body.push('<button type="button" class="hunt-flee" data-flee>Отступить</button>');
      body.push('</section>');
      body.push(logHtml());
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
      if (dead) body.push(`<div class="boss-dead">Персонаж восстанавливается · ${formatDuration(player.respawnRemainMs)}</div>`);
      body.push(lastHtml());
      body.push(logHtml());
      body.push(`<div class="mmo-section-title"><strong>Зоны</strong><small>🔵 синий: ×3 опыта · 🔴 красный: ×8 опыта и добычи</small></div>`);
      body.push(zonesHtml());
    }
    content.innerHTML = body.join('');
    if (!feedback) feedbackNode.textContent = '';
    bind();
  }

  function bind() {
    content.querySelectorAll('[data-pvp-target]').forEach(b=>b.addEventListener('click',()=>{playerTarget=b.dataset.pvpTarget;forceAttack=false;render();}));
    content.querySelector('[data-force-attack]')?.addEventListener('change',e=>{forceAttack=e.target.checked;});
    content.querySelector('.hunt-target-drops')?.addEventListener('toggle', e=>{dropOpen=e.target.open;});
    content.querySelectorAll('[data-loot-zone]').forEach(d=>d.addEventListener('toggle',e=>{if(e.target!==d)return;const id=d.dataset.lootZone;if(d.open){if(lootOpen.has(id))return;lootOpen.add(id);if(lootCache[id])render();else{lootOpen.add(id);d.insertAdjacentHTML('beforeend','<p class="hunt-loot-wait">Загружаю таблицу дропа…</p>');loadZoneLoot(id);}}else lootOpen.delete(id);}));
    content.querySelectorAll('[data-target]').forEach(b=>b.addEventListener('click',async()=>{playerTarget=null;forceAttack=false;await run('/api/hunt/target',{targetId:b.dataset.target});render();}));
    content.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',async()=>{await run('/api/hunt/move',{direction:b.dataset.move});render();}));
    content.querySelectorAll('[data-zone-kind]').forEach(b=>b.addEventListener('click',()=>{zoneKind=b.dataset.zoneKind;render();}));
    content.querySelector('[data-soul-select]')?.addEventListener('change',async e=>{const [color,stage]=e.target.value.split(':');await run('/api/soul/select',{color:color||null,stage:Number(stage)});render();});
    content.querySelector('[data-soul-charge]')?.addEventListener('click',async()=>{const p=await run('/api/hunt/soul');if(p)say('Кристалл использован. Победи монстра для попытки прокачки.');render();});
    content.querySelector('[data-seal-exchange]')?.addEventListener('click',async()=>{const counts=Object.fromEntries(Object.entries(state.soulCrystals.seals).map(([c,o])=>[c,o.count]));const p=await run('/api/catacombs/exchange',{counts});if(p)say('Получено '+formatNumber(p.aa)+' AA.');render();});
    content.querySelectorAll('[data-skill]').forEach(button => button.addEventListener('click', e => skill(button.dataset.skill,e.ctrlKey)));
    content.querySelectorAll('[data-boss-potion]').forEach(button => button.addEventListener('click', () => drink(button.dataset.bossPotion)));
    content.querySelectorAll('[data-zone]').forEach(button => button.addEventListener('click', () => start(button.dataset.zone)));
    content.querySelector('[data-flee]')?.addEventListener('click', flee);
    content.querySelector('[data-shots]')?.addEventListener('click', toggleShots);
  }

  // The mob swings in real time: poll while a fight is on, show new swings, and tick the timers locally.
  async function poll() {
    if (pending || !overlay.isConnected || (!state.mob && !state.field)) return;
    try {
      const next = await api('/api/hunt');
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
    } catch {
      // keep the last state; the next poll retries
    }
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

  render();
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));
  timer = window.setInterval(tick, 200);
  pollTimer = window.setInterval(poll, 2000);
}
