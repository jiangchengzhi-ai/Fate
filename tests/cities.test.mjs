import assert from 'node:assert/strict';
import { PROVINCES } from '../assets/js/cities-cn.js';
import { cityByName, CITIES } from '../server/cities.mjs';
import { paipan } from '../server/tools.mjs';

let pass = 0;
const ok = (name, fn) => { fn(); pass++; console.log('ok  ', name); };

ok('覆盖 34 个省级行政区', () => {
  assert.equal(PROVINCES.length, 34);
  const names = PROVINCES.map((p) => p.name);
  for (const n of ['北京市', '上海市', '天津市', '重庆市', '河北省', '新疆维吾尔自治区', '西藏自治区', '中国台湾', '中国香港', '中国澳门']) {
    assert.ok(names.some((x) => x.includes(n.replace('中国', ''))), n);
  }
});

ok('每个省至少 1 个市，坐标在中国范围内', () => {
  for (const p of PROVINCES) {
    assert.ok(p.cities.length >= 1, p.name);
    for (const c of p.cities) {
      assert.ok(c.lng >= 73 && c.lng <= 136, `${p.name}/${c.name} lng=${c.lng}`);
      assert.ok(c.lat >= 3 && c.lat <= 54, `${p.name}/${c.name} lat=${c.lat}`);
    }
  }
});

ok('关键城市经度正确', () => {
  assert.ok(Math.abs(cityByName('北京').lng - 116.4) < 0.2);
  assert.ok(Math.abs(cityByName('乌鲁木齐').lng - 87.6) < 0.3);
  assert.ok(Math.abs(cityByName('杭州').lng - 120.2) < 0.2);
  assert.ok(Math.abs(cityByName('拉萨').lng - 91.1) < 0.4);
});

ok('按省查找与按市查找结果一致', () => {
  const a = cityByName('乌鲁木齐市', '新疆维吾尔自治区');
  const b = cityByName('乌鲁木齐');
  assert.equal(a, b);
  assert.ok(a && a.lng < 90);
});

ok('paipan 使用省+市经度校正', () => {
  const r = paipan({ date: '1994-08-12', hour: '未', province: '新疆维吾尔自治区', city: '乌鲁木齐市' });
  assert.equal(r.resolved.trueSolarApplied, true);
  assert.ok(r.resolved.correctionMinutes < -100);
});

ok('城市总数 > 300', () => {
  assert.ok(CITIES.length > 300);
});

console.log(`\n${pass} passed`);
