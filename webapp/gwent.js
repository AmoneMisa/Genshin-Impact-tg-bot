import { dialogHeading } from './dialog-heading.js';
import { installOverlayA11y } from './overlay-a11y.js';
import { escapeHtml as esc } from './escape-html.js';
import { controlIcon, icon } from './icons.js';
import { enhanceSelects } from './design/select.js';
import { RULESETS, normalizeRuleset, rulesetAllows, deckFor, loadoutKey, GWENT_DECKS, ROWS, ROW_LABELS } from './gwent-decks.js';
import { GWENT_ART, GWENT_PRINTED_CARDS } from './gwent-art.js';
import { cardArtOptions, cardArtSource } from './gwent-art-options.js';
import { buildDeck, aiLoadout, defaultLoadout, inspectLoadout, repairLoadout, filterCards, cardTraits, leaderDescription } from './gwent-builder.js';
import { createMatch, createTable, TABLE_SEATS, legalPlays, playCard, passRound, resolveChoice, rowValuesFor, scores, teamScores } from './gwent-engine.js';
import { sfx, withMusic, GWENT_TRACKS } from './audio.js';
import { decideAi, AI_LEVELS, DEFAULT_AI_LEVEL, normalizeAiLevel } from './gwent-ai.js';

const FACTIONS = RULESETS.extended.factions; // every faction; a rule set allows some of them
const kitOf = id => /^(wh|wi|to|ve|re|so|ef|ex)-/.exec(id)?.[1] || '';
const RULES = 'У каждой стороны три ряда: ближний бой, дальний бой и осада. Игроки ходят по очереди. Пас завершает ваши ходы в раунде. '
  + 'После паса обоих побеждает сторона с большей силой. В конце раунда все карты стола уходят в отбой, включая героев. '
  + 'Для победы в матче нужно выиграть два раунда. Нильфгаард выигрывает ничью, если эта фракция только у одной стороны; иначе ничья засчитывается обоим. '
  + 'Рог удваивает силу обычных отрядов ряда. Колода: минимум 22 отряда (герои тоже считаются), максимум 10 особых карт и один лидер своей фракции.';
const WEATHER = { close: 'Мороз', ranged: 'Мгла', siege: 'Ливень' };
const CHOICES = { revive: 'Выберите отряд для медика', takeGrave: 'Выберите карту из отбоя противника', returnGrave: 'Выберите карту из своего отбоя',
  discard: 'Выберите карту для сброса', drawAny: 'Выберите карту из колоды', weather: 'Выберите погодную карту', agile: 'Выберите ряд для отряда',
  mulligan: 'Замените до двух карт или оставьте руку', first: 'Кто ходит первым?',
  moveFrom: 'Выберите отряд для перемещения', moveTo: 'Выберите ряд' };
const image = (key, className = '', alt = '', source = GWENT_ART[key]) => source ? `<img class="${className}" src="${source}" alt="${esc(alt)}" loading="lazy" decoding="async" draggable="false">` : '';
const button = (label, attrs = '', primary = false, variant = '') => `<button type="button" class="ui-button ui-compact${primary ? ' primary' : ''}${variant ? ' ' + variant : ''}" ${attrs}>${label}</button>`;
const aria = label => `aria-label="${esc(label)}"`;

/** One card component used on the battlefield, in the hand and in the deck editor. */
export function gwentCardHtml(card, value = card.strength, { selectable = false, selected = false, target = false, action = '', compact = false, artIndex = card.artIndex ?? 0, label = null, ruleset = card.ruleset || 'classic' } = {}) {
  const interactive = selectable || target || action;
  const data = action || (target ? `data-target-uid="${card.uid}"` : `data-card-uid="${card.uid}"`);
  const title = label || `${card.name}${card.type === 'unit' ? ` · Сила ${value}` : ''}${cardTraits(card) ? ' · ' + cardTraits(card) : ''}`;
  const tag = interactive ? 'button' : 'div';
  const printed = GWENT_PRINTED_CARDS.has(card.id);
  const source = cardArtSource(card.id, artIndex, ruleset) || GWENT_ART[card.id];
  const power = !printed || card.type === 'unit' && value !== card.strength;
  return `<${tag} data-kit="${kitOf(card.id)}" class="${interactive ? 'ui-button ui-card-art ' : ''}gwent-card${printed ? ' printed' : ''}${card.hero ? ' hero' : ''}${card.type === 'special' ? ' special' : ''}${selected ? ' selected' : ''}${target ? ' target' : ''}${compact ? ' compact' : ''}" ${interactive ? `type="button" ${data} aria-label="${esc(title)}"${selectable ? ` aria-pressed="${selected}"` : ''}` : `aria-label="${esc(title)}"`} title="${esc(title)}">
    ${image(card.id, 'gwent-card-art', '', source)}${power ? `<span class="gwent-card-power">${card.type === 'unit' ? value : icon('sparkle')}</span>` : ''}
    ${printed ? '' : `<span class="gwent-card-name">${esc(card.name)}</span>${compact ? '' : `<small class="gwent-card-trait">${esc(cardTraits(card))}</small>`}`}
  </${tag}>`;
}

export async function openGwentGame({ api = null, haptic = () => {}, initialInvite = null, initialWatch = null } = {}) {
  if (document.querySelector('.gwent-overlay')) return;
  installOverlayA11y();
  // Saved decks: the original rules under the faction id, the extended rules under `x:` + faction id.
  let loadouts = Object.fromEntries(['classic', 'extended'].flatMap(rules => RULESETS[rules].factions.map(id => [loadoutKey(rules, id), defaultLoadout(id, rules)])));
  if (!api) {
    try { for (const [id, config] of Object.entries(JSON.parse(localStorage.getItem('gwent-loadouts-v1') || '{}'))) {
      const repaired = repairLoadout(config);
      if (repaired && loadoutKey(repaired.ruleset, repaired.faction) === id && inspectLoadout(repaired).valid) loadouts[id] = repaired;
    } } catch { /* Private browsing and damaged storage must not prevent play. */ }
  }
  const releaseMusic = withMusic(GWENT_TRACKS[Math.floor(Math.random() * GWENT_TRACKS.length)]);
  let faction = 'northern-realms', enemyFaction = 'nilfgaard', screen = 'decks', mode = 'ai', level = DEFAULT_AI_LEVEL, ruleset = 'classic';
  try { ruleset = normalizeRuleset(localStorage.getItem('gwent-ruleset')); } catch { /* storage is optional */ }
  const factionsNow = () => RULESETS[ruleset].factions;
  // Tables of three or four (extended rules, against the AI): how many play, and which opponent is shown in full.
  let tableSize = 2, focusSeat = 'ai'; // 2 | 3 | 4 | 'teams' (two against two)
  try { const saved = localStorage.getItem('gwent-table-size'); tableSize = saved === 'teams' ? 'teams' : [2, 3, 4].includes(Number(saved)) ? Number(saved) : 2; } catch { /* optional */ }
  const isTableState = () => (state?.seats?.length || 2) > 2;
  const seatName = seat => (remote?.seatNames?.[seat] ? (seat === 'player' && !remote.spectator ? 'Вы' : remote.seatNames[seat]) : seat === 'player' ? remote?.playerName || 'Вы' : isTableState() ? (state.teams ? (state.teams[seat] === state.teams.player ? 'Союзник' : `Противник ${state.seats.filter(other => state.teams[other] !== state.teams.player).indexOf(seat) + 1}`) : `Противник ${state.seats.indexOf(seat)}`) : remote?.opponent || 'Противник');
  const watchName = seat => (isTableState() ? remote.seatNames[seat] : seat === 'player' ? remote.playerName : remote.opponent);
  const pickPlays = () => (pick ? pick.plays.filter(play => !pick.seat || play.seat === pick.seat) : []);
  const keyOf = (id = faction) => loadoutKey(ruleset, id);
  const deckNow = id => deckFor(ruleset, id);
  /** The deck for an invitation under its own rules: the current faction when allowed, else the first allowed one. */
  const loadoutFor = rules => loadouts[loadoutKey(rules, rulesetAllows(rules, faction) ? faction : RULESETS[normalizeRuleset(rules)].factions[0])];
  try { level = normalizeAiLevel(localStorage.getItem('gwent-ai-level')); } catch { /* storage is optional */ }
  let draft = null, filters = {}, page = 0, leaderReturn = 'editor', draftReturn = 'decks', deckReturn = 'mode';
  let state = null, remote = null, pick = null, decoy = null, preview = null, pile = null, artCard = null;
  let myRating = null, board = null, summary = false, summaryFor = null, wasOffered = false, localMatch = 0, aiThinking = null, aiWorker = null, aiCall = 0, matchLevel = level, busy = false, closed = false, aiTimer = null, pollTimer = null, requestId = 0, announcedRound = null;
  const artRuleset = () => screen === 'match' ? remote?.ruleset || state?.ruleset || ruleset : ruleset;
  const cardHtml = (card, value = card.strength, options = {}) => gwentCardHtml(card, value, { ruleset: artRuleset(), ...options });
  const artSource = (id, index, rules = artRuleset()) => cardArtSource(id, index, rules);
  let notice = '', tone = '', onlineError = '', serverOffset = 0;
  let lobby = {friends:[],incoming:[],outgoing:[],games:[],room:null}, focusedInvite = initialInvite, invitation = null, watchId = initialWatch, renderedLobbyKey = '';
  const lobbyKey = () => JSON.stringify(lobby) + JSON.stringify([...lobby.incoming,...lobby.outgoing,...invitation ? [invitation] : []].map(i=>[Math.max(0,Math.ceil((i.expiresAt-Date.now()-serverOffset)/60000)),i.canPushAt>Date.now()+serverOffset]));
  if (initialInvite) screen = 'friends';
  const readUrl = () => { const query = new URLSearchParams({...watchId ? {watch:watchId} : {}, ...focusedInvite ? {invite:focusedInvite} : {}, ...screen === 'board' ? {board:'1'} : {}}).toString(); return '/api/gwent' + (query ? '?' + query : ''); };
  const overlay = document.createElement('section'); overlay.className = 'game-overlay gwent-overlay';
  overlay.innerHTML = '<div class="overlay-backdrop"></div><div class="overlay-panel game-dialog-panel ui-card-table-window gwent-panel" data-gwent-panel></div>';
  const panel = overlay.querySelector('[data-gwent-panel]');
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add('visible'));

  function note(text = '', kind = '') { notice = text; tone = kind; }
  function deckSummary(config, edit = false) {
    const deck = deckFor(config.ruleset, config.faction), leader = deck.leaders.find(item => item.id === config.leaderId);
    return `<div class="ui-selection-summary gwent-summary" data-faction="${deck.id}">${image('shield:' + deck.id, 'gwent-crest')}
      <span><small>Ваша колода</small><strong>${esc(deck.title)}</strong>${GWENT_PRINTED_CARDS.has(leader?.id) ? '' : `<small>${esc(leader?.name || 'Выберите лидера')}</small>`}</span>
      ${image(leader?.id, 'gwent-summary-leader', '', artSource(leader?.id, config.arts?.[leader?.id], config.ruleset))}${edit ? button('Изменить', 'data-open-decks') : ''}</div>`;
  }
  /** The rules: the original game or the extended one (new factions, swap and ambush cards). */
  function rulesetHtml() {
    return `<div class="gwent-mode-options gwent-rules" role="radiogroup" aria-label="Правила">${[['classic', 'Оригинал', 'Игра из Ведьмака 3, рейтинг'], ['extended', 'Расширенный', 'Семь новых фракций, подмена и засады']].map(([value, title, subtitle]) => `<label class="ui-button ui-illustrated-choice gwent-mode" data-selected="${ruleset === value}">
      <span><strong>${title}</strong><small>${subtitle}</small></span><input type="radio" name="gwent-ruleset" value="${value}" ${ruleset === value ? 'checked' : ''}></label>`).join('')}</div>`;
  }
  /** What the player is asked to pick for cards that name a unit. */
  const promptFor = special => ({ teleport: 'Выберите свой отряд для перемещения', boost: 'Выберите свой отряд для усиления', strike: 'Выберите отряд противника для удара' })[special];
  function deckScreen() {
    return `${rulesetHtml()}<div class="gwent-factions" role="group" aria-label="Фракция">${factionsNow().map(id => `<button type="button" class="ui-button ui-illustrated-choice gwent-faction" data-faction="${id}" data-select-faction="${id}" aria-pressed="${id === faction}" style="--choice-art:url('${GWENT_ART['banner:' + id]}')">
      ${image('shield:' + id, 'gwent-crest')}<span>${esc(GWENT_DECKS[id].title)}</span><span class="ui-selection-mark" aria-hidden="true">${id === faction ? controlIcon('check') : ''}</span></button>`).join('')}</div>
      ${deckSummary(loadouts[keyOf()])}<div class="gwent-lobby-actions">${button('Состав колоды и лидер ' + controlIcon('chevron-right'), 'data-editor')}
      ${button('Выбрать колоду', 'data-mode', true)}</div>`;
  }
  /** How many play at the table: two (a duel) or, under the extended rules, three or four against the AI. */
  function tableHtml() {
    return `<h3 class="gwent-question">За столом</h3><div class="gwent-mode-options gwent-table-size" role="radiogroup" aria-label="Игроков за столом">${[[2, 'Двое', 'Дуэль'], [3, 'Трое', 'Каждый за себя'], [4, 'Четверо', 'Каждый за себя'], ['teams', 'Два на два', 'Команда против команды']].map(([value, title, subtitle]) => `<label class="ui-button ui-illustrated-choice gwent-mode" data-selected="${tableSize === value}">
      <span><strong>${title}</strong><small>${subtitle}</small></span><input type="radio" name="gwent-table-size" value="${value}" ${tableSize === value ? 'checked' : ''}></label>`).join('')}</div>`;
  }
  function levelHtml() {
    return `<h3 class="gwent-question">Сложность ИИ</h3><div class="gwent-mode-options gwent-levels" role="radiogroup" aria-label="Сложность ИИ">${[['easy', 'Простой', 'Для новичков'], ['medium', 'Средний', 'Играет разумно, но без планов'], ['hard', 'Сильный', 'Считает ходы вперёд. Трудно обыграть']].map(([value, title, subtitle]) => `<label class="ui-button ui-illustrated-choice gwent-mode" data-selected="${level === value}">
      <span><strong>${title}</strong><small>${subtitle}</small></span><input type="radio" name="gwent-level" value="${value}" ${level === value ? 'checked' : ''}></label>`).join('')}</div>`;
  }
  function modeScreen() {
    return `${deckSummary(loadouts[keyOf()], true)}<h3 class="gwent-question">С кем сыграть?</h3><div class="gwent-mode-options" role="group" aria-label="Соперник">
      ${[['online', 'Против игрока', api ? 'Найти соперника среди всех игроков' : 'Онлайн доступен при входе через Telegram', 'back:nilfgaard'],
        ['ai', 'Против ИИ', 'Матч с компьютерным соперником', 'back:northern-realms']].map(([value, title, subtitle, key]) => `<label class="ui-button ui-illustrated-choice gwent-mode" aria-disabled="${value === 'online' && !api}" data-selected="${mode === value}">
        ${image(key, 'gwent-mode-art')}<span><strong>${title}</strong><small>${subtitle}</small></span><input type="radio" name="gwent-mode" value="${value}" ${mode === value ? 'checked' : ''} ${value === 'online' && !api ? 'disabled' : ''}></label>`).join('')}</div>
      ${mode === 'ai' && ruleset === 'extended' ? tableHtml() : ''}${mode === 'ai' ? levelHtml() : ''}
      <p class="gwent-hint">${mode === 'online' ? 'На ход — 5 минут. Если не сделать ход, матч завершится поражением.' : 'Колода соперника выбирается случайно.'}</p>
      ${onlineError ? `<p class="gwent-hint">${esc(onlineError)}</p>${button('Проверить подключение', 'data-reconnect')}` : ''}
      ${api && mode === 'online' && ruleset === 'extended' ? '<p class="gwent-hint">Расширенные правила: рейтинг не меняется.</p>' : ''}
      ${api && mode === 'online' && ruleset === 'classic' && myRating ? `<p class="gwent-rating-line" role="status">Ваш рейтинг: <strong>${myRating.rating}</strong> · игр ${myRating.games}</p>` : ''}
      ${api ? `<div class="gwent-lobby-actions">${button('С другом', 'data-friends')}${button('Смотреть игры', 'data-games')}${button('Таблица лидеров', 'data-board')}${lobby.incoming.length ? `<span role="status">Приглашения: ${lobby.incoming.length}</span>` : ''}</div>` : ''}
      <div class="gwent-lobby-actions">${button(mode === 'online' ? 'Найти соперника' : 'Начать матч', 'data-start', true)}</div>`;
  }
  function searchScreen() {
    return `<div class="gwent-search-art" aria-hidden="true">${image('back:' + faction)}${image('back:nilfgaard')}</div>
      <h3 class="gwent-question" role="status">Ищем соперника…</h3><p class="gwent-hint">Подбираем игрока вашего уровня${myRating ? ` (рейтинг ${myRating.rating})` : ''}: чем дольше ожидание, тем шире подбор. Можно отменить поиск в любой момент.</p>${deckSummary(loadouts[keyOf()])}
      <div class="gwent-lobby-actions">${button('Отменить поиск', 'data-cancel-search')}<span class="gwent-or">или</span>${button('Играть с ИИ', 'data-search-ai', true)}</div>`;
  }
  function invitationHtml(item, outgoing = false) {
    return `<article class="ui-inset-row gwent-social-row"><div><strong>${esc(outgoing ? item.toName || 'Приглашение по ссылке' : item.fromName)}</strong>${item.table ? `<small>${item.table.teams ? 'Два на два' : `Стол на ${item.table.size}`} · за столом ${item.table.players.length}</small>` : ''}<small>${esc(GWENT_DECKS[item.faction].title)}${item.ruleset === 'extended' ? ' · Расширенные правила' : ''} · ${Math.max(0, Math.ceil((item.expiresAt-Date.now()-serverOffset)/60000))} мин.</small></div>
      <div class="gwent-lobby-actions">${outgoing ? `${item.url ? button('Копировать ссылку', `data-copy-invite="${item.id}"`) : '<span>Ссылка пока недоступна</span>'}${item.to ? button('Отправить уведомление', `data-push-invite="${item.id}" ${item.canPushAt>Date.now()+serverOffset ? 'disabled' : ''}`) : ''}${button('Отменить', `data-cancel-invite="${item.id}"`)}` : `${button('Принять', `data-accept-invite="${item.id}"`, true)}${item.to ? button('Отклонить', `data-decline-invite="${item.id}"`) : ''}`}</div>
      ${outgoing && item.url ? `<input class="gwent-share-link" aria-label="Ссылка приглашения" readonly value="${esc(item.url)}">` : ''}</article>`;
  }
  /** Tables of three or four are played under the extended rules, so a table is opened from that deck. */
  function tableCreateHtml() {
    return `<h3>Стол на троих или четверых</h3>
      <p class="gwent-hint">Каждый играет за себя, очки начисляются за место в раунде.</p>
      <p class="gwent-hint">${ruleset === 'extended' ? 'Пустые места займёт ИИ.' : 'Нужна колода расширенных правил: переключите правила на экране выбора.'}</p>
      <div class="gwent-lobby-actions">${[3, 4, 'teams'].map(size => button(size === 'teams' ? 'Два на два' : `Стол на ${size}`, `data-create-table="${size}" ${ruleset === 'extended' ? '' : 'disabled'}`)).join('')}</div>`;
  }
  /** The table the player sits at before it starts: seats, the link, friends to call, and the start button. */
  function roomHtml(room) {
    const host = room.host;
    const seats = Array.from({ length: room.table.size }, (_, i) => room.table.players[i]);
    return `<article class="ui-inset-row gwent-social-row gwent-room" aria-label="Стол">
      <div><strong>${room.table.teams ? 'Два на два' : `Стол на ${room.table.size}`}</strong><small>${Math.max(0, Math.ceil((room.expiresAt - Date.now() - serverOffset) / 60000))} мин. · Расширенные правила, без рейтинга</small></div>
      ${(room.table.teams ? [[0, 1], [2, 3]] : [seats.map((_, n) => n)]).map((group, g) => `${room.table.teams ? `<strong>Команда ${g + 1}</strong>` : ''}<ul class="gwent-room-seats">${group.map(n => `<li><span aria-hidden="true">${n + 1}.</span>${seats[n] ? `<strong>${esc(seats[n].name)}</strong> <small>${esc(GWENT_DECKS[seats[n].faction]?.title || '')}</small>` : '<small>Свободное место — займёт ИИ</small>'}</li>`).join('')}</ul>`).join('')}
      ${host ? `${room.url ? `<input class="gwent-share-link" aria-label="Ссылка на стол" readonly value="${esc(room.url)}">` : ''}
        <div class="gwent-lobby-actions">${room.url ? button('Копировать ссылку', `data-copy-invite="${room.id}"`) : ''}${button('Начать игру', `data-start-table="${room.id}" ${room.table.players.length < 2 ? 'disabled' : ''}`, true)}${button('Закрыть стол', `data-cancel-invite="${room.id}"`)}</div>
        <small>${room.table.players.length < 2 ? 'Для начала нужен ещё хотя бы один человек.' : 'Можно начать сейчас — пустые места займёт ИИ.'}</small>`
        : `<div class="gwent-lobby-actions">${button('Покинуть стол', `data-leave-table="${room.id}"`)}</div><small>Ждём, пока хозяин начнёт игру.</small>`}
    </article>`;
  }
  function friendsScreen() {
    const incoming = lobby.incoming.filter(i => !(lobby.room && i.id === lobby.room.id));
    if (invitation?.status === 'pending' && !lobby.outgoing.some(i=>i.id===invitation.id) && !incoming.some(i=>i.id===invitation.id)) incoming.unshift(invitation);
    return `${deckSummary(loadouts[keyOf()],true)}<p class="gwent-hint">Приглашение действует 15 минут. Друзья и игроки — из любых чатов.</p>
      ${invitation && invitation.status !== 'pending' ? '<p role="status">Приглашение уже закрыто или истекло</p>' : ''}
      ${incoming.length ? `<h3>Входящие приглашения</h3>${incoming.map(i=>invitationHtml(i)).join('')}` : ''}
      ${lobby.room ? roomHtml(lobby.room) : `<div class="gwent-lobby-actions">${button('Создать ссылку приглашения','data-create-invite')}</div>
      ${tableCreateHtml()}`}
      ${lobby.outgoing.filter(i=>!i.table).map(i=>invitationHtml(i,true)).join('')}
      <h3>Пригласить по нику</h3><div class="gwent-lobby-actions"><label class="gwent-search-field">Ник игрока<input type="text" data-invite-nick maxlength="16" autocomplete="off" placeholder="Ник в игре"></label>${button('Пригласить', 'data-invite-nick-go')}</div>
      <p class="gwent-hint">Игрок может быть из любого чата. Сообщение в Telegram получают только друзья; остальные увидят приглашение, когда откроют гвинт.</p>
      <h3>Друзья</h3>${lobby.friends.map(friend=>`<div class="ui-inset-row gwent-social-row"><div><strong>${esc(friend.name)}</strong><small>${esc(friend.busy ? 'В игре' : friend.text)}</small></div>${friend.watchId ? button('Смотреть', `data-watch="${esc(friend.watchId)}"`) : ''}${lobby.room?.host ? button('Позвать за стол',`data-table-invite="${esc(friend.userId)}" ${friend.busy || lobby.room.canPushAt > Date.now() + serverOffset ? 'disabled' : ''}`) : lobby.room ? '' : button('Пригласить',`data-invite-friend="${esc(friend.userId)}" ${friend.busy ? 'disabled' : ''}`)}</div>`).join('') || '<p class="gwent-hint">Добавьте друга в разделе друзей, чтобы пригласить его лично.</p>'}`;
  }
  function gameRow(game) {
    const result = game.finished ? `<small>${game.winnerName ? `Завершён · победил ${esc(game.winnerName)}` : 'Завершён · ничья'}</small>` : `<small>Раунд ${game.round} · ${game.table ? `стол на ${game.table}` : `${game.scores.player} : ${game.scores.ai}`}</small>`;
    return `<article class="ui-inset-row gwent-social-row"><div><strong>${game.names.map(esc).join(' · ')}</strong>${game.friend ? '<small>Играет ваш друг</small>' : ''}<small>${game.factions.map(id=>esc(GWENT_DECKS[id].title)).join(' · ')}${game.ruleset === 'extended' ? ' · Расширенные правила' : ''}</small>${result}</div>${button(game.participant ? 'Вернуться к матчу' : game.finished ? 'Посмотреть итог' : 'Смотреть', `data-watch="${game.id}"`)}</article>`;
  }
  function boardScreen() {
    if (!board) return '<p class="gwent-hint">Загрузка…</p>';
    const rows = board.rows || [];
    const mine = board.me;
    return `${mine ? `<p class="gwent-rating-line" role="status">Ваше место: <strong>${mine.rank}</strong> · рейтинг ${mine.rating} · побед ${mine.wins}, поражений ${mine.losses}, ничьих ${mine.draws}</p>` : '<p class="gwent-hint">Сыграйте в рейтинговой игре («Найти соперника»), чтобы попасть в таблицу.</p>'}
      ${button('Обновить', 'data-reconnect')}
      <div class="gwent-board" role="table" aria-label="Таблица лидеров">
        <div class="gwent-board-row gwent-board-head" role="row"><span role="columnheader">№</span><span role="columnheader">Игрок</span><span role="columnheader">Рейтинг</span><span role="columnheader">В / Н / П</span></div>
        ${rows.map(row => `<div class="gwent-board-row" role="row" data-me="${row.me}" data-rank="${row.rank}"><span role="cell">${row.rank}</span><span role="cell">${esc(row.name || 'Игрок')}</span><span role="cell"><strong>${row.rating}</strong></span><span role="cell">${row.wins} / ${row.draws} / ${row.losses}</span></div>`).join('') || '<p class="gwent-hint">Пока нет рейтинговых игр</p>'}
      </div><p class="gwent-hint">Рейтинг меняется только в играх, найденных через поиск соперника. Игры с друзьями и реванши в рейтинге не учитываются.</p>`;
  }
  function gamesScreen() {
    const open = lobby.games.filter(game => !game.finished), recent = lobby.games.filter(game => game.finished);
    return `<p class="gwent-hint">Прямой просмотр. Карты в руках и порядок колод скрыты.</p>${button('Обновить','data-reconnect')}
      ${open.map(gameRow).join('') || '<p class="gwent-hint">Сейчас нет открытых матчей</p>'}
      ${recent.length ? `<h3>Недавно завершённые</h3>${recent.map(gameRow).join('')}` : ''}`;
  }
  function statsHtml() {
    const s = inspectLoadout(draft);
    return `<div class="gwent-deck-stats" aria-live="polite"><span class="ui-inset-row" data-valid="${s.units >= 22}"><span>Отряды</span><strong>${s.units} / 22 мин.</strong></span>
      <span class="ui-inset-row" data-valid="${s.specials <= 10}"><span>Особые</span><strong>${s.specials} / 10 макс.</strong></span>
      <span class="ui-inset-row"><span>Герои</span><strong>${s.heroes}</strong></span>
      <span class="ui-inset-row"><span>Всего карт</span><strong>${s.total}</strong></span><span class="ui-inset-row"><span>Суммарная сила</span><strong>${s.strength}</strong></span></div>
      ${s.valid ? `<p class="gwent-deck-valid" role="status">${controlIcon('check')}<span>Колода готова к игре</span></p>` : `<p class="gwent-deck-invalid" role="status">${s.errors.map(esc).join('<br>')}</p>`}`;
  }
  function selectHtml(key, title, options) {
    return `<label>${title}<select data-filter="${key}" aria-label="${title}">${options.map(([value, label]) => `<option value="${value}" ${filters[key] === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`;
  }
  function editorScreen() {
    const leader = deckNow(faction).leaders.find(item => item.id === draft.leaderId);
    return `${deckSummary(draft)}<div class="gwent-editor-top">${button('Выбрать лидера', 'data-leaders')}${button('Очистить состав', 'data-clear-deck')}${button('Исходный состав', 'data-reset-deck')}</div>
      <p class="gwent-leader-description">${esc(leaderDescription(leader))}</p><div data-deck-stats>${statsHtml()}</div>
      <div class="gwent-filter-bar"><label class="gwent-search-field">Поиск карты<input type="search" data-search placeholder="Название или способность" value="${esc(filters.search || '')}" maxlength="100"></label>
      ${selectHtml('row', 'Ряд', [['', 'Любой ряд'], ['close', 'Ближний бой'], ['ranged', 'Дальний бой'], ['siege', 'Осада']])}
      ${selectHtml('type', 'Тип', [['', 'Все карты'], ['unit', 'Отряды'], ['hero', 'Герои'], ['special', 'Особые']])}
      <details class="gwent-extra-filters"><summary class="ui-disclosure-summary"><span>Другие фильтры</span>${controlIcon('chevron-down')}</summary><div class="gwent-filter-bar">
      ${selectHtml('ability', 'Способность', [['', 'Любая'], ['spy', 'Шпион'], ['medic', 'Медик'], ['bond', 'Связь'], ['muster', 'Призыв'], ['horn', 'Рог'], ['morale', 'Прилив сил'], ['agile', 'Проворство'], ['weather', 'Погода'], ['scorch', 'Казнь']])}
      ${selectHtml('origin', 'Принадлежность', [['', 'Любая'], ['neutral', 'Нейтральные'], ['faction', 'Фракционные и особые']])}
      ${selectHtml('sort', 'Сортировка', [['name', 'По названию'], ['strength', 'По силе']])}<label class="gwent-check"><input type="checkbox" data-included ${filters.included ? 'checked' : ''}> Только в колоде</label></div></details>
      </div><div class="gwent-catalog" data-catalog>${catalogHtml()}</div>
      <p class="gwent-hint">Под картой: количество в колоде / доступные копии.</p>
      <div class="gwent-lobby-actions">${button('Сохранить колоду', `data-save-deck ${inspectLoadout(draft).valid ? '' : 'disabled'}`, true)}${button('Отменить изменения', 'data-discard-draft')}</div>`;
  }
  function catalogHtml() {
    const all = filterCards(draft, filters), maxPage = Math.max(0, Math.ceil(all.length / 18) - 1); page = Math.min(page, maxPage);
    return `<div class="gwent-catalog-heading"><span role="status">Найдено карт: ${all.length}</span>${button('Сбросить фильтры', 'data-reset-filters')}</div>
      <div class="gwent-builder-grid">${all.slice(page * 18, page * 18 + 18).map(([card, limit]) => {
        const count = draft.counts[card.id] || 0, capped = count >= limit || card.type === 'special' && inspectLoadout(draft).specials >= 10;
        return `<article class="gwent-builder-card">${cardHtml(card, card.strength, { action: `data-preview-id="${card.id}"`, artIndex: draft.arts?.[card.id] ?? 0 })}
          <small>${card.rows?.map(row => ROW_LABELS[row]).join(' / ') || 'Особая карта'}</small>
          <div class="gwent-copy-controls">${button(controlIcon('minus'), `data-adjust="${card.id}" data-delta="-1" ${aria(`Убрать: ${card.name}`)} ${count ? '' : 'disabled'}`)}
          <span aria-label="${count} из ${limit} копий">${count} / ${limit}</span>${button(controlIcon('plus'), `data-adjust="${card.id}" data-delta="1" ${aria(`Добавить: ${card.name}`)} ${capped ? 'disabled' : ''}`)}</div>
          ${cardArtOptions(card.id, ruleset).length > 1 ? button('Выбрать арт', `data-art-card="${card.id}"`) : ''}</article>`;
      }).join('') || '<p class="gwent-hint">Карты не найдены. Измените фильтры.</p>'}</div>
      <nav class="gwent-pagination" aria-label="Страницы карт">${button('Назад', `data-page="-1" ${page ? '' : 'disabled'}`)}<span>${page + 1} / ${maxPage + 1}</span>${button('Далее', `data-page="1" ${page < maxPage ? '' : 'disabled'}`)}</nav>`;
  }
  function leaderScreen() {
    return `<p class="gwent-hint">Один лидер на матч. Выберите его способность.</p><div class="gwent-leader-list">${deckNow(faction).leaders.map(leader => `<div class="gwent-leader-entry"><button type="button" class="ui-button ui-illustrated-choice gwent-leader-choice" data-select-leader="${leader.id}" aria-label="${esc(leader.name)}" aria-pressed="${draft.leaderId === leader.id}">
      ${image(leader.id, 'gwent-leader-art', '', artSource(leader.id, draft.arts?.[leader.id]))}<span>${GWENT_PRINTED_CARDS.has(leader.id) ? '' : `<strong>${esc(leader.name)}</strong>`}<small>${esc(leaderDescription(leader))}</small></span><span class="ui-selection-mark" aria-hidden="true">${draft.leaderId === leader.id ? controlIcon('check') : ''}</span></button>
      ${cardArtOptions(leader.id, ruleset).length > 1 ? button('Выбрать арт', `data-art-card="${leader.id}"`) : ''}</div>`).join('')}</div>`;
  }
  function artPickerHtml() {
    const options = cardArtOptions(artCard.id, ruleset), chosen = draft.arts?.[artCard.id] ?? 0;
    return `<p class="gwent-hint">Одна карта — разные иллюстрации. Сила, способности и лимит копий не меняются.</p>
      <div class="gwent-art-options" role="group" aria-label="Варианты изображения">${options.map((_, index) => cardHtml(artCard, artCard.strength, {
        action: `data-select-art="${index}"`, selectable: true, artIndex: index, selected: index === chosen, label: `${artCard.name} · ${index + 1}`,
      })).join('')}</div>${button('Назад', 'data-close-art')}`;
  }
  function myPlays() { return !remote?.spectator && !busy && state?.turn === 'player' ? legalPlays(state, 'player') : []; }
  function rowHtml(side, row) {
    const cards = state.sides[side].rows[row], values = rowValuesFor(state, side, row);
    const horn = cards.some(card => card.special === 'horn'), innate = cards.some(card => card.horn), doubled = state.sides[side].doubled[row];
    const targetUids = new Set(decoy?.plays.map(play => play.targetUid));
    const canTarget = side === 'player' && pick?.card.special === 'horn' && (!pick.seat || pick.seat === 'player') && pick.plays.some(play => play.row === row && (!play.seat || play.seat === 'player'));
    // Ambushes the player laid in an opponent's row (the opponents' own ambushes are never shown).
    const laid = side !== 'player' && state.sides[side].traps?.[row];
    const trap = laid && (laid.by ?? 'player') === 'player';
    return `<div class="gwent-row${state.weather[row] ? ' weather' : ''}" data-side="${side}" data-row="${row}"${trap ? ' data-trap="true"' : ''}>
      <span class="gwent-row-label" title="${ROW_LABELS[row]}">${image('icon:card_row_' + row)}<span>${ROW_LABELS[row]}</span>${trap ? `<span class="gwent-trap" role="img" aria-label="Ваша засада в этом ряду" title="Ваша засада">${icon('sparkle')}</span>` : ''}</span>
      <div class="gwent-row-cards" aria-label="${remote?.spectator ? esc(side === 'player' ? remote.playerName : remote.opponent) : side === 'player' ? 'Ваш ряд' : 'Ряд противника'}: ${ROW_LABELS[row]}">${cards.map((card, i) => card.special === 'horn' ? '' : cardHtml(card, values[i], { compact: true, target: targetUids.has(card.uid), action: targetUids.has(card.uid) ? '' : `data-board-card="${card.uid}"` })).join('')}</div>
      <button type="button" class="ui-button gwent-horn${horn ? ' active' : ''}${canTarget ? ' target' : ''}" ${canTarget ? `data-pick-row="${row}"` : `data-horn-side="${side}" data-horn-row="${row}"`} aria-label="${ROW_LABELS[row]}: ${horn ? 'Командирский рог активен' : innate ? 'Рог от способности отряда' : doubled ? 'Удвоение от лидера' : 'Ячейка командирского рога пуста'}">${image('icon:card_ability_horn')}${horn || innate || doubled ? '<small>×2</small>' : ''}</button>
      <strong class="gwent-row-score">${values.reduce((a, b) => a + b, 0)}</strong></div>`;
  }
  /** The score marker of a seat: gems for the rounds won at a duel, points by place at a table. */
  function markerHtml(side) {
    if (isTableState() && !state.teams) return `<span class="gwent-points" aria-label="Очков за раунды: ${state.points[side]}">${state.points[side]} оч.</span>`;
    return `<span class="gwent-gems" aria-label="Побед в раундах: ${state.wins[side]}">${[0, 1].map(i => image('icon:icon_gem_' + (state.wins[side] > i ? 'on' : 'off'))).join('')}</span>`;
  }
  /** An opponent at a table: a one-line summary that opens into the full board when tapped. */
  function opponentHtml(side) {
    if (decoy || focusSeat === side) return sideHtml(side);
    const s = state.sides[side], f = s.faction, total = scores(state)[side];
    const totals = ROWS.map(row => rowValuesFor(state, side, row).reduce((a, b) => a + b, 0));
    return `<button type="button" class="ui-button gwent-opponent" data-focus-seat="${side}" data-faction="${f}" aria-label="${esc(seatName(side))}: показать ряды">
      <span class="gwent-opponent-head">${image('shield:' + f, 'gwent-crest')}<span>${esc(seatName(side))} · ${esc(GWENT_DECKS[f].title)}${state.passed[side] ? ' · Пас' : ''}</span>${markerHtml(side)}<strong>${total}</strong></span>
      <small>${ROWS.map((row, i) => `${ROW_LABELS[row]} ${totals[i]}`).join(' · ')} · В руке ${s.handCount ?? s.hand.length}</small></button>`;
  }
  function sideHtml(side) {
    const s = state.sides[side], f = s.faction, total = scores(state)[side];
    const leader = s.leader, name = seatName(side);
    return `<section class="gwent-side ${side}" data-faction="${f}" aria-label="${esc(name)}">
      <div class="gwent-side-head">${image('shield:' + f, 'gwent-crest')}<span>${esc(name)} · ${esc(GWENT_DECKS[f].title)}${state.passed[side] ? ' · Пас' : ''}</span>
      ${markerHtml(side)}<strong>${total}</strong>${isTableState() && side !== 'player' ? button('Свернуть', `data-focus-seat="${side}" data-collapse`) : ''}</div>
      <aside class="gwent-side-meta">${leader ? `<button class="ui-button ui-card-art gwent-leader-portrait" type="button" data-preview-leader="${side}" aria-label="${esc(leader.name)}">${image(leader.id, '', '', artSource(leader.id, leader.artIndex))}${GWENT_PRINTED_CARDS.has(leader.id) ? '' : `<span>${esc(leader.name)}</span>`}</button>` : ''}
        <div class="gwent-piles">${button(`${image('back:' + f)}<b>${s.deckCount ?? s.deck.length}</b>`, `data-pile="${side}:deck" ${aria(`Карт в колоде: ${s.deckCount ?? s.deck.length}`)} title="${esc('Колода')}"`, false, 'ui-card-art gwent-pile')}
        ${button(`${image('icon:discard')}<b>${s.graveyard.length}</b>`, `data-pile="${side}:graveyard" ${aria(`Карт в отбое: ${s.graveyard.length}`)} title="${esc('Отбой')}"`, false, 'ui-card-art gwent-pile')}
        </div><small>В руке: ${s.handCount ?? s.hand.length}</small></aside>
      <div class="gwent-rows">${(side !== 'player' ? [...ROWS].reverse() : ROWS).map(row => rowHtml(side, row)).join('')}</div>
      ${state.teams && side !== 'player' && state.teams[side] === state.teams.player && s.hand.length ? `<div class="gwent-ally-hand" role="group" aria-label="Карты союзника">${s.hand.map(card => cardHtml(card, card.strength, { compact: true })).join('')}</div>` : ''}</section>`;
  }
  function handHtml() {
    if (remote?.spectator) return '<p class="gwent-hint">Режим зрителя · Карты в руках скрыты</p>';
    const pending = state.pending;
    if (pending?.side === 'player') return `<div class="gwent-choice-title">${CHOICES[pending.kind] || 'Выберите карту'}${pending.remaining ? ` · осталось ${pending.remaining}` : ''}</div><div class="gwent-hand">${pending.options.map(option => option.card
      ? cardHtml(option.card, option.card.strength, { action: `data-choice-id="${option.id}"` })
      : button(esc(option.label), `data-choice-id="${option.id}"`)).join('')}</div>`;
    const playable = new Set(myPlays().map(play => play.uid));
    return `<div class="gwent-hand" aria-label="Карты в руке">${state.sides.player.hand.map(card => cardHtml(card, card.strength, {
      selectable: playable.has(card.uid), selected: (pick?.uid || decoy?.uid) === card.uid, action: playable.has(card.uid) ? '' : `data-preview-id="${card.id}" data-hand-uid="${card.uid}"`,
    })).join('') || '<span class="gwent-hint">В руке нет карт</span>'}</div>`;
  }
  /** What a selected card still needs: an opponent (at a table), then a row, or just a button to play it. */
  function pickerHtml() {
    const hint = ({ ambush: ' · выберите ряд противника', fireball: ' · выберите ряд противника', curse: ' · выберите ряд противника', blessing: state.teams ? ' · свой ряд или ряд союзника' : ' · выберите свой ряд', horn: state.teams ? ' · свой ряд или ряд союзника' : '' })[pick.card.special] || '';
    const plays = pickPlays();
    const seats = [...new Set(pick.plays.map(play => play.seat).filter(Boolean))];
    let choice;
    if (seats.length > 1 && !pick.seat) choice = seats.map(seat => button(`${esc(seatName(seat))}`, `data-pick-seat="${seat}"`)).join('');
    else if (plays.length === 1) choice = button('Сыграть', 'data-play-selected', true);
    else choice = [...new Set(plays.map(play => play.row))].map(row => button(ROW_LABELS[row], `data-pick-row="${row}"`)).join('');
    return `<div class="ui-inset-row gwent-picker"><span>${esc(pick.card.name)}<small>${esc(cardTraits(pick.card))}${hint}${seats.length > 1 && !pick.seat ? (['blessing', 'horn'].includes(pick.card.special) ? ' · выберите игрока' : ' · выберите соперника') : ''}</small></span>${choice}${pick.swapPlays.length ? button('С подменой', 'data-swap-selected') : ''}${button('Отмена', 'data-cancel-card')}</div>`;
  }
  /** The winner line at a table: who has the most points. */
  function tableWinnerText() {
    if (state.teams) {
      if (state.winner === 'draw') return 'Ничья';
      if (remote?.spectator) return `Победила команда: ${state.winners.map(seatName).join(' и ')}`;
      return state.winners.includes('player') ? 'Ваша команда победила!' : 'Победила команда соперников';
    }
    if (state.winner === 'draw') return `Ничья: ${state.winners.map(seatName).join(', ')}`;
    return state.winner === 'player' && !remote?.spectator ? 'Вы победили!' : `Победил ${seatName(state.winner)}`;
  }
  function matchScreen() {
    const turn = remote?.spectator ? (state.phase === 'matchOver' ? 'Матч окончен' : `Ход: ${watchName(state.pending ? state.pending.side : state.turn)}`) : state.phase === 'matchOver' ? 'Матч окончен' : state.pending?.side === 'player' ? 'Ваш выбор' : state.turn === 'player' ? 'Ваш ход' : isTableState() ? `Ходит ${seatName(state.pending ? state.pending.side : state.turn)}` : 'Ход противника';
    const weather = ROWS.filter(row => state.weather[row]).map(row => WEATHER[row]).join(' · ') || 'Ясно';
    const leader = state.sides.player.leader, passive = leader?.effect.type.startsWith('passive-');
    const ready = leader && myPlays().some(play => play.uid === leader.uid);
    let actions = '';
    if (remote?.spectator) actions = `${state.phase === 'matchOver' ? `<strong>${state.winner === 'draw' ? 'Ничья' : esc(isTableState() ? tableWinnerText() : watchName(state.winner))}</strong>` : ''}${button('К списку игр', 'data-leave-watch')}`;
    else if (state.phase === 'matchOver') actions = `<strong class="gwent-result">${isTableState() ? tableWinnerText() : state.winner === 'player' ? 'Вы победили!' : state.winner === 'ai' ? 'Победил противник' : 'Ничья'}</strong>${button('Итоги', 'data-open-summary')}${rematchHtml()}${button('Новая игра', 'data-finish', !rematchHtml())}`;
    else actions = `${leader ? button(passive ? 'Лидер · постоянно' : state.sides.player.leaderUsed ? 'Лидер использован' : state.sides.player.leaderCancelled ? 'Лидер отменён' : 'Лидер', `data-leader ${ready ? '' : 'disabled'} title="${esc(leader.name)}"`) : ''}
      ${button('Пас', `data-pass ${state.pending || state.turn !== 'player' || state.passed.player || busy ? 'disabled' : ''}`, true)}<details class="gwent-more"><summary aria-label="Другие действия">${controlIcon('more')}</summary><div>${button('Завершить матч', 'data-end-match')}</div></details>`;
    const teamSums = state.teams ? teamScores(state) : null;
    const standing = state.teams ? `Победы ${state.wins.player} : ${state.wins.ai} <span aria-hidden="true">│</span> Счёт команд ${teamSums[state.teams.player]} : ${teamSums[state.teams.player === 'A' ? 'B' : 'A']}` : isTableState() ? `Очки: ${state.seats.map(seat => `${seatName(seat)} ${state.points[seat]}`).join(' · ')}` : `Победы ${state.wins.player} : ${state.wins.ai}`;
    return `<div class="gwent-status"><span>Раунд ${state.round} <span aria-hidden="true">│</span> ${standing}</span>${remote && state.phase === 'playing' ? `<small data-gwent-clock>До хода: ${Math.max(0, Math.ceil((remote.deadline - (Date.now() + serverOffset)) / 60000))} мин.</small>` : ''}</div>
      ${state.seats?.length > 2 ? state.seats.filter(seat => seat !== 'player').map(opponentHtml).join('') : sideHtml('ai')}<div class="gwent-weather">${esc(weather)}</div>${sideHtml('player')}
      ${state.reveals.player.length ? `<div class="ui-inset-row gwent-reveal">Открыты: ${state.reveals.player.map(card => esc(card.name)).join(', ')}</div>` : ''}
      <div class="gwent-turn" role="status">${turn}</div>${handHtml()}
      ${pick ? pickerHtml() : ''}
      ${decoy ? `<div class="ui-inset-row gwent-picker"><span>${decoy.chosen ? 'Выберите ряд' : promptFor(state.sides.player.hand.find(card => card.uid === decoy.uid)?.special) ?? (decoy.row ? 'Выберите свой отряд, который вернётся в руку' : 'Выберите свой обычный отряд на поле для замены чучелом')}</span>${decoy.chosen ? decoy.rowChoices.map(row => button(ROW_LABELS[row], `data-pick-row="${row}"`)).join('') : ''}${button('Отмена', 'data-cancel-card')}</div>` : ''}
      <div class="gwent-actions">${actions}</div>`;
  }
  /** Round by round result, the winner, and the rematch offer. Shown as a popup when a match ends. */
  function teamSummaryHtml() {
    const rounds = state.rounds || [], mine = state.teams.player, theirs = mine === 'A' ? 'B' : 'A';
    const side = name => state.seats.filter(seat => state.teams[seat] === name).map(seatName).join(' и ');
    return `<div class="gwent-result-view"><p class="gwent-result-winner" role="status"><strong>${esc(tableWinnerText())}</strong></p>
      <p class="gwent-hint">Раунд выигрывает команда с большей суммой очков двух игроков; матч — две победы. Расширенные правила: рейтинг не меняется.</p>
      <div class="gwent-result-table" role="table" aria-label="Счёт команд по раундам">
        <div class="gwent-result-row gwent-result-head" role="row"><span role="columnheader">Раунд</span><span role="columnheader">${esc(side(mine))}</span><span role="columnheader">${esc(side(theirs))}</span></div>
        ${rounds.map(round => `<div class="gwent-result-row" role="row"><span role="cell">${round.round}</span><span role="cell" data-won="${round.winner !== 'draw' && state.teams[round.winner] === mine}">${round.teamScores[mine]}</span><span role="cell" data-won="${round.winner !== 'draw' && state.teams[round.winner] === theirs}">${round.teamScores[theirs]}</span></div>`).join('')}
      </div>
      <div class="gwent-actions">${button('К полю', 'data-close-summary')}${remote?.spectator ? button('К списку игр', 'data-leave-watch', true) : `${remote ? '' : button('Реванш', 'data-rematch', true)}${button('Новая игра', 'data-finish', Boolean(remote))}`}</div></div>`;
  }
  function tableSummaryHtml() {
    if (state.teams) return teamSummaryHtml();
    const rounds = state.rounds || [];
    const seats = state.seats;
    const place = seat => 1 + seats.filter(other => state.points[other] > state.points[seat]).length;
    return `<div class="gwent-result-view"><p class="gwent-result-winner" role="status"><strong>${esc(tableWinnerText())}</strong></p>
      <p class="gwent-hint">Очки за места в раундах: 1-е место — ${seats.length === 4 ? 3 : 2}, последнее — 0. Расширенные правила: рейтинг не меняется.</p>
      <div class="gwent-result-table gwent-table-result" role="table" aria-label="Очки по раундам" style="--seats:${seats.length}">
        <div class="gwent-result-row gwent-result-head" role="row"><span role="columnheader">Раунд</span>${seats.map(seat => `<span role="columnheader">${esc(seatName(seat))}</span>`).join('')}</div>
        ${rounds.map(round => `<div class="gwent-result-row" role="row"><span role="cell">${round.round}</span>${seats.map(seat => `<span role="cell" data-won="${(round.points?.[seat] ?? 0) === Math.max(...Object.values(round.points || {}))}">${round.points?.[seat] ?? 0} <small>(${round.scores[seat]})</small></span>`).join('')}</div>`).join('')}
        <div class="gwent-result-row gwent-result-total" role="row"><span role="cell">Итого</span>${seats.map(seat => `<span role="cell" data-won="${state.winners.includes(seat)}"><strong>${state.points[seat]}</strong> <small>${place(seat)}-е</small></span>`).join('')}</div>
      </div>
      <div class="gwent-actions">${button('К полю', 'data-close-summary')}${remote?.spectator ? button('К списку игр', 'data-leave-watch', true) : `${remote ? '' : button('Реванш', 'data-rematch', true)}${button('Новая игра', 'data-finish', Boolean(remote))}`}</div></div>`;
  }
  function summaryHtml() {
    if (isTableState()) return tableSummaryHtml();
    const you = remote?.spectator ? remote.playerName : 'Вы';
    const them = remote?.opponent || 'Противник';
    const winner = state.winner === 'draw' ? 'Ничья'
      : remote?.spectator ? `Победил ${state.winner === 'player' ? remote.playerName : remote.opponent}`
        : state.winner === 'player' ? 'Вы победили!' : `Победил ${them}`;
    const rounds = state.rounds || [];
    const who = round => round.winner === 'draw' ? 'Ничья' : round.winner === 'player' ? you : them;
    const rematch = remote?.spectator ? '' : rematchPanelHtml();
    return `<div class="gwent-result-view"><p class="gwent-result-winner" role="status"><strong>${esc(winner)}</strong></p>
      <p class="gwent-hint">Выиграно раундов: ${state.wins.player} : ${state.wins.ai}</p>${ratingChangeHtml()}${remote?.endReason ? `<p class="gwent-hint">${esc(remote.endReason)}</p>` : ''}
      <div class="gwent-result-table" role="table" aria-label="Очки по раундам">
        <div class="gwent-result-row gwent-result-head" role="row"><span role="columnheader">Раунд</span><span role="columnheader">${esc(you)}</span><span role="columnheader">${esc(them)}</span><span role="columnheader">Победа</span></div>
        ${rounds.map(round => `<div class="gwent-result-row" role="row"><span role="cell">${round.round}</span><span role="cell" data-won="${round.winner === 'player' || round.winner === 'draw'}">${round.scores.player}</span><span role="cell" data-won="${round.winner === 'ai' || round.winner === 'draw'}">${round.scores.ai}</span><span role="cell">${esc(who(round))}</span></div>`).join('') || '<p class="gwent-hint">Ни один раунд не был завершён</p>'}
      </div>${rematch}
      <div class="gwent-actions">${button('К полю', 'data-close-summary')}${remote?.spectator ? button('К списку игр', 'data-leave-watch', true) : button('Новая игра', 'data-finish', !rematch)}</div></div>`;
  }
  /** One line about the rating: the change of a counted game, a game still being counted, or a friendly game. */
  function ratingChangeHtml() {
    if (!remote || remote.spectator) return '';
    const rated = remote.rated;
    if (remote.ruleset === 'extended') return '<p class="gwent-hint">Расширенные правила: рейтинг не меняется</p>';
    if (!rated) return '<p class="gwent-hint">Товарищеская игра: рейтинг не меняется</p>';
    if (!rated.change) return '<p class="gwent-hint">Рейтинговая игра: считаем результат…</p>';
    const delta = rated.change.delta;
    return `<p class="gwent-rating-line" role="status" data-delta="${delta >= 0 ? 'up' : 'down'}">Рейтинг: ${rated.before} → <strong>${rated.change.after}</strong> (${delta >= 0 ? '+' : '−'}${Math.abs(delta)})</p>`;
  }
  /** Rematch controls inside the result popup: offer, answer an offer, wait, or nothing when the opponent left. */
  function rematchPanelHtml() {
    if (!remote) return `<div class="gwent-actions">${button('Реванш', 'data-rematch', true)}</div>`;
    const rematch = remote.rematch;
    if (!rematch) return '';
    if (rematch.declined) return '<p class="gwent-hint" role="status">Соперник отказался от реванша</p>';
    if (rematch.closed) return '<p class="gwent-hint" role="status">Соперник вышел из матча</p>';
    if (rematch.offered) return `<p class="gwent-result-offer" role="status">${esc(remote.opponent)} предлагает реванш</p><div class="gwent-actions">${button('Отклонить', 'data-rematch-decline')}${button('Принять реванш', 'data-rematch', true)}</div>`;
    if (rematch.requested) return `<div class="gwent-actions">${button('Ждём ответ соперника…', 'data-rematch disabled')}</div>`;
    return `<div class="gwent-actions">${button('Реванш', 'data-rematch', true)}</div>`;
  }
  /** The rematch button: offer, accept the opponent's offer, or wait. Nothing when the opponent has left. */
  function rematchHtml() {
    if (!remote) return button('Реванш', 'data-rematch', true);
    const rematch = remote.rematch;
    if (!rematch || rematch.closed) return '';
    if (rematch.offered) return button('Принять реванш', 'data-rematch', true);
    if (rematch.requested) return button('Ждём ответ соперника…', 'data-rematch disabled');
    return button('Реванш', 'data-rematch', true);
  }
  function previewHtml() {
    if (pile) {
      const [side, kind] = pile.split(':'), cards = kind === 'graveyard' ? state.sides[side].graveyard : [];
      return `<p class="gwent-hint">${kind === 'deck' ? 'Порядок карт в колоде скрыт от игроков.' : 'Карты в отбое'}</p><div class="gwent-pile-grid">${cards.map(card => cardHtml(card, card.strength)).join('') || (kind === 'graveyard' ? '<p>Отбой пуст</p>' : '')}</div>${button('Вернуться к матчу', 'data-close-preview')}`;
    }
    if (!preview) return '';
    return `<div class="gwent-card-detail">${image(preview.id, 'gwent-detail-art', '', artSource(preview.id, preview.artIndex))}<div>${GWENT_PRINTED_CARDS.has(preview.id) ? '' : `<h3>${esc(preview.name)}</h3>`}<p>${preview.type === 'leader' ? esc(leaderDescription(preview)) : esc(cardTraits(preview) || 'Обычный отряд')}</p>
      ${preview.type === 'unit' ? `<p>Базовая сила: ${preview.strength}</p><p>${preview.rows.map(row => ROW_LABELS[row]).join(' / ')}</p>` : ''}</div></div>${button('Назад', 'data-close-preview')}`;
  }

  function render() {
    if (closed) return;
    if (summary && state?.phase !== 'matchOver') summary = false; // the popup only exists for a finished match
    const active = document.activeElement;
    const key = active && [...active.attributes].find(a => a.name.startsWith('data-'));
    const scroll = panel.scrollTop, handScroll = panel.querySelector('.gwent-hand')?.scrollLeft || 0;
    const expanded = panel.querySelector('.gwent-extra-filters')?.open;
    const moreOpen = panel.querySelector('.gwent-more')?.open;
    const title = summary ? 'Итоги матча' : artCard ? 'Выбор арта' : preview || pile ? preview?.name || 'Карты' : ({ decks: 'Выбор колоды', mode: 'Начать игру', editor: 'Состав колоды', leaders: 'Выбор лидера', search: 'Поиск соперника', match: 'Гвинт', friends: 'Игра с другом', games: 'Текущие игры', board: 'Таблица лидеров' })[screen];
    panel.dataset.screen = screen; panel.classList.toggle('gwent-board-panel', screen === 'match' && !preview && !pile && !summary);
    panel.innerHTML = `${dialogHeading(title, { id: 'gwent-title', back: screen !== 'decks' && screen !== 'match' || !!preview || !!pile || !!artCard || summary, rules: RULES })}<div class="gwent-content" data-gwent-content>
      ${summary ? summaryHtml() : artCard ? artPickerHtml() : preview || pile ? previewHtml() : ({ decks: deckScreen, mode: modeScreen, editor: editorScreen, leaders: leaderScreen, search: searchScreen, match: matchScreen, friends: friendsScreen, games: gamesScreen, board: boardScreen })[screen]()}</div>
      <div class="gwent-feedback" data-tone="${tone}" role="status" aria-live="polite" ${notice && !summary ? '' : 'hidden'}>${esc(notice)}</div>`;
    renderedLobbyKey = lobbyKey();
    panel.setAttribute('aria-busy', String(busy));
    if (busy) panel.querySelectorAll('button:not([data-dismiss])').forEach(b => { b.disabled = true; });
    enhanceSelects(panel);
    if (expanded && panel.querySelector('.gwent-extra-filters')) panel.querySelector('.gwent-extra-filters').open = true;
    if (moreOpen && panel.querySelector('.gwent-more')) panel.querySelector('.gwent-more').open = true;
    panel.scrollTop = scroll;
    const hand = panel.querySelector('.gwent-hand'); if (hand) hand.scrollLeft = handScroll;
    if (key) [...panel.querySelectorAll(`[${key.name}]`)].find(node => node.getAttribute(key.name) === key.value)?.focus({ preventScroll: true });
    animateBoard(); markThinking();
  }
  function updateCatalog() {
    const active = document.activeElement, id = active?.dataset.adjust, delta = active?.dataset.delta;
    panel.querySelector('[data-catalog]').innerHTML = catalogHtml();
    panel.querySelector('[data-deck-stats]').innerHTML = statsHtml();
    panel.querySelector('[data-save-deck]').disabled = !inspectLoadout(draft).valid;
    if (id) {
      const same = [...panel.querySelectorAll('[data-adjust]')].find(n => n.dataset.adjust === id && n.dataset.delta === delta && !n.disabled);
      (same || [...panel.querySelectorAll('[data-adjust]')].find(n => n.dataset.adjust === id && !n.disabled))?.focus({preventScroll:true});
    }
  }
  function go(next) { preview = null; pile = null; artCard = null; note(); screen = next; panel.scrollTop = 0; render(); schedulePoll(); }
  async function post(body) { return api('/api/gwent/action', { method: 'POST', body: JSON.stringify(body) }); }
  function accept(data) {
    serverOffset = (data.serverNow || Date.now()) - Date.now();
    for (const [id, config] of Object.entries(data.loadouts || {})) if (inspectLoadout(config).valid && loadoutKey(config.ruleset, config.faction) === id) loadouts[id] = config;
    lobby = {friends:data.friends || [],incoming:data.incoming || [],outgoing:data.outgoing || [],games:data.games || [],room:data.room || null};
    if (data.rating) myRating = data.rating;
    if (data.leaderboard) board = data.leaderboard;
    if (data.invitation) { invitation = data.invitation; focusedInvite = invitation.id; }
    const snapshot = watchId ? data.spectating : data.match;
    if (snapshot) {
      const changed = !remote || remote.id !== snapshot.id || remote.revision !== snapshot.revision;
      remote = snapshot; state = remote.state; faction = remote.faction; enemyFaction = remote.enemyFaction;
      // The result popup opens once per finished match, and again when the opponent offers a rematch.
      if (state.phase !== 'matchOver') summary = false;
      else if (summaryFor !== remote.id) { summaryFor = remote.id; summary = true; }
      if (remote.rematch?.offered && !wasOffered) summary = true;
      wasOffered = !!remote.rematch?.offered;
      if (changed) { if (heardId !== remote.id) { heard = null; motionSeen = null; heardId = remote.id; } hear(state); pick = null; decoy = null; preview = null; pile = null; announceRound(); }
      if (changed && summary) { preview = null; pile = null; }
      screen = 'match';
      if (changed || panel.dataset.screen !== 'match') render();
      else { const clock = panel.querySelector('[data-gwent-clock]'); if (clock) clock.textContent = `До хода: ${Math.max(0, Math.ceil((remote.deadline - (Date.now() + serverOffset)) / 60000))} мин.`; }
    } else if (data.searching) { remote = null; screen = 'search'; render(); }
    else if (screen === 'search' || remote) { remote = null; go('mode'); note('Поиск завершён. Можно начать новый поиск.'); render(); }
    if (['mode','friends','games','board'].includes(screen) && renderedLobbyKey !== lobbyKey()) render();
  }
  async function online(body) {
    if (busy || !api) return;
    requestId++; // Invalidate a read started before this mutation.
    busy = true; render();
    try { const data = await post(body); if (!closed) accept(data);
      else if (body.action === 'join' && data.searching) post({ action: 'cancel' }).catch(() => {});
      return data; }
    catch (error) {
      if (!closed) { note(error.message || 'Не удалось выполнить действие', 'bad');
        // A response may have been lost after the server committed the move.
        try { accept(await api(readUrl())); } catch { /* keep visible error and permit retry */ }
      }
    } finally { busy = false; render(); schedulePoll(); }
  }
  function schedulePoll() {
    clearTimeout(pollTimer);
    if (closed || document.hidden || !api || !(screen === 'search' || ['mode','friends','games','board'].includes(screen) || remote?.state.phase === 'playing' || (remote && !remote.spectator && remote.rematch && !remote.rematch.closed))) return;
    pollTimer = setTimeout(async () => {
      if (busy) { schedulePoll(); return; }
      const token = ++requestId;
      try { const data = await api(readUrl()); if (!closed && token === requestId && !busy) { accept(data); if (onlineError) { onlineError = ''; note(); render(); } } }
      catch { if (!closed) { onlineError = 'Связь прервана. Повторяем подключение…'; note(onlineError, 'bad'); render(); } }
      schedulePoll();
    }, screen === 'match' ? 2500 : 4000);
  }
  // Sound follows what changed between two states: a played card, a pass, the weather, a round or the match.
  let heard = null, heardId = null;
  function hear(next) {
    const prev = heard; heard = next;
    if (!prev || !next || prev === next) return;
    if (next.phase === 'matchOver' && prev.phase !== 'matchOver') { sfx(next.winner === 'player' ? 'matchWin' : next.winner === 'ai' ? 'matchLose' : 'draw'); return; }
    const round = next.lastRound;
    if (round && round.round !== prev.lastRound?.round) { sfx(round.winner === 'draw' ? 'draw' : round.winner === 'player' ? 'roundWin' : 'roundLose'); return; }
    if (JSON.stringify(next.passed) !== JSON.stringify(prev.passed)) {
      sfx('pass');
      const passer = Object.keys(next.passed || {}).find(seat => next.passed[seat] && !prev.passed?.[seat]);
      if (passer) banner(passer === 'player' && !remote?.spectator ? 'Вы пасуете' : `${passer === 'ai' && !isTableState() ? 'Соперник' : seatName(passer)} пасует`);
      return;
    }
    if (JSON.stringify(next.weather) !== JSON.stringify(prev.weather)) { sfx(Object.values(next.weather || {}).some(Boolean) ? 'weather' : 'clear'); return; }
    sfx('cardPlay');
  }
  // ---- Motion: new cards land, scores pulse, the AI visibly thinks and lays its card before it is played. ----
  const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  let motionSeen = null, thinkingSeat = null, floating = new Set();
  function float(html, className, ms) {
    const node = document.createElement('div'); node.className = className; node.setAttribute('role', 'presentation'); node.innerHTML = html;
    document.body.append(node); floating.add(node);
    setTimeout(() => { node.remove(); floating.delete(node); }, ms);
  }
  /** A short message over the table: the pass of a seat, the result of a round. */
  function banner(text, tone = '') { if (text && screen === 'match') float(`<span>${esc(text)}</span>`, 'gwent-banner' + (tone ? ' ' + tone : ''), 1800); }
  const scoreKey = (node, i) => i + ':' + (node.closest('[data-side]')?.dataset.side || node.closest('.gwent-side')?.className || '') + (node.closest('[data-row]')?.dataset.row || '');
  /** After a render: cards that were not on the table before land, drawn cards slide in, changed scores pulse. */
  function animateBoard() {
    if (screen !== 'match' || !state || preview || pile || summary) return;
    const seen = { cards: new Set(), hand: new Set(), scores: new Map() };
    panel.querySelectorAll('.gwent-row-cards [data-board-card], .gwent-row-cards [data-target-uid]').forEach(node => seen.cards.add(node.dataset.boardCard || node.dataset.targetUid));
    panel.querySelectorAll('.gwent-hand [data-card-uid], .gwent-hand [data-hand-uid]').forEach(node => seen.hand.add(node.dataset.cardUid || node.dataset.handUid));
    const scoreNodes = [...panel.querySelectorAll('.gwent-row-score, .gwent-side-head > strong, .gwent-opponent-head > strong')];
    scoreNodes.forEach((node, i) => seen.scores.set(scoreKey(node, i), node.textContent));
    const before = motionSeen; motionSeen = seen;
    if (!before || calm()) return;
    const finish = node => node.addEventListener('animationend', () => node.classList.remove('gwent-enter', 'gwent-draw', 'gwent-bump'), { once: true });
    panel.querySelectorAll('.gwent-row-cards [data-board-card], .gwent-row-cards [data-target-uid]').forEach(node => { if (!before.cards.has(node.dataset.boardCard || node.dataset.targetUid)) { node.classList.add('gwent-enter'); finish(node); } });
    panel.querySelectorAll('.gwent-hand [data-card-uid], .gwent-hand [data-hand-uid]').forEach(node => { if (!before.hand.has(node.dataset.cardUid || node.dataset.handUid)) { node.classList.add('gwent-draw'); finish(node); } });
    scoreNodes.forEach((node, i) => {
      const key = scoreKey(node, i);
      if (before.scores.has(key) && before.scores.get(key) !== node.textContent) { node.classList.add('gwent-bump'); finish(node); }
    });
  }
  /** Marks the seat that is thinking: its crest pulses and the turn line says so. */
  function markThinking() {
    if (!thinkingSeat || screen !== 'match') return;
    panel.querySelectorAll('.thinking').forEach(node => node.classList.remove('thinking'));
    panel.querySelector(`.gwent-side.${thinkingSeat}, [data-focus-seat="${thinkingSeat}"]`)?.classList.add('thinking');
    const line = panel.querySelector('.gwent-turn');
    if (line) line.innerHTML = `${esc(thinkingSeat === 'ai' && !isTableState() ? 'Соперник' : seatName(thinkingSeat))} думает<span class="gwent-dots" aria-hidden="true"><i></i><i></i><i></i></span>`;
  }
  function setThinking(seat) { thinkingSeat = seat; if (seat) markThinking(); else panel.querySelectorAll('.thinking').forEach(node => node.classList.remove('thinking')); }
  /** How long the opponent seems to deliberate: longer with more cards in hand and on the strong level, never long enough to bore. */
  function thinkTime(snapshot, seat, action) {
    if (calm()) return 300;
    const hand = snapshot.sides[seat]?.hand?.length || 0;
    const base = 800 + Math.random() * 700 + Math.min(500, hand * 50) + (matchLevel === 'hard' ? 400 : 0);
    return Math.min(2400, action.type === 'choice' ? base * 0.5 : action.type === 'pass' ? base * 0.8 : base);
  }
  /** The card the AI chose is shown face up for a moment before it lands on the table. */
  async function showAiCard(snapshot, seat, action) {
    if (calm() || action.type !== 'play') return;
    const card = snapshot.sides[seat]?.hand?.find(item => item.uid === action.uid);
    if (!card) return;
    float(cardHtml(card, card.strength), 'gwent-ai-card', 800);
    await sleep(700);
  }
  function roundNote(text) { note(text); banner(text, 'round'); }
  function announceRound() {
    if (remote?.spectator) return;
    const last = state.lastRound;
    if (!last || last.round === announcedRound) return;
    announcedRound = last.round;
    if (last.teamScores) { const mine = state.teams.player; roundNote(`Раунд ${last.round}: ${last.winner === 'draw' ? 'ничья' : state.teams[last.winner] === mine ? 'за вашей командой' : 'за соперниками'}, ${last.teamScores[mine]} : ${last.teamScores[mine === 'A' ? 'B' : 'A']}`); return; }
    if (isTableState()) { roundNote(`Раунд ${last.round}: ваши очки — ${last.points?.player ?? 0}, счёт ${last.scores.player}`); return; }
    roundNote(`${last.winner === 'draw' ? 'Ничья' : last.winner === 'player' ? 'Раунд за вами' : 'Раунд за противником'}: ${last.scores.player} : ${last.scores.ai}`);
  }
  function apply(result) {
    if (result.error) { note(result.error, 'bad'); render(); return; }
    state = result.state; pick = null; decoy = null; hear(state); announceRound(); haptic('light');
    if (state.phase === 'matchOver' && summaryFor !== 'local' + localMatch) { summaryFor = 'local' + localMatch; summary = true; }
    render(); scheduleAi();
  }
  async function play(uid, options = {}) {
    if (remote) return online({ action: 'play', matchId: remote.id, revision: remote.revision, uid, ...options });
    apply(playCard(state, 'player', uid, options));
  }
  function scheduleAi() {
    clearTimeout(aiTimer);
    const mover = state?.pending ? state.pending.side : state?.turn;
    if (closed || remote || screen !== 'match' || document.hidden || state?.phase !== 'playing' || aiThinking === state || !mover || mover === 'player') return;
    aiTimer = setTimeout(async () => {
      const snapshot = state, seat = mover;
      aiThinking = snapshot; setThinking(seat);
      const started = Date.now();
      const action = await thinkAi(snapshot, matchLevel, seat);
      // The opponent deliberates for a believable time, then shows the card it chose.
      if (action && !closed && state === snapshot) {
        await sleep(Math.max(0, thinkTime(snapshot, seat, action) - (Date.now() - started)));
        if (!closed && state === snapshot) await showAiCard(snapshot, seat, action);
      }
      aiThinking = null;
      // The match may have been closed, restarted or moved on while the AI was thinking.
      if (!action || closed || state !== snapshot) { if (!closed && thinkingSeat === seat) setThinking(null); return; }
      setThinking(null);
      apply(action.type === 'choice' ? resolveChoice(state, seat, action.id) : action.type === 'pass' ? passRound(state, seat) : playCard(state, seat, action.uid, action));
    }, 250);
  }
  /** The strong AI searches in a Web Worker; any worker failure falls back to the main thread. */
  function thinkAi(snapshot, aiLevel, seat = 'ai') {
    const options = { level: aiLevel };
    if (aiLevel !== 'hard' || aiWorker === false) return Promise.resolve(decideAi(snapshot, seat, options));
    try { aiWorker ||= new Worker(new URL('./gwent-ai-worker.js', import.meta.url), { type: 'module' }); } catch { aiWorker = false; }
    if (!aiWorker) return Promise.resolve(decideAi(snapshot, seat, options));
    const worker = aiWorker, id = ++aiCall;
    return new Promise(resolve => {
      const finish = value => { worker.removeEventListener('message', onMessage); worker.removeEventListener('error', onError); resolve(value); };
      const onMessage = ({ data }) => { if (data.id !== id) return; if (data.action === undefined) { aiWorker = false; finish(decideAi(snapshot, seat, options)); } else finish(data.action); };
      const onError = () => { aiWorker = false; finish(decideAi(snapshot, seat, options)); };
      worker.addEventListener('message', onMessage); worker.addEventListener('error', onError);
      worker.postMessage({ id, state: snapshot, seat, options });
    });
  }
  function startAi(keepEnemy = false) {
    requestId++; clearTimeout(pollTimer); clearTimeout(aiTimer); localMatch++; summary = false;
    if (!keepEnemy || !rulesetAllows(ruleset, enemyFaction)) enemyFaction = factionsNow()[Math.floor(Math.random() * factionsNow().length)];
    matchLevel = level;
    remote = null; watchId = null; focusedInvite = null; pick = null; decoy = null; announcedRound = null;
    const size = ruleset === 'extended' ? (tableSize === 'teams' ? 4 : tableSize) : 2;
    if (size > 2) {
      // Every opponent plays a different faction of the rules when there are enough of them.
      const pool = factionsNow().filter(id => id !== faction).sort(() => Math.random() - 0.5);
      const decks = [buildDeck(loadouts[keyOf()]), ...pool.slice(0, size - 1).map(id => buildDeck(aiLoadout(id, level, undefined, ruleset)))];
      focusSeat = 'ai';
      heard = null; motionSeen = null; state = createTable({ decks, seats: TABLE_SEATS.slice(0, size), teams: tableSize === 'teams' && ruleset === 'extended' });
      go('match');
      return;
    }
    const aiDeck = buildDeck(aiLoadout(enemyFaction, level, undefined, ruleset));
    heard = null; motionSeen = null; state = createMatch({ playerDeck: buildDeck(loadouts[keyOf()]), aiDeck }); sfx('deal'); go('match');
  }
  async function cancelSearch(ai = false) {
    const data = await online({ action: 'cancel' });
    if (!data) return;
    if (data.match) { note('Соперник уже найден. Матч начался.'); render(); return; }
    if (ai) startAi(); else go('mode');
  }
  async function saveDeck() {
    if (!inspectLoadout(draft).valid) return;
    if (api) { const result = await online({ action: 'save', loadout: draft }); if (!result) return; }
    loadouts[keyOf()] = structuredClone(draft);
    if (!api) { try { localStorage.setItem('gwent-loadouts-v1', JSON.stringify(loadouts)); } catch { note('Не удалось сохранить колоду на устройстве', 'bad'); render(); return; } }
    draft = null; go(draftReturn);
  }
  function editDeck() { draftReturn = screen; draft = structuredClone(loadouts[keyOf()]); filters = { sort: 'name' }; page = 0; go('editor'); }
  function cardById(id) {
    const card = deckNow(faction).cards.find(([card]) => card.id === id)?.[0];
    return card ? { ...card, artIndex: (draft || loadouts[keyOf()]).arts?.[id] ?? 0 } : null;
  }
  async function close() {
    if (closed) return;
    const searching = screen === 'search'; closed = true; requestId++; if (aiWorker) aiWorker.terminate();
    releaseMusic(); floating.forEach(node => node.remove()); floating.clear(); clearTimeout(aiTimer); clearTimeout(pollTimer); document.removeEventListener('visibilitychange', onVisibility);
    if (searching && api) post({ action: 'cancel' }).catch(() => {});
    overlay.remove();
  }
  function back() {
    if (artCard) { artCard = null; render(); return; }
    if (summary) { summary = false; render(); return; }
    if (preview || pile) { preview = null; pile = null; render(); return; }
    if (screen === 'search') return cancelSearch();
    if (screen === 'leaders') return go(leaderReturn);
    if (screen === 'editor') { draft = null; return go(draftReturn); }
    if (['friends','games','board'].includes(screen)) return go('mode');
    go('decks');
  }
  panel.addEventListener('input', event => {
    if (event.target.matches('[data-search]')) { filters.search = event.target.value; page = 0; updateCatalog(); }
  });
  panel.addEventListener('change', event => {
    const el = event.target;
    if (el.matches('[data-filter]')) { filters[el.dataset.filter] = el.value; page = 0; updateCatalog(); }
    else if (el.matches('[data-included]')) { filters.included = el.checked; page = 0; updateCatalog(); }
    else if (el.name === 'gwent-mode') { mode = el.value; render(); }
    else if (el.name === 'gwent-ruleset') {
      ruleset = normalizeRuleset(el.value); try { localStorage.setItem('gwent-ruleset', ruleset); } catch { /* optional */ }
      if (!rulesetAllows(ruleset, faction)) faction = factionsNow()[0];
      render();
    }
    else if (el.name === 'gwent-table-size') { tableSize = el.value === 'teams' ? 'teams' : [2, 3, 4].includes(Number(el.value)) ? Number(el.value) : 2; try { localStorage.setItem('gwent-table-size', String(tableSize)); } catch { /* optional */ } render(); }
    else if (el.name === 'gwent-level') { level = normalizeAiLevel(el.value); try { localStorage.setItem('gwent-ai-level', level); } catch { /* optional */ } render(); }
  });
  panel.addEventListener('click', async event => {
    const el = event.target.closest('button,[data-back]'); if (!el || el.disabled) return;
    if (el.matches('[data-dismiss]')) return close();
    if (busy) return;
    const d = el.dataset;
    if ('back' in d || 'discardDraft' in d) return back();
    if ('friends' in d || 'games' in d || 'board' in d) { focusedInvite = null; invitation = null; go('friends' in d ? 'friends' : 'games' in d ? 'games' : 'board'); await reconnect(); }
    else if (d.createTable) await online({ action: 'invite', table: d.createTable === 'teams' ? 4 : Number(d.createTable), ...(d.createTable === 'teams' ? { teams: true } : {}), loadout: loadouts[keyOf()] });
    else if (d.startTable) await online({ action: 'start_table', inviteId: d.startTable });
    else if (d.leaveTable) await online({ action: 'leave_table', inviteId: d.leaveTable });
    else if (d.tableInvite) { const result = await online({ action: 'table_invite', inviteId: lobby.room?.id, targetId: d.tableInvite }); if (result) { note(result.notificationSent ? 'Друг получил приглашение за стол' : 'Не удалось доставить уведомление. Отправьте другу ссылку.'); render(); } }
    else if ('inviteNickGo' in d) {
      const nickname = panel.querySelector('[data-invite-nick]')?.value.trim() || '';
      if (!nickname) { note('Введите ник игрока', 'bad'); render(); return; }
      await online({ action: 'invite', ruleset, targetNickname: nickname, loadout: loadouts[keyOf()] });
    }
    else if ('createInvite' in d || d.inviteFriend) await online({action:'invite',ruleset,targetId:d.inviteFriend || null,loadout:loadouts[keyOf()]});
    else if (d.acceptInvite) { const inviteRules = [...lobby.incoming, invitation].find(item => item?.id === d.acceptInvite)?.ruleset || 'classic'; focusedInvite = null; invitation = null; await online({action:'accept_invite',inviteId:d.acceptInvite,loadout:loadoutFor(inviteRules)}); }
    else if (d.cancelInvite || d.declineInvite) { focusedInvite = null; invitation = null; await online({action:d.cancelInvite ? 'cancel_invite':'decline_invite',inviteId:d.cancelInvite || d.declineInvite}); }
    else if (d.pushInvite) { const result = await online({action:'push_invite',inviteId:d.pushInvite}); if(result) {note(result.notificationSent ? 'Уведомление отправлено' : 'Не удалось доставить уведомление. Отправьте другу ссылку.');render();} }
    else if (d.copyInvite) { const item=[...lobby.outgoing,lobby.room].find(i=>i?.id===d.copyInvite); if(item?.url) {try {await navigator.clipboard.writeText(item.url);note('Ссылка скопирована');} catch {note('Скопируйте выделенную ссылку');render();panel.querySelector(`[data-copy-invite="${d.copyInvite}"]`)?.closest('article').querySelector('input')?.select();return;} render();} }
    else if (d.watch) { focusedInvite = null; watchId = lobby.games.find(g=>g.id===d.watch)?.participant ? null : d.watch; await reconnect(); }
    else if ('leaveWatch' in d) { requestId++;watchId=null;remote=null;state=null;go('games');await reconnect(); }
    else if (d.artCard && draft) {
      artCard = deckNow(faction).leaders.find(leader => leader.id === d.artCard) || cardById(d.artCard);
      panel.scrollTop = 0; render();
    } else if ('selectArt' in d && artCard && draft) {
      const index = Number(d.selectArt);
      if (Number.isInteger(index) && index >= 0 && index < cardArtOptions(artCard.id, ruleset).length) {
        draft.arts ||= {}; draft.arts[artCard.id] = index; artCard = null; render();
      }
    } else if ('closeArt' in d) { artCard = null; render(); }
    else if (d.selectFaction) { faction = d.selectFaction; render(); }
    else if ('mode' in d) go(deckReturn);
    else if ('openDecks' in d) { deckReturn = screen === 'friends' ? 'friends' : 'mode'; go('decks'); }
    else if ('editor' in d) editDeck();
    else if ('leaders' in d) { leaderReturn = screen; go('leaders'); }
    else if (d.selectLeader) { draft.leaderId = d.selectLeader; go(leaderReturn); }
    else if ('clearDeck' in d) { draft.counts = {}; render(); }
    else if ('resetDeck' in d) { const { leaderId, arts } = draft; draft = defaultLoadout(faction); draft.leaderId = leaderId; draft.arts = arts || {}; render(); }
    else if ('saveDeck' in d) await saveDeck();
    else if (d.adjust) {
      const [card, limit] = deckNow(faction).cards.find(([card]) => card.id === d.adjust);
      const next = (draft.counts[card.id] || 0) + Number(d.delta);
      if (next >= 0 && next <= limit && !(Number(d.delta) > 0 && card.type === 'special' && inspectLoadout(draft).specials >= 10)) draft.counts[card.id] = next;
      updateCatalog();
    } else if ('resetFilters' in d) { filters = { sort: 'name' }; page = 0; render(); }
    else if ('page' in d) { page += Number(d.page); updateCatalog(); panel.querySelector('[data-catalog]').scrollIntoView({ block: 'start' }); }
    else if ('start' in d) {
      if (mode === 'ai') startAi();
      else { await online({ action: 'join', ruleset, loadout: loadouts[keyOf()] }); }
    } else if ('reconnect' in d) await reconnect();
    else if ('cancelSearch' in d) await cancelSearch();
    else if ('searchAi' in d) await cancelSearch(true);
    else if ('closeSummary' in d) { summary = false; render(); }
    else if ('openSummary' in d) { summary = true; render(); }
    else if ('rematchDecline' in d) { if (remote) await online({ action: 'rematch_decline', matchId: remote.id }); }
    else if ('rematch' in d) { if (remote) await online({ action: 'rematch', matchId: remote.id }); else startAi(true); }
    else if ('finish' in d) { if (remote) { const result = await online({ action: 'dismiss', matchId: remote.id }); if (!result) return; } remote = null; state = null; go('mode'); }
    else if ('endMatch' in d) { if (remote) await online({ action: 'surrender', matchId: remote.id, revision: remote.revision }); else { clearTimeout(aiTimer); state = null; go('mode'); } }
    else if ('closePreview' in d) { preview = null; pile = null; render(); scheduleAi(); }
    else if (d.previewId) { preview = cardById(d.previewId); render(); }
    else if (d.previewLeader) { preview = state.sides[d.previewLeader].leader; render(); }
    else if (d.boardCard) { preview = Object.values(state.sides).flatMap(s => ROWS.flatMap(row => s.rows[row])).find(card => card.uid === Number(d.boardCard)); render(); }
    else if (d.pile) { pile = d.pile; render(); }
    else if (d.hornRow) { const s = state.sides[d.hornSide], cards = s.rows[d.hornRow]; note(`${ROW_LABELS[d.hornRow]}: ${cards.some(c => c.special === 'horn') ? 'Командирский рог · ×2' : cards.some(c => c.horn) ? 'Рог от способности отряда · ×2' : s.doubled[d.hornRow] ? 'Удвоение от лидера · ×2' : 'Командирский рог не установлен'}. Герои не получают удвоение.`); render(); }
    else if (d.cardUid) {
      const uid = Number(d.cardUid), plays = myPlays().filter(play => play.uid === uid); if (!plays.length) return;
      const card = state.sides.player.hand.find(card => card.uid === uid); pick = null; decoy = null;
      // A decoy always names a target; a swap unit may be played plainly or with a unit to take back.
      if (plays[0].targetUid !== undefined) decoy = { uid, plays }; else pick = { uid, plays: plays.filter(play => play.targetUid === undefined), swapPlays: plays.filter(play => play.targetUid !== undefined), card, seat: undefined }; note(); render();
    } else if ('cancelCard' in d) { pick = null; decoy = null; render(); }
    else if ('playSelected' in d && pick) await play(pick.uid, pickPlays()[0]);
    else if (d.pickSeat && pick) { pick = { ...pick, seat: d.pickSeat }; render(); }
    else if (d.pickRow && pick) await play(pick.uid, { row: d.pickRow, seat: pick.seat });
    else if (d.focusSeat) { focusSeat = 'collapse' in d ? null : d.focusSeat; render(); }
    else if ('swapSelected' in d && pick?.swapPlays.length) { decoy = { uid: pick.uid, plays: pick.swapPlays, row: pick.swapPlays[0].row }; pick = null; render(); }
    else if (d.targetUid && decoy) {
      // A decoy or swap names one unit; a teleport then asks for the row it moves to.
      const uid = Number(d.targetUid), options = decoy.plays.filter(play => play.targetUid === uid), rowChoices = [...new Set(options.map(play => play.row))];
      if (decoy.row !== undefined || rowChoices.length <= 1) await play(decoy.uid, { row: decoy.row ?? options[0]?.row, targetUid: uid });
      else { decoy = { ...decoy, chosen: uid, rowChoices }; render(); }
    }
    else if (d.pickRow && decoy?.chosen) await play(decoy.uid, { row: d.pickRow, targetUid: decoy.chosen });
    else if ('pass' in d) { if (remote) await online({ action: 'pass', matchId: remote.id, revision: remote.revision }); else apply(passRound(state, 'player')); }
    else if ('leader' in d) await play(state.sides.player.leader.uid);
    else if (d.choiceId) { const id = state.pending.options.find(o => String(o.id) === d.choiceId)?.id; if (id === undefined) return;
      if (remote) await online({ action: 'choice', matchId: remote.id, revision: remote.revision, choiceId: id }); else apply(resolveChoice(state, 'player', id)); }
  });
  overlay.querySelector('.overlay-backdrop').addEventListener('click', close);
  overlay.addEventListener('overlay-escape', event => { if (preview || pile || artCard || screen === 'leaders') { event.preventDefault(); back(); } });
  function onVisibility() { if (document.hidden) { clearTimeout(aiTimer); clearTimeout(pollTimer); } else { scheduleAi(); schedulePoll(); } }
  document.addEventListener('visibilitychange', onVisibility);
  async function reconnect() {
    if (!api || busy) return;
    busy = true; render();
    try { const data = await api(readUrl()); if (!closed) { onlineError = ''; accept(data); } }
    catch (error) { if(watchId || focusedInvite) {watchId=null;focusedInvite=null;invitation=null;remote=null;screen='mode';onlineError=error.message;} else onlineError = 'Сервер недоступен. Игра с ИИ доступна без подключения.'; note(onlineError,'bad'); }
    finally { busy = false; render(); schedulePoll(); }
  }
  render();
  await reconnect();
  return { close };
}
