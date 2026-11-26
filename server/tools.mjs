/* ==========================================================================
   tools.mjs — 确定性工具层
   一张八字盘、一课上六壬、一日建除，都只依赖输入，不依赖模型。
   ========================================================================== */
import fs from 'node:fs';
import { elementsOf, buildCompass, ganzhi, mountainAt } from '../assets/js/engine.js';
import { GUAS, BAZHAI } from '../assets/js/data.js';
import { fortuneSheet } from './fortune.mjs';
import { solarCorrection, toMinutes, fromMinutes, zhiOfMinutes, midMinutesOfZhi } from './solar.mjs';
import { cityByName } from './cities.mjs';
import { lunarToSolar } from './lunar.mjs';
import { deepen } from './bazi.mjs';
import { inChinaDST } from './dst-cn.mjs';
import { isClash, isHe, isStemHe, dayRelations, dayEnergy, dayAdvice, BRANCH_CLASH, BRANCH_HE } from './relations.mjs';

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const GAN_E = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
const ZHI_E = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const pad = (n) => String(n).padStart(2, '0');

/* 以 2000-01-01 为戊午日锚点推算日柱；与两个独立记忆锚点自洽 */
function dayGanzhi(y, m, d) {
  const days = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000);
  const idx = (((54 + days) % 60) + 60) % 60;
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

const JIEQI = JSON.parse(fs.readFileSync(new URL('../knowledge/jieqi.json', import.meta.url), 'utf8'));
const TERM_ZHI = { 大雪: 0, 小寒: 1, 立春: 2, 惊蛰: 3, 清明: 4, 立夏: 5, 芒种: 6, 小暑: 7, 立秋: 8, 白露: 9, 寒露: 10, 立冬: 11 };
const termMs = (y, name) => {
  const iso = JIEQI[y]?.[name];
  return iso ? Date.parse(iso) : null;
};

const termCache = new Map();
export function termsOf(year) {
  if (!termCache.has(year)) {
    termCache.set(year, TERMS.map((t) => ({
      ...t,
      jd: termJD(year, t),
      utc: (termJD(year, t) - 2440587.5) * 86400000,
    })));
  }
  return termCache.get(year);
}

function monthZhiOf(y, m, d, minuteOfDay = 720) {
  const t = Date.UTC(y, m - 1, d) + (minuteOfDay - 480) * 60000;
  let bestMs = null;
  let bestZhi = null;
  for (const yy of [y - 1, y]) {
    const row = JIEQI[yy];
    if (!row) continue;
    for (const [name, iso] of Object.entries(row)) {
      const ms = Date.parse(iso);
      if (ms <= t && (bestMs === null || ms > bestMs)) {
        bestMs = ms;
        bestZhi = TERM_ZHI[name];
      }
    }
  }
  if (bestZhi !== null) return bestZhi;
  const birthJD = t / 86400000 + 2440587.5;
  const all = [...termsOf(y - 1), ...termsOf(y), ...termsOf(y + 1)].sort((a, b) => a.jd - b.jd);
  const prev = all.filter((x) => x.jd <= birthJD).pop();
  return prev ? prev.zhi : 0;
}

/* 年柱以立春为界（按精确立春时刻） */
function yearOf(y, m, d, minuteOfDay = 720) {
  const t = Date.UTC(y, m - 1, d) + (minuteOfDay - 480) * 60000;
  const lichun = termMs(y, '立春');
  if (lichun !== null) return t < lichun ? y - 1 : y;
  const birthJD = t / 86400000 + 2440587.5;
  return birthJD < termsOf(y)[1].jd ? y - 1 : y;
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

export function paipan({ date, hour = '午', gender = 'male', clock, city, province, longitude, hourUnknown = false, calendar = 'solar', lunar = null }) {
  let lunarConverted = false;
  let lunarInfo = null;
  if (calendar === 'lunar') {
    if (!lunar) throw new Error('农历输入需要 lunar: { year, month, day, leap }');
    const c = lunarToSolar(lunar.year, lunar.month, lunar.day, Boolean(lunar.leap));
    date = c.date;
    lunarConverted = true;
    lunarInfo = { year: Number(lunar.year), month: Number(lunar.month), day: Number(lunar.day), leap: Boolean(lunar.leap) };
  }

  let [y, m, d] = String(date).split('-').map(Number);
  if (!y || !m || !d) throw new Error('date 需要 YYYY-MM-DD');

  const lng = Number.isFinite(Number(longitude)) && longitude !== undefined
    ? Number(longitude)
    : (cityByName(city, province)?.lng ?? null);

  /* 起算时刻：有钟点用钟点；时辰未知用正午；否则取所报时辰的中点 */
  let baseMinutes = null;
  if (typeof clock === 'string' && toMinutes(clock) !== null) baseMinutes = toMinutes(clock);
  else if (hourUnknown) baseMinutes = 12 * 60;
  else baseMinutes = midMinutesOfZhi(hour);
  if (baseMinutes === null) throw new Error('hour 需要地支');

  const inputMinutes = baseMinutes;

  /* 1986–1991 夏令时：当时钟表快 1 小时，先减回标准时间 */
  const dstApplied = inChinaDST(y, m, d);
  if (dstApplied) baseMinutes -= 60;

  const correction = lng === null ? 0 : solarCorrection(y, m, d, lng);
  const adjMinutes = Math.round(baseMinutes + correction);
  const { clock: correctedClock, dayShift } = fromMinutes(adjMinutes);

  if (dayShift !== 0) {
    const shifted = new Date(Date.UTC(y, m - 1, d + dayShift));
    y = shifted.getUTCFullYear();
    m = shifted.getUTCMonth() + 1;
    d = shifted.getUTCDate();
  }

  const effectiveHour = zhiOfMinutes(adjMinutes);
  const hZhiIdx = ZHI.indexOf(effectiveHour);
  if (hZhiIdx < 0) throw new Error('hour 需要地支');
  const hourMid = Math.floor((((adjMinutes % 1440) + 1440) % 1440) / 60);

  const notes = [];
  if (lunarConverted) notes.push('lunar_converted');
  if (dstApplied) notes.push('china_dst_applied');
  if (hourUnknown) notes.push('hour_assumed');
  if (lng === null) notes.push('true_solar_skipped_no_longitude');
  else notes.push('true_solar_applied');

  const resolved = {
    calendar: lunarConverted ? 'lunar' : 'solar',
    lunar: lunarInfo,
    dstApplied,
    inputClock: fromMinutes(inputMinutes).clock,
    city: city || null,
    province: province || null,
    longitude: lng,
    baseClock: `${String(Math.floor(baseMinutes / 60)).padStart(2, '0')}:${String(baseMinutes % 60).padStart(2, '0')}`,
    correctedClock,
    correctionMinutes: Number(correction.toFixed(1)),
    adjustedDate: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    hour: effectiveHour,
    hourAssumed: Boolean(hourUnknown),
    trueSolarApplied: lng !== null,
    notes,
  };

  const minuteOfDay = ((adjMinutes % 1440) + 1440) % 1440;
  const bYear = yearOf(y, m, d, minuteOfDay);
  const yGanIdx = ((bYear - 4) % 10 + 10) % 10;
  const yZhiIdx = ((bYear - 4) % 12 + 12) % 12;
  const mZhiIdx = monthZhiOf(y, m, d, minuteOfDay);
  const mGanIdx = (yGanIdx * 2 + 2 + ((mZhiIdx - 2 + 12) % 12)) % 10;
  /* 23:00 起算子时：晚子时按次日日柱（sect 2），与 conventions.hourBoundary 一致 */
  let dayY = y;
  let dayM = m;
  let dayD = d;
  if (hourMid >= 23) {
    const nx = new Date(Date.UTC(y, m - 1, d + 1));
    dayY = nx.getUTCFullYear();
    dayM = nx.getUTCMonth() + 1;
    dayD = nx.getUTCDate();
  }
  const day = dayGanzhi(dayY, dayM, dayD);
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
  const deep = deepen(pillars, day.gan, pillars[0].gan);
  const me = GAN_E[GAN.indexOf(day.gan)];
  const same = elems.find((x) => x.e === me)?.v || 0;
  const support = elems.find((x) => x.e === Object.keys(SHENG).find((k) => SHENG[k] === me))?.v || 0;

  const strong = same + support * 0.8 >= 45;
  const yong = strong ? [KE[me], SHENG[me]] : [me, Object.keys(SHENG).find((k) => SHENG[k] === me)];

  /* ---- 大运：阳年男顺、阴年男逆；阳年女逆、阴年女顺 ---- */
  const birthMs = Date.UTC(y, m - 1, d) + (minuteOfDay - 480) * 60000;
  const allTerms = [];
  for (const yy of [y - 1, y, y + 1]) {
    const row = JIEQI[yy];
    if (!row) continue;
    for (const [name, iso] of Object.entries(row)) allTerms.push({ name, ms: Date.parse(iso) });
  }
  allTerms.sort((a, b) => a.ms - b.ms);
  const prevTerm = allTerms.filter((t) => t.ms <= birthMs).pop();
  const nextTerm = allTerms.find((t) => t.ms > birthMs);

  const yangYear = yGanIdx % 2 === 0;
  const forward = yangYear === (gender === 'male');
  const distDays = forward ? (nextTerm.ms - birthMs) / 86400000 : (birthMs - prevTerm.ms) / 86400000;
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
    date, hour: effectiveHour, gender,
    resolved,
    conventions: {
      yearBoundary: 'lichun',
      hourBoundary: 'day_changes_at_23',
      trueSolarApplied: resolved.trueSolarApplied,
      hourAssumed: resolved.hourAssumed,
    },
    notes,
    pillars,
    tenGods,
    deep,
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
/* 六宫：吉凶 + 五行方位类象（传统口诀，属文化娱乐参考）+ 应期节奏 */
export const LIUREN = [
  { name: '大安', luck: '吉', elem: '木', dir: '东', color: '青绿', num: '3、8',
    person: '长辈、稳重之人', timing: '事缓则圆，多在近日或春季见分晓',
    body: '身不动，事在近处。所问之事宜守成，不宜远求；等人则至，失物未远。' },
  { name: '留连', luck: '小凶', elem: '水', dir: '北', color: '黑蓝', num: '1、6',
    person: '反复之人、旧相识', timing: '事多拖延，往往一再展期',
    body: '事多拖延，音信迟。宜缓不宜急，反复确认再落笔；所托之人未必尽力。' },
  { name: '速喜', luck: '吉', elem: '火', dir: '南', color: '红橙', num: '2、7',
    person: '热心人、消息灵通者', timing: '事在须臾，近日即有消息',
    body: '喜信将至，事在须臾。宜速行、速决；求财得，问病轻，远行有信。' },
  { name: '赤口', luck: '凶', elem: '金', dir: '西', color: '白黄', num: '4、9',
    person: '口舌之人、执法者', timing: '防一时口角，过后渐平',
    body: '口舌是非，争讼之象。宜少言、避争；文书合同细看，勿代人担保。' },
  { name: '小吉', luck: '吉', elem: '木', dir: '东南', color: '青绿', num: '3、8',
    person: '和气之人、中间人', timing: '小有所成，需借人力',
    body: '事有小成，人和为贵。宜与人合作、托人办事；所谋多顺，但利不大。' },
  { name: '空亡', luck: '大凶', elem: '土', dir: '中 / 西南', color: '土黄', num: '5、10',
    person: '虚浮之人、久无音信者', timing: '所问多半无期，宜另寻他途',
    body: '事多落空，阴人作梗。宜止不宜进，所问之事多半无果；静待时机。' },
];

/* 事项分类：从所问的话里识别，给同一落宫一句对题的断语 */
export const LIUREN_TOPICS = [
  { id: 'wealth', name: '求财', keys: ['钱', '财', '生意', '买卖', '投资', '收入', '工资', '报价', '回款', '赚钱', '成本', '价格'],
    lines: {
      '大安': '钱在近处，别往远处追：先把手头的账理清，老客户比新门路靠谱。',
      '留连': '钱要账期慢，催得急反而拖；先把单据和约定写清楚。',
      '速喜': '进账的消息来得快，可趁热打铁，但别当场拍板大额。',
      '赤口': '容易在报价、合同上起争执，数字白纸黑字再签字。',
      '小吉': '有小的进账或人情回报，积少成多，别贪大。',
      '空亡': '这笔钱多半落空或回收无期，先保住本金，别追加。',
    } },
  { id: 'work', name: '工作与考试', keys: ['工作', '面试', '升职', '跳槽', '考试', '事业', 'offer', '录', '竞聘', '调动', '官司', '诉讼'],
    lines: {
      '大安': '位置稳得住，别急着动；把手上的成果整理出来，比到处打听更有用。',
      '留连': '流程会拖，名单或结果反复；多问一句进度，材料备齐别缺漏。',
      '速喜': '消息来得快，接到通知就果断回应，机会不等人。',
      '赤口': '容易有口碑或口舌之争，少表态、多留痕，别在人前评人。',
      '小吉': '有贵人从中说项，配合别人一起推进，比单打独斗顺。',
      '空亡': '这轮多半没有下文，别把希望押在一处，同时准备别的路。',
    } },
  { id: 'love', name: '感情', keys: ['感情', '恋爱', '婚姻', '结婚', '对象', '分手', '复合', '喜欢', '相亲', '异地'],
    lines: {
      '大安': '关系稳在近处，别急着推进或试探；把日常过好，比表态更管用。',
      '留连': '心里反复、对方也含糊；先把话说明白，别靠猜。',
      '速喜': '有好消息或主动的回应，趁热把约见面、把话说到明处。',
      '赤口': '容易因一句话起争执，先停一停再回，别翻旧账。',
      '小吉': '有中间人帮忙撮合，顺着人情走，别硬碰。',
      '空亡': '这层关系暂时没有着落，先把自己的日子过好，别追着问。',
    } },
  { id: 'move', name: '出行与搬迁', keys: ['出行', '搬家', '旅行', '出差', '迁', '搬', '走', '出远门'],
    lines: {
      '大安': '近处可行、远行宜缓；行李和证件先备齐，稳着走。',
      '留连': '路上多半耽搁，预留缓冲时间，别把行程排太满。',
      '速喜': '说走就走，路上顺，但提前订好落脚处。',
      '赤口': '路上易有口角或剐蹭，慢一点、让一步，别抢时间。',
      '小吉': '有人结伴或接应更顺，把行程告诉可信的人。',
      '空亡': '这趟多半成行不了或白跑，先确认消息真假再动身。',
    } },
  { id: 'lost', name: '找东西', keys: ['丢', '找', '失物', '丢了', '不见', '钥匙', '手机', '钱包'],
    lines: {
      '大安': '东西没走远，就在常待的地方；先翻手边和原处。',
      '留连': '被压在别处或一时记错，过一阵再找，越急越乱。',
      '速喜': '很快有线索，问一问身边的人就有消息。',
      '赤口': '可能被别人动过或借走，好好问，别先指责。',
      '小吉': '有人替你收着，找人问一声就有。',
      '空亡': '一时找不回，先止损、补办，别耗在原地。',
    } },
  { id: 'health', name: '身体', keys: ['病', '身体', '手术', '健康', '检查', '疼', '不舒服'],
    lines: {
      '大安': '情况平稳，按原来的节奏养着；别自己加药或停药。',
      '留连': '好得慢，反复拉扯；该复查就复查，别拖。',
      '速喜': '有好转的迹象，趁势把作息调好。',
      '赤口': '容易为治疗方案起争执，多听医生的专业意见。',
      '小吉': '有人照应、有办法，配合着来恢复得快。',
      '空亡': '心里没底的时候，先去正规医院查清楚，别靠猜。',
    } },
];

const PACE = { 大安: 45, 留连: 25, 速喜: 90, 赤口: 70, 小吉: 60, 空亡: 12 };
const HARMONY = { 大安: 70, 留连: 45, 速喜: 72, 赤口: 25, 小吉: 80, 空亡: 30 };
const LUCK_BASE = { 吉: 78, 小凶: 58, 凶: 52, 大凶: 45 };

function detectTopic(question) {
  const q = String(question || '');
  for (const t of LIUREN_TOPICS) if (t.keys.some((k) => q.includes(k))) return t;
  return { id: 'general', name: 'general', lines: {} };
}

function wangOf(elem, lunarMonth) {
  const season = lunarMonth <= 3 ? '春' : lunarMonth <= 6 ? '夏' : lunarMonth <= 9 ? '秋' : '冬';
  const seasonElem = { 春: '木', 夏: '火', 秋: '金', 冬: '水' }[season];
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };
  /* 以当令五行为「我」：同我旺、我生相、生我休、克我囚、我克死 */
  let state = '平';
  if (elem === seasonElem) state = '旺';
  else if (SHENG[seasonElem] === elem) state = '相';
  else if (SHENG[elem] === seasonElem) state = '休';
  else if (KE[elem] === seasonElem) state = '囚';
  else if (KE[seasonElem] === elem) state = '死';
  const delta = { 旺: 6, 相: 3, 平: 0, 休: 0, 囚: -3, 死: -6 }[state] || 0;
  const desc = { 旺: '得令而旺，事有根基', 相: '得生而相，后劲尚足', 休: '当令者休，气势平和',
    囚: '受克制而囚，进展有压', 死: '失令而弱，宜守不宜进', 平: '气势平和' }[state];
  return { season, seasonElem, state, delta, text: `${season}季${seasonElem}当令，落宫属${elem}，${desc}。` };
}

export function xiaoliuren({ month, day, hourIndex, question = '' }) {
  const m = Number(month), d = Number(day), h = Number(hourIndex);
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 30) || !(h >= 1 && h <= 12)) {
    throw new Error('month 1-12 / day 1-30 / hourIndex 1-12');
  }
  const pos = ((m - 1) + (d - 1) + (h - 1)) % 6;
  const gua = LIUREN[pos];
  const topic = detectTopic(question);
  const wang = wangOf(gua.elem, m);
  const overall = Math.round(clamp((LUCK_BASE[gua.luck] || 60) + wang.delta, 35, 92));
  const topicLine = topic.lines[gua.name]
    || `落在${gua.name}：${gua.body}`;

  return {
    type: 'bu',
    month: m, day: d, hourIndex: h,
    pos,
    overall,
    gua,
    topic: { id: topic.id, name: topic.name === 'general' ? '所占之事' : topic.name },
    topicLine,
    wang,
    scores: [
      { label: '事体', v: overall, note: '这一课的总体倾向' },
      { label: '节奏', v: PACE[gua.name] ?? 60, note: '事情来得快还是慢' },
      { label: '人事', v: HARMONY[gua.name] ?? 60, note: '与人相处、配合的顺逆' },
    ],
    steps: [
      { label: '起月', text: `自大安起，顺数至${m}月，落${LIUREN[(m - 1) % 6].name}` },
      { label: '起日', text: `自${LIUREN[(m - 1) % 6].name}起，顺数至${d}日，落${LIUREN[(m - 1 + d - 1) % 6].name}` },
      { label: '起时', text: `自${LIUREN[(m - 1 + d - 1) % 6].name}起，顺数至第${h}时，落${gua.name}` },
    ],
    summary: `农历${m}月${d}日第${h}时，落${gua.name}（${gua.luck}）。${wang.text}${topicLine}`,
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

/* 黄道黑道十二神：按月建起青龙顺行，与建除共用同一地支序号。
   六黄道（青龙/明堂/金匮/天德/玉堂/司命）为吉，六黑道为凶。
   注：黄黑道起例各派略有差异，本项目采用月建起青龙顺行的常见排法。 */
const HUANGDAO = [
  { name: '青龙', kind: '黄道' }, { name: '明堂', kind: '黄道' },
  { name: '天刑', kind: '黑道' }, { name: '朱雀', kind: '黑道' },
  { name: '金匮', kind: '黄道' }, { name: '天德', kind: '黄道' },
  { name: '白虎', kind: '黑道' }, { name: '玉堂', kind: '黄道' },
  { name: '天牢', kind: '黑道' }, { name: '玄武', kind: '黑道' },
  { name: '司命', kind: '黄道' }, { name: '勾陈', kind: '黑道' },
];

/* 月德：寅午戌月在丙，申子辰月在壬，亥卯未月在甲，巳酉丑月在庚 */
const YUEDE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬',
  亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
/* 天德（月建方）：正丁二申三壬四辛五亥六甲七癸八寅九丙十乙十一巳十二庚 */
const TIANDE = ['丁', '申', '壬', '辛', '亥', '甲', '癸', '寅', '丙', '乙', '巳', '庚'];

/* 地支关系：六合、三合、相害、相刑、比和 */
const BRANCH_SANHE = [['申', '子', '辰'], ['寅', '午', '戌'], ['巳', '酉', '丑'], ['亥', '卯', '未']];
const BRANCH_HAI = [['子', '未'], ['丑', '午'], ['寅', '巳'], ['卯', '辰'], ['申', '亥'], ['酉', '戌']];
const BRANCH_XING = [['子', '卯'], ['丑', '戌'], ['寅', '巳'], ['辰', '辰'], ['午', '午'], ['未', '丑'], ['申', '寅'], ['酉', '酉'], ['戌', '未'], ['巳', '申'], ['亥', '亥'], ['卯', '子']];
function branchRel(a, b) {
  if (!a || !b) return [];
  const out = [];
  if (a === b) out.push({ type: '比和', v: 1, text: '同支' });
  if (BRANCH_CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push({ type: '冲', v: -5, text: `${a}${b}相冲` });
  if (BRANCH_HE.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push({ type: '合', v: 3, text: `${a}${b}六合` });
  if (BRANCH_SANHE.some((g) => g.includes(a) && g.includes(b))) out.push({ type: '三合', v: 3, text: `${a}${b}同属三合` });
  if (BRANCH_HAI.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push({ type: '害', v: -3, text: `${a}${b}相害` });
  if (BRANCH_XING.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) out.push({ type: '刑', v: -3, text: `${a}${b}相刑` });
  return out;
}

const EVENTS = [
  { id: 'marry', name: '嫁娶订婚', keys: ['嫁娶', '结亲', '订婚', '纳采'], prefer: ['成', '定', '危', '开'], avoid: ['破', '闭', '收'] },
  { id: 'propose', name: '求婚', keys: ['嫁娶', '结亲', '订婚', '纳采'], prefer: ['成', '定', '开'], avoid: ['破', '闭'] },
  { id: 'move', name: '入宅搬家', keys: ['入宅', '移徙', '搬家', '安床'], prefer: ['成', '开', '除', '危'], avoid: ['破', '闭'] },
  { id: 'open', name: '开业开市', keys: ['开市', '开业', '交易', '立券'], prefer: ['开', '成', '满', '定'], avoid: ['破', '闭', '收'] },
  { id: 'travel', name: '出行赴任', keys: ['出行', '赴任', '移徙'], prefer: ['成', '开', '除', '执'], avoid: ['破', '闭', '危'] },
  { id: 'build', name: '动土装修', keys: ['动土', '修造', '上梁', '起基'], prefer: ['成', '开', '定', '执'], avoid: ['破', '闭', '月破'] },
  { id: 'sign', name: '签约立约', keys: ['立约', '交易', '纳财', '立券'], prefer: ['定', '成', '开', '执'], avoid: ['破', '闭'] },
  { id: 'medical', name: '求医问诊', keys: ['求医', '疗病', '除服', '解除'], prefer: ['除', '危', '定', '成'], avoid: ['破', '闭'] },
  { id: 'bury', name: '安葬破土', keys: ['安葬', '破土', '埋藏'], prefer: ['破', '危', '定', '执'], avoid: ['开', '成', '满'] },
  { id: 'worship', name: '祭祀祈福', keys: ['祭祀', '祈福', '求嗣'], prefer: ['除', '定', '执', '成'], avoid: ['破', '闭'] },
  { id: 'study', name: '入学考试', keys: ['入学', '赴考', '求财'], prefer: ['开', '成', '定', '满'], avoid: ['破', '闭'] },
];

const pad2 = (n) => String(n).padStart(2, '0');
const ymd = (dt) => `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;

function dayInfo(y, m, d) {
  const day = dayGanzhi(y, m, d);
  const mZhi = monthZhiOf(y, m, d);
  const idx = ((ZHI.indexOf(day.zhi) - mZhi) % 12 + 12) % 12;
  const jc = JIANCHU[idx];
  const hd = HUANGDAO[idx];
  const chong = ZHI[(ZHI.indexOf(day.zhi) + 6) % 12];
  const sha = SHA.find((s) => s.zhi.includes(day.zhi))?.dir || '—';
  const monthZhiName = ZHI[mZhi];
  const yueDe = YUEDE[monthZhiName] || null;
  const tianDe = TIANDE[(m - 1 + 12) % 12];
  const deShen = [];
  if (day.gan === yueDe) deShen.push('月德');
  if (day.gan === tianDe || day.zhi === tianDe) deShen.push('天德');
  return { day, mZhi, idx, jc, hd, chong, sha, monthZhiName, yueDe, tianDe, deShen };
}

/* 某日的十二时辰吉时：时支与日支的合/冲/三合/害 + 时干与日干的合 + 黄黑道 */
function hoursOf(info) {
  const dayZhi = info.day.zhi;
  const dayGan = info.day.gan;
  const HOUR_ZHI = ZHI;
  const out = [];
  for (let i = 0; i < 12; i++) {
    const hz = HOUR_ZHI[i];
    const hg = GAN[((GAN.indexOf(dayGan) % 5) * 2 + i) % 10];
    let s = 0;
    const notes = [];
    const rels = branchRel(dayZhi, hz);
    for (const r of rels) { s += r.v; notes.push(r.text); }
    if (isStemHe(dayGan, hg)) { s += 3; notes.push(`${dayGan}${hg}干合`); }
    if (isClash(dayZhi, hz)) notes.push('时冲日');
    out.push({ zhi: hz, gan: hg, s, notes, level: s >= 3 ? '宜' : s <= -3 ? '避' : '平' });
  }
  return out;
}

export function zeri({ date, event, days = 30, birthYear, from }) {
  const ev = EVENTS.find((e) => e.id === event) || EVENTS.find((e) => e.name === event);

  /* 单日查询：给出这一天的完整信息 + 吉时 */
  if (!ev) {
    const [y, m, d] = String(date).split('-').map(Number);
    const info = dayInfo(y, m, d);
    const hours = hoursOf(info);
    return {
      type: 'ze',
      date,
      ganzhi: info.day.gan + info.day.zhi,
      monthZhi: info.monthZhiName,
      jianchu: info.jc,
      huangdao: info.hd,
      deShen: info.deShen,
      chong: info.chong,
      sha: info.sha,
      goodHours: hours.filter((h) => h.level === '宜').map((h) => `${h.zhi}时`),
      summary: `${y}年${m}月${d}日，${info.day.gan}${info.day.zhi}日，${info.monthZhiName}月${info.jc.name}日（${info.jc.luck}），${info.hd.name}${info.hd.kind}。冲${info.chong}，煞${info.sha}。${info.deShen.length ? `得${info.deShen.join('、')}。` : ''}`,
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
    const { jc, hd } = info;

    /* 打分：建除吉凶 + 事由关键词 + 事由偏好 + 黄黑道 + 德神 + 本命生肖关系 */
    let score = jc.luck === '吉' ? 3 : jc.luck === '凶' ? -4 : 0;
    const reasons = [];
    if (jc.luck === '吉') reasons.push(`${jc.name}日属吉`);
    if (jc.luck === '凶') reasons.push(`${jc.name}日不宜`);

    const hitYi = ev.keys.filter((k) => jc.yi.includes(k));
    const hitJi = ev.keys.filter((k) => jc.ji.includes(k));
    score += hitYi.length * 4;
    score -= hitJi.length * 5;
    if (hitYi.length) reasons.push(`宜${hitYi.join('、')}`);
    if (hitJi.length) reasons.push(`忌${hitJi.join('、')}`);

    if (ev.prefer?.includes(jc.name)) { score += 3; reasons.push(`利${ev.name}`); }
    if (ev.avoid?.includes(jc.name)) { score -= 3; reasons.push(`不宜${ev.name}`); }

    if (hd.kind === '黄道') { score += 2; reasons.push(`${hd.name}黄道`); }
    else { score -= 2; reasons.push(`${hd.name}黑道`); }

    if (info.deShen.length) { score += 2; reasons.push(`得${info.deShen.join('、')}`); }

    let birthRel = [];
    if (birthZhi) {
      birthRel = branchRel(birthZhi, info.day.zhi);
      birthRel.forEach((r) => { score += r.v; reasons.push(`${r.text}本命`); });
    }

    const hours = hoursOf(info);
    const goodHours = hours.filter((h) => h.level === '宜').map((h) => `${h.zhi}时`);

    all.push({
      date: ymd(dt),
      weekday: '日一二三四五六'[dt.getUTCDay()],
      ganzhi: info.day.gan + info.day.zhi,
      jianchu: jc.name,
      luck: jc.luck,
      huangdao: hd.name,
      hdKind: hd.kind,
      deShen: info.deShen,
      chong: info.chong,
      sha: info.sha,
      yi: jc.yi,
      ji: jc.ji,
      birthRel: birthRel.map((r) => r.text),
      goodHours,
      score,
      reasons,
    });
  }

  const picks = all.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6);
  const zeriScore = Math.round(clamp(58 + Math.max(0, picks[0]?.score || 0) * 2.2, 50, 92));
  const avoid = all.filter((x) => x.score <= -4).sort((a, b) => a.score - b.score).slice(0, 5);
  /* 三维评分：日辰（建除黄道德神）、事由适配、本命相合 */
  const dims = [
    { label: '日辰', v: clamp(58 + Math.max(0, picks[0]?.score || 0) * 2, 45, 92) },
    { label: '事由', v: clamp(56 + Math.max(0, ...all.map((x) => (ev.prefer?.includes(x.jianchu) ? 18 : 0))) , 45, 92) },
    { label: '本命', v: birthZhi ? clamp(60 + Math.max(0, ...all.map((x) => x.birthRel.reduce((s, r) => s + (r.includes('合') ? 1 : 0), 0) * 8)), 40, 92) : 62 },
  ];

  return {
    type: 'ze',
    event: { id: ev.id, name: ev.name },
    from: ymd(base),
    to: ymd(new Date(base.getTime() + (span - 1) * 86400000)),
    days: span,
    overall: zeriScore,
    birthYear: birthYear || null,
    birthZhi,
    picks,
    avoid,
    dims,
    summary: `按「${ev.name}」看未来 ${span} 天：${picks.length ? `建议 ${picks.slice(0, 3).map((x) => `${x.date.slice(5)}（${x.jianchu}·${x.huangdao}）`).join('、')} 等 ${picks.length} 个日子` : '没有明显合适的日子'}；避开 ${avoid.length ? avoid.map((x) => x.date.slice(5)).join('、') : '无特别忌日'}。`,
    advice: [
      picks.length ? `首选 ${picks[0].date.slice(5)}：${picks[0].huangdao}${picks[0].hdKind}，${picks[0].jianchu}日${picks[0].goodHours.length ? `，当天${picks[0].goodHours.slice(0, 3).join('、')}较佳` : ''}。` : '这个区间没有高分日，建议放宽到 60 天再挑。',
      '建除、黄黑道、德神只是选日的几个角度，彼此也会打架；取分数高的日子，再看当天是否冲主事人。',
      birthZhi ? `已按本命生肖${birthZhi}避开冲害；填出生年只能看生肖，精细到日柱需另排八字。` : '填了出生年，就能自动避开冲、害本命生肖的日子。',
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

/* ---------------- 流日 ---------------- */
export function daily({ birth = {}, days = 7, from } = {}) {
  const chart = paipan(birth);
  const n = Math.min(14, Math.max(1, Number(days) || 7));
  const start = from ? new Date(`${from}T00:00:00+08:00`) : new Date();
  const out = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const dd = d.getDate();
    const gz = dayGanzhi(y, m, dd);
    const rel = dayRelations(gz.gan, gz.zhi, chart.pillars);
    const god = shishen(chart.dayMaster, gz.gan);
    const adv = dayAdvice(rel, god);
    out.push({
      date: `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`,
      ganzhi: gz.gan + gz.zhi,
      tenGod: god,
      relations: rel,
      energy: dayEnergy(rel),
      do: adv.do,
      avoid: adv.avoid,
    });
  }
  const avg = Math.round(out.reduce((a, x) => a + x.energy, 0) / out.length);
  return {
    type: 'daily',
    natal: chart.pillars.map((p) => p.gan + p.zhi),
    dayMaster: chart.dayMaster,
    days: out,
    overall: avg,
    summary: `未来 ${n} 天，按 ${chart.dayMaster} 日主看：${out.map((x) => x.date.slice(5) + ' ' + x.ganzhi).join('、')}。`,
  };
}

/* ---------------- 合盘 ---------------- */
const NAYIN_ELEM = (name) => (name || '').slice(-1);
const ELEM_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

export function hepan({ a = {}, b = {} }) {
  const A = paipan(a);
  const B = paipan(b);
  const relations = [];
  let core = 60;
  let shengxiao = 60;
  let wuxing = 60;
  let shishenScore = 60;

  /* 1) 日柱核心：日干合冲、夫妻宫（日支）合冲害刑 */
  if (isStemHe(A.dayMaster, B.dayMaster)) { core += 12; relations.push({ dim: '性情', type: '日干合', text: `${A.dayMaster} 与 ${B.dayMaster} 相合，性情上容易互相欣赏` }); }
  if (isHe(A.pillars[2].zhi, B.pillars[2].zhi)) { core += 12; relations.push({ dim: '相处', type: '夫妻宫合', text: `夫妻宫 ${A.pillars[2].zhi} 与 ${B.pillars[2].zhi} 相合，节奏合拍` }); }
  if (isClash(A.pillars[2].zhi, B.pillars[2].zhi)) { core -= 15; relations.push({ dim: '相处', type: '夫妻宫冲', text: `夫妻宫 ${A.pillars[2].zhi} 与 ${B.pillars[2].zhi} 相冲，节奏一快一慢` }); }

  /* 2) 四柱逐柱对照 */
  const pillarNames = ['年柱', '月柱', '日柱', '时柱'];
  const pillarMeanings = ['根基与家庭', '成长环境', '自身与伴侣宫', '晚年与子女'];
  const pillarTable = pillarNames.map((label, i) => {
    const za = A.pillars[i].zhi, zb = B.pillars[i].zhi;
    const rels = branchRel(za, zb);
    rels.forEach((r) => {
      if (i !== 2 || r.type !== '比和') relations.push({ dim: '四柱', type: `${label}${r.type}`, text: `${label} ${za} 与 ${zb} ${r.text}` });
    });
    return { label, meaning: pillarMeanings[i], a: A.pillars[i].gan + A.pillars[i].zhi, b: B.pillars[i].gan + B.pillars[i].zhi,
      rel: rels.map((r) => r.text).join('、') || '无直接冲合' };
  });

  /* 3) 生肖（年支）关系 */
  const yearRels = branchRel(A.pillars[0].zhi, B.pillars[0].zhi);
  yearRels.forEach((r) => {
    shengxiao += r.v * 2;
    relations.push({ dim: '生肖', type: r.type, text: `生肖 ${A.pillars[0].zhi} 与 ${B.pillars[0].zhi} ${r.text}` });
  });

  /* 4) 日柱纳音五行 */
  const nayinA = A.deep?.nayin?.find((x) => x.label === '日柱')?.name || '';
  const nayinB = B.deep?.nayin?.find((x) => x.label === '日柱')?.name || '';
  const neA = NAYIN_ELEM(nayinA), neB = NAYIN_ELEM(nayinB);
  let nayinText = '纳音无直接生克';
  if (neA && neB) {
    if (ELEM_SHENG[neA] === neB) { wuxing += 6; nayinText = `你的纳音${nayinA}生对方的${nayinB}，你更愿意付出`; }
    else if (ELEM_SHENG[neB] === neA) { wuxing += 6; nayinText = `对方纳音${nayinB}生你的${nayinA}，对方更顾着你`; }
    else if (neA === neB) { wuxing += 3; nayinText = `两人纳音同属${neA}，气质相近`; }
  }

  /* 5) 五行互补：一方喜用恰好是对方旺项 */
  const topA = [...A.elems].sort((x, y) => y.v - x.v)[0].e;
  const topB = [...B.elems].sort((x, y) => y.v - x.v)[0].e;
  const weakA = A.weak, weakB = B.weak;
  if (A.yong.includes(topB)) { wuxing += 8; relations.push({ dim: '五行', type: '互为喜用', text: `对方以 ${topB} 为主，正是你的喜用` }); }
  if (B.yong.includes(topA)) { wuxing += 8; relations.push({ dim: '五行', type: '互为喜用', text: `你以 ${topA} 为主，正是对方的喜用` }); }
  if (topA === weakB || topB === weakA) { wuxing += 4; relations.push({ dim: '五行', type: '补缺', text: `一方偏旺的五行，恰好补上另一方的短板` }); }

  /* 6) 十神互补：对方日主对我是什么十神 */
  const godOfA = shishen(A.dayMaster, B.dayMaster);
  const godOfB = shishen(B.dayMaster, A.dayMaster);
  const HARM_GODS = ['正财', '正官', '正印', '食神'];
  if (HARM_GODS.includes(godOfA)) shishenScore += 5;
  if (HARM_GODS.includes(godOfB)) shishenScore += 5;
  if (['七杀', '伤官', '劫财'].includes(godOfA)) shishenScore -= 4;
  if (['七杀', '伤官', '劫财'].includes(godOfB)) shishenScore -= 4;

  core = clamp(core, 25, 96);
  shengxiao = clamp(shengxiao, 25, 96);
  wuxing = clamp(wuxing, 25, 96);
  shishenScore = clamp(shishenScore, 25, 96);
  const overall = Math.round(core * 0.4 + wuxing * 0.25 + shengxiao * 0.2 + shishenScore * 0.15);

  const dims = [
    { label: '性情相处', v: core, note: '日干与夫妻宫的合冲' },
    { label: '五行互补', v: wuxing, note: '喜用、纳音、强弱是否互补' },
    { label: '生肖根基', v: shengxiao, note: '年支（生肖）的生克' },
    { label: '十神相处', v: shishenScore, note: '两人日主的十神关系' },
  ];

  const good = relations.filter((r) => /合|相生|喜用|补缺|相合/.test(r.text));
  const bad = relations.filter((r) => /冲|相刑|相害/.test(r.text));

  return {
    type: 'hepan',
    a: { pillars: A.pillars, dayMaster: A.dayMaster, dayMasterElem: A.dayMasterElem, yong: A.yong, elems: A.elems,
      weak: A.weak, nayin: nayinA, tenGodToB: godOfB, pattern: A.deep?.pattern?.name || '' },
    b: { pillars: B.pillars, dayMaster: B.dayMaster, dayMasterElem: B.dayMasterElem, yong: B.yong, elems: B.elems,
      weak: B.weak, nayin: nayinB, tenGodToA: godOfA, pattern: B.deep?.pattern?.name || '' },
    relations,
    pillarTable,
    nayin: { a: nayinA, b: nayinB, text: nayinText },
    tenGods: { aToB: godOfB, bToA: godOfA },
    goodCount: good.length,
    badCount: bad.length,
    dims,
    overall,
    scores: dims,
    summary: [
      core >= 70 ? '日柱与相处上合多冲少，节奏比较对得上。' : core <= 50 ? '日柱有冲，节奏不同，需要多磨合。' : '日柱合冲参半，有合有磕绊，看具体维度。',
      nayinText + '。',
      bad.length ? `要留意：${bad.slice(0, 2).map((r) => r.text).join('；')}。` : '四柱与生肖上没有明显的冲刑。',
    ].join(''),
    advice: [
      overall >= 72 ? '底子相合，别把默契当理所当然；把日子过好，比盘上的合更实在。' : overall <= 52 ? '合盘不算顺，不代表不能处；节奏不同就先说清楚，互相留空间。' : '有合有冲，遇到分歧先讲事实、再讲感受，别翻旧账。',
      `十神上，一方对另一方偏「${godOfB}」「${godOfA}」，相处里容易形成付出与承接的默契，也可能一边倒，留意平衡。`,
      '合盘只看传统命理的几组关系，不涉及家庭、价值观与现实相处；当个参考，别当成结论。',
    ],
  };
}

export const TOOLS = {
  paipan,
  xiaoliuren,
  zeri,
  bazhai,
  yangzhai,
  yinzha,
  daily,
  hepan,
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
