import assert from 'node:assert/strict';
import { paipan, zeri, xiaoliuren, bazhai } from '../server/tools.mjs';

let pass = 0;
const check = (name, fn) => {
  try { fn(); pass++; console.log('ok  ', name); }
  catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; }
};

check('2000-01-01 为戊午日', () => {
  const p = paipan({ date: '2000-01-01', hour: '子' });
  assert.equal(p.pillars[2].gan + p.pillars[2].zhi, '戊午');
});

check('1994-08-12 未时 → 甲戌 壬申 丙午 乙未', () => {
  const p = paipan({ date: '1994-08-12', hour: '未' });
  assert.equal(p.pillars.map((x) => x.gan + x.zhi).join(' '), '甲戌 壬申 丙午 乙未');
  assert.equal(p.dayMaster, '丙');
});

check('阳年女逆行，首运辛未', () => {
  const p = paipan({ date: '1994-08-12', hour: '未', gender: 'female' });
  assert.equal(p.luck.forward, false);
  assert.equal(p.luck.cycles[0].gan + p.luck.cycles[0].zhi, '辛未');
  assert.ok(p.luck.startAge.years >= 1 && p.luck.startAge.years <= 2, `起运 ${JSON.stringify(p.luck.startAge)}`);
});

check('阳年男顺行，首运癸酉', () => {
  const p = paipan({ date: '1994-08-12', hour: '未', gender: 'male' });
  assert.equal(p.luck.forward, true);
  assert.equal(p.luck.cycles[0].gan + p.luck.cycles[0].zhi, '癸酉');
});

check('流年干支与所在大运自洽', () => {
  const p = paipan({ date: '1994-08-12', hour: '未', gender: 'female' });
  const ln = p.luck.liunian;
  assert.equal(ln.ganZhi.length, 2);
  assert.ok(p.luck.cycles.some((c) => `${c.gan}${c.zhi}` === ln.cycle));
  assert.ok(ln.age === ln.year - 1994 || ln.age === ln.year - 1994 - 1);
});

check('立春前算上一年', () => {
  const p = paipan({ date: '1994-02-01', hour: '午' });
  assert.equal(p.pillars[0].gan + p.pillars[0].zhi, '癸酉');
});

check('2026-10-30 为己亥日、戌月除日', () => {
  const z = zeri({ date: '2026-10-30' });
  assert.equal(z.ganzhi, '己亥');
  assert.equal(z.monthZhi, '戌');
  assert.equal(z.jianchu.name, '除');
  assert.equal(z.chong, '巳');
});

check('小六壬 9月10日第6时 → 小吉', () => {
  assert.equal(xiaoliuren({ month: 9, day: 10, hourIndex: 6 }).gua.name, '小吉');
});

check('八宅 170° / 1994 女 / 门巽 → 坎宅 离命', () => {
  const r = bazhai({ heading: 170, birthYear: 1994, gender: 'female', door: '巽' });
  assert.equal(r.meta.houseGua, '坎');
  assert.equal(r.meta.mGua, '离');
  assert.equal(r.table.length, 8);
});

console.log(`\n${pass} passed`);
