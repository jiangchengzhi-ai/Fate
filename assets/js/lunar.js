/* 农历与时辰：用浏览器内置的中国历法（ICU），不引第三方库 */
export function lunarParts(date = new Date()) {
  try {
    const fmt = new Intl.DateTimeFormat('en-u-ca-chinese', { month: 'numeric', day: 'numeric' });
    const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
    const month = Number(parts.month);
    const day = Number(parts.day);
    if (!month || !day) return null;
    return { month, day };
  } catch {
    return null;
  }
}

/* 子 1 … 亥 12，23:00–01:00 为子 */
export function zhiIndexNow(date = new Date()) {
  return Math.floor((((date.getHours() + 1) % 24)) / 2) + 1;
}

export function nowLabel(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}`;
}
