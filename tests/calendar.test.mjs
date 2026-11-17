import assert from 'node:assert/strict';
import { paipan } from '../server/tools.mjs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Solar } = require('../vendor/lunar-javascript.cjs');

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

const pillars = (r) => r.pillars.map((p) => p.gan + p.zhi).join(' ');

ok('日柱锚点：2000-01-01 戊午', () => {
  assert.equal(pillars(paipan({ date: '2000-01-01', hour: '午', clock: '12:00' })), '己卯 丙子 戊午 戊午');
});

ok('已知盘：1994-08-12 13:41 庚午日', () => {
  assert.equal(pillars(paipan({ date: '1994-08-12', hour: '未', clock: '13:41' })), '甲戌 壬申 庚午 癸未');
});

ok('节气边界：1965-06-06 06:00 仍属巳月，06:05 进午月', () => {
  assert.equal(pillars(paipan({ date: '1965-06-06', hour: '卯', clock: '06:00' })), '乙巳 辛巳 辛卯 辛卯');
  assert.equal(pillars(paipan({ date: '1965-06-06', hour: '卯', clock: '06:05' })), '乙巳 壬午 辛卯 辛卯');
});

ok('23:00 换日：晚子时用次日日柱', () => {
  const r = paipan({ date: '2024-02-10', hour: '子', clock: '23:30' });
  assert.equal(r.pillars[2].gan + r.pillars[2].zhi, '乙巳');
  assert.equal(r.pillars[3].gan + r.pillars[3].zhi, '丙子');
});

ok('抽样 60 天与 lunar-javascript 完全一致', () => {
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.UTC(1970, 0, 1) + i * 397 * 86400000);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const dd = d.getUTCDate();
    const date = `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    const ours = pillars(paipan({ date, hour: '午', clock: '12:00' }));
    const ec = Solar.fromYmdHms(y, m, dd, 12, 0, 0).getLunar().getEightChar();
    ec.setSect(1);
    const ref = [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()].join(' ');
    assert.equal(ours, ref, date);
  }
});

console.log(`\n${pass} passed`);
