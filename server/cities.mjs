/* ==========================================================================
   cities.mjs — 中国 34 个省级行政区 → 地级市 经纬度
   数据：assets/js/cities-cn.js（自动生成）
   ========================================================================== */
import { PROVINCES } from '../assets/js/cities-cn.js';

const norm = (s) => String(s || '')
  .replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|盟|省|市|县|区)$/g, '')
  .trim();

const byKey = new Map();
const byCity = new Map();
for (const p of PROVINCES) {
  for (const c of p.cities) {
    byKey.set(`${norm(p.name)}|${norm(c.name)}`, c);
    if (!byCity.has(norm(c.name))) byCity.set(norm(c.name), c);
  }
}

export const CITIES = PROVINCES.flatMap((p) => p.cities.map((c) => ({ name: c.name, lng: c.lng, province: p.name })));

export function cityByName(name, province) {
  if (!name) return null;
  if (province) {
    const hit = byKey.get(`${norm(province)}|${norm(name)}`);
    if (hit) return hit;
  }
  return byCity.get(norm(name)) || null;
}

export const PROVINCE_LIST = PROVINCES;
