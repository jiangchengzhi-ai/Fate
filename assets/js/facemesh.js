/* ==========================================================================
   facemesh.js — 浏览器本地人脸关键点测量（MediaPipe Face Landmarker）
   照片不离开设备；量出比例后只把数字发给服务端。
   ========================================================================== */

const BASE = '/assets/vendor/mediapipe/';

let landmarkerPromise = null;

async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FaceLandmarker, FilesetResolver } = await import(`${BASE}vision_bundle.mjs`);
      const vision = await FilesetResolver.forVisionTasks(`${BASE}wasm`);
      const make = (delegate) => FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: `${BASE}face_landmarker.task`, delegate },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.4,
        minFacePresenceConfidence: 0.4,
        minTrackingConfidence: 0.4,
      });
      try {
        return await make('GPU');
      } catch {
        return await make('CPU');
      }
    })().catch((e) => {
      landmarkerPromise = null;
      throw e;
    });
  }
  return landmarkerPromise;
}

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('图片读取失败'));
  img.src = src;
});

const dist = (a, b, w, h) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
const r3 = (x) => Math.round(x * 1000) / 1000;

function computeMetrics(p, w, h) {
  const P = (i) => p[i];
  const W = dist(P(234), P(454), w, h) || 1;
  const H = dist(P(10), P(152), w, h) || 1;

  const d = (i, j) => dist(P(i), P(j), w, h);
  const eyeR = d(33, 133);
  const eyeL = d(362, 263);
  const eyeAvg = (eyeR + eyeL) / 2 || 1;

  return {
    faceWH: r3(H / W),
    upper: r3(d(10, 168) / H),
    middle: r3(d(168, 2) / H),
    lower: r3(d(2, 152) / H),
    eyeWidth: r3(eyeAvg / W),
    eyeGap: r3(d(133, 362) / eyeAvg),
    eyeTilt: r3((P(263).y - P(33).y)),
    eyeOpen: r3(((d(159, 145) + d(386, 374)) / 2) / eyeAvg),
    noseWidth: r3(d(129, 358) / W),
    noseLen: r3(d(168, 2) / H),
    mouthWidth: r3(d(61, 291) / W),
    lipThick: r3(d(0, 17) / H),
    jawWidth: r3(d(172, 397) / W),
    cheekWidth: r3(d(116, 345) / W),
    cheekJawRatio: r3(d(116, 345) / (d(172, 397) || 1)),
    chinWidth: r3(d(148, 377) / W),
    chinRatio: r3(d(148, 377) / (d(172, 397) || 1)),
    chinHeight: r3(d(2, 152) / H),
    browEye: r3(((d(105, 159) + d(334, 386)) / 2) / H),
    source: 'mediapipe-468',
    points: 468,
  };
}

/* 拍摄质量：偏头、歪头、脸太小、太暗 */
function qualityOf(p, w, h, img) {
  const P = (i) => p[i];
  const W = dist(P(234), P(454), w, h) || 1;
  const midX = (P(234).x + P(454).x) / 2;
  const yaw = (P(1).x - midX) / (P(454).x - P(234).x || 1); // 鼻尖偏离中线的比例
  const roll = (Math.atan2((P(263).y - P(33).y) * h, (P(263).x - P(33).x) * w) * 180) / Math.PI;
  const faceRatio = W / Math.min(w, h);

  let brightness = null;
  try {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 64, 64);
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    brightness = Math.round(sum / (data.length / 4));
  } catch { /* canvas 不可用就跳过 */ }

  const issues = [];
  if (Math.abs(yaw) > 0.09) issues.push('脸偏了：正对镜头再拍一张');
  if (Math.abs(roll) > 8) issues.push('头歪了：把手机端平');
  if (faceRatio < 0.28) issues.push('脸太小：靠近一点，让脸占画面一半');
  if (brightness != null && brightness < 55) issues.push('光线太暗：到亮一点的地方');
  if (brightness != null && brightness > 215) issues.push('太亮了：避开直射光');

  return {
    yaw: r3(yaw),
    roll: r3(roll),
    faceRatio: r3(faceRatio),
    brightness,
    ok: issues.length === 0,
    issues,
  };
}

/* 在原图上画 468 点 + 三庭五眼标线，返回 dataUrl */
export async function drawOverlay(dataUrl, landmarks) {
  const img = await loadImage(dataUrl);
  const max = 720;
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const P = (i) => landmarks[i];
  const X = (i) => P(i).x * w;
  const Y = (i) => P(i).y * h;

  // 关键点
  ctx.fillStyle = 'rgba(203,169,104,.55)';
  for (let i = 0; i < landmarks.length; i += 2) {
    ctx.beginPath();
    ctx.arc(X(i), Y(i), 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // 三庭横线
  ctx.strokeStyle = 'rgba(203,169,104,.9)';
  ctx.lineWidth = 1;
  for (const i of [10, 168, 2, 152]) {
    ctx.beginPath();
    ctx.moveTo(X(234), Y(i));
    ctx.lineTo(X(454), Y(i));
    ctx.stroke();
  }

  // 五眼竖线（左右脸缘 + 内外眼角）
  for (const i of [234, 33, 133, 362, 263, 454]) {
    ctx.beginPath();
    ctx.moveTo(X(i), Y(10));
    ctx.lineTo(X(i), Y(152));
    ctx.stroke();
  }

  return c.toDataURL('image/jpeg', 0.85);
}

/* 返回 { ok, measures, landmarks, quality, reason } */
export async function measureFace(dataUrl) {
  try {
    const lm = await getLandmarker();
    const img = await loadImage(dataUrl);
    const res = lm.detect(img);
    const face = res?.faceLandmarks?.[0];
    if (!face || face.length < 400) return { ok: false, reason: 'no-face' };
    return {
      ok: true,
      measures: computeMetrics(face, img.naturalWidth, img.naturalHeight),
      landmarks: face,
      quality: qualityOf(face, img.naturalWidth, img.naturalHeight, img),
    };
  } catch (e) {
    return { ok: false, reason: e?.message || 'measure-failed' };
  }
}

export const isReady = () => Boolean(landmarkerPromise);
