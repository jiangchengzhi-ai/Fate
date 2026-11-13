import assert from 'node:assert/strict';
import { patternOf } from '../server/bazi.mjs';
import { daily, hepan, paipan } from '../server/tools.mjs';
import { CITIES } from '../server/cities.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('透干优先：丙日申月，壬透为七杀格，庚透为偏财格', () => {
  assert.equal(patternOf('丙', '申', ['甲', '壬', '乙']).name, '七杀格');
  assert.equal(patternOf('丙', '申', ['甲', '庚', '乙']).name, '偏财格');
  assert.equal(patternOf('丙', '申', ['甲', '乙', '乙']).name, '偏财格'); // 都不透，取本气
});

ok('城市表 ≥ 90', () => {
  assert.ok(CITIES.length >= 90);
});

ok('流日：7 天、日期递增、能量在范围內', () => {
  const d = daily({ birth: { date: '1994-08-12', hour: '未' }, days: 7, from: '2026-11-13' });
  assert.equal(d.days.length, 7);
  assert.equal(d.days[0].date, '2026-11-13');
  assert.equal(d.days[6].date, '2026-11-19');
  for (const x of d.days) {
    assert.ok(x.energy >= 20 && x.energy <= 95);
    assert.ok(x.ganzhi.length === 2);
    assert.ok(Array.isArray(x.do));
  }
});

ok('合盘：分数与关系结构', () => {
  const h = hepan({
    a: { date: '1994-08-12', hour: '未', gender: 'male' },
    b: { date: '1995-03-05', hour: '申', gender: 'female' },
  });
  assert.ok(h.overall >= 20 && h.overall <= 96);
  assert.ok(Array.isArray(h.relations));
  assert.ok(h.a.pillars.length === 4 && h.b.pillars.length === 4);
});

ok('合盘不改变单个排盘结果', () => {
  const a = paipan({ date: '1994-08-12', hour: '未' });
  const h = hepan({ a: { date: '1994-08-12', hour: '未' }, b: { date: '1995-03-05', hour: '申' } });
  assert.deepEqual(a.pillars.map((p) => p.gan + p.zhi), h.a.pillars.map((p) => p.gan + p.zhi));
});

console.log(`\n${pass} passed`);
