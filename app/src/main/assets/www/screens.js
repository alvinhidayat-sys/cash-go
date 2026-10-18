'use strict';
/* ===== layar: Home, Transaksi, Detail/Nota, History, Rekap ===== */
const clone = o => JSON.parse(JSON.stringify(o));
const myTrx = () => isAdmin() ? DB.trx : DB.trx.filter(t => t.kasirUser === SESSION.username);
const sumTot = l => l.reduce((a, t) => a + trxTotal(t), 0);
const numFmtInput = el => { const d = el.value.replace(/\D/g, ''); el.value = d ? rp(+d) : ''; };

/* ---- Home ---- */
function screenHome(m) {
  setTitle('Transaksi');
  const today = nowIso().slice(0, 10), tl = myTrx().filter(t => dOnly(t.ts) === today);
  m.innerHTML = `<div class="kpis"><div class="kpi hot"><small>Penjualan hari ini</small><div>Rp ${rp(sumTot(tl))}</div></div><div class="kpi"><small>Transaksi hari ini</small><div>${tl.length}</div></div></div>
  <h3 class="hf muted" style="margin:6px 4px 10px;font-size:20px">Pilih Bidang Usaha</h3>
  <div class="tiles">${DB.usaha.map(u => `<button class="tile" data-u="${u.id}"><div class="lg">${u.logo ? `<img src="${u.logo}">` : catOf(u.kategori).ico}</div><b>${esc(u.nama)}</b><span>${esc(catOf(u.kategori).nama)}</span></button>`).join('')}</div>`;
  $$('[data-u]', m).forEach(b => b.onclick = () => { CART = null; go('tx', null, { uid: b.dataset.u }); });
}

/* ---- Transaksi ---- */
let CART = null, PRICE = {};
const STEP_DEC = ['kg', 'liter', 'm2', 'm3', 'ton', 'meter'];
function draftTrx() {
  const us = usahaById(CART.usahaId), cat = catOf(us.kategori), ts = nowIso(), tot = CART.items.reduce((a, i) => a + itemSub(i), 0);
  return { no: nextNo(dOnly(ts)), ts, usahaId: us.id, usahaNama: us.nama, kategori: us.kategori, kasir: SESSION.name, kasirUser: SESSION.username, kasirRole: SESSION.role,
    customer: CART.customer.trim() || 'Umum', hp: CART.hp.trim(), items: clone(CART.items), metode: CART.metode, bayar: CART.metode === 'Tunai' ? (CART.bayar === '' ? tot : num(CART.bayar)) : tot,
    catatan: CART.catatan.trim(), ext: cat.tx.map(f => [f.k, CART.ext[f.k] || '']).filter(e => e[1]) };
}
function screenTx(m) {
  const us = usahaById(NAV.uid); if (!us) return go('home');
  const cat = catOf(us.kategori); setTitle(us.nama);
  if (!CART || CART.usahaId !== us.id) CART = { usahaId: us.id, items: [], customer: '', hp: '', metode: 'Tunai', bayar: '', catatan: '', ext: {} };
  PRICE = {}; DB.trx.forEach(t => { if (t.usahaId === us.id || t.usahaNama === us.nama) t.items.forEach(i => PRICE[i.nama.toLowerCase()] = i); });
  const ts = nowIso();
  m.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sec sm" id="bk">${ic('back')} Beranda</button><span class="badge">${esc(cat.nama)}</span></div>
  <div class="tx"><div>
    <div class="card"><h3 class="hf">Tambah ${esc(cat.label)}</h3>
      <div class="field"><label>Nama ${esc(cat.label)}</label><input class="inp" id="in" list="dl" autocomplete="off" placeholder="Ketik nama..."><datalist id="dl">${Object.values(PRICE).map(i => `<option value="${esc(i.nama)}">`).join('')}</datalist></div>
      <div class="cols"><div class="field"><label>Qty</label><input class="inp" id="iq" inputmode="decimal" value="1"></div>
      <div class="field"><label>Satuan</label><select class="inp" id="is">${cat.units.map(u => `<option>${u}</option>`).join('')}</select></div>
      <div class="field"><label>Harga Satuan (Rp)</label><input class="inp" id="ih" inputmode="numeric" placeholder="0"></div>
      <div class="field"><label>Diskon (Rp)</label><input class="inp" id="id" inputmode="numeric" placeholder="0"></div></div>
      ${cat.ket ? `<div class="field"><label>${esc(cat.ket)}</label><input class="inp" id="ik"></div>` : ''}
      <button class="btn block" id="add">${ic('plus')} Tambah ke Pesanan</button></div>
    <div class="card"><h3 class="hf">Pesanan</h3><div id="items"></div></div>
  </div><div>
    <div class="card"><div class="meta"><div>No Transaksi<b>${nextNo(dOnly(ts))}</b></div><div>Tanggal<b>${fmtDate(ts)}</b></div><div>Kasir<b>${esc(SESSION.name)}</b></div></div><div class="gap"></div>
      <div class="field"><label>Nama Customer</label><input class="inp" id="cn" value="${esc(CART.customer)}" placeholder="Umum"></div>
      <div class="field"><label>No HP / WhatsApp</label><input class="inp" id="ch" type="tel" value="${esc(CART.hp)}" placeholder="08xxxxxxxxxx"></div><div id="waw"></div>
      ${cat.tx.map((f, i) => `<div class="field"><label>${esc(f.k)}</label>${f.o ? `<select class="inp" data-e="${esc(f.k)}"><option value="">- pilih -</option>${f.o.map(o => `<option ${CART.ext[f.k] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>` : `<input class="inp" data-e="${esc(f.k)}" type="${f.t === 'date' ? 'date' : 'text'}" value="${esc(CART.ext[f.k] || '')}">`}</div>`).join('')}</div>
    <div class="card"><h3 class="hf">Pembayaran</h3><div class="chips" id="mt">${METODE.map(x => `<button class="chip ${CART.metode === x ? 'on' : ''}" data-m="${x}">${x}</button>`).join('')}</div><div class="gap"></div>
      <div id="paywrap"></div>
      <div class="field"><label>Catatan Transaksi</label><input class="inp" id="cc" value="${esc(CART.catatan)}"></div></div>
    <div class="totbar"><span class="hf" style="font-size:20px">Total</span><b id="tot">Rp 0</b></div>
    <button class="btn block" id="save" style="font-size:17px">${ic('chk')} Simpan Transaksi</button>
  </div></div>`;
  const q = s => $(s, m);
  $('#bk', m).onclick = () => go('home');
  numFmtBind(q('#ih')); numFmtBind(q('#id'));
  q('#in').oninput = () => { const p = PRICE[q('#in').value.trim().toLowerCase()]; if (p && !q('#ih').value) { q('#ih').value = rp(p.harga); if (p.satuan) q('#is').value = cat.units.includes(p.satuan) ? p.satuan : q('#is').value; } };
  q('#add').onclick = () => {
    const nama = q('#in').value.trim(), qty = num(q('#iq').value), harga = num(q('#ih').value), diskon = num(q('#id').value);
    if (!nama) return toast('Nama ' + cat.label.toLowerCase() + ' wajib diisi');
    if (!(qty > 0)) return toast('Qty harus lebih dari 0');
    if (!(harga > 0)) return toast('Harga satuan wajib diisi');
    if (diskon > qty * harga) return toast('Diskon melebihi harga');
    CART.items.push({ nama, qty, satuan: q('#is').value, harga, diskon, ket: q('#ik') ? q('#ik').value.trim() : '' });
    q('#in').value = q('#ih').value = q('#id').value = ''; if (q('#ik')) q('#ik').value = ''; q('#iq').value = '1'; renderCart(m); q('#in').focus();
  };
  q('#cn').oninput = e => CART.customer = e.target.value; q('#cc').oninput = e => CART.catatan = e.target.value;
  q('#ch').oninput = e => { CART.hp = e.target.value; waLink(m); };
  $$('[data-e]', m).forEach(e => e.oninput = e.onchange = () => CART.ext[e.dataset.e] = e.value);
  $$('[data-m]', m).forEach(b => b.onclick = () => { CART.metode = b.dataset.m; $$('[data-m]', m).forEach(x => x.classList.toggle('on', x === b)); renderCart(m); });
  q('#save').onclick = saveTrx; waLink(m); renderCart(m);
}
function numFmtBind(el) { el.addEventListener('input', () => numFmtInput(el)); }
function waLink(m) {
  const w = $('#waw', m); if (!w) return;
  if (!validPhone(CART.hp)) { w.innerHTML = CART.hp ? '<div class="small muted" style="margin:-6px 0 10px 8px">Nomor belum valid</div>' : ''; return; }
  w.innerHTML = `<a href="#" class="wa-link" id="wal">${ic('wa')} Chat WhatsApp +${normPhone(CART.hp)}</a>`;
  $('#wal', m).onclick = e => { e.preventDefault(); sendWA(CART.items.length ? draftTrx() : null, normPhone(CART.hp)); };
}
function renderCart(m) {
  const tot = CART.items.reduce((a, i) => a + itemSub(i), 0), box = $('#items', m);
  box.innerHTML = CART.items.length ? `<div class="items">${CART.items.map((i, n) => `<div class="it"><div class="nm"><b>${esc(i.nama)}</b><span class="small muted">${rp(i.harga)} / ${esc(i.satuan)}${i.diskon ? ` • diskon ${rp(i.diskon)}` : ''}${i.ket ? ' • ' + esc(i.ket) : ''}</span></div>
    <div class="stp"><button data-s="${n}:-1">−</button><span>${fmtQty(i.qty)}</span><button data-s="${n}:1">+</button></div><b style="min-width:70px;text-align:right">${rp(itemSub(i))}</b><button data-d="${n}" style="color:var(--danger)">${ic('trash')}</button></div>`).join('')}</div>` : '<div class="empty">Belum ada item. Tambahkan lewat form di atas.</div>';
  $$('[data-s]', box).forEach(b => b.onclick = () => { const [n, d] = b.dataset.s.split(':').map(Number), i = CART.items[n], st = STEP_DEC.includes(i.satuan) ? 0.5 : 1; i.qty = Math.round((i.qty + d * st) * 100) / 100; if (i.qty <= 0) CART.items.splice(n, 1); renderCart(m); });
  $$('[data-d]', box).forEach(b => b.onclick = () => { CART.items.splice(+b.dataset.d, 1); renderCart(m); });
  $('#tot', m).textContent = 'Rp ' + rp(tot);
  const pw = $('#paywrap', m);
  if (CART.metode === 'Tunai') {
    const by = CART.bayar === '' ? tot : num(CART.bayar), kb = by - tot;
    pw.innerHTML = `<div class="field"><label>Uang Diterima (Rp)</label><input class="inp" id="by" inputmode="numeric" value="${esc(CART.bayar)}" placeholder="${rp(tot)}"></div>
      <div class="chips" style="margin-bottom:10px"><button class="chip" data-q="0">Uang Pas</button>${[20000, 50000, 100000].map(v => `<button class="chip" data-q="${v}">${rp(v)}</button>`).join('')}</div>
      <div class="row sp" style="margin-bottom:12px"><span class="muted">Kembalian</span><b style="color:${kb < 0 ? 'var(--danger)' : 'var(--ok)'}">Rp ${rp(Math.max(0, kb))}${kb < 0 ? ' (kurang ' + rp(-kb) + ')' : ''}</b></div>`;
    const by_ = $('#by', pw); numFmtBind(by_); by_.oninput = () => { numFmtInput(by_); CART.bayar = by_.value; renderKembali(m, tot); };
    $$('[data-q]', pw).forEach(b => b.onclick = () => { CART.bayar = b.dataset.q === '0' ? '' : rp(+b.dataset.q); renderCart(m); });
  } else pw.innerHTML = `<div class="small muted" style="margin-bottom:12px">Pembayaran ${CART.metode} sesuai total belanja.</div>`;
}
function renderKembali(m, tot) {
  const kb = (CART.bayar === '' ? tot : num(CART.bayar)) - tot, b = $('#paywrap .row b', m);
  if (b) { b.style.color = kb < 0 ? 'var(--danger)' : 'var(--ok)'; b.textContent = 'Rp ' + rp(Math.max(0, kb)) + (kb < 0 ? ' (kurang ' + rp(-kb) + ')' : ''); }
}
function saveTrx() {
  if (!CART.items.length) return toast('Tambahkan minimal 1 item');
  const t = draftTrx(), tot = trxTotal(t);
  if (t.metode === 'Tunai' && t.bayar < tot) return toast('Uang diterima kurang Rp ' + rp(tot - t.bayar));
  t.total = tot; DB.trx.push(t); save(); const uid = t.usahaId; CART = null; showDetail(t, { fresh: true, uid });
}

/* ---- WhatsApp / cetak / PDF ---- */
async function sendWA(t, phone) {
  phone = phone || normPhone(t.hp);
  if (!t) { if (hasBridge()) Android.openLink('https://wa.me/' + phone); else window.open('https://wa.me/' + phone, '_blank'); return; }
  const text = waSummary(t), pdf = notaPdf(await buildNota(t));
  if (hasBridge()) Android.shareWhatsApp(phone, text, u8ToB64(pdf), notaFileName(t));
  else { saveFileOut(notaFileName(t), pdf, 'application/pdf'); window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank'); toast('Di browser: PDF diunduh, lampirkan manual ke chat WA'); }
}
function pickPrinter() {
  if (!hasBridge()) { toast('Pilih printer hanya tersedia di aplikasi Android'); return Promise.resolve(null); }
  const r = Android.listPrinters();
  if (r === 'PERMISSION') { toast('Izinkan akses Bluetooth lalu coba lagi'); return Promise.resolve(null); }
  const list = JSON.parse(r);
  if (!list.length) { alertBox('Printer belum dipasangkan', 'Pasangkan (pairing) printer thermal Bluetooth lebih dulu di Pengaturan Bluetooth HP, lalu coba lagi.'); return Promise.resolve(null); }
  return new Promise(res => {
    let pick = null;
    const el = openModal(`<h2 class="hf">Pilih Printer</h2>${list.map((p, i) => `<button class="set-i" style="width:100%;margin-bottom:8px" data-p="${i}"><div class="ic">${ic('print')}</div><div><b>${esc(p.name)}</b><div class="small muted">${p.mac}</div></div></button>`).join('')}`, { onClose: () => res(pick) });
    el.onclick = e => { const b = e.target.closest('[data-p]'); if (b) { pick = list[+b.dataset.p]; DB.cfg.printer = pick; save(); closeModal(el); } };
  });
}
async function printNota(t) {
  if (!hasBridge()) return toast('Cetak thermal tersedia di aplikasi Android. Di browser gunakan tombol PDF.');
  const pr = DB.cfg.printer || await pickPrinter(); if (!pr) return;
  toast('Mengirim ke printer ' + pr.name + '…'); Android.printBytes(pr.mac, u8ToB64(notaEscPos(await buildNota(t))));
}
async function savePdf(t) {
  const u8 = notaPdf(await buildNota(t)), name = notaFileName(t), path = saveFileOut(name, u8, 'application/pdf'); if (!path) return;
  const el = openModal(`<h2 class="hf">Nota PDF Tersimpan</h2><p><b>${esc(path)}</b></p><div class="acts"><button class="btn sec" data-a="x">Tutup</button><button class="btn" data-a="s">${ic('share')} Bagikan</button></div>`);
  el.onclick = e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 's') shareFileOut(name, u8, 'application/pdf'); else if (a) closeModal(el); };
}

/* ---- detail transaksi ---- */
function detailHtml(t) {
  const tot = trxTotal(t), ph = validPhone(t.hp);
  const meta = [['No Transaksi', t.no], ['Tanggal', fmtDT(t.ts)], ['Bidang Usaha', t.usahaNama], ['Kasir', t.kasir], ['Customer', t.customer || '-'], ['Metode Bayar', t.metode], ...(t.ext || []).map(e => [e[0], e[1]])];
  return `<table class="t"><tbody>${meta.map(([a, b]) => `<tr><td class="muted" style="width:38%">${esc(a)}</td><td><b>${esc(b)}</b></td></tr>`).join('')}
  ${t.hp ? `<tr><td class="muted">No HP</td><td><b>${esc(t.hp)}</b> ${ph ? `<a href="#" class="wa-link" data-wa style="margin:0 0 0 6px">${ic('wa')} WA</a>` : ''}</td></tr>` : ''}</tbody></table><div class="gap"></div>
  <div class="scroll-x"><table class="t"><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Harga</th><th class="r">Subtotal</th></tr></thead><tbody>
  ${t.items.map(i => `<tr><td>${esc(i.nama)}${i.ket ? `<div class="small muted">${esc(i.ket)}</div>` : ''}${i.diskon ? `<div class="small muted">Diskon -${rp(i.diskon)}</div>` : ''}</td><td class="r">${fmtQty(i.qty)} ${esc(i.satuan)}</td><td class="r">${rp(i.harga)}</td><td class="r">${rp(itemSub(i))}</td></tr>`).join('')}
  <tr class="tot"><td colspan="3">TOTAL</td><td class="r">Rp ${rp(tot)}</td></tr>
  <tr><td colspan="3" class="muted">Dibayar (${esc(t.metode)})</td><td class="r">${rp(t.bayar)}</td></tr>
  ${t.metode === 'Tunai' ? `<tr><td colspan="3" class="muted">Kembalian</td><td class="r">${rp(Math.max(0, t.bayar - tot))}</td></tr>` : ''}</tbody></table></div>
  ${t.catatan ? `<p class="small muted">Catatan: ${esc(t.catatan)}</p>` : ''}`;
}
function showDetail(t, opt = {}) {
  const ph = validPhone(t.hp); let previewing = false;
  const el = openModal(`<div class="row sp"><h2 class="hf" style="margin:0">Detail Transaksi</h2><button data-a="x">${ic('x')}</button></div>
    ${opt.fresh ? '<div class="badge" style="margin:8px 0">✓ Transaksi berhasil disimpan</div>' : ''}<div id="dBody" style="margin-top:10px">${detailHtml(t)}</div>
    <div class="acts"><button class="btn sec" data-a="nota">${ic('rec')} <span id="nl">Lihat Nota</span></button><button class="btn sec" data-a="print">${ic('print')} Cetak</button><button class="btn sec" data-a="pdf">${ic('dl')} PDF</button>
    ${ph ? `<button class="btn wa" data-a="wa">${ic('wa')} WhatsApp</button>` : ''}${isAdmin() && !opt.fresh ? `<button class="btn danger" data-a="del">${ic('trash')} Hapus</button>` : ''}
    ${opt.fresh ? '<button class="btn" data-a="new">Transaksi Baru</button>' : ''}</div>`, { onClose: () => { if (opt.fresh && !el._new && NAV.tab === 'tx') go('home'); } });
  const bindWa = () => { const w = $('[data-wa]', el); if (w) w.onclick = e => { e.preventDefault(); sendWA(t); }; }; bindWa();
  el.onclick = async e => {
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'x') closeModal(el);
    else if (a === 'nota') { previewing = !previewing; $('#dBody', el).innerHTML = previewing ? notaHtml(await buildNota(t)) : detailHtml(t); $('#nl', el).textContent = previewing ? 'Lihat Detail' : 'Lihat Nota'; bindWa(); }
    else if (a === 'print') printNota(t); else if (a === 'pdf') savePdf(t); else if (a === 'wa') sendWA(t);
    else if (a === 'new') { el._new = true; closeModal(el); CART = null; go('tx', null, { uid: opt.uid }); }
    else if (a === 'del' && await confirmBox('Hapus Transaksi', `Hapus transaksi <b>${t.no}</b>? Tindakan ini tidak bisa dibatalkan.`, 'Hapus', true)) { DB.trx = DB.trx.filter(x => x !== t && x.no !== t.no); save(); closeModal(el); if (NAV.tab === 'hist') renderMain(); toast('Transaksi dihapus'); }
  };
}

/* ---- History ---- */
let HF = { tab: 'cust', usaha: '', y: '', m: '', d: '', q: '', kasir: '', lim: 60 };
function histFilter(base) {
  return base.filter(t => (!HF.usaha || t.usahaNama === HF.usaha) && (!HF.y || t.ts.startsWith(HF.y)) && (!HF.m || t.ts.slice(5, 7) === HF.m) && (!HF.d || t.ts.slice(8, 10) === HF.d)
    && (!HF.kasir || t.kasir === HF.kasir) && (!HF.q || (t.no + t.customer + t.hp + t.kasir).toLowerCase().includes(HF.q.toLowerCase())));
}
function screenHist(m) {
  setTitle('History Transaksi'); if (!isAdmin()) HF.tab = 'cust';
  const base = myTrx(), names = [...new Set([...DB.usaha.map(u => u.nama), ...base.map(t => t.usahaNama)])];
  const a = base.filter(t => !HF.usaha || t.usahaNama === HF.usaha), years = [...new Set(a.map(t => t.ts.slice(0, 4)))].sort().reverse(); if (HF.y && !years.includes(HF.y)) HF.y = '';
  const b = a.filter(t => !HF.y || t.ts.startsWith(HF.y)), months = [...new Set(b.map(t => t.ts.slice(5, 7)))].sort(); if (HF.m && !months.includes(HF.m)) HF.m = '';
  const c = b.filter(t => !HF.m || t.ts.slice(5, 7) === HF.m), days = [...new Set(c.map(t => t.ts.slice(8, 10)))].sort(); if (HF.d && !days.includes(HF.d)) HF.d = '';
  const list = histFilter(base).sort((x, y) => x.ts < y.ts ? 1 : -1), kas = HF.tab === 'kasir';
  const kb = {};
  const forKasir = base.filter(t => (!HF.usaha || t.usahaNama === HF.usaha) && (!HF.y || t.ts.startsWith(HF.y)) && (!HF.m || t.ts.slice(5, 7) === HF.m) && (!HF.d || t.ts.slice(8, 10) === HF.d));
  forKasir.forEach(t => { (kb[t.kasir] = kb[t.kasir] || { n: 0, s: 0 }).n++; kb[t.kasir].s += trxTotal(t); });
  const opt = (arr, cur, lab = x => x) => arr.map(x => `<option value="${x}" ${cur === x ? 'selected' : ''}>${lab(x)}</option>`).join('');
  m.innerHTML = `${isAdmin() ? `<div class="tabs"><button data-tb="cust" class="${kas ? '' : 'on'}">Transaksi Customer</button><button data-tb="kasir" class="${kas ? 'on' : ''}">Transaksi Kasir</button></div>` : ''}
  <div class="filters">${names.length > 1 ? `<select class="inp" id="fu"><option value="">Semua Usaha</option>${opt(names, HF.usaha)}</select>` : ''}
  <select class="inp" id="fy"><option value="">Semua Tahun</option>${opt(years, HF.y)}</select>
  <select class="inp" id="fm"><option value="">Semua Bulan</option>${opt(months, HF.m, x => BULAN[+x - 1])}</select>
  <select class="inp" id="fd"><option value="">Semua Tanggal</option>${opt(days, HF.d, x => +x)}</select>
  <input class="inp" id="fq" placeholder="Cari no / nama / HP" value="${esc(HF.q)}"></div>
  ${kas ? `<div class="chips" style="margin-bottom:12px"><button class="chip ${HF.kasir ? '' : 'on'}" data-k="">Semua Kasir</button>${Object.entries(kb).map(([k, v]) => `<button class="chip ${HF.kasir === k ? 'on' : ''}" data-k="${esc(k)}">${esc(k)} • ${v.n} trx • ${short(v.s)}</button>`).join('')}</div>` : ''}
  <div class="row sp" style="margin:0 4px 10px"><span class="muted small"><b>${list.length}</b> transaksi • Rp <b>${rp(sumTot(list))}</b></span>${isAdmin() ? `<button class="btn sec sm" id="fx">${ic('dl')} Export .xls</button>` : ''}</div>
  <div class="hist">${list.slice(0, HF.lim).map(t => `<button class="hi" data-n="${t.no}"><div class="ic">${ic(kas ? 'user' : 'rec')}</div><div class="grow"><b>${esc(kas ? t.kasir : t.customer || 'Umum')}</b><div class="small muted">${t.no} • ${fmtDT(t.ts)}</div><div class="small muted">${esc(kas ? 'Customer: ' + (t.customer || 'Umum') : (t.hp || 'Kasir: ' + t.kasir))} • ${esc(t.usahaNama)}</div></div><div class="amt">Rp ${rp(trxTotal(t))}</div></button>`).join('')}</div>
  ${list.length > HF.lim ? `<div class="center" style="margin:14px"><button class="btn sec" id="more">Tampilkan lebih banyak</button></div>` : ''}${list.length ? '' : '<div class="empty">Tidak ada transaksi pada filter ini.</div>'}`;
  const rr = () => { HF.lim = 60; screenHist(m); };
  $$('[data-tb]', m).forEach(x => x.onclick = () => { HF.tab = x.dataset.tb; HF.kasir = ''; rr(); });
  const ch = (id, f, reset = []) => { const e = $(id, m); if (e) e.onchange = () => { HF[f] = e.value; reset.forEach(r => HF[r] = ''); rr(); }; };
  ch('#fu', 'usaha', ['y', 'm', 'd']); ch('#fy', 'y', ['m', 'd']); ch('#fm', 'm', ['d']); ch('#fd', 'd');
  const fq = $('#fq', m); fq.onchange = () => { HF.q = fq.value; rr(); };
  $$('[data-k]', m).forEach(x => x.onclick = () => { HF.kasir = x.dataset.k; rr(); });
  $$('[data-n]', m).forEach(x => x.onclick = () => showDetail(DB.trx.find(t => t.no === x.dataset.n)));
  const mo = $('#more', m); if (mo) mo.onclick = () => { HF.lim += 60; screenHist(m); };
  const fx = $('#fx', m); if (fx) fx.onclick = () => exportTrx([...list].reverse(), HF.y ? HF.y + (HF.m ? '-' + HF.m : '') : 'Filter');
}

/* ---- Rekap Penjualan (Administrator) ---- */
let RF = { usaha: '', y: String(new Date().getFullYear()), m: '', type: 'bar' };
function screenRekap(m) {
  setTitle('Rekap Penjualan'); clearCharts();
  const names = [...new Set([...DB.usaha.map(u => u.nama), ...DB.trx.map(t => t.usahaNama)])];
  const years = [...new Set(DB.trx.map(t => t.ts.slice(0, 4)))].sort().reverse(); if (RF.y && !years.includes(RF.y)) RF.y = years.includes(RF.y) ? RF.y : (years[0] || '');
  const list = DB.trx.filter(t => (!RF.usaha || t.usahaNama === RF.usaha) && (!RF.y || t.ts.startsWith(RF.y)) && (!RF.m || t.ts.slice(5, 7) === RF.m));
  const bersih = sumTot(list), diskon = list.reduce((a, t) => a + trxDiskon(t), 0), nItem = list.reduce((a, t) => a + t.items.length, 0);
  // bucket waktu
  const bk = new Map();
  if (RF.m && RF.y) { const dim = new Date(+RF.y, +RF.m, 0).getDate(); for (let d = 1; d <= dim; d++) bk.set(pad(d), { l: String(d), n: 0, k: 0, d: 0 }); list.forEach(t => bk.get(t.ts.slice(8, 10)) && 0); }
  else if (RF.y) for (let i = 1; i <= 12; i++) bk.set(pad(i), { l: BULAN[i - 1].slice(0, 3), n: 0, k: 0, d: 0 });
  const keyOf = t => RF.m && RF.y ? t.ts.slice(8, 10) : RF.y ? t.ts.slice(5, 7) : t.ts.slice(0, 7);
  list.slice().sort((a, b) => a.ts < b.ts ? -1 : 1).forEach(t => { const k = keyOf(t); if (!bk.has(k)) bk.set(k, { l: RF.y ? k : BULAN[+k.slice(5) - 1].slice(0, 3) + ' ' + k.slice(2, 4), n: 0, k: 0, d: 0 }); const o = bk.get(k), tt = trxTotal(t), dd = trxDiskon(t); o.n++; o.k += tt + dd; o.d += dd; });
  const rows = [...bk.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([k, v]) => v), trows = rows.filter(r => r.n);
  const grp = (fn, val = trxTotal) => { const o = {}; list.forEach(t => fn(t).forEach(([k, v]) => o[k] = (o[k] || 0) + v)); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const byMet = grp(t => [[t.metode, trxTotal(t)]]), byUs = grp(t => [[t.usahaNama, trxTotal(t)]]), byKas = grp(t => [[t.kasir, trxTotal(t)]]), top = grp(t => t.items.map(i => [i.nama, itemSub(i)])).slice(0, 8);
  const kasN = {}; list.forEach(t => kasN[t.kasir] = (kasN[t.kasir] || 0) + 1);
  const opt = (arr, cur, lab = x => x) => arr.map(x => `<option value="${x}" ${cur === x ? 'selected' : ''}>${lab(x)}</option>`).join('');
  const mon = [...new Set(DB.trx.filter(t => !RF.y || t.ts.startsWith(RF.y)).map(t => t.ts.slice(5, 7)))].sort(); if (RF.m && !mon.includes(RF.m)) RF.m = '';
  m.innerHTML = `<div class="filters">${names.length > 1 ? `<select class="inp" id="ru"><option value="">Semua Usaha</option>${opt(names, RF.usaha)}</select>` : ''}<select class="inp" id="ry"><option value="">Semua Tahun</option>${opt(years, RF.y)}</select><select class="inp" id="rm"><option value="">Semua Bulan</option>${opt(mon, RF.m, x => BULAN[+x - 1])}</select></div>
  <div class="kpis"><div class="kpi hot"><small>Pendapatan Bersih</small><div>Rp ${rp(bersih)}</div></div><div class="kpi"><small>Pendapatan Kotor</small><div>Rp ${rp(bersih + diskon)}</div></div><div class="kpi"><small>Total Diskon</small><div>Rp ${rp(diskon)}</div></div><div class="kpi"><small>Transaksi</small><div>${list.length}</div></div><div class="kpi"><small>Rata-rata / Transaksi</small><div>Rp ${rp(list.length ? bersih / list.length : 0)}</div></div><div class="kpi"><small>Jumlah Item</small><div>${nItem}</div></div></div>
  <div class="charts"><div class="card wide"><div class="row sp"><h3 class="hf" style="margin:0">Tren Penjualan ${RF.m ? 'Harian' : RF.y ? 'Bulanan' : ''}</h3><div class="chips"><button class="chip ${RF.type === 'bar' ? 'on' : ''}" data-ty="bar">Batang</button><button class="chip ${RF.type === 'line' ? 'on' : ''}" data-ty="line">Garis</button></div></div><div class="gap"></div><canvas class="cv" id="c1"></canvas></div>
  <div class="card"><h3 class="hf">Metode Pembayaran</h3><canvas class="cv" id="c2"></canvas><div class="legend">${byMet.map(([k, v], i) => `<span><i style="background:${PAL[i % PAL.length]}"></i>${esc(k)} • Rp ${rp(v)}</span>`).join('')}</div></div>
  <div class="card"><h3 class="hf">Produk / Layanan Terlaris</h3><canvas class="cv" id="c3"></canvas></div>
  ${byUs.length > 1 ? `<div class="card"><h3 class="hf">Per Bidang Usaha</h3><canvas class="cv" id="c4"></canvas></div>` : ''}
  <div class="card"><h3 class="hf">Kinerja Kasir</h3><canvas class="cv" id="c5"></canvas></div>
  <div class="card wide"><h3 class="hf">Laporan Keuangan ${RF.m ? 'Harian' : 'Bulanan'}</h3><div class="scroll-x"><table class="t"><thead><tr><th>Periode</th><th class="r">Trx</th><th class="r">Kotor</th><th class="r">Diskon</th><th class="r">Bersih</th></tr></thead><tbody>
  ${trows.map(r => `<tr><td>${esc(r.l)}</td><td class="r">${r.n}</td><td class="r">${rp(r.k)}</td><td class="r">${rp(r.d)}</td><td class="r">${rp(r.k - r.d)}</td></tr>`).join('') || '<tr><td colspan="5" class="empty">Belum ada data</td></tr>'}
  <tr class="tot"><td>TOTAL</td><td class="r">${list.length}</td><td class="r">${rp(bersih + diskon)}</td><td class="r">${rp(diskon)}</td><td class="r">${rp(bersih)}</td></tr></tbody></table></div></div></div>`;
  const ch = (id, f, rs = []) => { const e = $(id, m); if (e) e.onchange = () => { RF[f] = e.value; rs.forEach(r => RF[r] = ''); screenRekap(m); }; };
  ch('#ru', 'usaha'); ch('#ry', 'y', ['m']); ch('#rm', 'm');
  $$('[data-ty]', m).forEach(b => b.onclick = () => { RF.type = b.dataset.ty; screenRekap(m); });
  chartBarLine($('#c1', m), { labels: rows.map(r => r.l), values: rows.map(r => r.k - r.d), type: RF.type });
  chartDonut($('#c2', m), { labels: byMet.map(x => x[0]), values: byMet.map(x => x[1]) });
  chartHBar($('#c3', m), { labels: top.map(x => x[0]), values: top.map(x => x[1]) });
  if ($('#c4', m)) chartHBar($('#c4', m), { labels: byUs.map(x => x[0]), values: byUs.map(x => x[1]) });
  chartHBar($('#c5', m), { labels: byKas.map(x => x[0]), values: byKas.map(x => x[1]), sub: byKas.map(x => kasN[x[0]] + ' transaksi') });
}
