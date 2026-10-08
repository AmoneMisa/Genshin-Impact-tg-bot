import test from 'node:test';
import assert from 'node:assert/strict';
import shopTemplate from '../template/shopTemplate.js';
import { itemIconHtml, ITEM_ICONS } from '../webapp/shop.js';

test('every shop item gets an emblem or its painting', () => {
  for (const item of shopTemplate) {
    const html = itemIconHtml(item);
    if (item.command.startsWith('palace') && item.command !== 'palaceChangeName') assert.match(html, /shop-icon art[^>]*\/art\/builds\/palace\//, item.command);
    else if (item.potionId) assert.match(html, /inv-flask|inv-potion-art/, item.command);
    else assert.ok(ITEM_ICONS[item.command], `${item.command} has an icon`);
  }
  assert.match(itemIconHtml({ command: 'potionMp180', category: 'player' }), /shop-icon mp/);
  assert.match(itemIconHtml({ command: 'potionHp1000', category: 'player' }), /shop-icon hp/);
});
