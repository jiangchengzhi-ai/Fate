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
  face: `你是面相特征的标注员，不是算命先生。
看照片，为每一道题选一个最接近的选项值，只输出 JSON，不要解释。

规则：
1. 只能使用给定的 value，不能自造。
2. 看不清或照片角度不对的字段，直接省略，不要猜。
3. 不评价美丑、年龄、性别、种族、健康；只描述题目要求的形态。
4. 输出格式：{"features":{"shape":"wood","forehead":"broad"},"confidence":72}
   confidence 是整体置信度 0-100，低于 45 就返回空 features。`,
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

export function parseFeatures(text, kind = 'face') {
  const fields = FIELDS[kind] || FIELDS.face;
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return { features: {}, confidence: 0, dropped: [] };
  let raw;
  try { raw = JSON.parse(m[0]); } catch { return { features: {}, confidence: 0, dropped: [] }; }

  const features = {};
  const dropped = [];
  const src = raw.features && typeof raw.features === 'object' ? raw.features : {};
  for (const [id, v] of Object.entries(src)) {
    const f = fields[id];
    if (!f) { dropped.push(id); continue; }
    if (typeof v !== 'string' || !f.options.some((o) => o.v === v)) { dropped.push(`${id}:${v}`); continue; }
    features[id] = v;
  }
  const confidence = Number(raw.confidence);
  if (Number.isFinite(confidence) && confidence < 45) return { features: {}, confidence, dropped };
  return { features, confidence: Number.isFinite(confidence) ? confidence : 60, dropped };
}

export async function analyzeImage(kind, dataUrl) {
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
        max_tokens: 1400,
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
    const parsed = parseFeatures(text, kind);
    return { ...parsed, kind, model: data.model || CFG.model, ms: Date.now() - started };
  } catch (e) {
    if (e.name === 'AbortError') {
      const err = new Error('视觉模型超时');
      err.code = 'TIMEOUT';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const analyzeFace = (dataUrl) => analyzeImage('face', dataUrl);
export const FACE_FIELDS = Object.keys(FIELDS.face);
export const PALM_FIELDS = Object.keys(FIELDS.palm);
