import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { materialIcon, materialIconInfo } from '../webapp/material-icons.js';
import materials from '../template/materialsTemplate.js';

test('enchant and crafting materials map onto paintings, unknown items use a painted fallback', () => {
  assert.deepEqual(materialIconInfo('scroll_D'), { icon: 'scroll', grade: 'D' });
  assert.deepEqual(materialIconInfo('blessed_S84'), { icon: 'scroll-blessed', grade: 'S84' });
  assert.deepEqual(materialIconInfo('crystal_S80'), { icon: 'crystal', grade: 'S80' });
  assert.deepEqual(materialIconInfo('craft_leather_noGrade'), { icon: 'leather', grade: 'noGrade' });
  assert.deepEqual(materialIconInfo('blessed_weapon_A'), { icon: 'scroll-blessed', grade: 'A' });
  assert.deepEqual(materialIconInfo('safe_armor_S80'), { icon: 'scroll-safe', grade: 'S80' });
  assert.equal(materialIconInfo('safe_shield_A'), null);
  assert.equal(materialIconInfo('skill_scroll'), null);
  assert.equal(materialIconInfo('essence_baium'), null);
  assert.equal(materialIconInfo('scroll_X'), null);
  assert.match(materialIcon('skill_scroll', '📜'), /<img/);
  assert.doesNotMatch(materialIcon('skill_scroll', '📜'), /📜|svg/);
  assert.match(materialIcon('scroll_A'), /src="\/art\/l2\/icon-etc_scroll_of_enchant_weapon_i04-128\.webp"/);
  assert.doesNotMatch(materialIcon('scroll_A'), /grade-tint|hue-rotate/);
});

test('every enchant / crafting material has a painted icon in both sizes', () => {
  for (const material of materials) {
    const info = materialIconInfo(material.key);
    if (!/^(scroll|blessed|safe|crystal|craft)_/.test(material.key)) continue;
    assert.ok(info, material.key);
    for (const size of [128, 256]) assert.ok(fs.existsSync(`webapp/art/icons/${info.icon}-${size}.webp`), `${info.icon}-${size}`);
  }
});
