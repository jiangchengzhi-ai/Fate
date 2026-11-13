/* ==========================================================================
   vision.mjs — 照片识别（面相 / 手相），可选，OpenAI 兼容视觉接口
   照片只在本次请求里传给模型，不落盘、不写进批注。
   ========================================================================== */
import { FACE, PALM } from '../assets/js/data.js';

const CFG = {
  base: (process.env.FATETELL_VISION_BASE || process.env.FATETELL_LLM_BASE || 'https://api.deepseek.com/v1').replace(/\/+$/, ''),
  key: process.env.FATETELL_VISION_KEY || process.env.FATETELL_LLM_KEY || '',
  model: process.env.FATETELL_VISION_MODEL || '',
  effort: process.env.FATETELL_VISION_EFFORT || 'low',
  timeout: Number(process.env.FATETELL_VISION_TIMEOUT || 40000),
};

export const visionStatus = () => ({
  ready: Boolean(CFG.key && CFG.model),
  model: CFG.model || null,
  provider: CFG.model ? (CFG.base.includes('deepseek') ? 'deepseek' : 'custom') : null,
  kinds: ['face', 'palm'],
});

/* 把题库压成模型能选的值 */
const buildFields = (mod) => {
  const out = {};
  mod.questions.forEach((q) => {
    out[q.id] = {
      title: q.title,
      options: q.options.map((o) => ({ v: o.v, label: o.label, note: o.note || '' })),
    };
  });
  return out;
};

const FIELDS = { face: buildFields(FACE), palm: buildFields(PALM) };

const SYSTEM = {
  face: `你是面相测量标注员，不是算命先生。先量比例，再按比例归类，只输出 JSON。

第一步，估测这张正面照的比例（用 0-1 之间的小数或比值表示，看不清就省略该项）：
- faceWH：脸长 ÷ 脸宽（常见 1.2–1.7）
- upper / middle / lower：三庭占比，发际到眉心 / 眉心到鼻底 / 鼻底到下巴，三项相加约等于 1
- eyeWidth：单眼宽度 ÷ 脸宽
- eyeGap：两眼间距 ÷ 单眼宽度
- noseWidth：鼻翼宽 ÷ 脸宽
- mouthWidth：口宽 ÷ 脸宽
- jawWidth：下颌角宽 ÷ 脸宽

第二步，按下面的硬规则归类（优先于你的直觉）：
- shape：faceWH ≥ 1.5 → wood；jawWidth ≥ 0.82 → earth；faceWH ≤ 1.3 且 jawWidth < 0.78 → water；upper ≥ 0.37 且 jawWidth < 0.75 → fire；其余 → metal
- forehead：upper ≥ 0.375 → broad；upper ≤ 0.315 → narrow；否则按发际线形态在 broad / even / narrow / lines / peak 里选
- nose：noseWidth ≥ 0.28 → flare；noseWidth ≤ 0.19 → small；其余按鼻梁高低选
- 其余字段（brow/eye/cheek/mouth/chin/mole）按可见形态选，看不清就省略

规则：
1. 只能使用给定的 value，不能自造。
2. 测量项与归类必须一致；照片不是正面、模糊、遮挡严重时，confidence 低于 45 并少给字段。
3. 不评价美丑、年龄、性别、种族、健康。
4. 输出格式：{"measures":{"faceWH":1.38,"upper":0.36,"middle":0.34,"lower":0.30,"eyeWidth":0.21,"eyeGap":1.1,"noseWidth":0.23,"mouthWidth":0.36,"jawWidth":0.76},"features":{"shape":"metal","forehead":"even","nose":"high"},"confidence":70}`,
  palm: `你是手相特征的标注员，不是算命先生。
照片是掌心（手掌内侧）。看照片，为每一道题选一个最接近的选项值，只输出 JSON，不要解释。

规则：
1. 只能使用给定的 value，不能自造。
2. 看不清、光线太暗、手掌没有摊平、或纹路被阴影遮住的字段，直接省略，不要猜。
3. 只描述可见形态：掌型、掌厚、三条主线走向、掌丘、指长、掌纹标记；不判断寿命、健康、财运、婚姻。
4. 输出格式：{"features":{"shape":"wood","life":"deep"},"confidence":66}
   confidence 是整体置信度 0-100，低于 45 就返回空 features。`,
};

function userContent(kind, dataUrl) {
  const fields = FIELDS[kind];
  const spec = Object.entries(fields)
    .map(([id, f]) => `${id}（${f.title}）：${f.options.map((o) => o.v).join(' / ')}`)
    .join('\n');
  return [
    { type: 'text', text: `请按以下字段与取值标注这张照片：\n${spec}\n\n只输出 JSON。` },
    { type: 'image_url', image_url: { url: dataUrl } },
  ];
}

/* ---------------- 面相：测量值 → 归类（硬规则，保证同一张照片结果稳定） ---------------- */
const n = (v, min, max) => {
  const x = Number(v);
  return Number.isFinite(x) && x >= min && x <= max ? x : null;
};

function sanitizeMeasures(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const m = {
    faceWH: n(raw.faceWH, 0.9, 2.2),
    upper: n(raw.upper, 0.15, 0.5),
    middle: n(raw.middle, 0.15, 0.5),
    lower: n(raw.lower, 0.15, 0.5),
    eyeWidth: n(raw.eyeWidth, 0.08, 0.4),
    eyeGap: n(raw.eyeGap, 0.5, 2.2),
    noseWidth: n(raw.noseWidth, 0.1, 0.45),
    mouthWidth: n(raw.mouthWidth, 0.15, 0.6),
    jawWidth: n(raw.jawWidth, 0.4, 1.05),
    eyeTilt: n(raw.eyeTilt, -0.15, 0.15),
    eyeOpen: n(raw.eyeOpen, 0.1, 0.9),
    cheekWidth: n(raw.cheekWidth, 0.5, 1.1),
    lipThick: n(raw.lipThick, 0.01, 0.25),
    noseLen: n(raw.noseLen, 0.2, 0.6),
    chinHeight: n(raw.chinHeight, 0.15, 0.5),
  };
  const out = {};
  for (const [k, v] of Object.entries(m)) if (v != null) out[k] = Math.round(v * 1000) / 1000;
  return Object.keys(out).length ? out : null;
}

function applyMeasureRules(features, measures) {
  if (!measures) return features;
  const f = { ...features };
  const m = measures;

  /* 脸型：长宽比 + 下颌宽 + 上停占比 */
  if (m.faceWH != null || m.jawWidth != null || m.upper != null) {
    if (m.faceWH != null && m.faceWH >= 1.5) f.shape = 'wood';
    else if (m.jawWidth != null && m.jawWidth >= 0.82) f.shape = 'earth';
    else if (m.faceWH != null && m.faceWH <= 1.3 && (m.jawWidth == null || m.jawWidth < 0.78)) f.shape = 'water';
    else if (m.upper != null && m.upper >= 0.37 && (m.jawWidth == null || m.jawWidth < 0.75)) f.shape = 'fire';
    else if (m.faceWH != null) f.shape = 'metal';
  }

  /* 上停：发际到眉心占脸长 */
  if (m.upper != null) {
    if (m.upper >= 0.375) f.forehead = 'broad';
    else if (m.upper <= 0.315) f.forehead = 'narrow';
  }

  /* 眼：外眼角高低（正=下垂，负=上扬）+ 开合度 */
  if (m.eyeTilt != null) {
    if (m.eyeTilt <= -0.012) f.eye = 'uplift';
    else if (m.eyeTilt >= 0.012) f.eye = 'droop';
  }
  if (m.eyeOpen != null && m.eyeOpen >= 0.42) f.eye = 'big';
  if (m.eyeGap != null && m.eyeGap >= 1.35) f.eye = 'sanbai';

  /* 鼻：鼻翼宽占脸宽 */
  if (m.noseWidth != null) {
    if (m.noseWidth >= 0.28) f.nose = 'flare';
    else if (m.noseWidth <= 0.19) f.nose = 'small';
  }

  /* 颧：颧宽占脸宽 */
  if (m.cheekWidth != null) {
    if (m.cheekWidth >= 0.88) f.cheek = 'full';
    else if (m.cheekWidth <= 0.72) f.cheek = 'thin';
  }

  /* 口：口宽、唇厚 */
  if (m.mouthWidth != null) {
    if (m.mouthWidth >= 0.42) f.mouth = 'wide';
    else if (m.mouthWidth <= 0.30) f.mouth = 'narrow';
  }
  if (m.lipThick != null) {
    if (m.lipThick >= 0.09) f.mouth = 'thick';
    else if (m.lipThick <= 0.05) f.mouth = 'thin';
  }

  return f;
}

export function parseFeatures(text, kind = 'face', clientMeasures = null) {
  const fields = FIELDS[kind] || FIELDS.face;
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return { features: {}, confidence: 0, dropped: [], measures: null };
  let raw;
  try { raw = JSON.parse(m[0]); } catch { return { features: {}, confidence: 0, dropped: [], measures: null }; }

  let features = {};
  const dropped = [];
  const src = raw.features && typeof raw.features === 'object' ? raw.features : {};
  for (const [id, v] of Object.entries(src)) {
    const f = fields[id];
    if (!f) { dropped.push(id); continue; }
    if (typeof v !== 'string' || !f.options.some((o) => o.v === v)) { dropped.push(`${id}:${v}`); continue; }
    features[id] = v;
  }

  const cm = kind === 'face' ? sanitizeMeasures(clientMeasures) : null;
  const measures = cm
    ? { ...cm, source: 'mediapipe-468' }
    : (kind === 'face' ? sanitizeMeasures(raw.measures) : null);
  if (measures) features = applyMeasureRules(features, measures);

  const confidence = Number(raw.confidence);
  if (Number.isFinite(confidence) && confidence < 45) return { features: {}, confidence, dropped, measures };
  return { features, confidence: Number.isFinite(confidence) ? confidence : 60, dropped, measures };
}

export async function analyzeImage(kind, dataUrl, clientMeasures = null) {
  if (!FIELDS[kind]) {
    const err = new Error('未知的识别类型');
    err.code = 'BAD_KIND';
    throw err;
  }
  if (!visionStatus().ready) {
    const err = new Error('视觉模型未配置');
    err.code = 'NO_VISION';
    throw err;
  }
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl) || dataUrl.length > 3_000_000) {
    const err = new Error('照片格式不支持或过大');
    err.code = 'BAD_IMAGE';
    throw err;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CFG.timeout);
  const started = Date.now();
  try {
    const res = await fetch(`${CFG.base}/chat/completions`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${CFG.key}` },
      body: JSON.stringify({
        model: CFG.model,
        temperature: 0,
        max_tokens: 3000,
        reasoning_effort: CFG.effort,
        messages: [
          { role: 'system', content: SYSTEM[kind] },
          { role: 'user', content: userContent(kind, dataUrl) },
        ],
      }),
    });
    const raw = await res.text();
    if (!res.ok) {
      const err = new Error(res.status === 401 ? '视觉模型密钥无效' : `视觉模型返回 ${res.status}`);
      err.code = 'UPSTREAM';
      err.detail = raw.slice(0, 300);
      throw err;
    }
    const data = JSON.parse(raw);
    const text = data?.choices?.[0]?.message?.content || '';
    if (!String(text).trim()) {
      const err = new Error('视觉模型没有返回结果（推理被截断或拒答）');
      err.code = 'EMPTY';
      throw err;
    }
    const parsed = parseFeatures(text, kind, clientMeasures);
    return { ...parsed, kind, model: data.model || CFG.model, usage: data.usage || null, ms: Date.now() - started };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('视觉模型超时');
      err.code = 'TIMEOUT';
      console.warn('[vision] TIMEOUT', kind, Date.now() - started + 'ms');
      throw err;
    }
    console.warn('[vision]', e.code || 'ERR', e.message, e.detail ? String(e.detail).slice(0, 200) : '');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const analyzeFace = (dataUrl) => analyzeImage('face', dataUrl);
export const FACE_FIELDS = Object.keys(FIELDS.face);
export const PALM_FIELDS = Object.keys(FIELDS.palm);
