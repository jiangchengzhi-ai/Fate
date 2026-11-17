import assert from 'node:assert/strict';
import { checkInterpret } from '../server/guard.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

const chart = '四柱：甲戌 壬申 庚午 癸未\n大运：癸酉 甲戌\n流年：丙午';

ok('正常解读通过', () => {
  const t = '你是庚金日主，月令申金，身旺。适合用火炼金、用水洗金。'
    + '今年流年丙午，火气旺，适合把手上事情收尾。以上按传统命理推演，仅供娱乐参考。'
    + '注意作息规律，量力而行。';
  const r = checkInterpret(t, chart);
  assert.equal(r.ok, true, JSON.stringify(r.issues));
});

ok('拒绝绝对化断言', () => {
  const t = '你今年一定会升职，注定要发大财。'.repeat(3) + '仅供娱乐参考，请理性看待，不要当真。';
  assert.equal(checkInterpret(t, chart).ok, false);
});

ok('拒绝编造干支', () => {
  const t = '你日柱是戊子，月柱是乙卯，今年丁未年运势不错。以上仅供娱乐，请理性参考，不要过度当真。';
  const r = checkInterpret(t, chart);
  assert.ok(r.issues.some((i) => i.startsWith('ganzhi-unknown')));
});

ok('拒绝医疗与投资建议', () => {
  const t = '建议你服用这副药，每天两次。'.repeat(2) + '另外可以满仓买入，保证收益。仅供娱乐参考。';
  const r = checkInterpret(t, chart);
  assert.equal(r.ok, false);
});

console.log(`\n${pass} passed`);
