import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Solar } = require('../vendor/lunar-javascript.cjs');
const { paipan } = await import('../server/tools.mjs');
const { inChinaDST } = await import('../server/dst-cn.mjs');

const pad = (n) => String(n).padStart(2, '0');
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function lunarPillars(y, m, d, hh, mm) {
  const ec = Solar.fromYmdHms(y, m, d, hh, mm, 0).getLunar().getEightChar();
  ec.setSect(1);
  return [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
}

const cases = [];
for (let ts = Date.UTC(1950, 0, 1); ts <= Date.UTC(2030, 11, 31); ts += 23 * 86400000) {
  const dt = new Date(ts);
  for (const [hh, mm] of [[0, 30], [6, 0], [12, 0], [18, 0], [23, 30]]) {
    cases.push([dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), hh, mm]);
  }
}
for (const y of [1950, 1984, 2000, 2024, 2030]) {
  for (const [m, d] of [[2, 3], [2, 4], [2, 5], [3, 5], [3, 6], [3, 7], [12, 31], [1, 1]]) {
    for (const [hh, mm] of [[0, 30], [12, 0], [23, 30]]) cases.push([y, m, d, hh, mm]);
  }
}
for (const y of [1986, 1987, 1988, 1989, 1990, 1991]) {
  cases.push([y, 6, 15, 12, 0]);
  cases.push([y, 9, 10, 12, 0]);
}

const stats = { total: 0, ok: 0, diff: [0, 0, 0, 0], dstExplain: 0 };
const examples = [];

for (const [y, m, d, hh, mm] of cases) {
  const date = `${y}-${pad(m)}-${pad(d)}`;
  const clock = `${pad(hh)}:${pad(mm)}`;
  const hour = ZHI[Math.floor(((hh * 60 + mm + 60) % 1440) / 120)];
  let ours;
  try { ours = paipan({ date, hour, clock }); } catch { continue; }
  const o = ours.pillars.map((p) => p.gan + p.zhi);

  // lunar 不知道中国夏令时：落在夏令时日期的样本，用"标准时间"喂它
  let ly = y, lm = m, ld = d, lh = hh, lmin = mm;
  let dstShift = false;
  if (inChinaDST(y, m, d)) {
    let total = hh * 60 + mm - 60;
    if (total < 0) {
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      ly = prev.getUTCFullYear(); lm = prev.getUTCMonth() + 1; ld = prev.getUTCDate();
      total += 1440;
    }
    lh = Math.floor(total / 60); lmin = total % 60;
    dstShift = true;
  }
  const t = lunarPillars(ly, lm, ld, lh, lmin);
  stats.total++;
  let allOk = true;
  for (let i = 0; i < 4; i++) {
    if (o[i] !== t[i]) {
      stats.diff[i]++;
      allOk = false;
      if (examples.length < 20) examples.push({ date, clock, i: ['年', '月', '日', '时'][i], ours: o[i], lunar: t[i], dstShift });
    }
  }
  if (allOk) stats.ok++;
}

console.log('cases:', stats.total, 'all-ok:', stats.ok, `${((stats.ok / stats.total) * 100).toFixed(2)}%`);
console.log('diff by pillar [年,月,日,时]:', stats.diff);
for (const e of examples) console.log(`${e.date} ${e.clock} ${e.i}柱 ours=${e.ours} lunar=${e.lunar}${e.dstShift ? ' (DST)' : ''}`);
