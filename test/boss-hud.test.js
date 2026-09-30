import test from 'node:test';
import assert from 'node:assert/strict';
import { bar, damageMeter, hotbar, partyStrip, playerFrame, rewardsPanel, statusIcons, targetFrame } from '../webapp/boss-hud.js';
import { bossStatusesDto, playerEffectsDto } from '../miniapp/bossEffects.js';

const boss = { name: 'kivaha', nameCall: 'Киваху', level: 12, hp: 1000, currentHp: 250, aliveTime: Date.now() + 60000, remainMs: 60000, statuses: [{ id: 'reflect', label: 'Зеркало' }] };

test('bars clamp and label their values', () => {
  assert.match(bar('hp', 250, 1000), /width:25%/);
  assert.match(bar('hp', 5000, 1000), /width:100%/);
  assert.match(bar('mp', 0, 0), /width:0%/);
  assert.match(bar('hp', 250, 1000), /250 \/ 1\s000/);
});

test('target frame shows the boss portrait, HP, timer and statuses, and toggles rewards', () => {
  const html = targetFrame(boss);
  assert.match(html, /data-boss-rewards-toggle/);
  assert.match(html, /\/art\/bosses\/kivaha\.webp/);
  assert.match(html, /mmo-bar hp/);
  assert.match(html, /mmo-bar time/);
  assert.match(html, /🪞/);
  assert.match(rewardsPanel({ gold: { min: 1, max: 2 } }), /data-boss-rewards hidden/);
});

test('player frame shows class portrait, HP/MP/CP and effects with counts', () => {
  const html = playerFrame({ name: 'A<b>', level: 3, className: 'mage', gender: 'female', hp: 1, maxHp: 2, mp: 1, maxMp: 2, cp: 1, maxCp: 2, effects: [{ id: 'damageUp', label: 'x', count: 4 }] });
  assert.match(html, /mage-female\.webp/);
  assert.match(html, /mmo-bar cp/);
  assert.match(html, /<em>4<\/em>/);
  assert.ok(!html.includes('<b>A<b>'), 'names are escaped');
});

test('party, meter and hotbar render every participant and skill', () => {
  const rows = [
    { name: 'A', damage: 300, share: 75, className: 'warrior', gender: 'male', hpPercent: 40, isYou: false },
    { name: 'B', damage: 100, share: 25, className: 'priest', gender: 'female', hpPercent: null, isYou: true },
  ];
  assert.equal((partyStrip(rows).match(/mmo-party-member/g) || []).length, 2);
  assert.match(partyStrip(rows), /--hp:40/);
  assert.match(damageMeter(rows), /--fill:100%/);
  assert.match(damageMeter(rows), /--fill:33\.3/);
  assert.equal(partyStrip([]), '');
  const html = hotbar([{ index: 0, name: 'S', description: '', isDamage: true, costMp: 5, canUse: true, cooldownMs: 0 }]);
  assert.match(html, /data-skill="0"/);
  assert.match(html, /data-skill-cooldown/);
  assert.match(statusIcons([]), /empty/);
});

test('server maps player effects and the boss skill to status icons', () => {
  const effects = playerEffectsDto([{ name: 'addDamageToBoss', amount: 75, count: 5 }, { name: 'shield', value: 300, time: 0 }], 1000);
  assert.deepEqual(effects.map(e => e.id), ['dead', 'damageUp', 'shield']);
  assert.equal(effects[1].count, 5);
  assert.deepEqual(bossStatusesDto({ skill: { effect: 'reflect', name: 'Зеркало', description: 'd' } }), [{ id: 'reflect', label: 'Зеркало', description: 'd' }]);
  assert.deepEqual(bossStatusesDto({ skill: {} }), []);
});

test('potion bar lists usable potions with power and count, or a hint when empty', async () => {
  const { potionBar } = await import('../webapp/boss-hud.js');
  const html = potionBar([{ key: '0', type: 'hp', bottleType: 'potion', count: 3, power: 1000, name: 'Крохотное зелье ХП' }, { key: '2', type: 'mp', bottleType: 'elixir', count: 1, power: 20, name: 'Эликсир' }]);
  assert.match(html, /data-boss-potion="0"[\s\S]*HP \+1\s000[\s\S]*×3/);
  assert.match(html, /MP \+20%/);
  assert.match(potionBar([], {}), /Зелий нет/);
  assert.match(potionBar([{ key: '0', type: 'hp', count: 1, power: 5 }], { disabled: true }), /disabled/);
});

test('boss card shows summons towards the next level', async () => {
  const { summonsProgress } = await import('../webapp/boss-hud.js');
  assert.match(summonsProgress({ current: 2, need: 5 }, 12), /До ур\. 13[\s\S]*--p:40%[\s\S]*2 \/ 5 призывов/);
  assert.equal(summonsProgress({ current: 0, need: 0 }, 1), '');
});
