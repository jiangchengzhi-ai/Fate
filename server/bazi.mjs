/* ==========================================================================
   bazi.mjs — 四柱深化：藏干十神、纳音、十二长生、神煞、格局、流月
   ========================================================================== */
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_E = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];

/* 地支藏干（本气、中气、余气） */
export const HIDDEN = {
  子: ['癸'],
  丑: ['己', '癸', '辛'],
  寅: ['甲', '丙', '戊'],
  卯: ['乙'],
  辰: ['戊', '乙', '癸'],
  巳: ['丙', '庚', '戊'],
  午: ['丁', '己'],
  未: ['己', '丁', '乙'],
  申: ['庚', '壬', '戊'],
  酉: ['辛'],
  戌: ['戊', '辛', '丁'],
  亥: ['壬', '甲'],
};

/* 六十甲子纳音（每两个干支共用一个） */
export const NAYIN = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金', '山头火',
  '涧下水', '城头土', '白蜡金', '杨柳木', '泉中水', '屋上土',
  '霹雳火', '松柏木', '长流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '佛灯火', '天河水', '大驿土', '钗钏金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

const TWELVE = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CS_START = { 甲: '亥', 乙: '午', 丙: '寅', 丁: '酉', 戊: '寅', 己: '酉', 庚: '巳', 辛: '子', 壬: '申', 癸: '卯' };

/* 十神：日干 vs 目标干 */
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
const YANG = new Set(['甲', '丙', '戊', '庚', '壬']);

export function tenGod(dayGan, otherGan) {
  if (!otherGan) return '';
  if (otherGan === dayGan) return '比肩';
  const me = GAN_E[GAN.indexOf(dayGan)];
  const it = GAN_E[GAN.indexOf(otherGan)];
  const samePolarity = YANG.has(dayGan) === YANG.has(otherGan);
  if (it === me) return samePolarity ? '比肩' : '劫财';
  if (SHENG[me] === it) return samePolarity ? '食神' : '伤官';
  if (KE[me] === it) return samePolarity ? '偏财' : '正财';
  if (KE[it] === me) return samePolarity ? '七杀' : '正官';
  if (SHENG[it] === me) return samePolarity ? '偏印' : '正印';
  return '';
}

export function nayinOf(gan, zhi) {
  const gi = GAN.indexOf(gan);
  const zi = ZHI.indexOf(zhi);
  for (let i = 0; i < 60; i++) {
    if (i % 10 === gi && i % 12 === zi) return NAYIN[Math.floor(i / 2)];
  }
  return '';
}

export function lifeStage(dayGan, branch) {
  const start = CS_START[dayGan];
  if (!start) return '';
  const dir = YANG.has(dayGan) ? 1 : -1;
  const diff = ((ZHI.indexOf(branch) - ZHI.indexOf(start)) * dir + 120) % 12;
  return TWELVE[diff];
}

/* 神煞：只取常用且口径明确的 */
const TIANYI = { 甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'], 乙: ['子', '申'], 己: ['子', '申'], 丙: ['亥', '酉'], 丁: ['亥', '酉'], 壬: ['卯', '巳'], 癸: ['卯', '巳'], 辛: ['午', '寅'] };
const WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
const YANGREN = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' };
const GROUP = {
  桃花: { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' },
  驿马: { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' },
  华盖: { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 巳: '丑', 酉: '丑', 丑: '丑', 亥: '未', 卯: '未', 未: '未' },
  将星: { 申: '子', 子: '子', 辰: '子', 寅: '午', 午: '午', 戌: '午', 巳: '酉', 酉: '酉', 丑: '酉', 亥: '卯', 卯: '卯', 未: '卯' },
};

export function shenshaOf(pillars, dayGan) {
  const branches = pillars.map((p) => p.zhi);
  const yearZhi = pillars[0].zhi;
  const dayZhi = pillars[2].zhi;
  const out = [];
  const hit = (name, target, basis) => {
    branches.forEach((b, i) => {
      if (b === target) out.push({ name, where: pillars[i].label, basis });
    });
  };

  (TIANYI[dayGan] || []).forEach((t) => hit('天乙贵人', t, `日干 ${dayGan}`));
  if (WENCHANG[dayGan]) hit('文昌', WENCHANG[dayGan], `日干 ${dayGan}`);
  if (YANGREN[dayGan]) hit('羊刃', YANGREN[dayGan], `日干 ${dayGan}`);
  for (const [name, map] of Object.entries(GROUP)) {
    const t1 = map[yearZhi];
    if (t1) hit(name, t1, `年支 ${yearZhi}`);
    const t2 = map[dayZhi];
    if (t2 && t2 !== t1) hit(name, t2, `日支 ${dayZhi}`);
  }
  const seen = new Set();
  return out.filter((x) => {
    const k = x.name + x.where;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* 格局：以月令本气十神取 */
export function patternOf(dayGan, monthZhi) {
  const main = HIDDEN[monthZhi]?.[0];
  if (!main) return { name: '', note: '' };
  const god = tenGod(dayGan, main);
  const map = {
    正官: '正官格', 七杀: '七杀格', 正财: '正财格', 偏财: '偏财格',
    食神: '食神格', 伤官: '伤官格', 正印: '正印格', 偏印: '偏印格',
  };
  if (god === '比肩' || god === '劫财') {
    const lu = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' }[dayGan];
    return { name: monthZhi === lu ? '建禄格' : '月劫格', note: `月令 ${monthZhi} 本气 ${main}（${god}）` };
  }
  return { name: map[god] || '', note: `月令 ${monthZhi} 本气 ${main}（${god}）` };
}

/* 流月：给定流年干支，排十二个月（寅月起） */
export function monthsOfYear(yearGan, yearZhi) {
  const yg = GAN.indexOf(yearGan);
  const first = ((yg % 5) * 2 + 2) % 10; // 五虎遁：寅月天干
  const seq = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];
  return seq.map((zhi, i) => {
    const gan = GAN[(first + i) % 10];
    return { label: `${['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'][i]}月`, gan, zhi, ganZhi: gan + zhi };
  });
}

/* 汇总：给 paipan 用 */
export function deepen(pillars, dayGan, yearGan) {
  const hidden = pillars.map((p) => ({
    label: p.label,
    stems: (HIDDEN[p.zhi] || []).map((g) => ({ gan: g, tenGod: g === dayGan ? '日主' : tenGod(dayGan, g), elem: GAN_E[GAN.indexOf(g)] })),
  }));
  const nayin = pillars.map((p) => ({ label: p.label, name: nayinOf(p.gan, p.zhi) }));
  const stages = pillars.map((p) => ({ label: p.label, stage: lifeStage(dayGan, p.zhi) }));
  const shensha = shenshaOf(pillars, dayGan);
  const pattern = patternOf(dayGan, pillars[1].zhi);
  const months = monthsOfYear(yearGan, pillars[0].zhi).map((m) => ({ ...m, tenGod: tenGod(dayGan, m.gan) }));
  return { hidden, nayin, stages, shensha, pattern, months };
}
