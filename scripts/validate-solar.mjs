/* 真太阳时独立校验：用 Spencer 公式替代 NOAA 公式，比较两者结果 */
import { solarCorrection } from '../server/solar.mjs';
import { cityByName } from '../server/cities.mjs';

/* Spencer (1971) 均时差，分钟 */
function spencerEoT(year, month, day) {
  const n = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const t = (2 * Math.PI * (n - 1)) / 365;
  const eot = 229.18 * (0.000075
    + 0.001868 * Math.cos(t)
    - 0.032077 * Math.sin(t)
    - 0.014615 * Math.cos(2 * t)
    - 0.040849 * Math.sin(2 * t));
  return eot; // 分钟
}

let max = 0; let sum = 0; let n = 0;
const cities = ['北京', '乌鲁木齐', '上海', '拉萨', '哈尔滨', '广州'];
for (let d = 0; d < 365; d += 7) {
  const dt = new Date(Date.UTC(2026, 0, 1) + d * 86400000);
  const y = dt.getUTCFullYear(); const m = dt.getUTCMonth() + 1; const dd = dt.getUTCDate();
  for (const c of cities) {
    const lng = cityByName(c).lng;
    const ours = solarCorrection(y, m, dd, lng);
    const alt = (lng - 120) * 4 + spencerEoT(y, m, dd);
    const diff = Math.abs(ours - alt);
    max = Math.max(max, diff); sum += diff; n++;
  }
}
console.log(`solar: ${n} 组，平均差 ${(sum / n).toFixed(2)} 分钟，最大差 ${max.toFixed(2)} 分钟`);
if (max > 2) { console.log('警告：两种均时差公式差异超过 2 分钟'); process.exit(1); }
