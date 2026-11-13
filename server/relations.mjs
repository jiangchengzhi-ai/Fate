/* ==========================================================================
   relations.mjs — 冲合关系、日运、合盘
   ========================================================================== */
export const BRANCH_CLASH = [['子', '午'], ['丑', '未'], ['寅', '申'], ['卯', '酉'], ['辰', '戌'], ['巳', '亥']];
export const BRANCH_HE = [['子', '丑'], ['寅', '亥'], ['卯', '戌'], ['辰', '酉'], ['巳', '申'], ['午', '未']];
export const STEM_HE = [['甲', '己'], ['乙', '庚'], ['丙', '辛'], ['丁', '壬'], ['戊', '癸']];

const pairHas = (pairs, a, b) => pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export const isClash = (a, b) => pairHas(BRANCH_CLASH, a, b);
export const isHe = (a, b) => pairHas(BRANCH_HE, a, b);
export const isStemHe = (a, b) => pairHas(STEM_HE, a, b);

/* 流日与命盘的关系 */
export function dayRelations(dayGan, dayZhi, pillars, tenGodFn) {
  const out = [];
  pillars.forEach((p) => {
    if (isClash(dayZhi, p.zhi)) out.push({ with: p.label, part: '支', type: '冲' });
    if (isHe(dayZhi, p.zhi)) out.push({ with: p.label, part: '支', type: '合' });
    if (isStemHe(dayGan, p.gan)) out.push({ with: p.label, part: '干', type: '合' });
  });
  return out;
}

export function dayEnergy(relations) {
  let score = 60;
  for (const r of relations) {
    if (r.type === '冲') score -= 12;
    if (r.type === '合') score += 9;
  }
  return Math.max(20, Math.min(95, score));
}

export function dayAdvice(relations, tenGod) {
  const doList = [];
  const avoid = [];
  if (relations.some((r) => r.type === '冲')) {
    avoid.push('远行、搬迁、签大合同');
    avoid.push('和长辈争执');
  } else {
    doList.push('推进手头的事');
  }
  if (relations.some((r) => r.type === '合')) doList.push('约人谈事、合作');
  if (['正官', '正印'].includes(tenGod)) doList.push('办事、递材料');
  if (['七杀', '伤官'].includes(tenGod)) avoid.push('硬碰硬、冲动决定');
  if (['正财', '偏财'].includes(tenGod)) doList.push('谈钱、收款');
  if (!doList.length) doList.push('按部就班，少做决定');
  return { do: [...new Set(doList)].slice(0, 3), avoid: [...new Set(avoid)].slice(0, 2) };
}
