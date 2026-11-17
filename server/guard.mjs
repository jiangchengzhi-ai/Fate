/* ==========================================================================
   guard.mjs — 解读输出校验
   规则：
   1. 文中出现的干支，必须来自引擎结果（chart 文本）
   2. 不得出现预测性/绝对化断言
   3. 不得给出医疗、投资、法律的具体建议
   4. 长度合理
   ========================================================================== */

const FORBIDDEN = [
  '一定会', '肯定会', '必定', '注定', '必然发生', '毫无疑问', '百分之百',
  '大凶', '必死', '血光之灾', '破财免灾',
  '包治', '治愈', '药到病除',
  '稳赚', '必赚', '保证收益', '投资建议',
  '离了吧', '赶紧分手', '必须离婚',
];

const MEDICAL = /(吃|服用|停药|剂量|处方|手术)/;
const INVEST = /(买入|卖出|满仓|抄底|梭哈|杠杆)/;

const GAN = '甲乙丙丁戊己庚辛壬癸';
const ZHI = '子丑寅卯辰巳午未申酉戌亥';
const GANZHI_RE = new RegExp(`[${GAN}][${ZHI}]`, 'g');

const unique = (arr) => [...new Set(arr)];

export function checkInterpret(text, chartText = '') {
  const issues = [];
  const t = String(text || '');

  if (t.length < 60) issues.push('too-short');
  if (t.length > 2500) issues.push('too-long');

  for (const w of FORBIDDEN) {
    if (t.includes(w)) issues.push(`forbidden:${w}`);
  }

  if (MEDICAL.test(t) && /建议|应该|可以/.test(t)) issues.push('medical-advice');
  if (INVEST.test(t)) issues.push('investment-advice');

  // 干支一致性：文中干支必须能在引擎结果里找到
  const allowed = new Set((String(chartText).match(GANZHI_RE) || []));
  const used = unique(t.match(GANZHI_RE) || []);
  const unknown = used.filter((g) => !allowed.has(g));
  if (unknown.length) issues.push(`ganzhi-unknown:${unknown.slice(0, 5).join(',')}`);

  return { ok: issues.length === 0, issues };
}
