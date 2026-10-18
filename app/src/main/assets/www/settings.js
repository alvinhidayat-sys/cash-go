'use strict';
/* ===== Pengaturan (wajib diisi di awal) & wizard ===== */
const recCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
const logoBox = (id, url, label) => `<div class="logo-pick"><div class="pv" id="${id}">${url ? `<img src="${url}">` : label}</div><div class="row wrap"><button class="btn sec sm" data-pk="${id}">${ic('img')} Pilih</button>${url ? `<button class="btn danger sm" data-rm="${id}">Hapus</button>` : ''}</div></div>`;

/* --- 1. password --- */
function secPass(el) {
  const first = !DB.adminHash;
  el.innerHTML = `<p class="muted small">${first ? 'Buat <b>password utama administrator</b>. Password ini memberi akses ke seluruh menu (Setting, History, Rekap).' : 'Ubah password utama administrator.'}</p>
  ${first ? '' : '<div class="field"><label>Password Lama</label><input class="inp" type="password" id="p0"></div>'}
  <div class="field"><label>Password ${first ? '' : 'Baru '}(min. 6 karakter)</label><input class="inp" type="password" id="p1"></div>
  <div class="field"><label>Ulangi Password</label><input class="inp" type="password" id="p2"></div>`;
  return { async save() {
    if (!first && (await hash($('#p0', el).value)) !== DB.adminHash) return 'Password lama salah';
    const a = $('#p1', el).value, b = $('#p2', el).value;
    if (a.length < 6) return 'Password minimal 6 karakter'; if (a !== b) return 'Ulangi password tidak sama';
    DB.adminHash = await hash(a);
    if (!DB.recHash) { const c = recCode(); DB.recHash = await hash(c); save();
      alertBox('Kode Pemulihan', `Simpan kode ini di tempat aman. Kode dipakai untuk mereset password administrator jika lupa (aplikasi bekerja offline).<div class="card center hf" style="margin:12px 0 0;font-size:34px;letter-spacing:.2em;color:var(--or2)">${c}</div><p class="small muted">Kode hanya ditampilkan sekali.</p>`); }
    save(); return null;
  } };
}
/* --- 2. profil & logo --- */
function secProfil(el) {
  const d = { splash: DB.cfg.splashLogo, nota: DB.cfg.notaLogo };
  const draw = () => {
    el.innerHTML = `<div class="field"><label>Nama Usaha / Toko</label><input class="inp" id="pn" value="${esc(DB.cfg.nama)}" placeholder="mis. Toko Berkah Jaya"></div>
    <div class="field"><label>Alamat</label><input class="inp" id="pa" value="${esc(DB.cfg.alamat)}"></div>
    <div class="field"><label>No. Telepon</label><input class="inp" id="pt" type="tel" value="${esc(DB.cfg.telp)}"></div>
    <div class="field"><label>Logo Welcome / Flash Screen</label>${logoBox('lsp', d.splash, 'Belum ada<br>(logo Cash GO)')}</div>
    <div class="field"><label>Logo pada Nota / Struk</label>${logoBox('lno', d.nota, 'Belum ada')}
      <div class="row wrap" style="margin-top:8px"><button class="btn sec sm" id="same">Samakan dengan logo welcome</button></div>
      <label class="row" style="margin-top:10px;text-transform:none;font-size:14px"><input type="checkbox" id="sl" ${DB.cfg.showLogo ? 'checked' : ''}> Cetak logo pada nota</label></div>`;
    const keep = () => { DB.cfg.nama = $('#pn', el).value.trim(); DB.cfg.alamat = $('#pa', el).value.trim(); DB.cfg.telp = $('#pt', el).value.trim(); DB.cfg.showLogo = $('#sl', el).checked; };
    $$('[data-pk]', el).forEach(b => b.onclick = async () => { keep(); const u = await pickImage(420); if (u) { d[b.dataset.pk === 'lsp' ? 'splash' : 'nota'] = u; draw(); } });
    $$('[data-rm]', el).forEach(b => b.onclick = () => { keep(); d[b.dataset.rm === 'lsp' ? 'splash' : 'nota'] = ''; draw(); });
    $('#same', el).onclick = () => { keep(); if (!d.splash) return toast('Pilih logo welcome dulu'); d.nota = d.splash; draw(); };
  }; draw();
  return { save() {
    DB.cfg.nama = $('#pn', el).value.trim(); DB.cfg.alamat = $('#pa', el).value.trim(); DB.cfg.telp = $('#pt', el).value.trim(); DB.cfg.showLogo = $('#sl', el).checked;
    if (!DB.cfg.nama) return 'Nama usaha wajib diisi';
    DB.cfg.splashLogo = d.splash; DB.cfg.notaLogo = d.nota; save(); return null;
  } };
}
/* --- 3. bidang usaha (maks 6) --- */
function secUsaha(el) {
  const d = clone(DB.usaha); if (!d.length) d.push({ id: uid(), kategori: CATS[0].id, nama: '', logo: '' });
  const draw = () => {
    el.innerHTML = `<p class="muted small">Pilih maksimal <b>6</b> bidang usaha. Logo dan nama akan tampil di halaman Transaksi.</p>
    ${d.map((u, i) => `<div class="urow"><div class="row sp"><b class="hf" style="font-size:18px">Usaha ${i + 1}</b>${d.length > 1 ? `<button data-del="${i}" style="color:var(--danger)">${ic('trash')}</button>` : ''}</div><div class="gap"></div>
      <div class="field"><label>Kategori</label><select class="inp" data-k="${i}">${CATS.map(c => `<option value="${c.id}" ${u.kategori === c.id ? 'selected' : ''}>${c.ico} ${c.nama}</option>`).join('')}</select></div>
      <div class="field"><label>Nama Usaha</label><input class="inp" data-n="${i}" value="${esc(u.nama)}" placeholder="mis. Warung Bu Ani"></div>
      <div class="field"><label>Logo Usaha</label>${logoBox('u' + i, u.logo, 'Emoji<br>kategori')}</div></div>`).join('')}
    <button class="btn sec block" id="addu" ${d.length >= 6 ? 'disabled' : ''}>${ic('plus')} Tambah Bidang Usaha (${d.length}/6)</button>`;
    $$('[data-n]', el).forEach(x => x.oninput = () => d[+x.dataset.n].nama = x.value);
    $$('[data-k]', el).forEach(x => x.onchange = () => { const u = d[+x.dataset.k]; u.kategori = x.value; if (!u.nama.trim()) u.nama = catOf(x.value).nama.split(/[,&]/)[0].trim(); draw(); });
    $$('[data-del]', el).forEach(x => x.onclick = () => { d.splice(+x.dataset.del, 1); draw(); });
    $$('[data-pk]', el).forEach(b => b.onclick = async () => { const u = await pickImage(300); if (u) { d[+b.dataset.pk.slice(1)].logo = u; draw(); } });
    $$('[data-rm]', el).forEach(b => b.onclick = () => { d[+b.dataset.rm.slice(1)].logo = ''; draw(); });
    $('#addu', el).onclick = () => { d.push({ id: uid(), kategori: CATS[0].id, nama: '', logo: '' }); draw(); };
  }; draw();
  return { save() {
    if (d.some(u => !u.nama.trim())) return 'Nama setiap bidang usaha wajib diisi';
    DB.usaha = d.map(u => ({ ...u, nama: u.nama.trim() })); save(); return null;
  } };
}
/* --- 4. nota, printer, sosmed --- */
function secNota(el) {
  const c = DB.cfg, sm = [0, 1, 2].map(i => c.sosmed[i] || { type: SOSMED[0], link: '' }), wa = [0, 1].map(i => c.wa[i] || { link: '' }); let paper = c.paper;
  el.innerHTML = `<div class="field"><label>Ukuran Kertas Thermal</label><div class="chips" id="pp">
    <button class="chip ${paper === '58' ? 'on' : ''}" data-p="58">58 mm (32 kolom)</button><button class="chip ${paper === '80' ? 'on' : ''}" data-p="80">80 mm (48 kolom)</button></div></div>
  <div class="field"><label>Printer Thermal Bluetooth</label><div class="row wrap"><span class="grow" id="pn">${c.printer ? esc(c.printer.name) : '<span class="muted">Belum dipilih</span>'}</span><button class="btn sec sm" id="pb">${ic('print')} Pilih Printer</button></div></div>
  <div class="field"><label>Pesan Penutup Nota</label><input class="inp" id="nf" value="${esc(c.footer)}"></div>
  <div class="field"><label>Media Sosial (maks. 3) — link / username profil</label>${sm.map((s, i) => `<div class="row" style="margin-bottom:8px"><select class="inp" style="max-width:140px" data-st="${i}">${SOSMED.map(o => `<option ${s.type === o ? 'selected' : ''}>${o}</option>`).join('')}</select><input class="inp" data-sl="${i}" value="${esc(s.link)}" placeholder="https://instagram.com/tokoku"></div>`).join('')}</div>
  <div class="field"><label>Nomor WhatsApp (maks. 2)</label>${wa.map((s, i) => `<input class="inp" style="margin-bottom:8px" data-wl="${i}" value="${esc(s.link)}" placeholder="08xxxxxxxxxx atau https://wa.me/62...">`).join('')}</div>
  <div class="row wrap"><button class="btn sec sm" id="pv">${ic('rec')} Pratinjau Nota</button><button class="btn sec sm" id="tp">${ic('print')} Tes Cetak</button></div>`;
  $$('[data-p]', el).forEach(b => b.onclick = () => { paper = b.dataset.p; $$('[data-p]', el).forEach(x => x.classList.toggle('on', x === b)); });
  const apply = () => {
    c.paper = paper; c.footer = $('#nf', el).value.trim();
    c.sosmed = sm.map((s, i) => ({ type: $(`[data-st="${i}"]`, el).value, link: $(`[data-sl="${i}"]`, el).value.trim() })).filter(s => s.link);
    c.wa = wa.map((s, i) => ({ link: $(`[data-wl="${i}"]`, el).value.trim() })).filter(s => s.link);
  };
  $('#pb', el).onclick = async () => { const p = await pickPrinter(); if (p) $('#pn', el).textContent = p.name; };
  $('#pv', el).onclick = async () => { apply(); const t = sampleTrx()[0]; t.usahaNama = DB.usaha[0]?.nama || t.usahaNama; openModal(`<h2 class="hf">Pratinjau Nota ${paper} mm</h2>${notaHtml(await buildNota(t))}<div class="acts"><button class="btn sec" data-x>Tutup</button><button class="btn" data-pdf>${ic('dl')} Contoh PDF</button></div>`).onclick = async e => { if (e.target.closest('[data-pdf]')) savePdf(t); else if (e.target.closest('[data-x]')) closeTopModal(); }; };
  $('#tp', el).onclick = () => { apply(); printNota(sampleTrx()[0]); };
  return { save() { apply(); save(); return null; } };
}
/* --- 5. kasir --- */
function secKasir(el) {
  const draw = () => {
    el.innerHTML = `<p class="muted small">Kasir hanya dapat mengakses <b>Transaksi</b> dan <b>History Transaksi Customer</b>.</p>
    ${DB.kasir.map((k, i) => `<div class="urow"><div class="row"><div class="grow"><b>${esc(k.nama)}</b><div class="small muted">@${esc(k.username)}</div></div><button class="btn sec sm" data-pw="${i}">Ubah Password</button><button data-dk="${i}" style="color:var(--danger)">${ic('trash')}</button></div></div>`).join('') || '<div class="empty">Belum ada akun kasir.</div>'}
    <div class="urow"><b class="hf" style="font-size:18px">Tambah Kasir</b><div class="gap"></div>
    <div class="field"><label>Nama</label><input class="inp" id="kn"></div><div class="field"><label>Username</label><input class="inp" id="ku" autocapitalize="off"></div>
    <div class="field"><label>Password (min. 4 karakter)</label><input class="inp" type="password" id="kp"></div><div class="err hide" id="ke"></div><button class="btn block" id="ka">${ic('plus')} Simpan Kasir</button></div>`;
    $('#ka', el).onclick = async () => {
      const n = $('#kn', el).value.trim(), u = $('#ku', el).value.trim(), p = $('#kp', el).value, er = $('#ke', el);
      const bad = !n ? 'Nama wajib diisi' : !/^[A-Za-z0-9._-]{3,}$/.test(u) ? 'Username minimal 3 karakter (huruf/angka)' : DB.kasir.some(k => k.username.toLowerCase() === u.toLowerCase()) || u.toLowerCase() === 'admin' ? 'Username sudah dipakai' : p.length < 4 ? 'Password minimal 4 karakter' : '';
      if (bad) { er.textContent = bad; er.classList.remove('hide'); return; }
      DB.kasir.push({ id: uid(), nama: n, username: u, pass: await hash(p) }); save(); toast('Kasir ditambahkan'); draw();
    };
    $$('[data-dk]', el).forEach(b => b.onclick = async () => { const k = DB.kasir[+b.dataset.dk]; if (await confirmBox('Hapus Kasir', `Hapus akun <b>${esc(k.nama)}</b>? Riwayat transaksi tetap tersimpan.`, 'Hapus', true)) { DB.kasir.splice(+b.dataset.dk, 1); save(); draw(); } });
    $$('[data-pw]', el).forEach(b => b.onclick = async () => { const k = DB.kasir[+b.dataset.pw]; const v = await promptPass({ title: 'Password Baru', desc: esc(k.nama), ok: 'Simpan', fields: [{ ph: 'Password baru (min. 4)' }], validate: ([p]) => p.length < 4 ? 'Minimal 4 karakter' : null }); if (v) { k.pass = await hash(v[0]); save(); toast('Password diubah'); } });
  }; draw();
  return { save() { return null; } };
}
/* --- 6. data --- */
function secData(el) {
  el.innerHTML = `<p class="muted small">Format <b>.xls</b> Cash GO: 1 baris = 1 item, kolom sama dengan form transaksi. Lihat sheet <i>Petunjuk Format</i> pada file template.</p>
  <div class="sets"><button class="set-i" id="dx"><div class="ic">${ic('dl')}</div><div><b>Export Semua Penjualan</b><div class="small muted">${DB.trx.length} transaksi → .xls</div></div></button>
  <button class="set-i" id="di"><div class="ic">${ic('up')}</div><div><b>Import Penjualan</b><div class="small muted">Dari file .xls / .xml / .csv</div></div></button>
  <button class="set-i" id="dt"><div class="ic">${ic('rec')}</div><div><b>Unduh Template .xls</b><div class="small muted">Contoh + petunjuk kolom</div></div></button>
  <button class="set-i" id="bk"><div class="ic">${ic('db')}</div><div><b>Backup Database (.json)</b><div class="small muted">Semua pengaturan & transaksi</div></div></button>
  <button class="set-i" id="rs"><div class="ic">${ic('up')}</div><div><b>Restore Backup (.json)</b><div class="small muted">Menimpa seluruh data</div></div></button>
  <button class="set-i" id="dl2"><div class="ic" style="background:var(--danger)">${ic('trash')}</div><div><b>Hapus Semua Transaksi</b><div class="small muted">Pengaturan tetap aman</div></div></button></div>`;
  $('#dx', el).onclick = () => exportTrx(DB.trx.slice(), 'Semua'); $('#dt', el).onclick = downloadTemplate;
  $('#di', el).onclick = async () => { await importFromFile(); secData(el); };
  $('#bk', el).onclick = () => { const p = saveFileOut(`CashGO_Backup_${nowIso().slice(0, 10)}.json`, strToU8(JSON.stringify(DB)), 'application/json'); if (p) toast('Backup tersimpan: ' + p, 4200); };
  $('#rs', el).onclick = async () => {
    const f = await readFileAny(); if (!f) return;
    try { const j = JSON.parse(new TextDecoder().decode(f.buf)); if (!j.cfg || !Array.isArray(j.trx) || !j.adminHash) throw 0;
      if (!await confirmBox('Restore Backup', 'Seluruh data saat ini akan diganti dengan isi backup.', 'Restore', true)) return;
      DB = { ...EMPTY(), ...j }; saveNow(); toast('Backup dipulihkan'); renderLogin();
    } catch (e) { alertBox('Backup tidak valid', 'File bukan backup Cash GO yang benar.'); }
  };
  $('#dl2', el).onclick = async () => { if (await confirmBox('Hapus Semua Transaksi', 'Semua riwayat transaksi akan dihapus permanen. Disarankan Export / Backup lebih dulu.', 'Hapus Semua', true)) { DB.trx = []; save(); toast('Semua transaksi dihapus'); secData(el); } };
  return { save() { return null; } };
}
const SEC = {
  pass: { t: 'Password Administrator', i: 'lock', r: secPass, s: 1 }, profil: { t: 'Profil Usaha & Logo', i: 'store', r: secProfil, s: 1 }, usaha: { t: 'Bidang Usaha (maks. 6)', i: 'rec', r: secUsaha, s: 1 },
  nota: { t: 'Nota, Printer & Sosmed', i: 'print', r: secNota, s: 1 }, kasir: { t: 'Akun Kasir', i: 'users', r: secKasir }, data: { t: 'Data, Export & Import', i: 'db', r: secData }
};

/* --- halaman Setting --- */
function screenSettings(m) {
  setTitle('Setting');
  if (!NAV.sub) {
    m.innerHTML = `<div class="sets">${Object.entries(SEC).map(([k, s]) => `<button class="set-i" data-s="${k}"><div class="ic">${ic(s.i)}</div><b>${s.t}</b></button>`).join('')}</div>
    <p class="center muted small" style="margin-top:20px">Cash GO v1.0 • Data tersimpan offline di penyimpanan internal perangkat</p>`;
    return $$('[data-s]', m).forEach(b => b.onclick = () => go('set', b.dataset.s));
  }
  const s = SEC[NAV.sub];
  m.innerHTML = `<div class="row" style="margin-bottom:10px"><button class="btn sec sm" id="sb">${ic('back')} Setting</button></div><div class="card"><h3 class="hf">${s.t}</h3><div id="sc"></div><div class="err hide" id="se"></div>${s.s ? `<button class="btn block" id="ss">${ic('chk')} Simpan</button>` : ''}</div>`;
  $('#sb', m).onclick = () => go('set'); const h = s.r($('#sc', m));
  if (s.s) $('#ss', m).onclick = async () => { const e = await h.save(); if (e) { const er = $('#se', m); er.textContent = e; er.classList.remove('hide'); } else { toast('Tersimpan'); go('set'); } };
}

/* --- wizard pengaturan awal --- */
let WIZ = null; const WSTEPS = ['pass', 'profil', 'usaha', 'nota', 'kasir'];
function startWizard() { WIZ = { i: 0 }; SESSION = { role: 'admin', name: 'Administrator', username: 'admin' }; renderWizard(); }
function wizBack() { if (WIZ.i > 0) { WIZ.i--; renderWizard(); return true; } return false; }
function renderWizard() {
  clearCharts(); const k = WSTEPS[WIZ.i], s = SEC[k], last = WIZ.i === WSTEPS.length - 1, optional = k === 'nota' || k === 'kasir';
  $('#app').innerHTML = `<div class="shell" style="flex-direction:column"><div class="body"><div class="hdr"><div class="av">${ic('gear')}</div><div class="grow"><div class="ttl hf">Pengaturan Awal</div><small>Langkah ${WIZ.i + 1} dari ${WSTEPS.length} — wajib diisi sebelum aplikasi digunakan</small></div></div>
  <div class="main"><div style="max-width:720px;margin:0 auto"><div class="steps">${WSTEPS.map((_, i) => `<i class="${i <= WIZ.i ? 'on' : ''}"></i>`).join('')}</div>
  <div class="card"><h3 class="hf">${s.t}</h3><div id="sc"></div><div class="err hide" id="se"></div></div>
  <div class="row">${WIZ.i ? `<button class="btn sec" id="wb">${ic('back')} Kembali</button>` : ''}<button class="btn grow" id="wn">${last ? 'Selesai & Mulai' : 'Lanjut'}</button></div></div></div></div></div>`;
  const h = s.r($('#sc')), er = $('#se');
  $('#wb') && ($('#wb').onclick = () => wizBack());
  $('#wn').onclick = async () => {
    const e = s.s ? await h.save() : null; if (e) { er.textContent = e; er.classList.remove('hide'); return; }
    if (!last) { WIZ.i++; return renderWizard(); }
    if (!DB.adminHash || !DB.cfg.nama || !DB.usaha.length) { WIZ.i = !DB.adminHash ? 0 : !DB.cfg.nama ? 1 : 2; return renderWizard(); }
    DB.setupDone = true; saveNow(); WIZ = null; toast('Pengaturan selesai. Selamat menggunakan Cash GO!'); NAV = { tab: 'home' }; renderShell();
  };
}
