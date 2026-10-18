'use strict';
/* ===== FORMAT EXPORT / IMPORT .xls (Excel "XML Spreadsheet 2003", terbuka di Excel / WPS / LibreOffice) =====
   1 baris = 1 item. Data transaksi (kolom A-H, P-T) diulang pada setiap item dengan No Transaksi yang sama. */
const XCOLS = [
  ['No Transaksi', 118, 'CG20261018-001'], ['Tanggal', 78, '2026-10-18'], ['Jam', 58, '14:03:00'], ['Bidang Usaha', 140, 'Warung Makan & Restoran'],
  ['Nama Usaha', 130, 'Warung Bu Ani'], ['Kasir', 80, 'Andi'], ['Nama Customer', 110, 'Budi'], ['No HP', 100, '081234567890'],
  ['Nama Item', 140, 'Nasi Goreng'], ['Qty', 45, 2], ['Satuan', 55, 'porsi'], ['Harga Satuan', 80, 20000],
  ['Diskon Item (Rp)', 85, 0], ['Subtotal (Rp)', 85, 40000], ['Keterangan Item', 130, 'pedas'], ['Metode Bayar', 80, 'Tunai'],
  ['Catatan', 120, ''], ['Info Tambahan', 160, 'Tipe Pesanan: Makan di tempat; No Meja: 5'], ['Total Transaksi (Rp)', 100, 56000], ['Dibayar (Rp)', 85, 100000], ['Kembalian (Rp)', 85, 44000]
];
const xe = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const cS = v => `<Cell><Data ss:Type="String">${xe(v)}</Data></Cell>`;
const cN = v => `<Cell ss:StyleID="n"><Data ss:Type="Number">${+v || 0}</Data></Cell>`;
const NUMCOLS = new Set([9, 11, 12, 13, 18, 19, 20]);

function trxRows(list) {
  const rows = [];
  for (const t of list) {
    const total = trxTotal(t), kemb = Math.max(0, t.bayar - total), info = (t.ext || []).filter(e => e[1]).map(e => `${e[0]}: ${e[1]}`).join('; ');
    for (const i of t.items)
      rows.push([t.no, dOnly(t.ts), t.ts.slice(11, 19), catOf(t.kategori).nama, t.usahaNama, t.kasir, t.customer, t.hp, i.nama, i.qty, i.satuan, i.harga, i.diskon || 0, itemSub(i), i.ket || '', t.metode, t.catatan || '', info, total, t.bayar, t.metode === 'Tunai' ? kemb : 0]);
  }
  return rows;
}
function buildXls(rows) {
  const head = `<Row ss:Height="32">${XCOLS.map(c => `<Cell ss:StyleID="h"><Data ss:Type="String">${xe(c[0])}</Data></Cell>`).join('')}</Row>`;
  const body = rows.map(r => `<Row>${r.map((v, i) => NUMCOLS.has(i) ? cN(v) : cS(v)).join('')}</Row>`).join('');
  const guide = [
    ['PETUNJUK FORMAT IMPORT / EXPORT CASH GO'], [''],
    ['1. Sheet "Penjualan" adalah data yang dibaca aplikasi. Jangan mengubah / menghapus baris judul (baris 1).'],
    ['2. Satu baris = satu item. Transaksi dengan banyak item ditulis di banyak baris dengan No Transaksi yang SAMA.'],
    ['3. Kolom wajib: No Transaksi, Tanggal, Nama Item, Qty, Harga Satuan. Kolom lain boleh kosong.'],
    ['4. Tanggal ditulis YYYY-MM-DD (contoh 2026-10-18) atau DD/MM/YYYY. Jam ditulis HH:MM:SS.'],
    ['5. Angka ditulis tanpa titik / simbol Rp (contoh 20000). Qty boleh desimal (contoh 1,5).'],
    ['6. Metode Bayar: Tunai, QRIS, Transfer, Debit, atau Lainnya.'],
    ['7. Info Tambahan: pasangan "Label: Isi" dipisah titik koma, contoh "Plat Nomor: DB 1234 AB; Jenis Kendaraan: Motor".'],
    ['8. Total, Subtotal, dan Kembalian dihitung ulang oleh aplikasi saat import; yang dipakai adalah Qty x Harga - Diskon.'],
    ['9. Transaksi dengan No Transaksi yang sudah ada di aplikasi akan dilewati (tidak ditimpa).'],
    ['10. Saat menyimpan dari Excel pilih tipe "XML Spreadsheet 2003 (*.xml)" atau "CSV". Format ".xls Excel 97-2003 (biner)" tidak bisa dibaca aplikasi.'],
    [''], ['Kolom', 'Contoh isi'], ...XCOLS.map(c => [c[0], String(c[2])])
  ].map(r => `<Row>${r.map((v, i) => `<Cell${r.length === 1 && v.startsWith('PETUNJUK') ? ' ss:StyleID="t"' : ''}><Data ss:Type="String">${xe(v)}</Data></Cell>`).join('')}</Row>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default"><Alignment ss:Vertical="Center"/><Font ss:FontName="Calibri" ss:Size="11"/></Style>
<Style ss:ID="h"><Font ss:FontName="Calibri" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#FC7A2F" ss:Pattern="Solid"/><Alignment ss:Vertical="Center" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#C7531B"/></Borders></Style>
<Style ss:ID="n"><NumberFormat ss:Format="#,##0.##"/></Style>
<Style ss:ID="t"><Font ss:Bold="1" ss:Size="14" ss:Color="#C7531B"/></Style>
</Styles>
<Worksheet ss:Name="Penjualan"><Table>${XCOLS.map(c => `<Column ss:Width="${c[1]}"/>`).join('')}${head}${body}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>
<Worksheet ss:Name="Petunjuk Format"><Table><Column ss:Width="240"/><Column ss:Width="330"/>${guide}</Table></Worksheet>
</Workbook>`;
}
function sampleTrx() {
  const mk = (no, ts, usaha, kasir, cust, hp, items, metode, bayar, ext, cat) => ({ no, ts, usahaNama: usaha, kategori: cat, kasir, customer: cust, hp, items, metode, bayar, catatan: '', ext });
  return [
    mk('CG20261018-001', '2026-10-18T14:03:00', 'Warung Bu Ani', 'Andi', 'Budi', '081234567890', [{ nama: 'Nasi Goreng', qty: 2, satuan: 'porsi', harga: 20000, diskon: 0, ket: 'pedas' }, { nama: 'Es Teh Manis', qty: 2, satuan: 'gelas', harga: 8000, diskon: 0, ket: '' }], 'Tunai', 100000, [['Tipe Pesanan', 'Makan di tempat'], ['No Meja', '5']], 'resto'),
    mk('CG20261018-002', '2026-10-18T15:20:00', 'Laundry Bersih', 'Sari', 'Rina', '085212345678', [{ nama: 'Cuci Setrika', qty: 3.5, satuan: 'kg', harga: 8000, diskon: 2000, ket: 'pakaian' }], 'QRIS', 26000, [['Layanan', 'Express']], 'laundry')
  ];
}
const exportName = tag => `CashGO_Penjualan_${tag}_${nowIso().slice(0, 10).replace(/-/g, '')}_${nowIso().slice(11, 16).replace(':', '')}.xls`;
function exportTrx(list, tag = 'Semua') {
  if (!list.length) return toast('Tidak ada transaksi untuk diekspor');
  const u8 = strToU8('\ufeff' + buildXls(trxRows(list))), name = exportName(tag);
  const path = saveFileOut(name, u8, 'application/vnd.ms-excel'); if (!path) return;
  const el = openModal(`<h2 class="hf">Export Berhasil</h2><p>${list.length} transaksi disimpan di:<br><b>${esc(path)}</b></p><div class="acts"><button class="btn sec" data-a="x">Tutup</button><button class="btn" data-a="s">Bagikan File</button></div>`);
  el.onclick = e => { const a = e.target.closest('[data-a]')?.dataset.a; if (a === 's') shareFileOut(name, u8, 'application/vnd.ms-excel'); if (a) a === 'x' && closeModal(el); };
}
function downloadTemplate() {
  const u8 = strToU8('\ufeff' + buildXls(trxRows(sampleTrx()))), name = 'CashGO_Template_Import.xls';
  const path = saveFileOut(name, u8, 'application/vnd.ms-excel'); if (path) toast('Template tersimpan: ' + path, 4200);
}

/* ---- baca file -> array of rows ---- */
function parseSheetRows(text) {
  if (/<Workbook[\s>]/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const sheets = [...doc.getElementsByTagNameNS('*', 'Worksheet')];
    const ws = sheets.find(w => /penjualan/i.test(w.getAttribute('ss:Name') || w.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Name') || '')) || sheets[0];
    if (!ws) return [];
    return [...ws.getElementsByTagNameNS('*', 'Row')].map(r => {
      const out = []; let idx = 0;
      for (const c of r.getElementsByTagNameNS('*', 'Cell')) {
        const at = c.getAttribute('ss:Index') || c.getAttributeNS('urn:schemas-microsoft-com:office:spreadsheet', 'Index');
        if (at) idx = +at - 1;
        const d = c.getElementsByTagNameNS('*', 'Data')[0]; out[idx++] = d ? d.textContent : '';
      }
      return out;
    });
  }
  if (/<table[\s>]/i.test(text)) {
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return [...doc.querySelectorAll('tr')].map(tr => [...tr.children].map(td => td.textContent.trim()));
  }
  const first = text.split(/\r?\n/)[0] || '', delim = [';', '\t', ','].sort((a, b) => first.split(b).length - first.split(a).length)[0];
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === delim) { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
    else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
const hk = s => String(s || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
const ALIAS = { notransaksi: 'no', nonota: 'no', tanggal: 'tgl', jam: 'jam', bidangusaha: 'kat', namausaha: 'usaha', kasir: 'kasir', namacustomer: 'cust', customer: 'cust', nohp: 'hp', namaitem: 'item', item: 'item', qty: 'qty', jumlah: 'qty', satuan: 'sat', hargasatuan: 'harga', harga: 'harga', diskonitem: 'disk', diskon: 'disk', keteranganitem: 'ket', metodebayar: 'metode', catatan: 'cat', infotambahan: 'info', dibayar: 'bayar', bayar: 'bayar' };
function toDate(v) {
  if (typeof v === 'number' || /^\d{5}(\.\d+)?$/.test(String(v))) { const d = new Date(Math.round((+v - 25569) * 864e5)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const s = String(v || '').trim(); let m;
  if ((m = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  if ((m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return '';
}
function toTime(v) { const m = String(v || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/); return m ? `${pad(m[1])}:${m[2]}:${m[3] || '00'}` : '12:00:00'; }

async function importFromFile() {
  const f = await readFileAny(); if (!f) return;
  const u = new Uint8Array(f.buf);
  if (u[0] === 0x50 && u[1] === 0x4B) return alertBox('Format tidak didukung', 'File .xlsx tidak bisa dibaca. Buka di Excel lalu simpan sebagai <b>XML Spreadsheet 2003</b> atau <b>CSV</b>, atau gunakan file hasil Export / Template Cash GO.');
  if (u[0] === 0xD0 && u[1] === 0xCF) return alertBox('Format tidak didukung', 'File Excel 97-2003 (biner) tidak bisa dibaca. Di Excel pilih <b>Save As → XML Spreadsheet 2003 (*.xml)</b> atau <b>CSV</b>, atau gunakan Template Cash GO.');
  let text = new TextDecoder('utf-8').decode(u).replace(/^\ufeff/, '');
  if (text.includes('\ufffd')) text = new TextDecoder('windows-1252').decode(u);
  const rows = parseSheetRows(text).filter(r => r.some(c => String(c ?? '').trim() !== ''));
  if (rows.length < 2) return alertBox('File kosong', 'Tidak ditemukan baris data pada file ini.');
  const map = {}; rows[0].forEach((h, i) => { const a = ALIAS[hk(h)]; if (a && !(a in map)) map[a] = i; });
  const miss = ['no', 'tgl', 'item', 'qty', 'harga'].filter(k => !(k in map));
  if (miss.length) return alertBox('Format kolom tidak sesuai', 'Kolom wajib tidak ditemukan. Gunakan file hasil Export atau Template Cash GO.');
  const g = (r, k) => k in map ? r[map[k]] ?? '' : '';
  const groups = new Map(), errs = [];
  rows.slice(1).forEach((r, n) => {
    const no = String(g(r, 'no')).trim(), item = String(g(r, 'item')).trim(), tgl = toDate(g(r, 'tgl'));
    if (!no && !item) return;
    if (!no || !item || !tgl || !(num(g(r, 'qty')) > 0)) return errs.push(`Baris ${n + 2}: data wajib belum lengkap`);
    if (!groups.has(no)) groups.set(no, []); groups.get(no).push(r);
  });
  let added = 0, skipped = 0, unmatched = 0; const have = new Set(DB.trx.map(t => t.no));
  for (const [no, rs] of groups) {
    if (have.has(no)) { skipped++; continue; }
    const r0 = rs[0], un = String(g(r0, 'usaha')).trim(), kt = String(g(r0, 'kat')).trim().toLowerCase();
    const us = DB.usaha.find(x => x.nama.toLowerCase() === un.toLowerCase()) || DB.usaha.find(x => catOf(x.kategori).nama.toLowerCase() === kt);
    if (!us) unmatched++;
    const cat = us ? us.kategori : (CATS.find(c => c.nama.toLowerCase() === kt) || CATS[CATS.length - 1]).id;
    const kas = String(g(r0, 'kasir')).trim() || 'Import';
    const t = {
      no, ts: `${toDate(g(r0, 'tgl'))}T${toTime(g(r0, 'jam'))}`, usahaId: us ? us.id : null, usahaNama: us ? us.nama : (un || catOf(cat).nama), kategori: cat,
      kasir: kas, kasirRole: /^admin/i.test(kas) ? 'admin' : 'kasir', customer: String(g(r0, 'cust')).trim(), hp: String(g(r0, 'hp')).trim(),
      items: rs.map(r => ({ nama: String(g(r, 'item')).trim(), qty: num(g(r, 'qty')), satuan: String(g(r, 'sat')).trim(), harga: num(g(r, 'harga')), diskon: num(g(r, 'disk')), ket: String(g(r, 'ket')).trim() })),
      metode: METODE.find(m => m.toLowerCase() === String(g(r0, 'metode')).trim().toLowerCase()) || 'Tunai', catatan: String(g(r0, 'cat')).trim(),
      ext: String(g(r0, 'info')).split(';').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return i > 0 ? [x.slice(0, i).trim(), x.slice(i + 1).trim()] : ['Info', x]; }), imported: true
    };
    const tot = trxTotal(t); t.bayar = num(g(r0, 'bayar')) || tot; t.total = tot; DB.trx.push(t); have.add(no); added++;
  }
  DB.trx.sort((a, b) => a.ts < b.ts ? -1 : 1); save();
  alertBox('Import Selesai', `<b>${added}</b> transaksi ditambahkan, <b>${skipped}</b> dilewati (No Transaksi sudah ada).` + (unmatched ? `<br>${unmatched} transaksi memakai nama usaha yang tidak ada di pengaturan (tetap tersimpan).` : '') + (errs.length ? `<br><span class="err">${errs.length} baris dilewati:<br>${errs.slice(0, 5).map(esc).join('<br>')}</span>` : ''));
  return added;
}
function alertBox(title, html, cb) {
  const el = openModal(`<h2 class="hf">${esc(title)}</h2><p>${html}</p><div class="acts"><button class="btn" data-x>OK</button></div>`, { onClose: cb });
  el.onclick = e => { if (e.target.closest('[data-x]')) closeModal(el); };
}
