/* ==========================================================================
   nlp.js — 一句话录生日：日期 / 时辰 / 城市 / 性别
   只做规则解析，不调模型；解析结果交给用户确认。
   ========================================================================== */

const HOUR_WORDS = [
  ['凌晨', '丑'], ['半夜', '子'], ['深夜', '子'], ['夜里', '亥'],
  ['早上', '卯'], ['早晨', '卯'], ['清晨', '卯'], ['上午', '巳'],
  ['中午', '午'], ['正午', '午'], ['下午', '未'], ['傍晚', '酉'],
  ['晚上', '戌'], ['晚间', '戌'],
];

const NLP_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function hourFromClock(h) {
  const n = ((Number(h) % 24) + 24) % 24;
  return NLP_ZHI[Math.floor(((n + 1) % 24) / 2)];
}

export function parseBirth(text, provinces = []) {
  const raw = String(text || '').trim();
  const out = { date: '', hour: '', gender: '', province: '', city: '', matched: [] };
  if (!raw) return out;

  /* 日期：1994年8月12日 / 1994-8-12 / 1994.8.12 / 8月12日 */
  let m = raw.match(/(\d{4})\s*[年./\-]\s*(\d{1,2})\s*[月./\-]\s*(\d{1,2})/);
  if (m) {
    out.date = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    out.matched.push('date');
  } else {
    m = raw.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*[日号]/);
    if (m) {
      out.date = `1990-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
      out.matched.push('date');
    }
  }

  /* 时辰：先看“几点”，再看词 */
  const hm = raw.match(/(\d{1,2})\s*[点时](?:\s*(\d{1,2})\s*分)?/) || raw.match(/(\d{1,2}):(\d{2})/);
  if (hm) {
    out.hour = hourFromClock(hm[1]);
    out.matched.push('hour');
  } else {
    for (const [word, zhi] of HOUR_WORDS) {
      if (raw.includes(word)) { out.hour = zhi; out.matched.push('hour'); break; }
    }
  }

  /* 性别 */
  if (/女|女生|女性/.test(raw)) { out.gender = 'female'; out.matched.push('gender'); }
  else if (/男|男生|男性/.test(raw)) { out.gender = 'male'; out.matched.push('gender'); }

  /* 城市：城市名优先，其次省名；取最长匹配 */
  const flat = [];
  for (const p of provinces) {
    flat.push({ name: p.name, province: p.name, city: '' });
    for (const c of p.cities) flat.push({ name: c.name, province: p.name, city: c.name });
  }
  flat.sort((a, b) => b.name.length - a.name.length);
  const cleaned = raw.replace(/[省市区县]/g, '');
  for (const item of flat) {
    const base = item.name.replace(/[省市区县]/g, '');
    if (base.length >= 2 && cleaned.includes(base)) {
      out.province = item.province;
      out.city = item.city;
      out.matched.push('place');
      break;
    }
  }

  return out;
}

export function describeParse(p) {
  const bits = [];
  if (p.date) bits.push(p.date);
  if (p.hour) bits.push(`${p.hour}时`);
  if (p.city) bits.push(p.city);
  else if (p.province) bits.push(p.province);
  if (p.gender) bits.push(p.gender === 'male' ? '男' : '女');
  return bits;
}
