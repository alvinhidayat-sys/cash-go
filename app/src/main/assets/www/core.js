'use strict';
/* ===== util ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, l = 2) => String(n).padStart(l, '0');
const rp = n => (n < 0 ? '-' : '') + String(Math.round(Math.abs(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const fmtQty = q => String(+(+q).toFixed(2)).replace('.', ',');
const num = v => {
  if (typeof v === 'number') return v;
  let s = String(v ?? '').replace(/rp/ig, '').replace(/\s/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (s.includes('.') && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  else if (s.includes(',')) s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, '') : s.replace(',', '.');
  const n = parseFloat(s); return isNaN(n) ? 0 : n;
};
const nowIso = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
const dOnly = ts => ts.slice(0, 10);
const fmtDate = ts => `${ts.slice(8, 10)}/${ts.slice(5, 7)}/${ts.slice(0, 4)}`;
const fmtDT = ts => `${fmtDate(ts)} ${ts.slice(11, 16)}`;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hasBridge = () => typeof window.Android !== 'undefined';

/* ===== database (penyimpanan internal via Android.saveDb / loadDb) ===== */
let DB = null, SESSION = null;
const EMPTY = () => ({
  v: 1, setupDone: false, adminHash: null, recHash: null,
  cfg: { nama: '', alamat: '', telp: '', splashLogo: '', notaLogo: '', showLogo: true, paper: '58', footer: 'Terima kasih atas kunjungan Anda', printer: null, sosmed: [], wa: [] },
  usaha: [], kasir: [], trx: []
});
function loadDb() {
  let raw = '';
  try { raw = hasBridge() ? Android.loadDb() : localStorage.getItem('cashgo_db') || ''; } catch (e) { }
  try { DB = raw ? JSON.parse(raw) : EMPTY(); } catch (e) { DB = EMPTY(); }
  const d = EMPTY(); DB = { ...d, ...DB, cfg: { ...d.cfg, ...(DB.cfg || {}) } };
}
let _st; const save = () => { clearTimeout(_st); _st = setTimeout(saveNow, 300); };
function saveNow() {
  clearTimeout(_st);
  try { const j = JSON.stringify(DB); if (hasBridge()) Android.saveDb(j); else localStorage.setItem('cashgo_db', j); } catch (e) { toast('Gagal menyimpan data'); }
}
addEventListener('pagehide', saveNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });

async function hash(p) {
  const s = 'cashgo.v1:' + p;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 5381; for (const c of s) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + h; }
}

/* ===== kategori bidang usaha UMKM Indonesia ===== */
const CATS = [
  { id: 'resto', nama: 'Warung Makan & Restoran', ico: '🍛', label: 'Menu', units: ['porsi', 'pcs', 'bungkus', 'paket'], ket: 'Catatan (pedas, tanpa nasi, dll)', tx: [{ k: 'Tipe Pesanan', o: ['Makan di tempat', 'Bawa pulang', 'Antar'] }, { k: 'No Meja', t: 'text' }] },
  { id: 'kafe', nama: 'Kafe, Kopi & Minuman', ico: '☕', label: 'Menu', units: ['gelas', 'cup', 'botol', 'pcs'], ket: 'Catatan (less sugar, es batu, dll)', tx: [{ k: 'Tipe Pesanan', o: ['Dine in', 'Take away'] }, { k: 'No Meja', t: 'text' }] },
  { id: 'kue', nama: 'Bakery, Kue & Jajanan', ico: '🍰', label: 'Produk', units: ['pcs', 'box', 'loyang', 'bungkus'], ket: 'Catatan (tulisan kue, dll)', tx: [{ k: 'Tgl Ambil', t: 'date' }] },
  { id: 'kelontong', nama: 'Toko Kelontong & Sembako', ico: '🛒', label: 'Barang', units: ['pcs', 'kg', 'liter', 'bungkus', 'dus', 'pack'], ket: '', tx: [] },
  { id: 'grosir', nama: 'Grosir & Distributor', ico: '📦', label: 'Barang', units: ['dus', 'karton', 'pack', 'kg', 'pcs', 'karung'], ket: 'Merk / varian', tx: [{ k: 'Tujuan Kirim', t: 'text' }] },
  { id: 'fashion', nama: 'Fashion, Pakaian & Aksesori', ico: '👗', label: 'Produk', units: ['pcs', 'stel', 'pasang', 'lusin'], ket: 'Ukuran / warna', tx: [] },
  { id: 'laundry', nama: 'Laundry & Dry Cleaning', ico: '🧺', label: 'Layanan', units: ['kg', 'pcs', 'meter', 'paket'], ket: 'Jenis cucian', tx: [{ k: 'Layanan', o: ['Reguler', 'Express', 'Kilat'] }, { k: 'Estimasi Selesai', t: 'date' }] },
  { id: 'bengkel', nama: 'Bengkel, Cuci Kendaraan & Otomotif', ico: '🔧', label: 'Jasa / Sparepart', units: ['jasa', 'pcs', 'liter', 'set'], ket: 'Keterangan pekerjaan', tx: [{ k: 'Plat Nomor', t: 'text' }, { k: 'Jenis Kendaraan', o: ['Motor', 'Mobil', 'Truk', 'Lainnya'] }] },
  { id: 'salon', nama: 'Salon, Barbershop & Kecantikan', ico: '💈', label: 'Layanan', units: ['kali', 'sesi', 'pcs', 'paket'], ket: 'Catatan', tx: [{ k: 'Kapster / Terapis', t: 'text' }] },
  { id: 'hp', nama: 'Servis HP, Elektronik & Konter', ico: '📱', label: 'Produk / Jasa', units: ['unit', 'pcs', 'jasa', 'voucher'], ket: 'IMEI / keterangan', tx: [{ k: 'No Nota Servis', t: 'text' }] },
  { id: 'print', nama: 'Percetakan, Fotokopi & ATK', ico: '🖨️', label: 'Item', units: ['lembar', 'pcs', 'rim', 'm2', 'jilid'], ket: 'Ukuran / bahan', tx: [{ k: 'Tgl Ambil', t: 'date' }] },
  { id: 'bangunan', nama: 'Toko Bangunan & Material', ico: '🧱', label: 'Barang', units: ['pcs', 'sak', 'batang', 'm3', 'kg', 'lembar'], ket: '', tx: [{ k: 'Alamat Kirim', t: 'text' }] },
  { id: 'tani', nama: 'Pertanian, Perkebunan & Perikanan', ico: '🌾', label: 'Hasil / Komoditas', units: ['kg', 'ton', 'ikat', 'ekor', 'karung', 'peti'], ket: 'Grade / keterangan', tx: [] },
  { id: 'ternak', nama: 'Peternakan & Pet Shop', ico: '🐔', label: 'Produk', units: ['ekor', 'kg', 'karung', 'pcs'], ket: 'Keterangan', tx: [] },
  { id: 'apotek', nama: 'Apotek, Herbal & Kesehatan', ico: '💊', label: 'Produk', units: ['strip', 'botol', 'box', 'pcs', 'sachet'], ket: 'Aturan pakai / catatan', tx: [] },
  { id: 'kerajinan', nama: 'Kerajinan, Souvenir & Oleh-oleh', ico: '🎁', label: 'Produk', units: ['pcs', 'set', 'box', 'pack'], ket: 'Varian / keterangan', tx: [] },
  { id: 'jasa', nama: 'Penyewaan & Jasa Lainnya', ico: '🧰', label: 'Jasa', units: ['kali', 'hari', 'jam', 'paket', 'unit'], ket: 'Keterangan', tx: [{ k: 'Keterangan Sewa', t: 'text' }] }
];
const catOf = id => CATS.find(c => c.id === id) || CATS[CATS.length - 1];
const METODE = ['Tunai', 'QRIS', 'Transfer', 'Debit', 'Lainnya'];
const SOSMED = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'X / Twitter', 'Lainnya'];

/* ===== telepon & WA ===== */
function normPhone(s) {
  const raw = String(s || '').trim(); let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8') && !raw.startsWith('+')) d = '62' + d;
  return d;
}
const validPhone = s => { const d = normPhone(s); return d.length >= 10 && d.length <= 15; };

/* ===== transaksi ===== */
const itemSub = i => Math.max(0, (+i.qty || 0) * (+i.harga || 0) - (+i.diskon || 0));
const trxTotal = t => t.items.reduce((a, i) => a + itemSub(i), 0);
const trxDiskon = t => t.items.reduce((a, i) => a + (+i.diskon || 0), 0);
function nextNo(dateStr) {
  const base = 'CG' + dateStr.replace(/-/g, '') + '-';
  let mx = 0;
  for (const t of DB.trx) if (t.no.startsWith(base)) mx = Math.max(mx, parseInt(t.no.slice(base.length), 10) || 0);
  return base + pad(mx + 1, 3);
}
const usahaById = id => DB.usaha.find(u => u.id === id);

/* ===== gambar ===== */
function pickImage(maxDim = 420) {
  return new Promise(res => {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
    f.onchange = () => {
      const file = f.files[0]; if (!file) return res(null);
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const s = Math.min(1, maxDim / Math.max(im.width, im.height));
          const c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png'));
        };
        im.onerror = () => { toast('Gambar tidak dapat dibaca'); res(null); };
        im.src = fr.result;
      };
      fr.readAsDataURL(file);
    };
    f.click();
  });
}

/* ===== file keluar masuk ===== */
function u8ToB64(u8) { let s = ''; const ch = 0x8000; for (let i = 0; i < u8.length; i += ch) s += String.fromCharCode.apply(null, u8.subarray(i, i + ch)); return btoa(s); }
const strToU8 = s => new TextEncoder().encode(s);
function saveFileOut(name, u8, mime) {
  if (hasBridge()) {
    const r = Android.saveFile(name, u8ToB64(u8), mime);
    if (String(r).startsWith('ERROR')) { toast('Gagal menyimpan: ' + r); return null; }
    return r;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([u8], { type: mime })); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  return 'Unduhan/' + name;
}
function shareFileOut(name, u8, mime) {
  if (hasBridge()) Android.shareFile(name, u8ToB64(u8), mime); else saveFileOut(name, u8, mime);
}
function readFileAny() {
  return new Promise(res => {
    const f = document.createElement('input'); f.type = 'file';
    f.onchange = () => { const file = f.files[0]; if (!file) return res(null); const fr = new FileReader(); fr.onload = () => res({ name: file.name, buf: fr.result }); fr.readAsArrayBuffer(file); };
    f.click();
  });
}

/* ===== toast & modal ===== */
function toast(msg, ms = 2800) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), ms); }
const modalStack = [];
function openModal(html, opt = {}) {
  const el = document.createElement('div'); el.className = 'modal';
  el.innerHTML = `<div class="sheet ${opt.cls || ''}">${html}</div>`;
  el.addEventListener('mousedown', e => { if (e.target === el && !opt.sticky) closeModal(el); });
  $('#modals').append(el); modalStack.push({ el, onClose: opt.onClose, sticky: opt.sticky }); return el;
}
function closeModal(el) {
  const i = modalStack.findIndex(m => m.el === el); if (i < 0) return;
  const [m] = modalStack.splice(i, 1); m.el.remove(); m.onClose && m.onClose();
}
function closeTopModal() { const m = modalStack[modalStack.length - 1]; if (m && !m.sticky) { closeModal(m.el); return true; } return !!m; }
function confirmBox(title, msg, ok = 'Ya', danger = false) {
  return new Promise(res => {
    let done = false;
    const el = openModal(`<h2 class="hf">${esc(title)}</h2><p class="muted">${msg}</p><div class="acts"><button class="btn sec" data-r="0">Batal</button><button class="btn ${danger ? 'dark' : ''}" data-r="1">${esc(ok)}</button></div>`, { onClose: () => { if (!done) res(false); } });
    el.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) { done = true; res(b.dataset.r === '1'); closeModal(el); } });
  });
}
function promptPass({ title, desc = '', ok = 'Masuk', fields = [{ ph: 'Password' }], validate }) {
  return new Promise(res => {
    let done = false;
    const el = openModal(`<h2 class="hf">${esc(title)}</h2>${desc ? `<p class="muted small">${desc}</p>` : ''}
      ${fields.map((f, i) => `<div class="field"><input class="inp" type="password" data-i="${i}" placeholder="${esc(f.ph)}" autocomplete="off"></div>`).join('')}
      <div class="err hide"></div><div class="acts"><button class="btn sec" data-r="0">Batal</button><button class="btn" data-r="1">${esc(ok)}</button></div>`,
      { onClose: () => { if (!done) res(null); } });
    el.querySelector('input').focus();
    el.addEventListener('click', async e => {
      const b = e.target.closest('[data-r]'); if (!b) return;
      if (b.dataset.r === '0') return closeModal(el);
      const vals = $$('input', el).map(x => x.value);
      const r = validate ? await validate(vals) : null;
      if (r) { const er = $('.err', el); er.textContent = r; er.classList.remove('hide'); return; }
      done = true; res(vals); closeModal(el);
    });
  });
}
