/* ==========================================================================
   solar.mjs — 真太阳时校正
   校正量 = 经度差 × 4 分钟 + 均时差（Equation of Time）
   基准经线：东经 120°（北京时间 UTC+8）
   ========================================================================== */

/* 均时差，分钟。NOAA 简化式，误差 < 1 分钟，足够定时辰。 */
export function equationOfTime(year, month, day) {
  const start = Date.UTC(year, 0, 1);
  const now = Date.UTC(year, month - 1, day);
  const n = Math.floor((now - start) / 86400000) + 1;
  const b = (2 * Math.PI * (n - 81)) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/* 某地、某日的校正分钟数：东边早（正），西边晚（负） */
export function solarCorrection(year, month, day, longitude) {
  return (Number(longitude) - 120) * 4 + equationOfTime(year, month, day);
}

/* "HH:mm" → 分钟 */
export const toMinutes = (clock) => {
  const m = String(clock).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/* 分钟 → "HH:mm"（可跨日），返回 { clock, dayShift } */
export function fromMinutes(total) {
  const dayShift = Math.floor(total / 1440);
  const t = ((Math.round(total) % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  return { clock: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, dayShift };
}

/* 时辰地支（子丑寅…）由当天分钟数决定；23:00–00:59 为子 */
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export function zhiOfMinutes(total) {
  const t = ((total % 1440) + 1440) % 1440;
  const idx = Math.floor(((t + 60) % 1440) / 120);
  return ZHI[idx];
}

/* 时辰地支 → 该时辰的中点分钟（子=0:00? 这里取 23:00 起算的中点） */
export function midMinutesOfZhi(zhi) {
  const i = ZHI.indexOf(zhi);
  if (i < 0) return null;
  /* 子时 23:00-00:59，中点 00:00；丑 01:00-02:59 中点 02:00 … */
  if (i === 0) return 0;
  return i * 120;
}
