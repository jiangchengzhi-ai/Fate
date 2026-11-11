/* ==========================================================================
   engine.js — 规则引擎
   选项 → 六维 → 批注。全部同步计算，无网络请求。
   ========================================================================== */
import {
  DIMS, DIM_KEYS, FACE, PALM,
  GAN, ZHI, GAN_ELEM, ZHI_ELEM, NAYIN, ELEM_ORDER, ELEM_INFO, GE_NAMES, GE_SINGLE,
  MOUNTAINS, GUAS, BAZHAI, DIRS8,
} from './data.js';

/* ---------------- 基础工具 ---------------- */
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

export function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = (arr, h) => arr[h % arr.length];

export function fmtDate(d = new Date()) {
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

const LEVELS = [
  { min: 90, name: '上上', note: '气厚而顺，宜守成拓新' },
  { min: 82, name: '上', note: '底子扎实，进中有守' },
  { min: 74, name: '中上', note: '有起有伏，贵在节奏' },
  { min: 66, name: '中', note: '平中见稳，宜先立后破' },
  { min: 58, name: '中平', note: '借势而行，忌独断' },
  { min: 0, name: '平', note: '先安其内，再图其外' },
];
export function levelOf(v) {
  return LEVELS.find((l) => v >= l.min);
}

const STRENGTH = {
  career: '你适合把目标拆成可交付的结果，一次做成一件事。',
  wealth: '你有把资源留下来的能力，慢即是快。',
  love: '你在关系里愿意先给出善意，这是稀缺品。',
  health: '你的底子撑得住折腾，但别拿它当理由。',
  social: '你能让不同的人坐在一张桌上，这是硬本事。',
  mind: '你想得比多数人远半步，注意别把这半步变成犹豫。',
};
const CAUTION = {
  career: '容易把责任全揽在自己身上，学会分出去。',
  wealth: '对数字的耐心不够，记账比赚钱更该先做。',
  love: '把期待说成句子，而不是等对方猜。',
  health: '身体的账最不能欠，睡眠优先于效率。',
  social: '人情消耗要设额度，别让好说话变成好欺负。',
  mind: '重大决定隔一夜再做，能避开大半冲动。',
};
const ADVICE = {
  career: '每个季度只留一个必须完成的结果，其余都算加分。',
  wealth: '先建三个月的现金缓冲，再谈投资与扩张。',
  love: '每周留一段不被打断的两小时，只给最亲近的人。',
  health: '固定入睡时间，比任何补品都有效。',
  social: '把时间给三位能互相托底的人，其余保持礼貌即可。',
  mind: '把想法写成三行：做什么、为什么、什么时候停。',
};

const VERDICTS = {
  face: [
    '相不独论，骨肉之外看神。',
    '面上有山河，心里要有一把尺。',
    '三十岁前的脸是父母给的，三十岁后是自己修的。',
    '气色比形状要紧，睡好一觉，胜过改三分相。',
    '眉眼看人，口鼻看己。',
    '相由心生——不是劝善，是提醒情绪会留下痕迹。',
  ],
  palm: [
    '掌纹会变，人的路也会。',
    '线是过去的记录，不是未来的判决。',
    '手是拿来做的，不是拿来看的。',
    '三线之中，最该修的是那条还没长出来的。',
    '握拳看命，摊开看运。',
    '纹路越用越深，闲着手也会老。',
  ],
  combo: [
    '三处合看，才敢说一句。',
    '相、掌、命三者不必同，不同处正是可改处。',
    '命是底牌，运是出牌的顺序。',
    '合参不是求一个准，是找一个着力点。',
    '知命不是认命，是知道力气该往哪使。',
  ],
  compass: [
    '宅以形势为骨，以气为血。',
    '方位只决定起点，日子是走出来的。',
    '风水讲的是人与环境的相处，不是与环境的交易。',
    '门是一宅之口，床是一身之根。',
    '先通光、通气、通人，再谈吉凶。',
  ],
};

/* ---------------- 维度 ---------------- */
/* 以每题选项的均值为基线做中心化：分数只反映“在这一题里选得偏高还是偏低”，
   不会被题目里正负词的比例带跑。 */
function dimsFromAnswers(answers, questions) {
  const raw = {};
  DIM_KEYS.forEach((k) => (raw[k] = 0));
  const chosen = [];
  for (const q of questions) {
    const pickV = answers[q.id];
    if (!pickV) continue;
    const opt = q.options.find((o) => o.v === pickV);
    if (!opt) continue;
    chosen.push({ q, opt });

    const withDims = q.options.filter((o) => o.dims && Object.keys(o.dims).length);
    if (!withDims.length) continue;
    for (const k of DIM_KEYS) {
      const mean = withDims.reduce((s, o) => s + (o.dims[k] || 0), 0) / withDims.length;
      raw[k] += (opt.dims?.[k] || 0) - mean;
    }
  }
  const dims = {};
  DIM_KEYS.forEach((k) => { dims[k] = Math.round(clamp(67 + raw[k] * 3.2, 44, 96)); });
  return { dims, chosen };
}

const dimList = (dims) => DIM_KEYS.map((k) => ({ k, label: DIMS[k], v: dims[k] }));
const avg = (dims) => Math.round(DIM_KEYS.reduce((s, k) => s + dims[k], 0) / DIM_KEYS.length);
const topKeys = (dims, n = 2) => [...DIM_KEYS].sort((a, b) => dims[b] - dims[a]).slice(0, n);
const lowKeys = (dims, n = 2) => [...DIM_KEYS].sort((a, b) => dims[a] - dims[b]).slice(0, n);

/* ---------------- 三停 ---------------- */
function stopNote(stops) {
  const t = stops.find((s) => s.k === 'top').v;
  const m = stops.find((s) => s.k === 'mid').v;
  const b = stops.find((s) => s.k === 'bot').v;
  const list = [t, m, b];
  const max = Math.max(...list);
  const min = Math.min(...list);
  if (max - min <= 10) {
    return '三停大致均匀，一生少大起大落。均匀的好处是承压稳，代价是爆发力要靠自己造。';
  }
  if (max === t) return '上停最盛，早年得力、思路开阔；中段要靠积累接住，别让好开局停在计划里。';
  if (max === m) return '中停最盛，三十至五十岁是主战场，财官都在这段见分晓，注意别把身体当成本金。';
  if (max === b) return '下停最厚，越往后越稳，属于慢热长跑型；前半段不必与人争速。';
  return '三停有起落，节奏比高低重要。';
}

/* ---------------- 面相 ---------------- */
export function buildFace(answers, photo) {
  const { dims, chosen } = dimsFromAnswers(answers, FACE.questions);
  const overall = avg(dims);
  const level = levelOf(overall);
  const h = hash('face' + JSON.stringify(answers));

  const shape = chosen.find((c) => c.q.id === 'shape');
  const top = topKeys(dims, 2);
  const low = lowKeys(dims, 2);
  const traits = [...new Set(chosen.flatMap((c) => c.opt.traits || []))].slice(0, 6);
  const elem = shape?.opt.elem || '土';

  const stops = [
    { k: 'top', label: '上停', v: chosen.find((c) => c.q.id === 'forehead')?.opt.stop ?? 60, hint: '少年至三十' },
    { k: 'mid', label: '中停', v: chosen.find((c) => c.q.id === 'nose')?.opt.stop ?? 60, hint: '三十至五十' },
    { k: 'bot', label: '下停', v: chosen.find((c) => c.q.id === 'chin')?.opt.stop ?? 60, hint: '五十以后' },
  ];

  const items = chosen
    .filter((c) => !c.q.meta)
    .map((c) => ({ title: c.q.title, chosen: c.opt.label, text: c.opt.text }));

  const summary = [
    shape?.opt.text || '',
    `综观三停五官，${DIMS[top[0]]}一宫最见气象。${STRENGTH[top[0]]}`,
  ].join(' ');

  return {
    type: 'face',
    title: '观面批注',
    heading: '面相',
    glyph: '相',
    overall,
    level,
    summary,
    dims: dimList(dims),
    stops,
    stopNote: stopNote(stops),
    items,
    traits,
    elem,
    strengths: top.map((k) => `${DIMS[k]}：${STRENGTH[k]}`),
    cautions: low.map((k) => `${DIMS[k]}：${CAUTION[k]}`),
    advice: [ADVICE[low[0]], ADVICE[low[1]], '照镜子时看气色，不看缺点；相学最怕把自己看窄。'],
    verdict: pick(VERDICTS.face, h),
    meta: { answers, photo: photo || null, faceElem: elem },
  };
}

/* ---------------- 手相 ---------------- */
export function buildPalm(answers, photo) {
  const { dims, chosen } = dimsFromAnswers(answers, PALM.questions);
  const overall = avg(dims);
  const level = levelOf(overall);
  const h = hash('palm' + JSON.stringify(answers));

  const shape = chosen.find((c) => c.q.id === 'shape');
  const hand = chosen.find((c) => c.q.id === 'hand')?.opt.label || '';
  const top = topKeys(dims, 2);
  const low = lowKeys(dims, 2);
  const traits = [...new Set(chosen.flatMap((c) => c.opt.traits || []))].slice(0, 6);
  const elem = shape?.opt.elem || '土';

  const items = chosen
    .filter((c) => !c.q.meta)
    .map((c) => ({ title: c.q.title, chosen: c.opt.label, text: c.opt.text }));

  const summary = [
    shape?.opt.text || '',
    `${hand ? hand + '为准。' : ''}三线合看，以${DIMS[top[0]]}最为突出。${STRENGTH[top[0]]}`,
  ].join(' ');

  return {
    type: 'palm',
    title: '观掌批注',
    heading: '手相',
    glyph: '掌',
    overall,
    level,
    summary,
    dims: dimList(dims),
    items,
    traits,
    elem,
    hand,
    strengths: top.map((k) => `${DIMS[k]}：${STRENGTH[k]}`),
    cautions: low.map((k) => `${DIMS[k]}：${CAUTION[k]}`),
    advice: [ADVICE[low[0]], ADVICE[low[1]], '掌纹每月看一次即可，看的是变化，不是好坏。'],
    verdict: pick(VERDICTS.palm, h),
    meta: { answers, photo: photo || null, palmElem: elem },
  };
}

/* ---------------- 干支五行 ---------------- */
const MONTH_ZHI = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0]; // 公历月 → 近似月支

export function ganzhi(year) {
  const i = ((year - 4) % 60 + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}

export function elementsOf(birth) {
  const year = Number(birth.year);
  const month = Number(birth.month) || 6;
  const hourZhi = birth.hour || '午';

  const gi = ((year - 4) % 10 + 10) % 10;
  const zi = ((year - 4) % 12 + 12) % 12;
  const nIdx = Math.floor(((((year - 4) % 60) + 60) % 60) / 2);
  const nayin = NAYIN[nIdx];
  const nayinElem = nayin.slice(-1);
  const monthZhi = ZHI[MONTH_ZHI[month - 1]];

  const parts = [
    { e: GAN_ELEM[gi], w: 1.1, from: '年干 ' + GAN[gi] },
    { e: ZHI_ELEM[zi], w: 1.0, from: '年支 ' + ZHI[zi] },
    { e: nayinElem, w: 1.2, from: '纳音 ' + nayin },
    { e: ZHI_ELEM[MONTH_ZHI[month - 1]], w: 1.0, from: '月支 ' + monthZhi },
    { e: ZHI_ELEM[ZHI.indexOf(hourZhi)], w: 1.0, from: '时支 ' + hourZhi },
  ];

  const sums = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  parts.forEach((p) => { if (sums[p.e] !== undefined) sums[p.e] += p.w; });
  const total = Object.values(sums).reduce((a, b) => a + b, 0);

  const pcts = ELEM_ORDER.map((e) => ({ e, v: Math.round((sums[e] / total) * 100) }));
  const diff = 100 - pcts.reduce((s, p) => s + p.v, 0);
  const maxI = pcts.reduce((m, p, i) => (p.v > pcts[m].v ? i : m), 0);
  pcts[maxI].v += diff;

  const sorted = [...pcts].sort((a, b) => b.v - a.v);
  const dom = sorted[0].e;
  const second = sorted[1].e;
  const weak = sorted[sorted.length - 1].e;

  const ge = GE_NAMES[`${dom}${second}`] || GE_NAMES[`${second}${dom}`] || GE_SINGLE[dom];

  const dims = {};
  DIM_KEYS.forEach((k) => (dims[k] = 57));
  pcts.forEach(({ e, v }) => {
    const d = ELEM_INFO[e].dims;
    for (const [k, weight] of Object.entries(d)) dims[k] += (v / 100) * weight * 20;
  });
  DIM_KEYS.forEach((k) => (dims[k] = Math.round(clamp(dims[k], 44, 92))));

  return { year, month, hourZhi, monthZhi, gan: GAN[gi], zhi: ZHI[zi], nayin, nayinElem, parts, pcts, sorted, dom, second, weak, ge, dims };
}

const ELEM_FILL = {
  木: '多亲近草木与东方，晨间走一段路，让事情先长起来。',
  火: '多晒太阳，把想说的话说出口，别让热情闷在心里。',
  土: '按时吃饭、按时交付，稳定本身就是你的补法。',
  金: '整理与断舍离，练一门能换饭吃的硬技能。',
  水: '多走动、多喝水，让信息和情绪都流动起来。',
};

/* ---------------- 综合相 ---------------- */
export function buildCombo(face, palm, birth) {
  const el = elementsOf(birth);
  const h = hash('combo' + JSON.stringify([face.meta.answers, palm.meta.answers, birth]));

  const fd = {}; face.dims.forEach((d) => (fd[d.k] = d.v));
  const pd = {}; palm.dims.forEach((d) => (pd[d.k] = d.v));

  const dims = {};
  DIM_KEYS.forEach((k) => {
    dims[k] = Math.round(clamp(fd[k] * 0.38 + pd[k] * 0.37 + el.dims[k] * 0.25, 42, 96));
  });

  const overall = avg(dims);
  const level = levelOf(overall);
  const top = topKeys(dims, 2);
  const low = lowKeys(dims, 2);

  const traits = [...new Set([...face.traits.slice(0, 2), ...palm.traits.slice(0, 2), `${el.dom}气偏旺`, `${el.weak}气偏弱`])];

  const summary = `面以${el.faceElem || face.elem}为底，掌以${palm.elem}为形，命以${el.nayin}为根，合而为「${el.ge}」。${STRENGTH[top[0]]}`;

  const tri = [
    { key: '相', text: `${face.elem}形之面，${face.traits.slice(0, 3).join('、') || '气清'}为显；${DIMS[face.dims[0].k]}一宫最旺。` },
    { key: '掌', text: `${palm.elem}型之手，三线之中以${DIMS[palm.dims[0].k]}最厚；${palm.traits.slice(0, 3).join('、') || '纹清'}。` },
    { key: '命', text: `${el.gan}${el.zhi}年生，纳音${el.nayin}，${el.monthZhi}月${el.hourZhi}时；${el.dom}旺${el.weak}弱，成「${el.ge}」。` },
  ];

  const strengths = [
    ...top.map((k) => `${DIMS[k]}：${STRENGTH[k]}`),
    `命格：${el.ge}，${ELEM_INFO[el.dom].trait}为主，${ELEM_INFO[el.dom].organ}是你最该养的地方。`,
  ];
  const cautions = low.map((k) => `${DIMS[k]}：${CAUTION[k]}`);

  const advice = [
    ADVICE[low[0]],
    ADVICE[low[1]],
    `补${el.weak}：${ELEM_FILL[el.weak]}`,
  ];

  return {
    type: 'combo',
    title: '合参批注',
    heading: '综合相',
    glyph: '合',
    overall,
    level,
    summary,
    dims: dimList(dims),
    tri,
    elems: el.pcts,
    elemMeta: { dom: el.dom, weak: el.weak, ge: el.ge, nayin: el.nayin, gan: el.gan, zhi: el.zhi, monthZhi: el.monthZhi, hourZhi: el.hourZhi },
    traits,
    strengths,
    cautions,
    advice,
    verdict: pick(VERDICTS.combo, h),
    meta: { birth, sources: { face: face.overall, palm: palm.overall } },
  };
}

/* ---------------- 罗盘 ---------------- */
export const norm360 = (d) => ((d % 360) + 360) % 360;

export function mountainAt(deg) {
  const d = norm360(deg);
  const i = Math.round(d / 15) % 24;
  return MOUNTAINS[i];
}

export function mingGua(year, gender) {
  const y = Number(year);
  let n;
  if (gender === 'male') {
    n = (((101 - y) % 9) + 9) % 9;
  } else {
    n = (((y - 1904) % 9) + 9) % 9;
  }
  if (n === 0) n = 9;
  if (n === 5) return gender === 'male' ? '坤' : '艮';
  return { 1: '坎', 2: '坤', 3: '震', 4: '巽', 6: '乾', 7: '兑', 8: '艮', 9: '离' }[n];
}

export function buildCompass({ heading, birthYear, gender, door }) {
  const facing = mountainAt(heading);
  const sitting = mountainAt(heading + 180);
  const houseGua = sitting.gua;
  const mGua = mingGua(birthYear, gender);
  const houseGroup = GUAS[houseGua].group.replace('命', '宅');
  const mingGroup = GUAS[mGua].group;
  const match = GUAS[houseGua].group === GUAS[mGua].group;

  const houseMap = BAZHAI[houseGua];
  const mingMap = BAZHAI[mGua];

  const table = DIRS8.map((d) => ({
    dir: d.label,
    gua: d.v,
    star: houseMap[d.v],
  }));

  const doorStar = door ? houseMap[door] : null;
  const doorDir = door ? DIRS8.find((d) => d.v === door)?.label : '';

  const mingGood = ['生气', '天医', '延年', '伏位']
    .map((s) => ({ s, dir: Object.keys(mingMap).find((g) => mingMap[g].name === s) }))
    .map((x) => ({ s: x.s, dir: GUAS[x.dir]?.dir, gua: x.dir }));

  const best = mingGood[0];
  const doorGood = doorStar ? doorStar.good : false;

  const advice = [];
  if (best?.dir) advice.push(`床头或办公桌朝向${best.dir}方（${best.s}），是你命卦的生气位，主精神与机会。`);
  const tianyi = mingGood.find((x) => x.s === '天医');
  if (tianyi?.dir) advice.push(`身体偏弱时，多在${tianyi.dir}方活动或安床（天医），比摆放物件更实在。`);
  const worst = table.find((t) => !t.star.good && (t.star.name === '五鬼' || t.star.name === '绝命'));
  if (worst) advice.push(`${worst.dir}方为${worst.star.name}，宜作储物、卫浴、厨房，不宜久卧久坐。`);
  advice.push(match
    ? '命宅同组，格局本来就顺；剩下的是把光、风、动线处理好，吉方才用得上。'
    : '命宅不同组，不必改门；用床位、书桌朝向和常驻位置，把自己挪到吉方即可。');

  const overall = clamp(
    66 + (match ? 6 : -2) + (doorGood ? 6 : -3) + (houseMap[door]?.name === '生气' ? 3 : 0),
    45, 92,
  );

  const summary = `坐${sitting.n}向${facing.n}，即${GUAS[houseGua].dir}方坐山、${GUAS[facing.gua].dir}方朝向，宅卦属${houseGua}（${houseGroup}）。命卦为${mGua}（${mingGroup}），${match ? '命宅同组，气口相合' : '命宅异组，宜借方位化解'}。`;

  return {
    type: 'compass',
    title: '堪舆批注',
    heading: '罗盘风水',
    glyph: '盘',
    overall,
    level: levelOf(overall),
    summary,
    meta: {
      heading: Math.round(norm360(heading)),
      facing, sitting, houseGua, mGua, match, door, doorDir,
      houseGroup, mingGroup, birthYear, gender,
    },
    table,
    mingGood,
    doorStar,
    advice,
    dims: null,
    traits: [houseGroup, mingGroup, facing.n + '山' + sitting.n + '向'],
    verdict: pick(VERDICTS.compass, hash('compass' + heading + birthYear + gender)),
    cautions: [
      ...(match ? [] : ['命宅不同组：常驻的位置（床、书桌、沙发）以命卦吉方为准，宅卦吉方留给公共区域。']),
      ...(doorStar && !doorGood ? ['门开在凶方，先处理采光、通风与动线；门位不宜大改，改动成本远高于微调。'] : []),
    ],
    strengths: [
      `宅卦${houseGua}，${houseGroup}，坐山五行属${GUAS[houseGua].elem}。`,
      ...(doorStar && doorGood ? [`门在${doorDir}方，为${doorStar.name}（${doorStar.level}）：${doorStar.line}。`] : []),
    ],
  };
}

/* ---------------- 报告存档辅助 ---------------- */
export function makeRecord(report) {
  const now = new Date();
  return {
    ...report,
    id: `${report.type}-${now.getTime().toString(36)}`,
    createdAt: now.toISOString(),
    dateLabel: fmtDate(now),
  };
}
