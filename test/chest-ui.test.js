import test from 'node:test';
import assert from 'node:assert/strict';
import { counterText, possibleRewardsHtml, rewardText, rewardTilesHtml, summaryHtml, summaryRows, POSSIBLE_REWARDS, PRIZE_ICONS } from '../webapp/chest.js';

test('chest reward text signs amounts and names the special prizes', () => {
  assert.equal(rewardText({ type: 'gold', amount: 12000 }).replace(/\s/g, ' '), '+12 000');
  assert.equal(rewardText({ type: 'brokenSword', amount: -3 }), '-3');
  assert.equal(rewardText({ type: 'nothing' }), 'Пусто');
  assert.equal(rewardText({ type: 'immuneToUpSword' }), 'Иммунитет');
});

test('counter prompts the pick and explains the daily reset', () => {
  assert.match(counterText({ available: true, selectionsLeft: 2 }), /Выбери сундук.*осталось 2/);
  assert.match(counterText({ available: false, selectionsLeft: 0 }), /дневного сброса/);
});

test('possible rewards row lists every non-empty prize with an icon', () => {
  const html = possibleRewardsHtml();
  for (const item of POSSIBLE_REWARDS) assert.ok(html.includes(PRIZE_ICONS[item.type]), item.type);
  assert.doesNotMatch(html, /nothing/);
});

test('summary adds same-type prizes together and counts them', () => {
  const prizes = [{ type: 'gold', label: 'золота', amount: 12000 }, { type: 'crystals', label: 'кристаллов', amount: 50 }, { type: 'gold', label: 'золота', amount: 8000 }];
  assert.deepEqual(summaryRows(prizes).map(r => [r.type, r.amount, r.count]), [['gold', 20000, 2], ['crystals', 50, 1]]);
  const html = summaryHtml(prizes);
  assert.match(html, /Все сундуки открыты/);
  assert.match(html, /×2/);
  assert.match(html, /data-chest-close/);
  assert.match(summaryHtml([]), /Сегодня награды уже получены/);
});

test('reward tiles escape labels and mark empty chests', () => {
  const html = rewardTilesHtml([{ type: 'nothing', label: '<i>ничего</i>' }]);
  assert.match(html, /chest-prize-tile empty/);
  assert.match(html, /&lt;i&gt;ничего/);
});
