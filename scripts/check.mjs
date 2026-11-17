/* 一键校验：单元测试 + 交叉校验 + 规则/解读守卫 */
import { spawnSync } from 'node:child_process';

const JOBS = [
  ['单元 · 工具', 'tests/tools.test.mjs'],
  ['单元 · 农历', 'tests/lunar.test.mjs'],
  ['单元 · 四柱', 'tests/bazi.test.mjs'],
  ['单元 · 夏令时', 'tests/dst.test.mjs'],
  ['单元 · 深化', 'tests/depth.test.mjs'],
  ['单元 · 规则', 'tests/rules.test.mjs'],
  ['单元 · 日历', 'tests/calendar.test.mjs'],
  ['单元 · 守卫', 'tests/guard.test.mjs'],
  ['交叉 · 黄金样本', 'scripts/validate-golden.mjs'],
  ['交叉 · 真太阳时', 'scripts/validate-solar.mjs'],
  ['交叉 · lunar-javascript 全量', 'scripts/validate-cn.mjs'],
];

let fail = 0;
for (const [name, file] of JOBS) {
  const r = spawnSync(process.execPath, [file], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const last = out.trim().split(/\r?\n/).pop() || '';
  if (r.status === 0) console.log(`✅ ${name}  ${last}`);
  else {
    fail++;
    console.log(`❌ ${name}`);
    console.log(out.split(/\r?\n/).slice(-12).join('\n'));
  }
}
console.log(`\n${JOBS.length - fail}/${JOBS.length} 通过`);
process.exit(fail ? 1 : 0);
