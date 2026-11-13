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
        baseOptions: {
          modelAssetPath: `${BASE}face_landmarker.task`,
          delegate,
        },
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

  const upper = d(10, 168) / H;
  const middle = d(168, 2) / H;
  const lower = d(2, 152) / H;

  return {
    faceWH: r3(H / W),
    upper: r3(upper),
    middle: r3(middle),
    lower: r3(lower),
    eyeWidth: r3(eyeAvg / W),
    eyeGap: r3(d(133, 362) / eyeAvg),
    eyeTilt: r3((P(263).y - P(33).y)),   // >0 外眼角低（下垂），<0 上扬
    eyeOpen: r3(((d(159, 145) + d(386, 374)) / 2) / eyeAvg),
    noseWidth: r3(d(129, 358) / W),
    noseLen: r3(d(168, 2) / H),
    mouthWidth: r3(d(61, 291) / W),
    lipThick: r3(d(0, 17) / H),
    jawWidth: r3(d(172, 397) / W),
    cheekWidth: r3(d(116, 345) / W),
    chinHeight: r3(d(2, 152) / H),
    browEye: r3(((d(105, 159) + d(334, 386)) / 2) / H),
    source: 'mediapipe-468',
    points: 468,
  };
}

/* 返回 { measures, ok, reason } */
export async function measureFace(dataUrl) {
  try {
    const lm = await getLandmarker();
    const img = await loadImage(dataUrl);
    const res = lm.detect(img);
    const face = res?.faceLandmarks?.[0];
    if (!face || face.length < 400) return { ok: false, reason: 'no-face' };
    return { ok: true, measures: computeMetrics(face, img.naturalWidth, img.naturalHeight) };
  } catch (e) {
    return { ok: false, reason: e?.message || 'measure-failed' };
  }
}

export const isReady = () => Boolean(landmarkerPromise);
