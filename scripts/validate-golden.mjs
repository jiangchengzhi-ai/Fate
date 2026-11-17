import fs from 'node:fs';
import { paipan } from '../server/tools.mjs';

const f = JSON.parse(fs.readFileSync(new URL('../fixtures/bazi-golden.json', import.meta.url), 'utf8'));
let ok = 0;
const bad = [];
for (const c of f.cases) {
  const r = paipan({ date: c.date, hour: c.hour, clock: c.clock });
  const got = r.pillars.map((p) => p.gan + p.zhi);
  if (got.join(' ') === c.expected.join(' ')) ok++;
  else bad.push({ ...c, got });
}
console.log(`golden: ${ok}/${f.cases.length} 一致`);
for (const b of bad.slice(0, 10)) console.log('DIFF', b.date, b.clock, 'got', b.got.join(' '), 'want', b.expected.join(' '));
if (bad.length) process.exit(1);
