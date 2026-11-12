import assert from 'node:assert/strict';
import { lunarToSolar, solarToLunar } from '../server/lunar.mjs';
import { paipan } from '../server/tools.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('农历 1994-7-6 → 公历 1994-08-12', () => {
  assert.equal(lunarToSolar(1994, 7, 6).date, '1994-08-12');
});

ok('农历 2023 闰 2-1 → 公历 2023-03-22', () => {
  assert.equal(lunarToSolar(2023, 2, 1, true).date, '2023-03-22');
});

ok('公历 2024-02-10 → 农历正月初一', () => {
  const l = solarToLunar(2024, 2, 10);
  assert.equal(l.month, 1);
  assert.equal(l.day, 1);
  assert.equal(l.leap, false);
});

ok('农历与公历排盘结果一致', () => {
  const a = paipan({ calendar: 'lunar', lunar: { year: 1994, month: 7, day: 6 }, hour: '未', city: '北京' });
  const b = paipan({ date: '1994-08-12', hour: '未', city: '北京' });
  assert.deepEqual(a.pillars.map((p) => p.gan + p.zhi), b.pillars.map((p) => p.gan + p.zhi));
  assert.ok(a.notes.includes('lunar_converted'));
});

ok('闰月标记会传到 resolved', () => {
  const r = paipan({ calendar: 'lunar', lunar: { year: 2023, month: 2, day: 1, leap: true }, hour: '午' });
  assert.equal(r.resolved.lunar.leap, true);
  assert.equal(r.resolved.adjustedDate, '2023-03-22');
});

ok('越界农历年份报错', () => {
  assert.throws(() => lunarToSolar(1899, 1, 1));
});

console.log(`\n${pass} passed`);
