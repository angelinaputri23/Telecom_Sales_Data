/* Core logic: parsing the POS report layout, cleaning week labels, aggregation, target forecast. */
(function (root) {
  const DAY = 864e5;
  const sum = a => a.reduce((x, y) => x + y, 0);
  const iso = ms => new Date(ms).toISOString().slice(0, 10);

  function parseRange(s) {
    const m = String(s).match(/(\d{4})\/(\d{2})\/(\d{2})\s*[-~–]\s*(\d{4})\/(\d{2})\/(\d{2})/);
    return m ? [Date.UTC(+m[1], m[2] - 1, +m[3]), Date.UTC(+m[4], m[5] - 1, +m[6])] : null;
  }

  // rows = array of cell arrays (empty cells / merged-cell gaps are ignored)
  function parseTab(rows) {
    const blocks = []; let cur = null;
    for (const r of rows) {
      const t = r.map(c => String(c == null ? '' : c).trim()).filter(c => c !== '');
      if (!t.length || /^Date Range/i.test(t[0])) continue;
      const rg = parseRange(t[0]);
      if (rg) { cur = { s: rg[0], e: rg[1], items: [] }; blocks.push(cur); t.shift(); }
      if (!cur || t.length < 8 || t[0] === '合計') continue;
      const n = t.slice(-6).map(x => +x.replace(/,/g, ''));
      if (n.some(isNaN)) continue;
      cur.items.push({ code: t[0], name: t[1], qty: n[0], amt: n[1], rq: n[2], ra: n[3], nq: n[4], na: n[5] });
    }
    return blocks;
  }

  // Repairs odd week labels. Returns notes describing every change.
  function fixBlocks(blocks, tab) {
    const notes = [], seen = new Set();
    for (const b of blocks) {
      const old = iso(b.s) + ' – ' + iso(b.e);
      if ((b.e - b.s) / DAY + 1 > 9) {
        b.s = b.e - 6 * DAY;
        notes.push(`${tab}: range ${old} is longer than a week; treated as ${iso(b.s)} – ${iso(b.e)} (the week ending ${iso(b.e)}).`);
      }
      if (seen.has(b.s)) {
        const o2 = iso(b.s) + ' – ' + iso(b.e);
        b.s += 7 * DAY; b.e += 7 * DAY;
        notes.push(`${tab}: week ${o2} appears twice; the second block was treated as ${iso(b.s)} – ${iso(b.e)}.`);
      }
      seen.add(b.s);
    }
    return notes;
  }

  const carrierOf = n => /CHUNGHWA|中華/.test(n) ? 'Chunghwa' : /^IF\b|遠傳/.test(n) ? 'FarEasTone' : /^OK\b|台灣大哥大/.test(n) ? 'Taiwan Mobile' : 'Other';
  const typeOf = n => /儲值卡/.test(n) ? 'Top-up' : 'SIM / data card';

  // -> Map(weekStartMs -> {s,e,days,pcs,amt,carrier:{},type:{}})
  function aggregate(blocks) {
    const m = new Map();
    for (const b of blocks) {
      const w = m.get(b.s) || { s: b.s, e: b.e, days: (b.e - b.s) / DAY + 1, pcs: 0, amt: 0, carrier: {}, type: {} };
      for (const i of b.items) {
        w.pcs += i.nq; w.amt += i.na;
        const c = carrierOf(i.name), t = typeOf(i.name);
        w.carrier[c] = (w.carrier[c] || 0) + i.nq; w.type[t] = (w.type[t] || 0) + i.nq;
      }
      m.set(b.s, w);
    }
    return m;
  }

  function pct(a, p) {
    const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return s[lo] + (s[hi] - s[lo]) * (i - lo);
  }

  // vals = pcs per 7 days for complete weeks, oldest -> newest
  function forecast(vals) {
    if (vals.length < 3) return null;
    const v = vals.slice(-8), w4 = v.slice(-4);
    const wts = w4.map((_, i) => i + 1);
    const target = sum(w4.map((x, i) => x * wts[i])) / sum(wts);
    const min = Math.min(pct(v, 0.25), target);
    const stretch = Math.max(pct(v, 0.75), target * 1.1);
    const prev4 = vals.slice(-8, -4);
    const trend = prev4.length ? (sum(w4) / w4.length) / (sum(prev4) / prev4.length) - 1 : null;
    const r = Math.round;
    return { min: r(min), target: r(target), stretch: r(stretch), trend, last: r(vals[vals.length - 1]),
             mMin: r(min) * 4, mTarget: r(target) * 4, mStretch: r(stretch) * 4 };
  }

  root.Core = { parseTab, fixBlocks, aggregate, forecast, iso, DAY };
})(typeof window !== 'undefined' ? window : globalThis);
