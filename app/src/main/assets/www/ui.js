'use strict';
/* ===== ikon, splash, login, kerangka aplikasi ===== */
const IC = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>', hist: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>', gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>', out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  wa: '<path d="M3 21l1.6-4.8A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1z"/><path d="M9 8.5c0 3 3.5 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.4-2-1.4-2.4-2.4l.8-1-1-2z"/>',
  print: '<path d="M7 9V3h10v6M7 18H5a2 2 0 01-2-2v-5a2 2 0 012-2h14a2 2 0 012 2v5a2 2 0 01-2 2h-2M7 14h10v7H7z"/>', dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  up: '<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>', back: '<path d="M15 5l-7 7 7 7"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  store: '<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9c0 2 3 2 3 0M9 9c0 2 3 2 3 0M15 9c0 2 3 2 3 0M9 20v-6h6v6"/>', rec: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>', share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.5M8.2 13.2l7.6 4.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.6 3-6 7-6s7 2.4 7 6M16 4.5a3.5 3.5 0 010 7M18 14c2.4.6 4 2.4 4 5"/>', db: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>', chk: '<path d="M5 12l5 5 9-10"/>'
};
const ic = n => `<svg class="i" viewBox="0 0 24 24">${IC[n] || ''}</svg>`;
const rings = (n = 3, base = 120, step = 90) => Array.from({ length: n }, (_, i) => `<i style="width:${base + step * i}px;height:${base + step * i}px;left:0;top:0"></i>`).join('');
const isAdmin = () => SESSION && SESSION.role === 'admin';

/* ---- splash ---- */
function showSplash() {
  const c = DB.cfg, el = document.createElement('div'); el.id = 'splash';
  el.innerHTML = `<div class="rings">${Array.from({ length: 4 }, (_, i) => `<i style="width:${200 + i * 160}px;height:${200 + i * 160}px;animation-delay:${i * .25}s"></i>`).join('')}</div>` +
    (c.splashLogo ? `<img class="lg" src="${c.splashLogo}"><h1 class="hf">${esc(c.nama)}</h1><p>Selamat datang</p>`
      : `<img class="lg" src="logo_mark.svg" style="width:130px"><h1 class="hf">Cash GO</h1><p>Aplikasi Kasir UMKM</p>`);
  document.body.append(el); return new Promise(r => setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 520); r(); }, 1700));
}

/* ---- login ---- */
function renderLogin() {
  SESSION = null; clearCharts();
  $('#app').innerHTML = `<div class="login"><div class="top"><div class="rings">${rings(4, 130, 110)}</div>
    ${DB.cfg.splashLogo ? `<img src="${DB.cfg.splashLogo}" style="height:84px;object-fit:contain">` : '<img src="logo_mark.svg">'}<h1 class="hf">${esc(DB.cfg.nama || 'Cash GO')}</h1><div style="opacity:.85;font-size:13px;position:relative">Silakan masuk untuk memulai transaksi</div></div>
    <div class="curve"></div><div class="avatar"><svg viewBox="0 0 96 96" width="86" height="86"><circle cx="48" cy="38" r="16" fill="#C9BBC4"/><path d="M14 96c0-22 15-34 34-34s34 12 34 34z" fill="#C9BBC4"/></svg></div>
    <form id="lf" autocomplete="off"><div class="field"><input class="inp" id="lu" placeholder="USERNAME" autocapitalize="off" autocomplete="off"></div>
    <div class="field"><input class="inp" id="lp" type="password" placeholder="PASSWORD"></div><div class="err hide" id="le"></div>
    <button class="btn block hf" style="font-size:22px;letter-spacing:.08em" type="submit">Masuk</button>
    <a class="alt" id="la" href="#">Masuk sebagai Administrator</a><a class="alt" id="lr" href="#" style="color:var(--mut);font-size:12px;margin-top:10px;text-transform:none">Lupa password administrator?</a></form></div>`;
  $('#lf').onsubmit = async e => {
    e.preventDefault(); const u = $('#lu').value.trim().toLowerCase(), p = $('#lp').value, er = $('#le');
    const k = DB.kasir.find(x => x.username.toLowerCase() === u);
    if (k && k.pass === await hash(p)) { SESSION = { role: 'kasir', name: k.nama, username: k.username }; NAV = { tab: 'home' }; return renderShell(); }
    er.textContent = DB.kasir.length ? 'Username atau password salah' : 'Belum ada akun kasir. Masuk sebagai Administrator untuk menambahkan.'; er.classList.remove('hide');
  };
  $('#la').onclick = e => { e.preventDefault(); adminPopup(); };
  $('#lr').onclick = async e => { e.preventDefault();
    const v = await promptPass({ title: 'Reset Password Admin', desc: 'Masukkan kode pemulihan 8 karakter yang ditampilkan saat pengaturan awal.', ok: 'Reset', fields: [{ ph: 'Kode pemulihan' }, { ph: 'Password baru (min. 6)' }],
      validate: async ([c, p]) => (await hash(c.toUpperCase().replace(/[\s-]/g, ''))) !== DB.recHash ? 'Kode pemulihan salah' : p.length < 6 ? 'Password minimal 6 karakter' : null });
    if (v) { DB.adminHash = await hash(v[1]); save(); toast('Password administrator diubah'); } };
}
async function adminPopup() {
  const v = await promptPass({ title: 'Masuk Administrator', desc: 'Masukkan password utama administrator.', validate: async ([p]) => (await hash(p)) === DB.adminHash ? null : 'Password salah' });
  if (v) { SESSION = { role: 'admin', name: 'Administrator', username: 'admin' }; NAV = { tab: 'home' }; renderShell(); }
}

/* ---- kerangka ---- */
let NAV = { tab: 'home' };
function go(tab, sub = null, extra = {}) { NAV = { tab, sub, ...extra }; clearCharts(); renderMain(); updateNav(); }
function renderShell() {
  const items = [['home', 'home', 'Transaksi'], ['hist', 'hist', 'History']].concat(isAdmin() ? [['rekap', 'chart', 'Rekap'], ['set', 'gear', 'Setting']] : []);
  $('#app').innerHTML = `<div class="shell"><nav class="nav">${items.map(([k, i, l]) => `<button data-t="${k}">${ic(i)}<span>${l}</span></button>`).join('')}<div class="sep"></div><button data-out>${ic('out')}<span>Keluar</span></button></nav>
    <div class="body"><div class="hdr"><div class="av">${ic('user')}</div><div class="grow"><div class="ttl hf" id="ht"></div><small>${isAdmin() ? 'Administrator' : esc(SESSION.name) + ' • Kasir'}</small></div><button data-out>${ic('out')}</button></div><div class="main" id="main"></div></div></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => go(b.dataset.t));
  $$('[data-out]').forEach(b => b.onclick = async () => { if (await confirmBox('Keluar', 'Keluar dari akun ini?', 'Keluar')) renderLogin(); });
  go('home');
}
function updateNav() { $$('[data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === (NAV.tab === 'tx' ? 'home' : NAV.tab))); }
function setTitle(t) { const e = $('#ht'); if (e) e.textContent = t; }
function renderMain() {
  const m = $('#main'); if (!m) return; m.scrollTop = 0;
  ({ home: screenHome, tx: screenTx, hist: screenHist, rekap: screenRekap, set: screenSettings })[NAV.tab](m);
}
window.onBack = () => {
  if (modalStack.length) return closeTopModal();
  if (WIZ) return wizBack();
  if (!SESSION) return false;
  if (NAV.tab === 'tx') { go('home'); return true; }
  if (NAV.tab === 'set' && NAV.sub) { go('set'); return true; }
  if (NAV.tab !== 'home') { go('home'); return true; }
  return false;
};
window.onPrintResult = (ok, msg) => toast(msg, 3500);

/* ---- booting ---- */
async function boot() {
  loadDb();
  await showSplash();
  if (!DB.setupDone) return startWizard();
  renderLogin();
}
addEventListener('DOMContentLoaded', boot);
