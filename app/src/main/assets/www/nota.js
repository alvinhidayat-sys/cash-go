'use strict';
/* ===== NOTA: satu model, tiga keluaran (preview HTML, ESC/POS thermal, PDF) =====
   Kertas thermal standar Indonesia: 58 mm (32 kolom) dan 80 mm (48 kolom). */
const PAPER = { '58': { cols: 32, dots: 384, ptW: 164, pad: 14 }, '80': { cols: 48, dots: 576, ptW: 227, pad: 11.5 } };
const ascii = s => String(s ?? '').replace(/[•·]/g, '*').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '?');

function wrapText(s, w) {
  const out = []; let line = '';
  for (let word of ascii(s).split(/\s+/).filter(Boolean)) {
    while (word.length > w) { if (line) { out.push(line); line = ''; } out.push(word.slice(0, w)); word = word.slice(w); }
    if (!line) line = word; else if ((line + ' ' + word).length <= w) line += ' ' + word; else { out.push(line); line = word; }
  }
  if (line) out.push(line); return out;
}
const socLine = (type, link) => {
  let v = String(link || '').trim().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
  if (type === 'WA') { const d = normPhone(link); v = d ? '0' + d.slice(2) : v; }
  return v;
};

/* siapkan logo: skala sesuai lebar kertas, hasilkan bitmap hitam-putih (ESC/POS) + JPEG (PDF) */
function prepLogo(dataUrl, paper) {
  return new Promise(res => {
    if (!dataUrl) return res(null);
    const im = new Image();
    im.onload = () => {
      const maxW = paper === '58' ? 192 : 256, maxH = 120;
      const s = Math.min(maxW / im.width, maxH / im.height, 1);
      const w = Math.max(8, Math.round(im.width * s / 8) * 8), h = Math.max(8, Math.round(im.height * s));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      const sw = im.width * s, sh = im.height * s; g.drawImage(im, (w - sw) / 2, (h - sh) / 2, sw, sh);
      const d = g.getImageData(0, 0, w, h).data, bytes = new Uint8Array((w / 8) * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        if (lum < 150) bytes[y * (w / 8) + (x >> 3)] |= 0x80 >> (x & 7);
      }
      const jpg = atob(c.toDataURL('image/jpeg', 0.85).split(',')[1]); const jb = new Uint8Array(jpg.length); for (let i = 0; i < jpg.length; i++) jb[i] = jpg.charCodeAt(i);
      res({ w, h, bytes, jpeg: jb, url: c.toDataURL('image/png') });
    };
    im.onerror = () => res(null); im.src = dataUrl;
  });
}

async function buildNota(t, opt = {}) {
  const cfg = DB.cfg, paper = opt.paper || cfg.paper || '58', cols = PAPER[paper].cols, L = [];
  const hr = (ch = '-') => L.push({ k: 'hr', s: ch.repeat(cols) });
  const kv = (l, r, b) => { l = ascii(l); r = ascii(r); const room = cols - r.length - 1; if (l.length > room) l = l.slice(0, Math.max(0, room)); L.push({ k: 't', s: l + ' '.repeat(Math.max(1, cols - l.length - r.length)) + r, b }); };
  const logo = cfg.showLogo && cfg.notaLogo ? await prepLogo(cfg.notaLogo, paper) : null;
  if (logo) L.push({ k: 'logo' });
  const brand = cfg.nama || t.usahaNama || 'Cash GO';
  wrapText(brand.toUpperCase(), cols / 2 | 0).forEach(s => L.push({ k: 't', s, a: 'c', b: 1, big: 1 }));
  if (t.usahaNama && t.usahaNama.toLowerCase() !== brand.toLowerCase()) wrapText(t.usahaNama, cols).forEach(s => L.push({ k: 't', s, a: 'c', b: 1 }));
  wrapText(cfg.alamat, cols).forEach(s => L.push({ k: 't', s, a: 'c' }));
  if (cfg.telp) L.push({ k: 't', s: 'Telp: ' + ascii(cfg.telp), a: 'c' });
  hr('=');
  kv('No', t.no); kv('Tanggal', fmtDT(t.ts)); kv('Kasir', t.kasir);
  if (t.customer) kv('Pelanggan', t.customer);
  if (t.hp) kv('No HP', t.hp);
  (t.ext || []).forEach(([k, v]) => v && kv(k, v));
  hr();
  for (const i of t.items) {
    wrapText(i.nama, cols).forEach(s => L.push({ k: 't', s, b: 1 }));
    kv(`  ${fmtQty(i.qty)} ${i.satuan || ''} x ${rp(i.harga)}`, rp(i.qty * i.harga));
    if (i.diskon) kv('  Diskon', '-' + rp(i.diskon));
    if (i.ket) wrapText(i.ket, cols - 2).forEach(s => L.push({ k: 't', s: '  ' + s }));
  }
  hr();
  const tot = trxTotal(t);
  if (trxDiskon(t)) kv('Hemat (diskon)', rp(trxDiskon(t)));
  L.push({ k: 'kv2', l: 'TOTAL', r: 'Rp ' + rp(tot) });
  kv(`Bayar (${t.metode})`, rp(t.bayar));
  if (t.metode === 'Tunai') kv('Kembali', rp(Math.max(0, t.bayar - tot)));
  hr();
  if (t.catatan) { wrapText('Catatan: ' + t.catatan, cols).forEach(s => L.push({ k: 't', s })); hr(); }
  wrapText(cfg.footer, cols).forEach(s => L.push({ k: 't', s, a: 'c' }));
  const soc = [...cfg.sosmed.filter(x => x.link).map(x => [x.type === 'X / Twitter' ? 'X' : x.type.slice(0, 2) === 'In' ? 'IG' : x.type === 'Facebook' ? 'FB' : x.type === 'TikTok' ? 'TikTok' : x.type === 'YouTube' ? 'YT' : 'Web', socLine(x.type, x.link)]),
    ...cfg.wa.filter(x => x.link).map(x => ['WA', socLine('WA', x.link)])];
  if (soc.length) { L.push({ k: 't', s: '' }); soc.forEach(([a, b]) => wrapText(`${a}: ${b}`, cols).forEach(s => L.push({ k: 't', s, a: 'c' }))); }
  L.push({ k: 't', s: '' }); L.push({ k: 't', s: '-- Cash GO --', a: 'c' });
  return { paper, cols, L, logo };
}

/* ---- keluaran 1: preview HTML ---- */
function notaHtml(m) {
  const rows = m.L.map(l => {
    if (l.k === 'logo') return `<img src="${m.logo.url}">`;
    if (l.k === 'hr') return `<div class="ln">${esc(l.s)}</div>`;
    if (l.k === 'kv2') { const w = m.cols / 2 | 0; const a = ascii(l.l), b = ascii(l.r); return `<div class="ln b big">${esc(a + ' '.repeat(Math.max(1, w - a.length - b.length)) + b)}</div>`; }
    return `<div class="ln ${l.a === 'c' ? 'c' : ''} ${l.b ? 'b' : ''} ${l.big ? 'big' : ''}">${esc(l.s) || '&nbsp;'}</div>`;
  }).join('');
  return `<div class="paperwrap"><div class="paper" style="--cols:${m.cols}">${rows}</div></div>`;
}

/* ---- keluaran 2: ESC/POS (printer thermal Bluetooth) ---- */
function notaEscPos(m) {
  const o = []; const P = (...b) => o.push(...b); const T = s => { for (const ch of ascii(s)) o.push(ch.charCodeAt(0)); };
  P(0x1B, 0x40);
  for (const l of m.L) {
    if (l.k === 'logo') { P(0x1B, 0x61, 1, 0x1D, 0x76, 0x30, 0, (m.logo.w / 8) & 255, (m.logo.w / 8) >> 8, m.logo.h & 255, m.logo.h >> 8); o.push(...m.logo.bytes); P(0x0A); continue; }
    if (l.k === 'kv2') { const w = m.cols / 2 | 0, a = ascii(l.l), b = ascii(l.r); P(0x1B, 0x61, 0, 0x1B, 0x45, 1, 0x1D, 0x21, 0x11); T(a + ' '.repeat(Math.max(1, w - a.length - b.length)) + b); P(0x0A, 0x1D, 0x21, 0, 0x1B, 0x45, 0); continue; }
    P(0x1B, 0x61, l.a === 'c' ? 1 : 0, 0x1B, 0x45, l.b ? 1 : 0, 0x1D, 0x21, l.big ? 0x11 : 0); T(l.s); P(0x0A);
  }
  P(0x1B, 0x61, 0, 0x1B, 0x45, 0, 0x1D, 0x21, 0, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x42, 0);
  return new Uint8Array(o);
}

/* ---- keluaran 3: PDF (nota digital, lebar 58/80 mm, tinggi mengikuti isi) ---- */
function notaPdf(m) {
  const { ptW: W, pad: PD, dots } = PAPER[m.paper], FS = 7.08, LH = 9.4, CW = 0.6, ptPerDot = (W - 2 * PD) / dots;
  let y = PD; const ops = []; let img = null;
  for (const l of m.L) {
    if (l.k === 'logo') { const w = m.logo.w * ptPerDot, h = m.logo.h * ptPerDot; img = { x: (W - w) / 2, y, w, h }; y += h + 4; continue; }
    const big = l.big || l.k === 'kv2', size = big ? FS * 2 : FS, lh = big ? LH * 2 : LH;
    let s = l.k === 'kv2' ? (() => { const w = m.cols / 2 | 0, a = ascii(l.l), b = ascii(l.r); return a + ' '.repeat(Math.max(1, w - a.length - b.length)) + b; })() : l.s;
    const bold = l.b || l.k === 'kv2', tw = s.length * size * CW;
    const x = l.a === 'c' ? (W - tw) / 2 : PD; y += lh;
    if (s.trim()) ops.push({ x, y: y - lh * 0.22, s, size, bold });
  }
  const H = Math.ceil(y + PD + 6);
  let cs = '';
  if (img) cs += `q ${img.w.toFixed(2)} 0 0 ${img.h.toFixed(2)} ${img.x.toFixed(2)} ${(H - img.y - img.h).toFixed(2)} cm /Im1 Do Q\n`;
  for (const t of ops) cs += `BT /${t.bold ? 'F2' : 'F1'} ${t.size.toFixed(2)} Tf ${t.x.toFixed(2)} ${(H - t.y).toFixed(2)} Td (${t.s.replace(/([\\()])/g, '\\$1')}) Tj ET\n`;
  const parts = []; let len = 0; const offs = [];
  const add = d => { const u = typeof d === 'string' ? strToU8(d) : d; parts.push(u); len += u.length; };
  const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); add(body); add('\nendobj\n'); };
  add('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >>${img ? ' /XObject << /Im1 7 0 R >>' : ''} >> >>`);
  obj(4, `<< /Length ${cs.length} >>\nstream\n${cs}endstream`);
  obj(5, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>');
  obj(6, '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>');
  let n = 7;
  if (img) {
    offs[7] = len; add(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${m.logo.w} /Height ${m.logo.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${m.logo.jpeg.length} >>\nstream\n`);
    add(m.logo.jpeg); add('\nendstream\nendobj\n'); n = 8;
  }
  const xr = len; add(`xref\n0 ${n}\n0000000000 65535 f \n`);
  for (let i = 1; i < n; i++) add(String(offs[i]).padStart(10, '0') + ' 00000 n \n');
  add(`trailer\n<< /Size ${n} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`);
  const out = new Uint8Array(len); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return out;
}

/* ---- ringkasan untuk WhatsApp ---- */
function waSummary(t) {
  const tot = trxTotal(t), cfg = DB.cfg;
  let s = `*${cfg.nama || 'Cash GO'}*${t.usahaNama && t.usahaNama !== cfg.nama ? ' - ' + t.usahaNama : ''}\nNota: ${t.no}\nTanggal: ${fmtDT(t.ts)}\n`;
  if (t.customer) s += `Pelanggan: ${t.customer}\n`;
  s += '----------------\n';
  t.items.forEach((i, n) => { s += `${n + 1}. ${i.nama} - ${fmtQty(i.qty)} ${i.satuan || ''} x ${rp(i.harga)} = ${rp(itemSub(i))}\n`; });
  s += `----------------\n*TOTAL: Rp ${rp(tot)}*\n${t.metode}: Rp ${rp(t.bayar)}`;
  if (t.metode === 'Tunai') s += ` (kembali Rp ${rp(Math.max(0, t.bayar - tot))})`;
  return s + `\n\nNota digital terlampir (PDF).\n${cfg.footer || 'Terima kasih'} 🙏`;
}
const notaFileName = t => `Nota_${t.no}.pdf`;
