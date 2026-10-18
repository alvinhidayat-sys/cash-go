'use strict';
/* ===== grafik dinamis tanpa library (canvas) ===== */
const PAL = ['#FC7A2F', '#402E3E', '#FF9C5C', '#C7531B', '#7A7375', '#962E08', '#C9BBC4', '#F2B58A'];
const short = n => { const a = Math.abs(n); const f = (v, u) => String(+(v.toFixed(1))).replace('.', ',') + u; return a >= 1e9 ? f(n / 1e9, ' M') : a >= 1e6 ? f(n / 1e6, ' jt') : a >= 1e3 ? f(n / 1e3, ' rb') : String(Math.round(n)); };
let CHARTS = [];
function chartSetup(cv, h) {
  const dpr = window.devicePixelRatio || 1, w = cv.clientWidth || 300;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px';
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.font = '11px Roboto, sans-serif';
  cv._hits = []; return { g, w, h };
}
function showTip(cv, e) {
  let tip = $('.tip'); const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = cv._hits.find(h => h.t === 'r' ? x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h : Math.hypot(x - h.x, y - h.y) <= h.r && Math.atan2(y - h.y, x - h.x) >= -9);
  const d = cv._hits.find(h => h.t === 'a' ? (() => { const dx = x - h.x, dy = y - h.y, dist = Math.hypot(dx, dy); if (dist < h.r0 || dist > h.r1) return false; let a = Math.atan2(dy, dx); if (a < -Math.PI / 2) a += 2 * Math.PI; return a >= h.a0 && a < h.a1; })() : false);
  const f = d || (hit && hit.t === 'r' ? hit : null);
  if (!f) { tip && tip.remove(); return; }
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; document.body.append(tip); }
  tip.textContent = f.tip; tip.style.left = Math.min(innerWidth - tip.offsetWidth - 8, Math.max(8, e.clientX - tip.offsetWidth / 2)) + 'px'; tip.style.top = Math.max(8, e.clientY - 46) + 'px';
  clearTimeout(tip._t); tip._t = setTimeout(() => tip.remove(), 2200);
}
function reg(cv, draw) { cv.onpointerdown = cv.onpointermove = e => showTip(cv, e); CHARTS.push({ cv, draw }); draw(); }
function clearCharts() { CHARTS = []; $('.tip')?.remove(); }
addEventListener('resize', () => CHARTS.forEach(c => c.cv.isConnected && c.draw()));

function chartBarLine(cv, { labels, values, fmt = rp, type = 'bar', h = 230 }) {
  reg(cv, () => {
    const { g, w } = chartSetup(cv, h), L = 44, B = 24, T = 10, R = 8, pw = w - L - R, ph = h - B - T;
    const mx = Math.max(1, ...values), step = Math.pow(10, Math.floor(Math.log10(mx))), top = Math.ceil(mx / step) * step;
    g.strokeStyle = '#ECE5E2'; g.fillStyle = '#7A7375'; g.textAlign = 'right'; g.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { const y = T + ph - ph * i / 4; g.beginPath(); g.moveTo(L, y); g.lineTo(w - R, y); g.stroke(); g.fillText(short(top * i / 4), L - 6, y + 4); }
    const n = values.length, bw = pw / Math.max(1, n); g.textAlign = 'center';
    const every = Math.ceil(n / Math.max(1, Math.floor(pw / 38)));
    const pts = values.map((v, i) => [L + bw * i + bw / 2, T + ph - ph * v / top]);
    if (type === 'bar') {
      const gr = g.createLinearGradient(0, T, 0, T + ph); gr.addColorStop(0, '#FC7A2F'); gr.addColorStop(1, '#C7531B'); g.fillStyle = gr;
      values.forEach((v, i) => { const x = L + bw * i + bw * 0.15, bh = ph * v / top, ww = bw * 0.7; if (bh > 0) { g.beginPath(); g.roundRect ? g.roundRect(x, T + ph - bh, ww, bh, 5) : g.rect(x, T + ph - bh, ww, bh); g.fill(); } cv._hits.push({ t: 'r', x: L + bw * i, y: T, w: bw, h: ph, tip: `${labels[i]}: Rp ${fmt(v)}` }); });
    } else {
      const gr = g.createLinearGradient(0, T, 0, T + ph); gr.addColorStop(0, 'rgba(252,122,47,.35)'); gr.addColorStop(1, 'rgba(252,122,47,0)');
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.lineTo(pts.at(-1)[0], T + ph); g.lineTo(pts[0][0], T + ph); g.closePath(); g.fillStyle = gr; g.fill();
      g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.strokeStyle = '#FC7A2F'; g.lineWidth = 2.5; g.lineJoin = 'round'; g.stroke();
      pts.forEach(([x, y], i) => { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fillStyle = '#fff'; g.fill(); g.strokeStyle = '#C7531B'; g.lineWidth = 2; g.stroke(); cv._hits.push({ t: 'r', x: x - bw / 2, y: T, w: bw, h: ph, tip: `${labels[i]}: Rp ${fmt(values[i])}` }); });
    }
    g.fillStyle = '#7A7375'; g.textAlign = 'center';
    labels.forEach((lb, i) => { if (i % every === 0) g.fillText(lb, L + bw * i + bw / 2, h - 7); });
    if (!values.some(v => v > 0)) { g.fillStyle = '#C9BBC4'; g.font = '14px Roboto'; g.fillText('Belum ada data', w / 2, h / 2); }
  });
}
function chartHBar(cv, { labels, values, fmt = v => 'Rp ' + rp(v), sub = [] }) {
  const rowH = 34, h = Math.max(70, labels.length * rowH + 8);
  reg(cv, () => {
    const { g, w } = chartSetup(cv, h), lw = Math.min(w * 0.38, 130), mx = Math.max(1, ...values), pw = w - lw - 70;
    labels.forEach((lb, i) => {
      const y = 4 + i * rowH, bw = Math.max(3, pw * values[i] / mx);
      g.fillStyle = '#402E3E'; g.textAlign = 'left'; let s = lb; while (g.measureText(s).width > lw - 6 && s.length > 3) s = s.slice(0, -2); if (s !== lb) s += '…'; g.fillText(s, 0, y + 19);
      const gr = g.createLinearGradient(lw, 0, lw + bw, 0); gr.addColorStop(0, '#FF9C5C'); gr.addColorStop(1, '#C7531B'); g.fillStyle = gr;
      g.beginPath(); g.roundRect ? g.roundRect(lw, y + 6, bw, 18, 6) : g.rect(lw, y + 6, bw, 18); g.fill();
      g.fillStyle = '#7A7375'; g.fillText(short(values[i]), lw + bw + 6, y + 19);
      cv._hits.push({ t: 'r', x: 0, y, w, h: rowH, tip: `${lb}: ${fmt(values[i])}${sub[i] ? ' • ' + sub[i] : ''}` });
    });
  });
}
function chartDonut(cv, { labels, values, h = 200 }) {
  reg(cv, () => {
    const { g, w } = chartSetup(cv, h), cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 8, r = R * 0.6, tot = values.reduce((a, b) => a + b, 0);
    if (!tot) { g.fillStyle = '#C9BBC4'; g.textAlign = 'center'; g.font = '14px Roboto'; g.fillText('Belum ada data', cx, cy); return; }
    let a = -Math.PI / 2;
    values.forEach((v, i) => {
      const a2 = a + v / tot * Math.PI * 2; g.beginPath(); g.arc(cx, cy, R, a, a2); g.arc(cx, cy, r, a2, a, true); g.closePath(); g.fillStyle = PAL[i % PAL.length]; g.fill();
      cv._hits.push({ t: 'a', x: cx, y: cy, r0: r, r1: R, a0: a, a1: a2, tip: `${labels[i]}: Rp ${rp(v)} (${Math.round(v / tot * 100)}%)` }); a = a2;
    });
    g.fillStyle = '#402E3E'; g.textAlign = 'center'; g.font = '700 15px Roboto'; g.fillText(short(tot), cx, cy + 2); g.font = '11px Roboto'; g.fillStyle = '#7A7375'; g.fillText('total', cx, cy + 16);
  });
}
