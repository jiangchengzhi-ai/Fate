/* ==========================================================================
   lunar.mjs — 农历 ↔ 公历
   依据 vendored lunar-javascript v1.7.8（MIT，6tail/lunar-javascript）
   ========================================================================== */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Solar, Lunar } = require('../vendor/lunar-javascript.cjs');

const pad = (n) => String(n).padStart(2, '0');

/* 农历 → 公历。leap=true 表示闰月 */
export function lunarToSolar(year, month, day, leap = false) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!(y >= 1900 && y <= 2100)) throw new Error('农历年份需在 1900–2100');
  if (!(m >= 1 && m <= 12)) throw new Error('农历月份需在 1–12');
  if (!(d >= 1 && d <= 30)) throw new Error('农历日期需在 1–30');
  const lunar = Lunar.fromYmd(y, leap ? -m : m, d);
  const solar = lunar.getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    date: `${solar.getYear()}-${pad(solar.getMonth())}-${pad(solar.getDay())}`,
  };
}

/* 公历 → 农历 */
export function solarToLunar(year, month, day) {
  const lunar = Solar.fromYmd(Number(year), Number(month), Number(day)).getLunar();
  const m = lunar.getMonth();
  return {
    year: lunar.getYear(),
    month: Math.abs(m),
    day: lunar.getDay(),
    leap: m < 0,
    text: `${lunar.getYear()}年${m < 0 ? '闰' : ''}${Math.abs(m)}月${lunar.getDay()}日`,
  };
}
