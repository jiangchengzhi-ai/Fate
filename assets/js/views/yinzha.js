import { api } from '../api.js';
import { MOUNTAINS, GUAS } from '../data.js';
import { mountainAt, norm360, levelOf } from '../engine.js';
import { $, $$, esc, toast, compassSVG } from '../ui.js';
import { startHeading, locate, fmtLoc } from '../sensors.js';
import { finish } from './arts.js';

const ZHI12 = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export function yinzhaView() {
  let heading = 0;

  return {
    html: `
      <div class="flow">
        <header class="page-head">
          <a class="back" href="#/" data-back><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>返回</a>
          <h1>阴宅</h1>
          <a class="tb-link right" href="#/about">关于</a>
        </header>

        <p class="lead">拖动罗盘定坐向，再看水从哪来、往哪去。三合水法只论方位：来水宜长生、冠带、临官、帝旺，去水宜衰、病、死、墓、绝。</p>

        <div class="compass-stage" data-stage>
          ${compassSVG(MOUNTAINS, GUAS)}
        </div>

        <div class="cp-read">
          <div class="deg" data-readout>朝向 0° · 坎卦 · 北</div>
          <div class="dir" data-dir>坐 <span>子</span> 向 午</div>
          <div class="hint" data-hint>拖动转盘定坐向，松手即定</div>
        </div>

        <div class="cp-actions">
          <button class="btn btn-ghost btn-sm" type="button" data-sensor>启用指南针</button>
          <button class="btn btn-ghost btn-sm" type="button" data-loc>取当前位置</button>
        </div>
        <div class="cp-read"><div class="hint" data-loc-text></div></div>

        <div class="field">
          <label>来水方位（可不填）</label>
          <div class="opts" data-lai>
            ${ZHI12.map((z) => `<button class="opt" type="button" data-lai-z="${z}" aria-pressed="false">${z}</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>去水方位（可不填）</label>
          <div class="opts" data-qu>
            ${ZHI12.map((z) => `<button class="opt" type="button" data-qu-z="${z}" aria-pressed="false">${z}</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>形势</label>
          <div class="opts">
            <button class="opt" type="button" data-t="backing" aria-pressed="false">后有靠山</button>
            <button class="opt" type="button" data-t="mingtang" aria-pressed="false">前有明堂</button>
            <button class="opt" type="button" data-t="shaq" aria-pressed="false">左右有砂</button>
          </div>
        </div>

        <p class="foot">简化三合水法，只论方位与形势，不替代实地踏勘。</p>
      </div>

      <div class="dock">
        <div class="dock-info"><b data-deg>0°</b>坐向</div>
        <button class="btn btn-primary" type="button" data-go>定 穴</button>
      </div>`,
    mount: () => {
      const root = $('#app .view');
      const stage = $('[data-stage]', root);
      const needle = $('#cpNeedle', root);
      const readout = $('[data-readout]', root);
      const dirEl = $('[data-dir]', root);
      const degEl = $('[data-deg]', root);
      const hint = $('[data-hint]', root);
      const btn = $('[data-go]', root);

      let lai = '';
      let qu = '';
      let loc = null;
      let stopSensor = null;
      const t = { backing: false, mingtang: false, shaq: false };

      const cleanup = () => {
        if (stopSensor) {
          stopSensor();
          stopSensor = null;
        }
      };
      window.addEventListener('hashchange', cleanup, { once: true });

      const paint = () => {
        const facing = mountainAt(heading);
        const sitting = mountainAt(heading + 180);
        needle.setAttribute('transform', `rotate(${norm360(heading).toFixed(1)} 160 160)`);
        readout.textContent = `朝向 ${Math.round(norm360(heading))}° · ${facing.gua}卦 · ${GUAS[facing.gua].dir}`;
        dirEl.innerHTML = `坐 <span>${sitting.n}</span> 向 ${facing.n}`;
        degEl.textContent = `${Math.round(norm360(heading))}°`;
        $$('.cp-shan', root).forEach((el) => {
          const d = Number(el.dataset.deg);
          el.classList.toggle('hot', d === facing.deg || d === sitting.deg);
        });
      };

      const angleAt = (e) => {
        const r = stage.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        return (Math.atan2(x, -y) * 180) / Math.PI;
      };
      let dragging = false;
      let startAngle = 0;
      let startHeading = 0;

      stage.addEventListener('pointerdown', (e) => {
        if (stopSensor) return;
        dragging = true;
        startAngle = angleAt(e);
        startHeading = heading;
        stage.setPointerCapture?.(e.pointerId);
        hint.textContent = '转到想要的坐向，松手即定';
      });
      stage.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        heading = startHeading + (angleAt(e) - startAngle);
        paint();
      });
      const stop = () => {
        if (!dragging) return;
        dragging = false;
        heading = Math.round(norm360(heading));
        paint();
        hint.textContent = `已定：坐 ${mountainAt(heading + 180).n} 向 ${mountainAt(heading).n}`;
      };
      stage.addEventListener('pointerup', stop);
      stage.addEventListener('pointercancel', stop);

      paint();

      const sensorBtn = $('[data-sensor]', root);
      sensorBtn?.addEventListener('click', async () => {
        if (stopSensor) {
          cleanup();
          sensorBtn.textContent = '启用指南针';
          hint.textContent = '已关闭传感器，可拖动转盘';
          return;
        }
        try {
          stopSensor = await startHeading((h) => {
            heading = h;
            paint();
          });
          sensorBtn.textContent = '关闭指南针';
          hint.textContent = '转动手机对准朝向';
        } catch (err) {
          toast(`${err.message}（需 https 或 localhost）`);
        }
      });

      const locBtn = $('[data-loc]', root);
      locBtn?.addEventListener('click', async () => {
        locBtn.disabled = true;
        locBtn.textContent = '定位中…';
        try {
          loc = await locate();
          $('[data-loc-text]', root).textContent = `位置 ${fmtLoc(loc)}`;
        } catch (err) {
          toast(`${err.message}（需 https 或 localhost）`);
        } finally {
          locBtn.disabled = false;
          locBtn.textContent = '取当前位置';
        }
      });

      root.addEventListener('click', (e) => {
        const l = e.target.closest('[data-lai-z]');
        if (l) {
          lai = lai === l.dataset.laiZ ? '' : l.dataset.laiZ;
          root.querySelectorAll('[data-lai-z]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.laiZ === lai)));
          return;
        }
        const q = e.target.closest('[data-qu-z]');
        if (q) {
          qu = qu === q.dataset.quZ ? '' : q.dataset.quZ;
          root.querySelectorAll('[data-qu-z]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.quZ === qu)));
          return;
        }
        const tg = e.target.closest('[data-t]');
        if (tg) {
          const k = tg.dataset.t;
          t[k] = !t[k];
          tg.setAttribute('aria-pressed', String(t[k]));
          return;
        }
        if (e.target.closest('[data-go]')) submit();
      });

      const submit = async () => {
        btn.disabled = true;
        btn.textContent = '定 穴 中';
        try {
          const r = await api.tool('yinzha', {
            heading,
            laishui: lai || undefined,
            qushui: qu || undefined,
            backing: t.backing,
            mingtang: t.mingtang,
            shaq: t.shaq,
          });
          finish(r, {
            title: '阴宅批注',
            heading: '阴宅',
            glyph: '穴',
            subtitle: `${r.meta.sitting.n}山${r.meta.facing.n}向 · ${r.ju}局`,
            blocks: [
              { kind: 'kv', title: '坐向', rows: [
                ['坐山', `${r.meta.sitting.n}（${r.meta.sitting.zhi}）`],
                ['朝向', `${r.meta.facing.n}`],
                ['三合局', `${r.ju}局`],
                ['长生', `${r.sheng}方`],
              ] },
              { kind: 'kv', title: '来去水', rows: [
                ['来水', r.water.inState ? `${r.water.laishui}　${r.water.inState}（${r.water.inGood ? '合' : '不合'}）` : '未填'],
                ['去水', r.water.outState ? `${r.water.qushui}　${r.water.outState}（${r.water.outGood ? '合' : '不合'}）` : '未填'],
              ] },
              { kind: 'kv', title: '形势', rows: [
                ['靠山', t.backing ? '有' : '无'],
                ['明堂', t.mingtang ? '有' : '无'],
                ['砂', t.shaq ? '有' : '无'],
              ] },
              ...(loc ? [{ kind: 'kv', title: '位置', rows: [
                ['经纬度', `${loc.lat}, ${loc.lng}`],
                ['精度', `±${loc.acc}m`],
                ...(loc.alt == null ? [] : [['海拔', `${loc.alt}m`]]),
              ] }] : []),
            ],
            advice: r.advice,
            overall: r.overall,
            level: levelOf(r.overall),
            meta: { location: loc },
          });
        } catch (err) {
          btn.disabled = false;
          btn.textContent = '定 穴';
          toast(err.message.includes('fetch') ? '服务未启动' : err.message);
        }
      };
    },
  };
}
