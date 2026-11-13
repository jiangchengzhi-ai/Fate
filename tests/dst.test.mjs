import assert from 'node:assert/strict';
import { inChinaDST, chinaDSTSpan } from '../server/dst-cn.mjs';
import { paipan } from '../server/tools.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('夏令时边界：1986-05-04 起、09-14 止', () => {
  assert.equal(inChinaDST(1986, 5, 3), false);
  assert.equal(inChinaDST(1986, 5, 4), true);
  assert.equal(inChinaDST(1986, 9, 14), true);
  assert.equal(inChinaDST(1986, 9, 15), false);
});

ok('1991 是最后一年，1992 没有夏令时', () => {
  assert.equal(inChinaDST(1991, 7, 1), true);
  assert.equal(inChinaDST(1992, 7, 1), false);
  assert.equal(chinaDSTSpan(1992), null);
});

ok('夏令时出生：12:00 → 减 60 分钟 → 再按经度校正', () => {
  const r = paipan({ date: '1988-06-01', hour: '午', clock: '12:00', city: '北京' });
  assert.equal(r.resolved.inputClock, '12:00');
  assert.equal(r.resolved.baseClock, '11:00');
  assert.equal(r.resolved.dstApplied, true);
  assert.ok(r.notes.includes('china_dst_applied'));
  assert.equal(r.resolved.correctedClock, '10:48');
});

ok('非夏令时年份不扣 60 分钟', () => {
  const r = paipan({ date: '1992-06-01', hour: '午', clock: '12:00', city: '北京' });
  assert.equal(r.resolved.baseClock, '12:00');
  assert.equal(r.resolved.dstApplied, false);
  assert.ok(!r.notes.includes('china_dst_applied'));
});

ok('手填经度与城市经度等效', () => {
  const a = paipan({ date: '1994-08-12', hour: '未', longitude: 87.62 });
  const b = paipan({ date: '1994-08-12', hour: '未', city: '乌鲁木齐' });
  assert.equal(a.resolved.correctedClock, b.resolved.correctedClock);
  assert.equal(a.resolved.correctionMinutes, b.resolved.correctionMinutes);
});

console.log(`\n${pass} passed`);
