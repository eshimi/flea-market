// マップで探す：サイトの都道府県の形を使ったイラスト地図（SVG）。日付・種類・地域で絞り込み、近い印はまとめて数字で表す。位置は目安
// 位置情報は「現在地へ」を押したときだけ、地図を動かすために使う（送信・保存しない）
(() => {
  const root = document.getElementById('mk-root');
  const cfgEl = document.getElementById('mk-i18n');
  const svg = root && root.querySelector('.mk-svg');
  if (!root || !cfgEl || !svg) return;
  const cfg = JSON.parse(cfgEl.textContent);
  const t = cfg.t;
  const lang = cfg.lang;
  const li = lang === 'ja' ? 0 : 1;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const se = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const P = cfg.proj;
  const project = (lat, lon) => [P.ax * lon + P.bx, P.ay * lat + P.by];

  const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wdOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
  const WD = lang === 'ja' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dlabel = (iso) => { const [, m, d] = iso.split('-'); return lang === 'ja' ? `${+m}/${+d}（${WD[wdOf(iso)]}）` : `${WD[wdOf(iso)]}, ${MON[+m - 1]} ${+d}`; };
  const href = (id) => (lang === 'ja' ? `/ja/e/${id}/` : `/e/${id}/`);

  const ranges = [
    ['weekend', t.weekend, (d) => cfg.weekend.includes(d)],
    ['d7', t.d7, (d) => d >= cfg.today && d <= addDays(cfg.today, 7)],
    ['d30', t.d30, (d) => d >= cfg.today && d <= addDays(cfg.today, 30)],
    ['all', t.all, () => true],
  ];
  const state = { range: 'weekend', kind: 'all', pref: 'all' };

  // ---- 操作パネル ----
  const bar = root.querySelector('.mk-bar');
  const countEl = root.querySelector('.mk-count');
  const listEl = root.querySelector('.mk-list');
  const wrap = root.querySelector('#mk-map');
  const pop = root.querySelector('.mk-pop');
  const mkGroup = (label) => { const g = el('div', 'mk-grp'); g.appendChild(el('span', 'mk-lab', label)); return g; };
  const rangeGrp = mkGroup(t.when);
  const rangeBtns = ranges.map(([k, label]) => { const b = el('button', 'mk-chip', label); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => { state.range = k; render(true); }); rangeGrp.appendChild(b); return b; });
  const kindGrp = mkGroup(t.kind);
  const prefGrp = mkGroup(t.pref);
  const prefSel = el('select', 'mk-sel'); prefSel.setAttribute('aria-label', t.pref);
  prefSel.addEventListener('change', () => { state.pref = prefSel.value; render(true); });
  prefGrp.appendChild(prefSel);
  const locBtn = el('button', 'mk-loc', t.locate); locBtn.type = 'button';
  bar.append(rangeGrp, kindGrp, prefGrp, locBtn);

  // ---- 地図の見ている範囲（viewBox）----
  const gMarks = svg.querySelector('.mk-markers');
  const prefPaths = [...svg.querySelectorAll('.mk-pref')];
  const VB0 = svg.viewBox.baseVal;
  const home = { x: VB0.x, y: VB0.y, w: VB0.width, h: VB0.height };
  let vb = { ...home };
  const minW = home.w / 40;
  const setVB = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  const kOf = () => { const r = svg.getBoundingClientRect(); return Math.min(r.width / vb.w, r.height / vb.h) || 1; };
  const clampVB = () => {
    vb.w = Math.min(Math.max(vb.w, minW), home.w); vb.h = vb.w * (home.h / home.w);
    vb.x = Math.min(Math.max(vb.x, home.x - 10), home.x + home.w + 10 - vb.w);
    vb.y = Math.min(Math.max(vb.y, home.y - 10), home.y + home.h + 10 - vb.h);
  };
  // 画面の縦横比に合わせた表示範囲（地図の枠は、イラスト地図より横長のことがある）
  function fitBox(x0, y0, x1, y1, pad = 0.22, maxZoom = 18) {
    const r = svg.getBoundingClientRect(); const asp = (r.width / r.height) || (home.w / home.h);
    let w = Math.max(x1 - x0, 6) * (1 + pad * 2); let h = Math.max(y1 - y0, 6) * (1 + pad * 2);
    if (w / h < asp) w = h * asp; else h = w / asp;
    w = Math.max(w, home.w / maxZoom); h = w / asp;
    vb = { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
    const aspHome = home.w / home.h; vb.h = vb.w / (asp || aspHome);
    setVB();
  }
  function resetView() { const r = svg.getBoundingClientRect(); const asp = (r.width / r.height) || (home.w / home.h); const w = Math.max(home.w, home.h * asp); const h = w / asp; vb = { x: home.x + home.w / 2 - w / 2, y: home.y + home.h / 2 - h / 2, w, h }; setVB(); }
  const toSvg = (cx, cy) => { const pt = svg.createSVGPoint(); pt.x = cx; pt.y = cy; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; };
  const toClient = (x, y) => { const pt = svg.createSVGPoint(); pt.x = x; pt.y = y; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m) : { x: 0, y: 0 }; };
  function zoomAt(cx, cy, f) {
    const p = toSvg(cx, cy); const nw = Math.min(Math.max(vb.w * f, minW), Math.max(home.w, vb.w)); const s = nw / vb.w;
    vb.x = p.x - (p.x - vb.x) * s; vb.y = p.y - (p.y - vb.y) * s; vb.w = nw; vb.h = vb.h * s; setVB(); draw();
  }

  // ---- ドラッグで動かす・ホイールで拡大 ----
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { if (e.target.closest('.mk-pin, .mk-clu')) return; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, moved: false }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => {
    if (!drag) return; const k = kOf(); const dx = e.clientX - drag.x; const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    vb.x = drag.vx - dx / k; vb.y = drag.vy - dy / k; setVB(); hidePop();
  });
  svg.addEventListener('pointerup', () => { if (drag && drag.moved) { suppressClick = true; setTimeout(() => { suppressClick = false; }, 0); draw(); } drag = null; });
  let suppressClick = false;
  svg.addEventListener('wheel', (e) => { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY > 0 ? 1.25 : 0.8); hidePop(); }, { passive: false });
  svg.addEventListener('dblclick', (e) => { if (e.target.closest('.mk-pin, .mk-clu')) return; zoomAt(e.clientX, e.clientY, 0.5); });
  wrap.querySelectorAll('.mk-zoom button').forEach((b) => b.addEventListener('click', () => {
    const r = svg.getBoundingClientRect(); hidePop();
    if (b.dataset.z === 'reset') { state.pref = 'all'; prefSel.value = 'all'; render(true); return; }
    zoomAt(r.left + r.width / 2, r.top + r.height / 2, b.dataset.z === 'in' ? 0.6 : 1.6);
  }));

  // ---- 都道府県の形：件数で色を変える。押すと、その地域へ ----
  const bboxCache = new Map();
  const prefBox = (code) => { if (!bboxCache.has(code)) { const p = svg.querySelector(`.mk-pref[data-pref="${code}"]`); bboxCache.set(code, p ? p.getBBox() : null); } return bboxCache.get(code); };
  prefPaths.forEach((p) => p.addEventListener('click', () => {
    if (suppressClick) return; const code = p.dataset.pref;
    state.pref = state.pref === code ? 'all' : code; prefSel.value = [...prefSel.options].some((o) => o.value === state.pref) ? state.pref : 'all'; render(true);
  }));
  // 沖縄など、位置をずらして置いている都道府県のまわりに、点線の枠
  const inset = svg.querySelector('.mk-inset'); const ob = prefBox('47');
  if (ob) { inset.setAttribute('x', ob.x - 4); inset.setAttribute('y', ob.y - 4); inset.setAttribute('width', ob.width + 8); inset.setAttribute('height', ob.height + 8); } else { inset.remove(); }

  // ---- 印（ピン）と、近い印のまとめ ----
  let items = [];
  let vis = [];
  const PIN = 'M0 0c-5.6-7.4-8.6-11.4-8.6-15.9a8.6 8.6 0 1 1 17.2 0c0 4.5-3 8.5-8.6 15.9z';
  const inRange = (it) => { const f = ranges.find((r) => r[0] === state.range)[2]; return it.d.filter(f); };
  function visible() {
    return items.map((it) => { const [x, y] = project(it.lat, it.lon); return { it, shown: inRange(it), x, y }; })
      .filter((o) => o.shown.length && (state.kind === 'all' || o.it.k.includes(state.kind)) && (state.pref === 'all' || o.it.pref === state.pref) && o.it.pref !== '47');
  }
  function clusters(k) {
    const R = 20 / k; const out = [];
    for (const o of vis) {
      const c = out.find((q) => Math.hypot(q.x - o.x, q.y - o.y) < R);
      if (c) { c.m.push(o); c.x = c.m.reduce((s, z) => s + z.x, 0) / c.m.length; c.y = c.m.reduce((s, z) => s + z.y, 0) / c.m.length; } else out.push({ x: o.x, y: o.y, m: [o] });
    }
    return out;
  }
  function draw() {
    const k = kOf(); gMarks.textContent = '';
    for (const c of clusters(k)) {
      const g = se('g', { transform: `translate(${c.x} ${c.y}) scale(${1 / k})` });
      if (c.m.length === 1) {
        g.setAttribute('class', 'mk-pin'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', c.m[0].it.n[li]);
        g.appendChild(se('path', { d: PIN, class: 'mk-pin-b' })); g.appendChild(se('circle', { cx: 0, cy: -15.6, r: 3.2, class: 'mk-pin-c' }));
        const open = () => showPop(c); g.addEventListener('click', (e) => { e.stopPropagation(); if (!suppressClick) open(); }); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      } else {
        g.setAttribute('class', 'mk-clu'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', String(c.m.length));
        g.appendChild(se('circle', { r: 15, class: 'mk-clu-b' }));
        const tx = se('text', { 'text-anchor': 'middle', y: 4.5, class: 'mk-clu-t' }); tx.textContent = c.m.length; g.appendChild(tx);
        const open = () => { const xs = c.m.map((z) => z.x); const ys = c.m.map((z) => z.y); const spread = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
          if (spread * k < 6 || vb.w <= minW * 1.5) showPop(c); else { hidePop(); fitBox(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 0.5, 30); draw(); } };
        g.addEventListener('click', (e) => { e.stopPropagation(); if (!suppressClick) open(); }); g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      }
      gMarks.appendChild(g);
    }
  }

  // ---- 吹き出し ----
  function hidePop() { pop.hidden = true; pop.textContent = ''; }
  function showPop(c) {
    pop.textContent = '';
    const close = el('button', 'mk-pop-x', '×'); close.type = 'button'; close.setAttribute('aria-label', 'close'); close.addEventListener('click', hidePop); pop.appendChild(close);
    for (const o of c.m.slice(0, 8)) {
      const it = o.it; const box = el('div', 'mk-pop-i');
      box.appendChild(el('b', 'mk-pop-n', it.n[li])); box.appendChild(el('div', 'mk-pop-v', it.v[li]));
      box.appendChild(el('div', 'mk-pop-d', `${t.next}: ${dlabel(o.shown[0])}${it.t[li] ? ` ${it.t[li]}` : ''}`));
      if (it.pr && it.pr !== 'lot') box.appendChild(el('div', 'mk-pop-a', t.approx));
      const a = el('a', 'mk-pop-l', `${t.open} →`); a.href = href(it.id); box.appendChild(a); pop.appendChild(box);
    }
    if (c.m.length > 8) pop.appendChild(el('div', 'mk-pop-a', `+${c.m.length - 8}`));
    pop.hidden = false;
    const r = wrap.getBoundingClientRect(); const p = toClient(c.x, c.y);
    const pw = pop.offsetWidth; const ph = pop.offsetHeight;
    let left = p.x - r.left - pw / 2; let top = p.y - r.top - ph - 26;
    if (top < 6) top = p.y - r.top + 14;
    left = Math.min(Math.max(left, 6), r.width - pw - 6); top = Math.min(Math.max(top, 6), Math.max(6, r.height - ph - 6));
    pop.style.left = `${left}px`; pop.style.top = `${top}px`;
  }
  wrap.addEventListener('click', (e) => { if (!e.target.closest('.mk-pop, .mk-pin, .mk-clu, .mk-zoom') && !suppressClick) hidePop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hidePop(); });

  // ---- 描画（絞り込みのたびに）----
  function render(fit) {
    rangeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === state.range)));
    kindGrp.querySelectorAll('.mk-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === state.kind)));
    vis = visible(); hidePop(); listEl.textContent = '';
    const counts = new Map(); vis.forEach((o) => counts.set(o.it.pref, (counts.get(o.it.pref) || 0) + 1));
    prefPaths.forEach((p) => { const n = counts.get(p.dataset.pref) || 0; p.setAttribute('class', `mk-pref${n ? ` lv${n >= 10 ? 3 : n >= 4 ? 2 : 1}` : ''}${state.pref === p.dataset.pref ? ' sel' : ''}`); });
    for (const o of vis) {
      const it = o.it; const row = el('li', 'mk-row'); row.dataset.id = it.id;
      const btn = el('button', 'mk-row-b'); btn.type = 'button';
      btn.appendChild(el('b', 'mk-row-n', it.n[li])); btn.appendChild(el('span', 'mk-row-v', it.v[li]));
      btn.appendChild(el('span', 'mk-row-d', `${dlabel(o.shown[0])}${o.shown.length > 1 ? ` +${o.shown.length - 1}` : ''}${it.t[li] ? ` ${it.t[li]}` : ''}`));
      btn.addEventListener('click', () => { fitBox(o.x, o.y, o.x, o.y, 0, 14); draw(); showPop({ x: o.x, y: o.y, m: [o] }); wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
      row.appendChild(btn); const link = el('a', 'mk-row-l', t.open); link.href = href(it.id); row.appendChild(link); listEl.appendChild(row);
    }
    countEl.textContent = vis.length ? t.countTpl.replace('{n}', vis.length) : t.none;
    if (fit) {
      if (state.pref !== 'all' && prefBox(state.pref)) { const b = prefBox(state.pref); fitBox(b.x, b.y, b.x + b.width, b.y + b.height, 0.18, 9); }
      else if (vis.length && state.pref === 'all' && vis.length < items.length * 0.4 && false) { fitBox(Math.min(...vis.map((o) => o.x)), Math.min(...vis.map((o) => o.y)), Math.max(...vis.map((o) => o.x)), Math.max(...vis.map((o) => o.y))); }
      else resetView();
    }
    draw();
  }

  function buildFilters() {
    const kinds = new Set(); const prefs = new Set();
    items.forEach((x) => { x.k.forEach((k) => kinds.add(k)); prefs.add(x.pref); });
    const mkChip = (k, label) => { const b = el('button', 'mk-chip', label); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => { state.kind = k; render(false); }); kindGrp.appendChild(b); };
    mkChip('all', t.allKinds); [...kinds].forEach((k) => mkChip(k, cfg.kinds[k] || k));
    prefSel.appendChild(new Option(t.allPrefs, 'all'));
    [...prefs].sort().forEach((p) => prefSel.appendChild(new Option(cfg.prefs[p] || p, p)));
  }

  // ---- 現在地（日本の範囲内のときだけ） ----
  let me = null;
  locBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { countEl.textContent = t.locFail; return; }
    countEl.textContent = t.locating;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: la, longitude: lo } = pos.coords;
      if (la < 24 || la > 46 || lo < 122 || lo > 146.5) { countEl.textContent = t.locFail; return; }
      const [x, y] = project(la, lo); if (me) me.remove(); me = se('circle', { cx: x, cy: y, r: 1.4, class: 'mk-me' }); svg.insertBefore(me, gMarks);
      fitBox(x, y, x, y, 0, 8); render(false); fitBox(x, y, x, y, 0, 8); draw();
    }, () => { countEl.textContent = t.locFail; }, { timeout: 10000, maximumAge: 600000 });
  });

  window.addEventListener('resize', () => { hidePop(); draw(); });
  fetch(root.dataset.src).then((r) => r.json()).then((data) => {
    items = data; buildFilters();
    if (!visible().length) state.range = 'd30';
    render(true);
  }).catch((e) => { console.error('map', e); countEl.textContent = t.none; });
})();
