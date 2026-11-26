import assert from 'node:assert/strict';
import { paipan, zeri, xiaoliuren, bazhai, hepan } from '../server/tools.mjs';

let pass = 0;
const check = (name, fn) => {
  try { fn(); pass++; console.log('ok  ', name); }
  catch (e) { console.error('FAIL', name, '\n    ', e.message); process.exitCode = 1; }
};

check('2000-01-01 为戊午日', () => {
  const p = paipan({ date: '2000-01-01', hour: '子' });
  assert.equal(p.pillars[2].gan + p.pillars[2].zhi, '戊午');
});

check('1994-08-12 未时 → 甲戌 壬申 庚午 癸未', () => {
  const p = paipan({ date: '1994-08-12', hour: '未' });
  assert.equal(p.pillars.map((x) => x.gan + x.zhi).join(' '), '甲戌 壬申 庚午 癸未');
  assert.equal(p.dayMaster, '庚');
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

check('2026-10-30 为丁丑日、戌月平日', () => {
  const z = zeri({ date: '2026-10-30' });
  assert.equal(z.ganzhi, '丁丑');
  assert.equal(z.monthZhi, '戌');
  assert.equal(z.jianchu.name, '平');
  assert.equal(z.chong, '未');
});

check('小六壬 9月10日第6时 → 小吉', () => {
  assert.equal(xiaoliuren({ month: 9, day: 10, hourIndex: 6 }).gua.name, '小吉');
});

check('小六壬事项识别 + 三维分数 + 类象', () => {
  const r = xiaoliuren({ month: 9, day: 10, hourIndex: 6, question: '这次面试能不能过' });
  assert.equal(r.topic.id, 'work');
  assert.ok(r.topicLine.includes('面试') || r.topicLine.length > 10);
  assert.equal(r.scores.length, 3);
  assert.ok(r.scores.every((s) => s.v >= 0 && s.v <= 100));
  assert.ok(r.gua.elem && r.gua.dir && r.gua.timing);
  assert.ok(r.wang.season && ['旺', '相', '休', '囚', '死', '平'].includes(r.wang.state));
  assert.ok(r.overall >= 35 && r.overall <= 92);
});

check('小六壬不同事项同一落宫给不同断语', () => {
  const a = xiaoliuren({ month: 9, day: 10, hourIndex: 6, question: '这笔钱能不能收回' });
  const b = xiaoliuren({ month: 9, day: 10, hourIndex: 6, question: '这次面试能不能过' });
  assert.equal(a.gua.name, b.gua.name);
  assert.notEqual(a.topicLine, b.topicLine);
});

check('合盘多维：四柱、纳音、生肖、十神、五行', () => {
  const r = hepan({
    a: { date: '1994-08-12', hour: '未', gender: 'female' },
    b: { date: '1990-03-15', hour: '辰', gender: 'male' },
  });
  assert.equal(r.dims.length, 4);
  assert.ok(r.overall >= 20 && r.overall <= 96);
  assert.equal(r.pillarTable.length, 4);
  assert.ok(r.pillarTable.every((p) => p.a && p.b && p.rel));
  assert.ok(r.nayin.a && r.nayin.b && r.nayin.text);
  assert.ok(r.tenGods.aToB && r.tenGods.bToA);
  assert.ok(r.relations.every((x) => x.dim && x.type && x.text));
  assert.ok(r.scores === r.dims);
});

check('择日：黄黑道、德神、吉时与生肖关系', () => {
  const single = zeri({ date: '2026-10-30' });
  assert.ok(single.huangdao && ['黄道', '黑道'].includes(single.huangdao.kind));
  assert.ok(Array.isArray(single.goodHours));
  assert.ok(single.goodHours.every((h) => h.endsWith('时')));
  const r = zeri({ event: 'marry', days: 30, birthYear: 1994, from: '2026-11-01' });
  assert.ok(r.picks.length > 0 && r.picks.length <= 6);
  assert.equal(r.birthZhi, '戌');
  assert.ok(r.picks.every((x) => x.huangdao && x.hdKind && Array.isArray(x.goodHours)));
  assert.equal(r.dims.length, 3);
  assert.ok(r.picks[0].score >= r.picks[r.picks.length - 1].score);
});

check('择日：填出生年会避开冲本命的日子', () => {
  const a = zeri({ event: 'move', days: 60, from: '2026-11-01' });
  const b = zeri({ event: 'move', days: 60, from: '2026-11-01', birthYear: 1990 });
  assert.equal(b.birthZhi, '午');
  assert.ok(b.picks.every((x) => !x.reasons.some((r) => r.includes('冲本命'))));
});

check('八宅 170° / 1994 女 / 门巽 → 坎宅 离命', () => {
  const r = bazhai({ heading: 170, birthYear: 1994, gender: 'female', door: '巽' });
  assert.equal(r.meta.houseGua, '坎');
  assert.equal(r.meta.mGua, '离');
  assert.equal(r.table.length, 8);
});

console.log(`\n${pass} passed`);
