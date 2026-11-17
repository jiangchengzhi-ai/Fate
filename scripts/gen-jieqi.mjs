import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { Solar } = require('../vendor/lunar-javascript.cjs');

const MAJOR = ['小寒', '立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪'];
const pad = (n) => String(n).padStart(2, '0');
const out = {};

for (let y = 1899; y <= 2101; y++) {
  const table = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
  const row = {};
  for (const name of MAJOR) {
    const s = table[name];
    if (!s) continue;
    row[name] = `${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())}T${pad(s.getHour())}:${pad(s.getMinute())}:${pad(s.getSecond())}+08:00`;
  }
  out[y] = row;
}

fs.writeFileSync('knowledge/jieqi.json', JSON.stringify(out));
const kb = fs.statSync('knowledge/jieqi.json').size / 1024;
console.log('years:', Object.keys(out).length, 'size:', Math.round(kb), 'KB');
console.log('sample 1965:', out[1965]);
