import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { bundlePageAssets } from '../../miniapp/pageAssets.js';
import { runGwent, emptyLobby } from '../../miniapp/gwentLobby.js';
const { chromium } = createRequire(process.env.PLAYWRIGHT_PACKAGE || 'C:/Users/kubai/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/package.json')('playwright');
const root = path.resolve('webapp'), out = path.resolve('.tmp/gwent-ui'); fs.mkdirSync(out, {recursive:true});
const assets = bundlePageAssets(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), f => fs.readFileSync(path.join(root, f.slice(1)), 'utf8'));
const styles = [...assets.html.matchAll(/<(?:link rel="stylesheet"|meta name="game-feature-styles")[^>]+>/g)].map(m => m[0]).join('');
const browser = await chromium.launch({headless:true, executablePath:process.env.DESIGN_BROWSER || 'C:/Users/kubai/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
// The shared lobby, as the server keeps it: players 1-3 are friends, each known only by user id.
const lobby = emptyLobby(), savedDecks = {};
const chat = {game:{gwent:lobby.gwent}};
const peopleOf = () => Object.fromEntries([1,2,3].map(id => [String(id), {name:`Игрок ${id}`, friends:[1,2,3].filter(i=>i!==id).map(String), lastSeenAt:0}]));
async function fixture(width, userId = 1) {
  const page = await browser.newPage({viewport:{width,height:950},hasTouch:width<500,reducedMotion:'reduce'}), errors = [];
  let requests = 0;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/fixture') return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+styles+'<body><button id="origin">Открыть</button></body>'});
    if (url.pathname.startsWith('/api/gwent')) {
      requests++;
      const body = route.request().method() === 'POST' ? route.request().postDataJSON() : null;
      const result = runGwent({lobby,userId,name:`Игрок ${userId}`,people:peopleOf(),loadouts:savedDecks[userId]||{},saveLoadout:loadout=>{(savedDecks[userId]||={})[loadout.faction]=loadout;},
        mutation:!!body,body,watch:url.searchParams.get('watch'),invite:url.searchParams.get('invite')}).result;
      // The route adds the player's rating and, on request, the leaderboard; here they are fixed samples.
      if(result.ok!==false){result.rating={rating:1000,peak:1000,games:3,wins:2,losses:1,draws:0};
        if(url.searchParams.get('board'))result.leaderboard={rows:[{rank:1,userId:'2',name:'Игрок 2',rating:1100,games:5,wins:4,losses:1,draws:0,me:false},{rank:2,userId:String(userId),name:'Игрок '+userId,rating:1000,games:3,wins:2,losses:1,draws:0,me:true}],me:{rank:2,rating:1000,games:3,wins:2,losses:1,draws:0}};}
      for(const item of [...result.outgoing||[],...result.incoming||[],...result.invitation?[result.invitation]:[],...result.room?[result.room]:[]])item.url='https://t.me/test_bot/game?startapp=gwent_-100_i_'+item.id;
      if(result.notifyInvite){delete result.notifyInvite;result.notificationSent=true;}
      return route.fulfill({status:result.ok===false?409:200,json:result});
    }
    const bundle = assets.bundles.find(b => b.path === url.pathname);
    if (bundle) return route.fulfill({contentType:'text/css',body:bundle.css});
    const file = path.resolve(root, '.'+url.pathname);
    if (!file.startsWith(root+path.sep)||!fs.existsSync(file)) return route.fulfill({status:404});
    return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://gwent.local/fixture');
  await page.evaluate(async()=>{
    HTMLCanvasElement.prototype.getContext=()=>null;
    await(await import('/feature-styles.js')).ensureFeatureStyles();
    window.openGwent = async (online,entry={}) => {
      const api = online ? async(url, options) => { const r=await fetch(url,options),data=await r.json();if(!r.ok)throw new Error(data.reason);return data; } : null;
      return (await import('/gwent.js')).openGwentGame({api,...entry});
    };
    document.querySelector('#origin').focus(); await window.openGwent(false);
  });
  async function fits() {
    assert.equal(await page.locator('.gwent-panel').evaluate(n => n.scrollWidth<=n.clientWidth+1),true, 'panel overflows at '+width);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'page overflows');
    assert.deepEqual(errors,[]);
  }
  async function shot(name) { await fits(); await page.waitForTimeout(250); await page.screenshot({path:path.join(out,`${name}-${width}.png`)}); }
  return {page,errors,fits,shot,getRequests:()=>requests};
}
try {
  if(!process.argv.includes('--social-only')) {
  for (const width of [320,390,1100]) {
    const {page,shot,fits,errors}=await fixture(width);
    assert.equal(await page.locator('[data-select-faction]').count(),5);await shot('decks');
    await page.locator('[data-editor]').click();await page.locator('[data-clear-deck]').click();
    assert.equal(await page.locator('[data-save-deck]').isDisabled(),true);
    await page.locator('[data-reset-deck]').click();assert.equal(await page.locator('[data-save-deck]').isEnabled(),true);
    await page.locator('[data-leaders]').click();await shot('leaders');
    await page.locator('[data-select-leader="foltest-siegemaster"]').click();
    await page.locator('[data-search]').fill('Геральт');assert.equal(await page.locator('.gwent-builder-card').count(),1);
    assert.equal(await page.locator('.gwent-builder-card .gwent-card-name').count(),0,'printed card has no duplicated title');
    assert.equal(await page.locator('.gwent-builder-card .gwent-card-trait').count(),0,'printed abilities stay unobscured');
    assert.equal(await page.locator('.gwent-builder-card .gwent-card-power').count(),0,'base strength is already printed');
    assert.match(await page.locator('.gwent-builder-card img').getAttribute('src'),/\/printed\/neit_h5\.webp$/);
    assert.equal(await page.locator('.gwent-builder-card').evaluate(n=>getComputedStyle(n).borderTopWidth),'0px');
    assert.equal(await page.locator('.gwent-builder-card .printed').evaluate(n=>getComputedStyle(n).borderTopWidth),'0px');
    await page.locator('[data-art-card=geralt]').click();assert.equal(await page.locator('[data-select-art]').count(),2);await shot('art-picker');
    await page.locator('[data-select-art="1"]').click();assert.match(await page.locator('.gwent-builder-card img').getAttribute('src'),/neit_h5a\.webp$/);
    assert.equal(await page.locator('.gwent-builder-card').count(),1,'art is not another playable entity');
    await page.locator('[data-preview-id=geralt]').click();await shot('printed-preview');
    assert.equal(await page.locator('.gwent-card-detail h3').count(),0);
    await page.locator('[data-close-preview]').click();
    await page.locator('[data-adjust="geralt"][data-delta="-1"]').click();
    assert.equal(await page.locator('[data-adjust="geralt"][data-delta="-1"]').isDisabled(),true);
    await page.locator('[data-adjust="geralt"][data-delta="1"]').click();
    assert.equal(await page.locator('[data-adjust="geralt"][data-delta="1"]').isDisabled(),true);
    await page.locator('[data-search]').fill('');
    await page.locator('[data-filter=type]').selectOption('hero',{force:true});
    assert.ok(await page.locator('.gwent-builder-card').count()>0);await shot('editor');
    await page.locator('[data-save-deck]').click();await page.locator('[data-mode]').click();
    assert.equal(await page.locator('input[name=gwent-level]').count(),3,'three AI levels');
    if(width===320){await page.locator('input[name=gwent-level][value=hard]').check();assert.equal(await page.evaluate(()=>localStorage.getItem('gwent-ai-level')),'hard','level is remembered');}
    await shot('mode');
    await page.locator('[data-start]').click();await shot('board');
    assert.equal(await page.locator('[data-pass]').evaluate(n=>n.getBoundingClientRect().height<=34),true,'compact actions');
    assert.equal(await page.locator('[data-pile="player:deck"]').evaluate(n=>{const r=n.getBoundingClientRect();return r.width<=34&&r.height<=46&&getComputedStyle(n).borderTopWidth==='0px';}),true,'compact unframed deck');
    assert.equal(await page.locator('[data-pile="player:graveyard"]').evaluate(n=>n.getBoundingClientRect().width<=34),true,'compact discard');
    assert.match(await page.locator('[data-pile="player:graveyard"] img').getAttribute('src'),/\/discard\.svg$/);
    for(const side of ['player','ai']) {
      assert.equal(await page.locator(`[data-preview-leader=${side}]`).isVisible(),true,'both leaders are visible');
      assert.equal(await page.locator(`[data-preview-leader=${side}]`).evaluate(n=>{const r=n.getBoundingClientRect();return r.width>=60&&r.height>=110;}),true,'readable leader size');
    }
    await shot('mulligan');
    // Start of the match: keep the hand, then wait for the opponent if the coin toss gave them the first move.
    for (const id of ['done','self']) if (await page.locator(`[data-choice-id="${id}"]`).count()) {await page.locator(`[data-choice-id="${id}"]`).click();await page.waitForTimeout(300);}
    for (const id of ['done','self']) if (await page.locator(`[data-choice-id="${id}"]`).count()) {await page.locator(`[data-choice-id="${id}"]`).click();await page.waitForTimeout(300);}
    await page.waitForSelector('[data-pass]:not([disabled])',{timeout:10000});
    await page.locator('[data-preview-leader=player]').click();await shot('leader-preview');
    await page.locator('[data-close-preview]').click();
    assert.equal(await page.locator('.gwent-more summary svg').count(),1,'menu uses shared SVG');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('gwent-loadouts-v1'))['northern-realms'].arts.geralt),1,'chosen art is saved');
    if(width===1100) assert.equal(await page.locator('[data-pass]').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight),true,'desktop battlefield and actions fit the screen');
    assert.equal(await page.locator('.gwent-row').count(),6);assert.equal(await page.locator('.gwent-horn').count(),6);
    assert.match(await page.locator('[data-preview-leader=player]').getAttribute('aria-label'),/Завоеватель/);
    await page.locator('[data-game-rules]').click();await page.keyboard.press('Escape');
    // Escape dismisses only the rules tooltip; the match remains open.
    assert.equal(await page.locator('.gwent-panel').count(),1);
    const hand = page.locator(".gwent-hand [data-card-uid]");assert.ok(await hand.count()>0);await hand.first().click();
    if (await page.locator('[data-play-selected]').count()) await page.locator('[data-play-selected]').click();
    else if (await page.locator('[data-pick-row]').count()) await page.locator('[data-pick-row]').first().click();
    else if (await page.locator('[data-target-uid]').count()) await page.locator('[data-target-uid]').first().click();
    await page.waitForTimeout(800);await fits();
    if(width===320){await page.waitForTimeout(1800);assert.equal(page.workers().length,1,'the strong AI searches in a Web Worker');}
    await page.locator('[data-horn-side=player]').first().click();assert.match(await page.locator('.gwent-feedback').innerText(),/Командирский рог|Рог от способности|Удвоение от лидера/);
    await page.locator('[data-pile="player:graveyard"]').click();await page.keyboard.press('Escape');
    await page.locator('[data-dismiss]').click();await page.waitForTimeout(50);
    assert.equal(await page.locator('[inert]').count(),0);assert.equal(await page.locator('#origin').evaluate(n=>n===document.activeElement),true);
    await page.evaluate(()=>window.openGwent(false));await page.locator('[data-mode]').click();await page.locator('[data-start]').click();
    assert.match(await page.locator('[data-preview-leader=player]').getAttribute('aria-label'),/Завоеватель/);
    await page.locator('[data-dismiss]').click();
    assert.deepEqual(errors,[]);await page.close();console.log(`PASS Gwent ${width}: editor, limits, saved leader after reopening, filters, AI move, horn, rules, focus, no overflow / WebGL`);
  }
  // Extended rules: reviewed printed art, ruleset-specific badges and a match against the AI.
  for (const width of [320,1100]) {
    const {page,shot,fits,errors}=await fixture(width);
    await page.locator('input[name=gwent-ruleset][value=extended]').check();
    assert.equal(await page.locator('[data-select-faction]').count(),12,'extended offers all twelve factions');
    await page.locator('[data-select-faction=skellige]').click();await page.locator('[data-editor]').click();
    await page.locator('[data-search]').fill('Бирна');
    assert.match(await page.locator('.gwent-builder-card img').getAttribute('src'),/expansion\/extended-birna\.webp$/);
    await page.locator('.gwent-builder-card img').evaluate(n=>n.decode());
    assert.equal(await page.locator('.gwent-builder-card .gwent-card-name, .gwent-builder-card .gwent-card-power').count(),0);
    await page.locator('[data-save-deck]').click();
    await page.locator('[data-select-faction=redania]').click();assert.equal(await page.locator('[data-select-faction=redania] img').count(),1,'drawn crest');
    await shot('extended-decks');await fits();
    await page.locator('[data-editor]').click();
    await page.locator('[data-search]').fill('Засада');assert.equal(await page.locator('.gwent-builder-card').count(),1);
    await page.locator('[data-search]').fill('Диверсант');assert.equal(await page.locator('.gwent-builder-card .gwent-card[data-kit="re"]').count(),1,'one printed face for the canonical card');
    assert.match(await page.locator('.gwent-builder-card img').getAttribute('src'),/expansion\/re-saboteur\.webp$/);
    await page.locator('.gwent-builder-card img').evaluate(n=>n.decode());
    assert.equal(await page.locator('.gwent-builder-card .gwent-card-name, .gwent-builder-card .gwent-card-trait, .gwent-builder-card .gwent-card-power').count(),0);
    await page.locator('[data-search]').fill('');await shot('extended-editor');await fits();
    await page.locator('[data-save-deck]').click();await page.locator('[data-mode]').click();
    await page.locator('[data-start]').click();
    for (let i = 0; i < 2; i += 1) for (const id of ['done','self']) if (await page.locator(`[data-choice-id="${id}"]`).count()) {await page.locator(`[data-choice-id="${id}"]`).click();await page.waitForTimeout(300);}
    await page.waitForSelector('[data-pass]:not([disabled])',{timeout:10000});
    assert.equal(await page.locator('.gwent-row').count(),6);await shot('extended-board');await fits();
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS Gwent extended ${width}: ruleset switch, twelve factions, printed art, ruleset-specific badges, match against the AI`);
  }
  // A table of four against the AI: summaries of the three opponents, one opened, play to the end by passing.
  for (const width of [390,1100]) {
    const {page,shot,fits,errors}=await fixture(width);
    await page.locator('input[name=gwent-ruleset][value=extended]').check();
    await page.locator('[data-mode]').click();
    assert.equal(await page.locator('input[name=gwent-table-size]').count(),4,'two, three, four or two against two');
    await page.locator('input[name=gwent-table-size][value="4"]').check();
    await shot('table-mode');
    await page.locator('[data-start]').click();
    for (let i = 0; i < 40 && !(await page.locator('.gwent-opponent, .gwent-side.ai').count()); i += 1) {
      const choice = page.locator('[data-choice-id="done"]');if (await choice.count()) await choice.click();await page.waitForTimeout(400);
    }
    for (let i = 0; i < 30 && await page.locator('[data-pass]:not([disabled])').count() === 0; i += 1) {
      const choice = page.locator('[data-choice-id="done"]');if (await choice.count()) await choice.click();await page.waitForTimeout(500);
    }
    assert.equal(await page.locator('.gwent-opponent').count(),2,'two opponents collapsed, one opened');
    assert.equal(await page.locator('.gwent-side:not(.player)').count(),1);
    await shot('table-board');await fits();
    await page.locator('.gwent-opponent').first().click();
    assert.equal(await page.locator('.gwent-side:not(.player)').count(),1,'one opponent open at a time');
    assert.equal(await page.locator('.gwent-opponent').count(),2,'the one opened before is a summary now');
    for (let i = 0; i < 400 && !(await page.locator('.gwent-table-result').count()); i += 1) {
      const pending = page.locator('[data-choice-id]');
      if (await pending.count()) await pending.first().click();
      else { const pass = page.locator('[data-pass]:not([disabled])'); if (await pass.count()) await pass.click(); }
      await page.waitForTimeout(500);
    }
    assert.equal(await page.locator('.gwent-table-result').count(),1,'the result popup shows the points of every seat');
    assert.equal(await page.locator('.gwent-table-result .gwent-result-row').count(),5,'head, three rounds, total');
    await shot('table-result');await fits();
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS Gwent table ${width}: four seats, summaries of opponents, three rounds scored by place, result table`);
  }
  // Two against two with the AI: the teammate is shown with a hand, the status counts the teams, the result lists the team sums.
  for (const width of [390,1100]) {
    const {page,shot,fits,errors}=await fixture(width);
    await page.locator('input[name=gwent-ruleset][value=extended]').check();
    await page.locator('[data-mode]').click();
    await page.locator('input[name=gwent-table-size][value="teams"]').check();
    await page.locator('[data-start]').click();
    for (let i = 0; i < 40 && await page.locator('[data-pass]:not([disabled])').count() === 0; i += 1) {
      const choice = page.locator('[data-choice-id="done"]');if (await choice.count()) await choice.click();await page.waitForTimeout(500);
    }
    assert.match(await page.locator('.gwent-status').innerText(),/Счёт команд/,'the status counts the teams');
    assert.equal(await page.locator('.gwent-opponent, .gwent-side:not(.player)').count(),3,'teammate and two opponents');
    const ally=page.locator('.gwent-opponent',{hasText:'Союзник'});await ally.click();
    assert.ok(await page.locator('.gwent-ally-hand .gwent-card, .gwent-ally-hand [data-card-id], .gwent-ally-hand > *').count()>0,'the teammate hand is shown');
    await shot('teams-board');await fits();
    for (let i = 0; i < 600 && !(await page.locator('[aria-label="Счёт команд по раундам"]').count()); i += 1) {
      const pending = page.locator('[data-choice-id]');
      if (await pending.count()) await pending.first().click();
      else { const pass = page.locator('[data-pass]:not([disabled])'); if (await pass.count()) await pass.click(); }
      await page.waitForTimeout(400);
    }
    assert.equal(await page.locator('[aria-label="Счёт команд по раундам"]').count(),1,'the result lists the team sums');
    await shot('teams-result');await fits();
    assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS Gwent teams ${width}: two against two, teammate hand, team sums, result`);
  }
  const a=await fixture(390,1), b=await fixture(1100,2);
  // Both online players keep their hands; the server then fixes the first player by coin toss or Scoia'tael choice.
  var settle=async items=>{const match=()=>chat.game.gwent.matches.at(-1).state;
    for(let i=0;i<60&&(match().pending||match().setup);i+=1){
      for(const item of items)for(const id of ['done','self']){const choice=item.page.locator(`[data-choice-id="${id}"]`);if(await choice.count())await choice.first().click().catch(()=>{});}
      await items[0].page.waitForTimeout(500);}
    assert.equal(match().setup,null,'match setup finished');};
  for (const item of [a,b]) {
    await item.page.locator('[data-dismiss]').click();await item.page.evaluate(()=>window.openGwent(true));
    await item.page.locator('[data-mode]').click();await item.page.locator('input[value=online]').check();await item.page.locator('[data-start]').click();
    if(item===a){await a.shot('search');await a.page.locator('[data-cancel-search]').click();assert.equal(chat.game.gwent.queue.length,0);await a.page.locator('[data-start]').click();}
  }
  await a.page.locator('.gwent-row').first().waitFor({timeout:10000});
  await b.page.locator('.gwent-row').first().waitFor();await a.shot('online');await b.shot('online');
  assert.equal(chat.game.gwent.matches.length,1);
  await settle([a,b]);
  const [first,second]=chat.game.gwent.matches.at(-1).state.turn==='player'?[a,b]:[b,a];
  await first.page.waitForFunction(()=>!document.querySelector('[data-pass]')?.disabled,{},{timeout:10000});
  await first.page.locator('[data-pass]').click();await second.page.locator('[data-pass]').waitFor({state:'visible'});
  await second.page.waitForFunction(()=>!document.querySelector('[data-pass]')?.disabled,{},{timeout:10000});
  await second.page.locator('[data-pass]').click();
  await a.page.waitForFunction(()=>document.querySelector('.gwent-status')?.textContent.includes('Раунд 2'),{},{timeout:10000});
  await a.page.locator('.gwent-more summary').click();await a.page.locator('[data-end-match]').click();
  await a.page.locator('[data-finish]').waitFor();await b.page.locator('[data-finish]').waitFor({timeout:10000});
  // Rematch: one offers, the other sees the offer and accepts, a new match with the same decks starts.
  // The result popup opens by itself: winner, points per round, and the rematch button.
  for(const item of [a,b]){await item.page.locator('.gwent-result-view').waitFor();assert.ok((await item.page.locator('.gwent-result-winner').innerText()).length>3);
    assert.ok(await item.page.locator('.gwent-result-head').count()===1);await item.fits();}
  await a.shot('summary');
  await a.page.locator('[data-rematch]').click();
  await b.page.waitForFunction(()=>/Принять реванш/.test(document.querySelector('[data-rematch]')?.textContent||''),{},{timeout:10000});
  assert.match(await a.page.locator('[data-rematch]').innerText(),/Ждём ответ/);await a.shot('rematch-wait');await b.shot('rematch-offer');
  assert.equal(await b.page.locator('[data-rematch-decline]').count(),1,'the offer popup can be declined');
  await b.page.locator('[data-rematch]').click();
  await a.page.waitForFunction(()=>document.querySelector('.gwent-status')?.textContent.includes('Раунд 1')&&!document.querySelector('[data-finish]'),{},{timeout:10000});
  assert.equal(chat.game.gwent.matches.length,2,'rematch created a second match');
  await settle([a,b]);await a.page.waitForTimeout(3000); // the next poll brings the latest revision
  await a.page.locator('.gwent-more summary').click();await a.page.locator('[data-end-match]').click();
  await a.page.locator('[data-finish]').waitFor();await b.page.locator('[data-finish]').waitFor({timeout:10000});
  for(const item of [a,b]){await item.fits();await item.page.locator('[data-finish]').click();await item.page.locator('[data-dismiss]').click();await item.page.close();}
  console.log('PASS online: two authenticated views, real pairing, synchronized turns, round, surrender and dismissal');

  }
  for (const width of [320,1100]) {
    const host=await fixture(width,1),guest=await fixture(390,2),viewer=await fixture(width,3);
    for(const item of [host,guest,viewer]) {await item.page.locator('[data-dismiss]').click();await item.page.evaluate(()=>window.openGwent(true));await item.page.locator('[data-mode]').click();}
    await host.page.locator('[data-friends]').click();
    assert.equal(await host.page.locator('[data-invite-nick]').count(),1,'invite by nickname is offered');
    await host.page.locator('[data-invite-friend="2"]').click();
    await host.page.locator('[data-copy-invite]').waitFor();
    assert.equal(await host.page.locator('[data-copy-invite]').count(),1);
    await host.page.locator('[data-push-invite]').click();
    await host.page.waitForFunction(()=>document.querySelector('.gwent-feedback')?.textContent.includes('Уведомление отправлено'));
    await host.shot('friends');
    if(width===1100){
      const token=chat.game.gwent.invites.at(-1).id;
      await guest.page.locator('[data-dismiss]').click();await guest.page.evaluate(token=>window.openGwent(true,{initialInvite:token}),token);
      await guest.page.locator('[data-open-decks]').click();await guest.page.locator('[data-select-faction=nilfgaard]').click();await guest.page.locator('[data-mode]').click();
      assert.equal(await guest.page.locator('[data-accept-invite]').count(),1,'invitation survives changing deck');
    } else await guest.page.locator('[data-friends]').click();
    await guest.page.locator('[data-accept-invite]').click();
    await host.page.locator('.gwent-row').first().waitFor({timeout:10000});
    await viewer.page.locator('input[value=online]').check();
    assert.match(await viewer.page.locator('.gwent-rating-line').first().innerText(),/1000/,'the rating is shown');
    await viewer.page.locator('[data-board]').click();await viewer.page.locator('.gwent-board-row').nth(2).waitFor();
    assert.equal(await viewer.page.locator('.gwent-board-row[data-me="true"]').count(),1,'the player is marked in the table');
    await viewer.shot('leaderboard');await viewer.fits();await viewer.page.locator('[data-back]').click();
    await viewer.page.locator('[data-games]').click();await viewer.shot('games');
    assert.ok(await viewer.page.locator('[data-watch]').count()>=2,'finished games stay listed');await viewer.page.locator('[data-watch]').first().click();await viewer.shot('spectator');
    assert.equal(await viewer.page.locator('.gwent-hand').count(),0);
    assert.equal(await viewer.page.locator('[data-pass],[data-leader],[data-choice-id]').count(),0);
    if(width===320){
      await viewer.page.evaluate(()=>{window.gwentHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.gwentHidden});document.dispatchEvent(new Event('visibilitychange'));});
      const paused=viewer.getRequests();await viewer.page.waitForTimeout(4300);assert.equal(viewer.getRequests(),paused,'hidden spectator stops polling');
      await viewer.page.evaluate(()=>{window.gwentHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
    }
    await settle([host,guest]);
    const current=chat.game.gwent.matches.at(-1),turn=current.state.turn==='player'?host:guest;
    await turn.page.waitForFunction(()=>!document.querySelector('[data-pass]')?.disabled,{},{timeout:10000});
    await turn.page.locator('[data-pass]').click();
    await viewer.page.waitForFunction(()=>document.querySelector('.gwent-side-head')?.textContent.includes('Пас')||document.querySelector('.gwent-side.player .gwent-side-head')?.textContent.includes('Пас'),{},{timeout:10000});
    await viewer.page.locator('[data-leave-watch]').click();
    assert.equal(current.state.phase,'playing','leaving spectator does not surrender');
    await host.page.waitForFunction(()=>/Пас/.test(document.querySelector(".gwent-panel")?.innerText||"")&&!document.querySelector("[data-pass]")?.disabled||document.querySelector("[data-pass]")?.disabled,{},{timeout:10000});await host.page.waitForTimeout(3000);
    await host.page.locator('.gwent-more summary').click();await host.page.locator('[data-end-match]').click();
    await guest.page.locator('[data-finish]').waitFor({timeout:10000});
    for(const item of [host,guest])await item.page.locator('[data-finish]').click();
    for(const item of [host,guest,viewer]) {await item.fits();await item.page.locator('[data-dismiss]').click();await item.page.close();}
    console.log(`PASS invitations and live spectator ${width}: targeted friend, link, mock push, accept, hidden hands, synchronized pass, safe exit`);
  }
  // An online table: the host opens a room under the extended rules, a guest joins by the link, the host starts with the AI in the empty seats.
  for (const width of [390,1100]) {
    const host=await fixture(width,1),guest=await fixture(390,2);
    await host.page.locator('[data-dismiss]').click();await host.page.evaluate(()=>window.openGwent(true));await host.page.waitForTimeout(700);await host.page.locator('input[name=gwent-ruleset][value=extended]').check();await host.page.locator('[data-mode]').click();
    await host.page.locator('[data-friends]').click();
    const teamsRoom=width===1100;
    await host.page.locator(`[data-create-table="${teamsRoom?'teams':'3'}"]`).click();
    await host.page.locator('.gwent-room').waitFor();
    assert.equal(await host.page.locator('[data-start-table]').isDisabled(),true,'a table needs a second person');
    await host.shot('table-room');
    const token=chat.game.gwent.invites.at(-1).id;
    await guest.page.locator('[data-dismiss]').click();await guest.page.evaluate(token=>window.openGwent(true,{initialInvite:token}),token);
    await guest.page.locator('[data-accept-invite]').click();
    await guest.page.locator('[data-leave-table]').waitFor();await guest.shot('table-guest');
    await host.page.waitForFunction(()=>!document.querySelector('[data-start-table]')?.disabled,{},{timeout:10000});
    await host.page.locator('[data-start-table]').click();
    await host.page.locator('.gwent-opponent').first().waitFor({timeout:10000});
    await guest.page.locator('.gwent-opponent').first().waitFor({timeout:10000});
    for(const item of [host,guest])assert.equal(await item.page.locator('.gwent-opponent, .gwent-side.ai').count(),teamsRoom?3:2,'the other seats of the table, one of them opened');
    if(teamsRoom)assert.match(await host.page.locator('.gwent-status').innerText(),/Счёт команд/,'online teams show the team score');
    await settle([host,guest]);
    await host.page.waitForTimeout(500);await host.shot('table-online');await guest.shot('table-online');
    const names=await host.page.locator('.gwent-panel').innerText();
    assert.ok(names.includes('Игрок 2'),'the guest is named at the host table');
    assert.ok(names.includes('Бот 1'),'the empty seat is played by the AI');
    for(const item of [host,guest]){await item.page.locator('.gwent-more summary').click();await item.page.locator('[data-end-match]').click();await item.page.waitForTimeout(500);}
    for(const item of [host,guest]){await item.fits();await item.page.close();}
    console.log(`PASS online table ${width}: room, link, join, start with the AI, seats seen from each player, leaving`);
  }
} finally {await browser.close();}
