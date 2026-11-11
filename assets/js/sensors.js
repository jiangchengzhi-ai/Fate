/* ==========================================================================
   sensors.js — 方向与定位
   注意：iOS/Android 的传感器与定位都要求安全上下文（https 或 localhost）。
   ========================================================================== */

export const hasHeading = () => 'DeviceOrientationEvent' in window;

export async function startHeading(onHeading) {
  if (!hasHeading()) throw new Error('此设备不支持方向感应');

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const res = await DeviceOrientationEvent.requestPermission();
    if (res !== 'granted') throw new Error('未授权方向权限');
  }

  const absolute = 'ondeviceorientationabsolute' in window;
  const handler = (e) => {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (typeof e.alpha === 'number') h = 360 - e.alpha;
    if (h !== null && Number.isFinite(h)) onHeading(h);
  };

  const evt = absolute ? 'deviceorientationabsolute' : 'deviceorientation';
  window.addEventListener(evt, handler, true);
  return () => window.removeEventListener(evt, handler, true);
}

export function locate(timeout = 9000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('此设备不支持定位'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: Number(pos.coords.latitude.toFixed(6)),
        lng: Number(pos.coords.longitude.toFixed(6)),
        acc: Math.round(pos.coords.accuracy),
        alt: pos.coords.altitude == null ? null : Math.round(pos.coords.altitude),
      }),
      (err) => {
        const msg = err.code === 1 ? '定位权限被拒绝'
          : err.code === 2 ? '定位不可用'
            : err.code === 3 ? '定位超时' : '定位失败';
        reject(new Error(msg));
      },
      { enableHighAccuracy: true, timeout, maximumAge: 60000 },
    );
  });
}

export const fmtLoc = (l) => (l ? `${l.lat}, ${l.lng}　±${l.acc}m` : '');
