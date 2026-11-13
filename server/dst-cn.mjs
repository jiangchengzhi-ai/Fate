/* ==========================================================================
   dst-cn.mjs — 中国夏令时（1986–1991）
   实行期间时钟拨快 1 小时（UTC+9）。出生记录若为当时官方时间，需减 60 分钟。
   起止按每年公布日期（5 月上旬至 9 月中旬），日级近似。
   ========================================================================== */
export const CN_DST_SPANS = {
  1986: ['1986-05-04', '1986-09-14'],
  1987: ['1987-04-12', '1987-09-13'],
  1988: ['1988-04-10', '1988-09-11'],
  1989: ['1989-04-16', '1989-09-17'],
  1990: ['1990-04-15', '1990-09-16'],
  1991: ['1991-04-14', '1991-09-15'],
};

const pad = (n) => String(n).padStart(2, '0');

export function chinaDSTSpan(year) {
  const s = CN_DST_SPANS[Number(year)];
  return s ? { start: s[0], end: s[1] } : null;
}

export function inChinaDST(year, month, day) {
  const span = chinaDSTSpan(year);
  if (!span) return false;
  const d = `${year}-${pad(month)}-${pad(day)}`;
  return d >= span.start && d <= span.end;
}
