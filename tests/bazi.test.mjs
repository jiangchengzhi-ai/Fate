import assert from 'node:assert/strict';
import { nayinOf, lifeStage, tenGod, patternOf, monthsOfYear } from '../server/bazi.mjs';
import { paipan } from '../server/tools.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('纳音：甲子海中金、丙午天河水、壬申剑锋金', () => {
  assert.equal(nayinOf('甲', '子'), '海中金');
  assert.equal(nayinOf('丙', '午'), '天河水');
  assert.equal(nayinOf('壬', '申'), '剑锋金');
});

ok('十二长生：丙午帝旺、甲亥长生、丙戌墓', () => {
  assert.equal(lifeStage('丙', '午'), '帝旺');
  assert.equal(lifeStage('甲', '亥'), '长生');
  assert.equal(lifeStage('丙', '戌'), '墓');
});

ok('十神：甲见庚七杀、甲见辛正官、丙见庚偏财', () => {
  assert.equal(tenGod('甲', '庚'), '七杀');
  assert.equal(tenGod('甲', '辛'), '正官');
  assert.equal(tenGod('丙', '庚'), '偏财');
});

ok('格局：甲日酉月正官格，丙日申月偏财格', () => {
  assert.equal(patternOf('甲', '酉').name, '正官格');
  assert.equal(patternOf('丙', '申').name, '偏财格');
});

ok('流月：甲年正月丙寅', () => {
  const m = monthsOfYear('甲', '戌');
  assert.equal(m[0].ganZhi, '丙寅');
  assert.equal(m.length, 12);
});

ok('paipan 带出深化字段', () => {
  const r = paipan({ date: '1994-08-12', hour: '未', city: '北京' });
  assert.equal(r.deep.nayin[2].name, '天河水');
  assert.equal(r.deep.stages[2].stage, '帝旺');
  assert.equal(r.deep.pattern.name, '七杀格');
  assert.equal(r.deep.months.length, 12);
});

console.log(`\n${pass} passed`);
