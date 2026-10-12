import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {getShopState, buyShopItem} from '../miniapp/shop.js';
import {starsHtml} from '../webapp/exchange.js';
import {itemIconHtml} from '../webapp/shop.js';

const player = (gold, luckCoins) => ({game:{inventory:{gold,luckCoins,crystals:12},shopTimers:{}}});

test('adena is an ordinary CoL-priced shop product, independent of adena balance', async () => {
  const session = player(0,2);
  const offer = getShopState(session).items.find(item=>item.command==='adena-col');
  assert.equal(offer.currency,'luckCoins');
  assert.equal(offer.canAfford,true);
  assert.match(itemIconHtml(offer),/\.webp/);
  for(let i=0;i<2;i++) assert.equal((await buyShopItem(session,'adena-col')).ok,true);
  assert.equal(session.game.inventory.gold,30000);
  assert.equal(session.game.inventory.luckCoins,0);
  assert.equal(session.game.inventory.crystals,12);
  assert.equal(getShopState(session).items.find(item=>item.command==='adena-col').available,false);
  const before=JSON.stringify(session);
  assert.equal((await buyShopItem(session,'adena-col')).reason,'not_enough_coins');
  assert.equal(JSON.stringify(session),before);
});

test('unsafe adena balances refuse conversion without spending CoL',async()=>{
  const session=player(Number.MAX_SAFE_INTEGER,1);
  const before=JSON.stringify(session);
  assert.equal((await buyShopItem(session,'adena-col')).reason,'balance_limit');
  assert.equal(JSON.stringify(session),before);
});

test('top-up packs use coin raster art and explain CoL, without crystal exchange',()=>{
  const html=starsHtml({firstPurchase:true,shield:{amount:10,until:Date.now()},packs:[{id:'pouch',title:'<Coins>',coins:25,stars:25,firstBonus:25}]});
  assert.match(html,/currency\/coin-of-luck-128.webp/);
  assert.match(html,/Выберите пакет/);
  assert.match(html,/&lt;Coins&gt;/);
  assert.doesNotMatch(html,/Кристалл|кристалл|stars\/|data-exchange-buy|data-luck-shop|<svg/);
});

test('every top-up pack has unique lightweight raster art in the repository',()=>{
  const ids=['pouch','sack','casket','chest','trove','vault'];
  const packs=ids.map(id=>({id,title:id,coins:25,stars:25}));
  const html=starsHtml({packs});
  let bytes=0;
  for(const id of ids) {
    assert.ok(html.includes(`/art/col-topup/${id}-128.webp`));
    for(const size of [128,256]) bytes+=fs.statSync(new URL(`../webapp/art/col-topup/${id}-${size}.webp`,import.meta.url)).size;
  }
  assert.ok(bytes<250000,'the complete responsive pack art stays below 250 KB');
});
