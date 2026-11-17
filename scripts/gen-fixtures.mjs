import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Solar } = require('../vendor/lunar-javascript.cjs');
const { inChinaDST } = await import('../server/dst-cn.mjs');

const pad = (n) => String(n).padStart(2, '0');
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const hourOf = (mins) => ZHI[Math.floor((((mins + 60) % 1440)) / 120)];

function expected(y, m, d, hh, mm) {
  let ly = y; let lm = m; let ld = d; let lh = hh; let lmin = mm;
  if (inChinaDST(y, m, d)) {
    let total = hh * 60 + mm - 60;
    if (total < 0) {
      const prev = new Date(Date.UTC(y, m - 1, d - 1));
      ly = prev.getUTCFullYear(); lm = prev.getUTCMonth() + 1; ld = prev.getUTCDate();
      total += 1440;
    }
    lh = Math.floor(total / 60); lmin = total % 60;
  }
  const ec = Solar.fromYmdHms(ly, lm, ld, lh, lmin, 0).getLunar().getEightChar();
  ec.setSect(1);
  return [ec.getYear(), ec.getMonth(), ec.getDay(), ec.getTime()];
}

const cases = [];
const add = (y, m, d, hh, mm) => {
  const date = `${y}-${pad(m)}-${pad(d)}`;
  const clock = `${pad(hh)}:${pad(mm)}`;
  cases.push({ date, clock, hour: hourOf(hh * 60 + mm), expected: expected(y, m, d, hh, mm) });
};

// 固定边界
add(1994, 8, 12, 13, 41);
add(2000, 1, 1, 12, 0);
add(1965, 6, 6, 6, 0);
add(1965, 6, 6, 6, 5);
add(2024, 2, 10, 23, 30);
add(2024, 2, 4, 12, 0);
add(1984, 2, 4, 12, 0);

// 随机：1950–2035，避开不确定性
let seed = 20261117;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
for (let i = 0; i < 110; i++) {
  const y = 1950 + Math.floor(rnd() * 86);
  const m = 1 + Math.floor(rnd() * 12);
  const d = 1 + Math.floor(rnd() * 28);
  const hh = Math.floor(rnd() * 24);
  const mm = Math.floor(rnd() * 60);
  add(y, m, d, hh, mm);
}

fs.mkdirSync('fixtures', { recursive: true });
fs.writeFileSync('fixtures/bazi-golden.json', JSON.stringify({
  source: 'lunar-javascript v1.7.8 (MIT)', convention: '晚子时日柱按次日（sect 1）；夏令时先减 60 分钟', generatedAt: '2026-11-17', cases,
}, null, 1));
console.log('fixtures:', cases.length);
