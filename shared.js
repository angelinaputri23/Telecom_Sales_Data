/* Shared engine: data loading (Google Sheet live / uploaded file / offline snapshot), filters, export. */
const CFG = {
  sheetId: '1B0x_Xk7lepi1TszYM29gXXl4MamJ_r5fVybn-3n4VoA',
  // One tab per store. To add App sales, add a tab named like "30002 MF APP" (same layout) and list it here.
  tabs: ['30002 MF', '30003 DW', '709001 TN', '811001 DT', '829001 FN']
};
const $ = id => document.getElementById(id);
const isApp = n => /\bAPP\b/i.test(n), baseName = n => n.replace(/\s*\bAPP\b\s*/i, ' ').trim();
const Data = { stores: [], notes: [], hasApp: false, source: '' };
const todayUTC = (() => { const d = new Date(); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); })();

function csv(t) { const rows = []; let r = [], c = '', q = false;
  for (let i = 0; i < t.length; i++) { const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { r.push(c); c = ''; }
    else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; } else if (ch !== '\r') c += ch; }
  if (c || r.length) { r.push(c); rows.push(r); } return rows; }

function build(raw) {
  const res = (k) => { let v = raw[k], n = 0; while (typeof v === 'string' && v[0] === '=' && n++ < 5) v = raw[v.slice(1)]; return v; };
  const by = new Map(); const notes = [];
  for (const tab of Object.keys(raw)) {
    const blocks = Core.parseTab(res(tab) || []); Core.fixBlocks(blocks, tab).forEach(n => console.info('[week label fixed] ' + n));
    const m = Core.aggregate(blocks); if (!m.size) { notes.push(`${tab}: no readable rows found.`); continue; }
    const id = baseName(tab); const s = by.get(id) || { id, pos: null, app: null }; s[isApp(tab) ? 'app' : 'pos'] = m; by.set(id, s);
  }
  const stores = [...by.values()], seen = new Map();
  for (const s of stores) { const sig = [...new Set([...(s.pos || new Map()).keys(), ...(s.app || new Map()).keys()])].sort()
      .map(k => k + ':' + ((s.pos && s.pos.get(k) || {}).pcs || 0) + '/' + ((s.app && s.app.get(k) || {}).pcs || 0)).join('|');
    if (seen.has(sig)) s.dupOf = seen.get(sig); else seen.set(sig, s.id); }
  const d = stores.filter(s => s.dupOf);
  if (d.length) notes.unshift(`ℹ ${[...new Set(d.map(s => s.dupOf))].join(', ')} and ${d.map(s => s.id).join(', ')} have identical numbers every week, so they look like placeholder/dummy data. "All stores" counts them once while the box is ticked; once real data is in, they will be counted separately.`);
  Data.stores = stores; Data.notes = notes; Data.hasApp = stores.some(s => s.app);
}

Data.series = (sel, ch, dedupe) => {
  let list = Data.stores; if (sel !== 'all') list = list.filter(s => s.id === sel); else if (dedupe) list = list.filter(s => !s.dupOf);
  const acc = new Map();
  for (const s of list) for (const c of ['pos', 'app']) { if (!s[c]) continue;
    for (const w of s[c].values()) { let a = acc.get(w.s);
      if (!a) acc.set(w.s, a = { s: w.s, e: w.e, days: w.days, pos: 0, app: 0, amt: 0, carrier: {}, type: {} });
      a[c] += w.pcs; if (ch === 'all' || ch === c) { a.amt += w.amt;
        for (const k in w.carrier) a.carrier[k] = (a.carrier[k] || 0) + w.carrier[k]; for (const k in w.type) a.type[k] = (a.type[k] || 0) + w.type[k]; } } }
  return [...acc.values()].sort((a, b) => a.s - b.s).map(a => { a.pcs = ch === 'pos' ? a.pos : ch === 'app' ? a.app : a.pos + a.app; a.complete = a.e < todayUTC; a.n7 = a.pcs * 7 / a.days; return a; });
};
Data.norm = w => w.filter(x => x.complete).map(x => x.n7);

const Shell = {
  charts: {}, async start(page) { this.page = page; this.build(); await this.load(localStorage.getItem('telecomMode') === 'upload' ? 'upload' : 'live'); },
  f() { return { store: $('fStore').value, ch: $('fCh') ? $('fCh').value : 'all', dedupe: $('fDedupe').checked }; },
  build() {
    const nav = [['index.html', 'Weekly Sales'], ['channel.html', 'App vs POS'], ['target.html', 'Target Planner']].map(([h, t]) => `<a href="${h}" class="${this.page.file === h ? 'on' : ''}">${t}</a>`).join('');
    $('shell').innerHTML = `<h1>Telecom Sales — ${this.page.title}</h1><nav>${nav}</nav>
    <div class="bar"><select id="fStore"></select>${this.page.ch ? `<select id="fCh"><option value="all">App + POS</option><option value="pos">POS only</option><option value="app">App only</option></select>` : ''}
    <label><input type="checkbox" id="fDedupe" checked> Count identical stores only once</label>${this.page.extra || ''}</div>
    <div class="bar"><button class="pri" id="bRef">↻ Refresh from Google Sheet</button><button id="bUp">⬆ Upload Excel/CSV</button><input type="file" id="fFile" accept=".xlsx,.xls,.csv" hidden>
    <button id="bCsv">⬇ Export CSV</button><button id="bXls">⬇ Export Excel</button><span id="status"></span></div><div id="notes"></div>`;
    $('bRef').onclick = () => { localStorage.setItem('telecomMode', 'live'); this.load('live'); };
    $('bUp').onclick = () => $('fFile').click(); $('fFile').onchange = e => this.upload(e.target.files[0]);
    $('fStore').onchange = $('fDedupe').onchange = () => this.page.render(); if ($('fCh')) $('fCh').onchange = () => this.page.render();
    for (const el of document.querySelectorAll('.bar input[type=number]')) el.oninput = () => this.page.render();
    $('bCsv').onclick = () => this.exp('csv'); $('bXls').onclick = () => this.exp('xlsx');
  },
  async load(mode) {
    $('status').textContent = 'Loading…'; let raw, src;
    try {
      if (mode === 'upload') { raw = JSON.parse(localStorage.getItem('telecomUpload') || 'null'); if (!raw) throw new Error('no stored upload'); src = 'Uploaded file: ' + raw.__name; delete raw.__name; }
      else { raw = {}; await Promise.all(CFG.tabs.map(async n => { const r = await fetch(`https://docs.google.com/spreadsheets/d/${CFG.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(n)}`, { cache: 'no-store' });
          if (!r.ok) throw new Error(n + ' → HTTP ' + r.status); raw[n] = csv(await r.text()); })); src = 'Google Sheet (live)'; }
    } catch (e) { raw = SNAPSHOT.tabs; src = `Offline snapshot from ${SNAPSHOT.takenAt} (live data unavailable: ${e.message})`; }
    try { build(raw); } catch (e) { $('status').textContent = 'Could not read data: ' + e.message; return; }
    $('status').textContent = `${src} · ${new Date().toLocaleTimeString()}`; this.fill(); this.page.render();
  },
  async upload(file) {
    if (!file) return; try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' }), raw = { __name: file.name }, one = wb.SheetNames.length === 1;
      for (const n of wb.SheetNames) raw[one && /^sheet\d*$/i.test(n) ? file.name.replace(/\.\w+$/, '') : n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
      localStorage.setItem('telecomUpload', JSON.stringify(raw)); localStorage.setItem('telecomMode', 'upload'); await this.load('upload');
    } catch (e) { alert('Could not read that file: ' + e.message); } $('fFile').value = '';
  },
  fill() { const cur = $('fStore').value || 'all'; $('fStore').innerHTML = '<option value="all">All stores</option>' + Data.stores.map(s => `<option value="${s.id}">${s.id}${s.dupOf ? ' ≈ same as ' + s.dupOf : ''}</option>`).join('');
    if ([...$('fStore').options].some(o => o.value === cur)) $('fStore').value = cur;
    $('notes').innerHTML = Data.notes.length ? `<details class="warn"><summary>Data quality notes (${Data.notes.length})</summary><ul>${Data.notes.map(n => `<li>${n}</li>`).join('')}</ul></details>` : ''; },
  chart(id, cfg) { if (this.charts[id]) this.charts[id].destroy(); const tx = getComputedStyle(document.body).color;
    Chart.defaults.color = tx; Chart.defaults.borderColor = 'rgba(128,128,128,.2)'; cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {}); this.charts[id] = new Chart($(id), cfg); },
  exp(kind) { const d = this.page.exportData && this.page.exportData(); if (!d) return alert('Nothing to export yet.');
    if (kind === 'xlsx') { const wb = XLSX.utils.book_new(); d.sheets.forEach(s => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows), s.name.slice(0, 31))); XLSX.writeFile(wb, d.name + '.xlsx'); }
    else { const t = d.sheets[0].rows.map(r => r.map(c => /[",\n]/.test(c) ? '"' + String(c).replace(/"/g, '""') + '"' : c).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' })); a.download = d.name + '.csv'; a.click(); } }
};
const U = {
  lbl: w => Core.iso(w.s).slice(5) + (w.days !== 7 ? '*' : '') + (w.complete ? '' : '†'), n: x => Math.round(x).toLocaleString(),
  pc: x => x == null || !isFinite(x) ? '–' : `<span class="${x >= 0 ? 'up' : 'dn'}">${x >= 0 ? '+' : ''}${(x * 100).toFixed(1)}%</span>`,
  kpi: (l, v, s) => `<div class="card k"><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s || ''}</div></div>`,
  foot: '* this week is not 7 days long, so weeks are compared per 7 days · † week still in progress (left out of the targets)'
};
