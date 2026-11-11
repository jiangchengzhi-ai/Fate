/* ==========================================================================
   tools.mjs — 确定性工具层
   一张八字盘、一课上六壬、一日建除，都只依赖输入，不依赖模型。
   ========================================================================== */
import { elementsOf, buildCompass, ganzhi, mountainAt } from '../assets/js/engine.js';
import { GUAS, BAZHAI } from '../assets/js/data.js';
import { fortuneSheet } from './fortune.mjs';

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_E = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const ZHI_E = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad = (n) => String(n).padStart(2, '0');

/* 以 2000-01-01 为戊午日锚点推算日柱；与两个独立记忆锚点自洽 */
function dayGanzhi(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
  const idx = (((54 - days) % 60) + 60) % 60;
  return { idx, gan: GAN[idx % 10], zhi: ZHI[idx % 12] };
}

/* ---------------- 节气：按太阳视黄经求解，精度到分钟 ---------------- */
const TERMS = [
  { n: '小寒', deg: 285, zhi: 1, m: 1, d: 6 },
  { n: '立春', deg: 315, zhi: 2, m: 2, d: 4 },
  { n: '惊蛰', deg: 345, zhi: 3, m: 3, d: 6 },
  { n: '清明', deg: 15, zhi: 4, m: 4, d: 5 },
  { n: '立夏', deg: 45, zhi: 5, m: 5, d: 6 },
  { n: '芒种', deg: 75, zhi: 6, m: 6, d: 6 },
  { n: '小暑', deg: 105, zhi: 7, m: 7, d: 7 },
  { n: '立秋', deg: 135, zhi: 8, m: 8, d: 8 },
  { n: '白露', deg: 165, zhi: 9, m: 9, d: 8 },
  { n: '寒露', deg: 195, zhi: 10, m: 10, d: 8 },
  { n: '立冬', deg: 225, zhi: 11, m: 11, d: 7 },
  { n: '大雪', deg: 255, zhi: 0, m: 12, d: 7 },
];

function solarLongitude(jd) {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = ((357.52911 + 35999.05029 * T - 0.0001537 * T * T) * Math.PI) / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);
  const omega = ((125.04 - 1934.136 * T) * Math.PI) / 180;
  return ((L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) % 360 + 360) % 360;
}

function termJD(year, t) {
  const approx = Date.UTC(year, t.m - 1, t.d) / 86400000 + 2440587.5;
  let lo = approx - 9;
  let hi = approx + 9;
  const diff = (jd) => {
    let d = solarLongitude(jd) - t.deg;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  if (diff(lo) > 0 || diff(hi) < 0) return approx; // 极端兜底
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (diff(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

const termCache = new Map();
function termsOf(year) {
  if (!termCache.has(year)) {
    termCache.set(year, TERMS.map((t) => ({
      ...t,
      jd: termJD(year, t),
      utc: (termJD(year, t) - 2440587.5) * 86400000,
    })));
  }
  return termCache.get(year);
}

function monthZhiOf(y, m, d, hourMid = 12) {
  const birthJD = Date.UTC(y, m - 1, d, hourMid - 8) / 86400000 + 2440587.5;
  const all = [...termsOf(y - 1), ...termsOf(y), ...termsOf(y + 1)].sort((a, b) => a.jd - b.jd);
  const prev = all.filter((t) => t.jd <= birthJD).pop();
  return prev ? prev.zhi : 0;
}

/* 年柱以立春为界（按精确立春时刻） */
function yearOf(y, m, d, hourMid = 12) {
  const birthJD = Date.UTC(y, m - 1, d, hourMid - 8) / 86400000 + 2440587.5;
  const lichun = termsOf(y)[1].jd;
  return birthJD < lichun ? y - 1 : y;
}

const SHISHEN = {
  // 同我、我生、我克、克我、生我
  同我: ['比肩', '劫财'],
  我生: ['食神', '伤官'],
  我克: ['偏财', '正财'],
  克我: ['七杀', '正官'],
  生我: ['偏印', '正印'],
};
const ELEM_ORDER = ['木', '火', '土', '金', '水'];
const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
const KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

function shishen(dayGan, otherGan) {
  const me = GAN_E[GAN.indexOf(dayGan)];
  const he = GAN_E[GAN.indexOf(otherGan)];
  let rel;
  if (he === me) rel = '同我';
  else if (SHENG[me] === he) rel = '我生';
  else if (KE[me] === he) rel = '我克';
  else if (KE[he] === me) rel = '克我';
  else rel = '生我';
  const sameYinYang = (GAN.indexOf(dayGan) % 2) === (GAN.indexOf(otherGan) % 2);
  return SHISHEN[rel][sameYinYang ? 0 : 1];
}

export function paipan({ date, hour = '午', gender = 'male' }) {
  const [y, m, d] = String(date).split('-').map(Number);
  if (!y || !m || !d) throw new Error('date 需要 YYYY-MM-DD');
  const hZhiIdx = ZHI.indexOf(hour);
  if (hZhiIdx < 0) throw new Error('hour 需要地支');
  const hourMid = (hZhiIdx * 2) % 24;

  const bYear = yearOf(y, m, d, hourMid);
  const yGanIdx = ((bYear - 4) % 10 + 10) % 10;
  const yZhiIdx = ((bYear - 4) % 12 + 12) % 12;
  const mZhiIdx = monthZhiOf(y, m, d, hourMid);
  const mGanIdx = (yGanIdx * 2 + 2 + ((mZhiIdx - 2 + 12) % 12)) % 10;
  const day = dayGanzhi(y, m, d);
  const hGanIdx = ((day.idx % 10) % 5 * 2 + hZhiIdx) % 10;

  const pillars = [
    { label: '年柱', gan: GAN[yGanIdx], zhi: ZHI[yZhiIdx] },
    { label: '月柱', gan: GAN[mGanIdx], zhi: ZHI[mZhiIdx] },
    { label: '日柱', gan: day.gan, zhi: day.zhi },
    { label: '时柱', gan: GAN[hGanIdx], zhi: ZHI[hZhiIdx] },
  ];

  const weights = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p, i) => {
    const w = i === 2 ? 1.2 : 1; // 日干为主
    weights[GAN_E[GAN.indexOf(p.gan)]] += w;
    weights[ZHI_E[ZHI.indexOf(p.zhi)]] += w * 1.1;
  });
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const elems = ELEM_ORDER.map((e) => ({ e, v: Math.round((weights[e] / total) * 100) }));
  const diff = 100 - elems.reduce((s, x) => s + x.v, 0);
  elems.reduce((m2, x) => (x.v > m2.v ? x : m2), elems[0]).v += diff;
  const dom = [...elems].sort((a, b) => b.v - a.v)[0].e;
  const weak = [...elems].sort((a, b) => a.v - b.v)[0].e;

  const tenGods = pillars.map((p) => (p === pillars[2] ? '日主' : shishen(day.gan, p.gan)));
  const me = GAN_E[GAN.indexOf(day.gan)];
  const same = elems.find((x) => x.e === me)?.v || 0;
  const support = elems.find((x) => x.e === Object.keys(SHENG).find((k) => SHENG[k] === me))?.v || 0;

  const strong = same + support * 0.8 >= 45;
  const yong = strong ? [KE[me], SHENG[me]] : [me, Object.keys(SHENG).find((k) => SHENG[k] === me)];

  /* ---- 大运：阳年男顺、阴年男逆；阳年女逆、阴年女顺 ---- */
  const birthJD = Date.UTC(y, m - 1, d, hourMid - 8) / 86400000 + 2440587.5;
  const allTerms = [...termsOf(y - 1), ...termsOf(y), ...termsOf(y + 1)].sort((a, b) => a.jd - b.jd);
  const prevTerm = allTerms.filter((t) => t.jd <= birthJD).pop();
  const nextTerm = allTerms.find((t) => t.jd > birthJD);

  const yangYear = yGanIdx % 2 === 0;
  const forward = yangYear === (gender === 'male');
  const distDays = forward ? (nextTerm.jd - birthJD) : (birthJD - prevTerm.jd);
  const totalMonths = Math.max(0, Math.round(distDays * 4)); // 3 日 = 1 年 = 12 月
  const startYears = Math.floor(totalMonths / 12);
  const startMonths = totalMonths % 12;
  const startAge = startYears + startMonths / 12;

  const sexIdx = (g, z) => {
    for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
    return 0;
  };
  const monthIdx = sexIdx(mGanIdx, mZhiIdx);
  const cycles = Array.from({ length: 8 }, (_, i) => {
    const idx = (monthIdx + (forward ? i + 1 : -(i + 1)) + 600) % 60;
    const g = GAN[idx % 10];
    const age = startAge + i * 10;
    return {
      gan: g, zhi: ZHI[idx % 12],
      startAge: Number(age.toFixed(1)),
      startLabel: `${startYears + i * 10}岁${startMonths ? startMonths + '个月' : ''}`,
      startYear: Math.round(bYear + age),
      tenGod: shishen(day.gan, g),
    };
  });

  const now = new Date();
  const nowYear = yearOf(now.getFullYear(), now.getMonth() + 1, now.getDate(), 12);
  let age = nowYear - bYear;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age -= 1;
  const cur = cycles.find((c) => age >= c.startAge && age < c.startAge + 10) || cycles[cycles.length - 1];
  const lnIdx = ((nowYear - 4) % 60 + 60) % 60;
  const liunian = {
    year: nowYear,
    ganZhi: GAN[lnIdx % 10] + ZHI[lnIdx % 12],
    gan: GAN[lnIdx % 10],
    tenGod: shishen(day.gan, GAN[lnIdx % 10]),
    age,
    cycle: `${cur.gan}${cur.zhi}`,
  };

  const startDate = new Date(Date.UTC(y, m - 1, d) + Math.round(startAge * 365.2425) * 86400000)
    .toISOString().slice(0, 10);

  const spread = Math.max(...elems.map((x) => x.v)) - Math.min(...elems.map((x) => x.v));
  const mingScore = Math.round(clamp(60 + spread * 0.25 + (strong ? 0 : 4), 55, 88));

  const luckText = `起运${startYears}岁${startMonths ? `${startMonths}个月` : ''}，${forward ? '顺' : '逆'}行；现行${cur.gan}${cur.zhi}运，${nowYear}年流年${liunian.ganZhi}。`;

  return {
    type: 'ming',
    date, hour, gender,
    pillars,
    tenGods,
    dayMaster: day.gan,
    dayMasterElem: me,
    elems,
    dom, weak,
    strong,
    yong,
    overall: mingScore,
    fortune: fortuneSheet(yong, dom),
    luck: {
      forward,
      startAge: { years: startYears, months: startMonths },
      startDate,
      cycles,
      liunian,
    },
    summary: `${pillars.map((p) => p.gan + p.zhi).join(' ')}，日主${day.gan}${me}，生于${ZHI[mZhiIdx]}月，${strong ? '身旺' : '身弱'}，${elems.map((x) => x.e + x.v).join(' ')}。${luckText}`,
  };
}

/* ---------------- 小六壬 ---------------- */
export const LIUREN = [
  { name: '大安', luck: '吉', body: '身不动，事在近处。所问之事宜守成，不宜远求；等人则至，失物未远。' },
  { name: '留连', luck: '小凶', body: '事多拖延，音信迟。宜缓不宜急，反复确认再落笔；所托之人未必尽力。' },
  { name: '速喜', luck: '吉', body: '喜信将至，事在须臾。宜速行、速决；求财得，问病轻，远行有信。' },
  { name: '赤口', luck: '凶', body: '口舌是非，争讼之象。宜少言、避争；文书合同细看，勿代人担保。' },
  { name: '小吉', luck: '吉', body: '事有小成，人和为贵。宜与人合作、托人办事；所谋多顺，但利不大。' },
  { name: '空亡', luck: '大凶', body: '事多落空，阴人作梗。宜止不宜进，所问之事多半无果；静待时机。' },
];

export function xiaoliuren({ month, day, hourIndex }) {
  const m = Number(month), d = Number(day), h = Number(hourIndex);
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 30) || !(h >= 1 && h <= 12)) {
    throw new Error('month 1-12 / day 1-30 / hourIndex 1-12');
  }
  const pos = ((m - 1) + (d - 1) + (h - 1)) % 6;
  const luckScore = { 吉: 78, 小凶: 58, 凶: 52, 大凶: 45 }[LIUREN[pos].luck] || 60;
  const gua = LIUREN[pos];
  return {
    type: 'bu',
    month: m, day: d, hourIndex: h,
    pos,
    overall: luckScore,
    gua,
    steps: [
      { label: '起月', text: `自大安起，顺数至${m}月，落${LIUREN[(m - 1) % 6].name}` },
      { label: '起日', text: `自${LIUREN[(m - 1) % 6].name}起，顺数至${d}日，落${LIUREN[(m - 1 + d - 1) % 6].name}` },
      { label: '起时', text: `自${LIUREN[(m - 1 + d - 1) % 6].name}起，顺数至第${h}时，落${gua.name}` },
    ],
    summary: `农历${m}月${d}日第${h}时，落${gua.name}（${gua.luck}）。${gua.body}`,
  };
}

/* ---------------- 择日 ---------------- */
const JIANCHU = [
  { name: '建', luck: '平', yi: '出行、上任、求财', ji: '动土、开仓' },
  { name: '除', luck: '吉', yi: '除服、疗病、扫舍、解除', ji: '求财、远行' },
  { name: '满', luck: '平', yi: '祭祀、祈福、结亲', ji: '服药、栽种' },
  { name: '平', luck: '平', yi: '修饰、平治道涂', ji: '开渠、栽种' },
  { name: '定', luck: '吉', yi: '订婚、安床、协议', ji: '诉讼、远行' },
  { name: '执', luck: '吉', yi: '捕捉、立约、修造', ji: '开市、移徙' },
  { name: '破', luck: '凶', yi: '破屋、坏垣、求医', ji: '嫁娶、开市、动土' },
  { name: '危', luck: '吉', yi: '安床、祭祀、祈福', ji: '登高、行船' },
  { name: '成', luck: '吉', yi: '嫁娶、开市、入宅、出行', ji: '诉讼' },
  { name: '收', luck: '平', yi: '纳财、收账、入仓', ji: '开市、安葬' },
  { name: '开', luck: '吉', yi: '开市、出行、求财、入学', ji: '安葬、动土' },
  { name: '闭', luck: '凶', yi: '筑堤、埋藏、补垣', ji: '开市、出行、求医' },
];

const SHA = [
  { zhi: ['申', '子', '辰'], dir: '南' },
  { zhi: ['巳', '酉', '丑'], dir: '东' },
  { zhi: ['寅', '午', '戌'], dir: '北' },
  { zhi: ['亥', '卯', '未'], dir: '西' },
];

const EVENTS = [
  { id: 'marry', name: '嫁娶订婚', keys: ['嫁娶', '结亲', '订婚', '纳采'] },
  { id: 'propose', name: '求婚', keys: ['嫁娶', '结亲', '订婚', '纳采'] },
  { id: 'move', name: '入宅搬家', keys: ['入宅', '移徙', '搬家', '安床'] },
  { id: 'open', name: '开业开市', keys: ['开市', '开业', '交易', '立券'] },
  { id: 'travel', name: '出行赴任', keys: ['出行', '赴任', '移徙'] },
  { id: 'build', name: '动土装修', keys: ['动土', '修造', '上梁', '起基'] },
  { id: 'sign', name: '签约立约', keys: ['立约', '交易', '纳财', '立券'] },
  { id: 'medical', name: '求医问诊', keys: ['求医', '疗病', '除服', '解除'] },
  { id: 'bury', name: '安葬破土', keys: ['安葬', '破土', '埋藏'] },
  { id: 'worship', name: '祭祀祈福', keys: ['祭祀', '祈福', '求嗣'] },
  { id: 'study', name: '入学考试', keys: ['入学', '赴考', '求财'] },
];

const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (dt) => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;

function dayInfo(y, m, d) {
  const day = dayGanzhi(y, m, d);
  const mZhi = monthZhiOf(y, m, d);
  const idx = ((ZHI.indexOf(day.zhi) - mZhi) % 12 + 12) % 12;
  const jc = JIANCHU[idx];
  const chong = ZHI[(ZHI.indexOf(day.zhi) + 6) % 12];
  const sha = SHA.find((s) => s.zhi.includes(day.zhi))?.dir || '—';
  return { day, mZhi, jc, chong, sha };
}

export function zeri({ date, event, days = 30, birthYear, from }) {
  const ev = EVENTS.find((e) => e.id === event) || EVENTS.find((e) => e.name === event);

  /* 单日查询 */
  if (!ev) {
    const [y, m, d] = String(date).split('-').map(Number);
    const info = dayInfo(y, m, d);
    return {
      type: 'ze',
      date,
      ganzhi: info.day.gan + info.day.zhi,
      monthZhi: ZHI[info.mZhi],
      jianchu: info.jc,
      chong: info.chong,
      sha: info.sha,
      summary: `${y}年${m}月${d}日，${info.day.gan}${info.day.zhi}日，${ZHI[info.mZhi]}月${info.jc.name}日（${info.jc.luck}）。冲${info.chong}，煞${info.sha}。`,
    };
  }

  const start = from ? new Date(`${from}T00:00:00Z`) : new Date();
  const base = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const span = Math.min(120, Math.max(7, Number(days) || 30));
  const birthZhi = birthYear ? ZHI[((Number(birthYear) - 4) % 12 + 12) % 12] : null;

  const all = [];
  for (let i = 0; i < span; i++) {
    const dt = new Date(base.getTime() + i * 86400000);
    const [y, m, d] = ymd(dt).split('-').map(Number);
    const info = dayInfo(y, m, d);
    const { jc } = info;

    let score = jc.luck === '吉' ? 3 : jc.luck === '凶' ? -4 : 0;
    const hitYi = ev.keys.filter((k) => jc.yi.includes(k));
    const hitJi = ev.keys.filter((k) => jc.ji.includes(k));
    score += hitYi.length * 4;
    score -= hitJi.length * 5;

    const chongMe = birthZhi && info.chong === birthZhi;
    if (chongMe) score -= 6;

    const reasons = [];
    if (jc.luck === '吉') reasons.push(`${jc.name}日，属吉`);
    if (jc.luck === '凶') reasons.push(`${jc.name}日，不宜`);
    if (hitYi.length) reasons.push(`宜${hitYi.join('、')}`);
    if (hitJi.length) reasons.push(`忌${hitJi.join('、')}`);
    if (chongMe) reasons.push(`冲本命${birthZhi}`);

    all.push({
      date: ymd(dt),
      weekday: '日一二三四五六'[dt.getUTCDay()],
      ganzhi: info.day.gan + info.day.zhi,
      jianchu: jc.name,
      luck: jc.luck,
      chong: info.chong,
      sha: info.sha,
      yi: jc.yi,
      ji: jc.ji,
      score,
      reasons,
    });
  }

  const picks = all.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const zeriScore = Math.round(clamp(58 + Math.max(0, picks[0]?.score || 0) * 3, 50, 90));
  const avoid = all.filter((x) => x.score <= -4).sort((a, b) => a.score - b.score).slice(0, 5);

  return {
    type: 'ze',
    event: { id: ev.id, name: ev.name },
    from: ymd(base),
    to: ymd(new Date(base.getTime() + (span - 1) * 86400000)),
    days: span,
    overall: zeriScore,
    birthYear: birthYear || null,
    picks,
    avoid,
    summary: `按「${ev.name}」看未来 ${span} 天：${picks.length ? `建议 ${picks.slice(0, 3).map((x) => `${x.date.slice(5)}（${x.jianchu}）`).join('、')} 等 ${picks.length} 个日子` : '没有明显合适的日子'}；避开 ${avoid.length ? avoid.map((x) => x.date.slice(5)).join('、') : '无特别忌日'}。`,
    advice: [
      picks.length ? '优先看排在前面的日子，再看当天是否有冲本命、冲主事人。' : '这个区间没有高分日，建议放宽到 60 天，或改看时辰。',
      '建除只论日辰，不代替对具体事项的判断；婚丧嫁娶等大事请结合双方家庭与实际情况。',
      '若已知主事人生肖，填出生年可自动避开冲本命的日子。',
    ],
  };
}

/* ---------------- 八宅（复用原引擎） ---------------- */
export function bazhai(input) {
  const r = buildCompass(input);
  return {
    type: 'kan',
    ...r,
    summary: r.summary,
  };
}

/* ---------------- 阳宅：宅向 + 门 / 床 / 灶 / 书桌 ---------------- */
const GOOD = ['生气', '天医', '延年', '伏位'];
const PLACES = [
  { key: 'door', name: '大门', basis: '宅卦', note: '宅以门为气口，门的吉凶先于家具。' },
  { key: 'stove', name: '灶', basis: '宅卦', note: '灶为养命之源，宜压在凶方、面向吉方。' },
  { key: 'bed', name: '床', basis: '命卦', note: '床是一身之根，按命卦取吉方，不按宅卦。' },
  { key: 'desk', name: '书桌', basis: '命卦', note: '书桌看长坐的位置，宜向命卦吉方。' },
];

export function yangzhai({ heading, birthYear, gender, door, bed, stove, desk }) {
  const base = buildCompass({ heading, birthYear, gender, door });
  const houseMap = BAZHAI[base.meta.houseGua];
  const mingMap = BAZHAI[base.meta.mGua];
  const picked = { door, bed, stove, desk };

  const items = PLACES.filter((p) => picked[p.key]).map((p) => {
    const map = p.basis === '命卦' ? mingMap : houseMap;
    const star = map[picked[p.key]];
    return {
      key: p.key, name: p.name, basis: p.basis, note: p.note,
      dir: GUAS[picked[p.key]].dir,
      gua: picked[p.key],
      star: star.name, level: star.level, good: star.good, line: star.line, use: star.use,
    };
  });

  const goodCount = items.filter((i) => i.good).length;
  const badCount = items.length - goodCount;

  const mingGood = ['生气', '天医', '延年']
    .map((s) => ({ s, gua: Object.keys(mingMap).find((g) => mingMap[g].name === s) }))
    .map((x) => ({ ...x, dir: GUAS[x.gua].dir }));

  const advice = [
    `床头宜朝${mingGood[0].dir}（生气）或${mingGood[1].dir}（天医），这两个方位按你的命卦算，不按宅卦。`,
    base.meta.match
      ? '命宅同组，格局本来就顺；先处理采光、通风、动线，再谈方位。'
      : '命宅不同组，不必改门；把床、书桌、常坐的位置挪到命卦吉方即可。',
    badCount ? `有 ${badCount} 处落在凶方：${items.filter((i) => !i.good).map((i) => i.name + '（' + i.star + '）').join('、')}，能挪则挪，挪不动就用柜体、帘子做隔断，别在那里久卧久坐。` : '门、床、灶、桌四处都在吉方，剩下的就是把光、风、水处理好。',
  ];

  return {
    type: 'kan',
    title: '阳宅批注',
    heading: '阳宅',
    glyph: '宅',
    overall: Math.round(clamp(62 + goodCount * 6 - badCount * 4 + (base.meta.match ? 4 : 0), 45, 92)),
    summary: `${base.summary}${items.length ? `已看 ${items.length} 处：${items.map((i) => i.name + '在' + i.dir + '（' + i.star + '）').join('，')}。` : ''}`,
    meta: base.meta,
    items,
    mingGood,
    table: base.table,
    advice,
    cautions: items.filter((i) => !i.good).map((i) => `${i.name}在${i.dir}方，为${i.star}（${i.level}）：${i.line}。`),
    strengths: items.filter((i) => i.good).map((i) => `${i.name}在${i.dir}方，为${i.star}（${i.level}）：${i.line}。`),
    traits: [base.meta.houseGroup, base.meta.mingGroup],
  };
}

/* ---------------- 阴宅：坐向 + 来去水 + 形势 ---------------- */
const SANHE = {
  水: { zhi: ['申', '子', '辰'], sheng: '申' },
  火: { zhi: ['寅', '午', '戌'], sheng: '寅' },
  金: { zhi: ['巳', '酉', '丑'], sheng: '巳' },
  木: { zhi: ['亥', '卯', '未'], sheng: '亥' },
};
const TWELVE = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const WATER_GOOD_IN = ['长生', '冠带', '临官', '帝旺'];
const WATER_GOOD_OUT = ['衰', '病', '死', '墓', '绝'];

function juOf(zhi) {
  const k = Object.keys(SANHE).find((j) => SANHE[j].zhi.includes(zhi));
  return k ? { ju: k, sheng: SANHE[k].sheng } : { ju: '水', sheng: '申' };
}

function waterState(zhi, sheng) {
  return TWELVE[(ZHI.indexOf(zhi) - ZHI.indexOf(sheng) + 12) % 12];
}

export function yinzha({ heading, laishui, qushui, backing = true, mingtang = true, shaq = true }) {
  const facing = mountainAt(heading);
  const sitting = mountainAt(heading + 180);
  const { ju, sheng } = juOf(sitting.zhi);
  const sitState = waterState(sitting.zhi, sheng);

  const inState = laishui ? waterState(laishui, sheng) : null;
  const outState = qushui ? waterState(qushui, sheng) : null;

  const inGood = inState ? WATER_GOOD_IN.includes(inState) : null;
  const outGood = outState ? WATER_GOOD_OUT.includes(outState) : null;

  let score = 60;
  if (inGood) score += 12; else if (inState) score -= 6;
  if (outGood) score += 12; else if (outState) score -= 8;
  if (backing) score += 6;
  if (mingtang) score += 5;
  if (shaq) score += 4;

  const advice = [
    `坐${sitting.n}向${facing.n}，属${ju}局，长生在${sheng}。来水宜自${WATER_GOOD_IN.join('、')}方来，去水宜从${WATER_GOOD_OUT.join('、')}方消。`,
    backing ? '后有靠山，气有所止；再看靠山是否破碎、是否逼压。' : '后无靠，气易散。若无天然靠山，可用围墙、密植或后高前低的格局补。',
    mingtang ? '前有明堂，宜平整开阔，不宜堆土、高树、乱石塞心。' : '前无明堂，气不聚，宜清出前方空间，至少不使门前局促。',
    shaq ? '两侧有砂，能藏风；注意左右是否反背、是否高压逼穴。' : '两侧无砂，风直来直去，宜借地形或植树挡风。',
    '以上为三合水法的简化判断，只论方位与形势，不替代实地踏勘。',
  ];

  const summary = `坐${sitting.n}向${facing.n}（${sitting.n}山${facing.n}向），属${ju}局，长生在${sheng}。`
    + (inState ? `来水在${laishui}，为${inState}，${inGood ? '合局' : '不理想'}。` : '')
    + (outState ? `去水在${qushui}，为${outState}，${outGood ? '合局' : '不理想'}。` : '')
    + `形势：${[backing ? '有靠' : '无靠', mingtang ? '有明堂' : '无明堂', shaq ? '有砂' : '无砂'].join('，')}。`;

  return {
    type: 'kan',
    title: '阴宅批注',
    heading: '阴宅',
    glyph: '穴',
    overall: Math.round(clamp(score, 45, 92)),
    summary,
    meta: { heading: Math.round(((heading % 360) + 360) % 360), facing, sitting },
    ju, sheng, sitState,
    water: { laishui, inState, inGood, qushui, outState, outGood },
    advice,
    cautions: [
      ...(inState && !inGood ? [`来水在${laishui}为${inState}，来水不宜从${inState}方入。`] : []),
      ...(outState && !outGood ? [`去水在${qushui}为${outState}，去水不宜从${outState}方出。`] : []),
      ...(!backing ? ['后无靠，气散。'] : []),
    ],
    strengths: [
      `坐${sitting.zhi}属${ju}局，长生在${sheng}。`,
      ...(inGood ? [`来水${inState}，合长生水法。`] : []),
      ...(outGood ? [`去水${outState}，合墓绝消水。`] : []),
    ],
    traits: [`${ju}局`, `${sitting.n}山${facing.n}向`],
  };
}

export const TOOLS = {
  paipan,
  xiaoliuren,
  zeri,
  bazhai,
  yangzhai,
  yinzha,
};

export const TOOL_MANIFEST = [
  {
    name: 'paipan',
    title: '四柱排盘',
    desc: '按公历生日与时辰排四柱，输出五行分布、十神、身强弱、喜用、起运、大运与流年。',
    input: { date: 'YYYY-MM-DD', hour: '子…亥', gender: 'male|female' },
    deterministic: true,
  },
  {
    name: 'xiaoliuren',
    title: '小六壬',
    desc: '以农历月、日、时辰三数起课，落六宫，输出吉凶与断语。',
    input: { month: '1-12', day: '1-30', hourIndex: '1-12' },
    deterministic: true,
  },
  {
    name: 'zeri',
    title: '黄历择日',
    desc: '以月建与日辰定建除十二神，输出宜忌、冲煞与煞方。',
    input: { date: 'YYYY-MM-DD' },
    deterministic: true,
  },
  {
    name: 'bazhai',
    title: '八宅定盘',
    desc: '坐向、出生年、性别、门位 → 宅卦、命卦、八宅吉凶表。',
    input: { heading: '0-359', birthYear: '1900-2100', gender: 'male|female', door: '乾坎艮震巽离坤兑' },
    deterministic: true,
  },  {
    name: 'yangzhai',
    title: '阳宅定盘',
    desc: '坐向、出生年、性别、门/床/灶/书桌方位 → 宅卦、命卦、各处吉凶与安置建议。',
    input: { heading: '0-359', birthYear: '1900-2100', gender: 'male|female', door: '八卦', bed: '八卦?', stove: '八卦?', desk: '八卦?' },
    deterministic: true,
  },
  {
    name: 'yinzha',
    title: '阴宅定穴',
    desc: '坐山、来去水、形势 → 三合局、长生位、来去水吉凶与形势判断。',
    input: { heading: '0-359', laishui: '地支?', qushui: '地支?', backing: 'bool', mingtang: 'bool', shaq: 'bool' },
    deterministic: true,
  },
];
