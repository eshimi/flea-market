// マップで探す：Leaflet ＋ 国土地理院の地理院タイル。日付・種類・地域で絞り込み。位置は目安。位置情報は「現在地へ」を押したときだけ、地図を動かすために使う（送信・保存しない）
(() => {
  const root = document.getElementById('mk-root');
  const cfgEl = document.getElementById('mk-i18n');
  if (!root || !cfgEl || !window.L) return;
  const cfg = JSON.parse(cfgEl.textContent);
  const t = cfg.t;
  const lang = cfg.lang;
  const li = lang === 'ja' ? 0 : 1;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const wdOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
  const WD = lang === 'ja' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dlabel = (iso) => { const [, m, d] = iso.split('-'); return lang === 'ja' ? `${+m}/${+d}（${WD[wdOf(iso)]}）` : `${WD[wdOf(iso)]}, ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1]} ${+d}`; };
  const href = (id) => (lang === 'ja' ? `/ja/e/${id}/` : `/e/${id}/`);

  const ranges = [
    ['weekend', t.weekend, (d) => cfg.weekend.includes(d)],
    ['d7', t.d7, (d) => d >= cfg.today && d <= addDays(cfg.today, 7)],
    ['d30', t.d30, (d) => d >= cfg.today && d <= addDays(cfg.today, 30)],
    ['all', t.all, () => true],
  ];
  const state = { range: 'weekend', kind: 'all', pref: 'all' };

  // ---- 画面の部品 ----
  const bar = root.querySelector('.mk-bar');
  const countEl = root.querySelector('.mk-count');
  const listEl = root.querySelector('.mk-list');
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

  // ---- 地図 ----
  const map = L.map('mk-map', { minZoom: 4, maxZoom: 18, zoomControl: true }).setView([36.2, 137.5], 5);
  L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png', { attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">国土地理院</a>', maxZoom: 18 }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let items = [];
  const markers = new Map();

  const popupFor = (it, shown) => {
    const box = el('div', 'mk-pop');
    box.appendChild(el('b', 'mk-pop-n', it.n[li]));
    box.appendChild(el('div', 'mk-pop-v', it.v[li]));
    const nd = shown[0];
    if (nd) box.appendChild(el('div', 'mk-pop-d', `${t.next}: ${dlabel(nd)}${it.t[li] ? ` ${it.t[li]}` : ''}`));
    if (it.pr && it.pr !== 'lot') box.appendChild(el('div', 'mk-pop-a', t.approx));
    const a = el('a', 'mk-pop-l', `${t.open} →`); a.href = href(it.id); box.appendChild(a);
    return box;
  };

  const inRange = (it) => { const f = ranges.find((r) => r[0] === state.range)[2]; return it.d.filter(f); };
  function visible() {
    return items.map((it) => ({ it, shown: inRange(it) })).filter((x) => x.shown.length
      && (state.kind === 'all' || x.it.k.includes(state.kind)) && (state.pref === 'all' || x.it.pref === state.pref));
  }

  function render(fit) {
    rangeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === state.range)));
    kindGrp.querySelectorAll('.mk-chip').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.k === state.kind)));
    const vis = visible();
    layer.clearLayers(); markers.clear(); listEl.textContent = '';
    for (const { it, shown } of vis) {
      const m = L.circleMarker([it.lat, it.lon], { radius: 8, color: '#fff', weight: 2, fillColor: '#B5452E', fillOpacity: 0.95 });
      m.bindPopup(() => popupFor(it, shown), { maxWidth: 280 });
      m.on('click', () => { const li_ = listEl.querySelector(`[data-id="${it.id}"]`); if (li_) { listEl.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); li_.classList.add('on'); li_.scrollIntoView({ block: 'nearest' }); } });
      m.addTo(layer); markers.set(it.id, m);
      const row = el('li', 'mk-row'); row.dataset.id = it.id;
      const btn = el('button', 'mk-row-b'); btn.type = 'button';
      btn.appendChild(el('b', 'mk-row-n', it.n[li]));
      btn.appendChild(el('span', 'mk-row-v', it.v[li]));
      btn.appendChild(el('span', 'mk-row-d', `${dlabel(shown[0])}${shown.length > 1 ? ` +${shown.length - 1}` : ''}${it.t[li] ? ` ${it.t[li]}` : ''}`));
      btn.addEventListener('click', () => { map.setView([it.lat, it.lon], Math.max(map.getZoom(), 14)); m.openPopup(); listEl.querySelectorAll('.on').forEach((x) => x.classList.remove('on')); row.classList.add('on'); map.getContainer().scrollIntoView({ block: 'nearest' }); });
      row.appendChild(btn);
      const link = el('a', 'mk-row-l', t.open); link.href = href(it.id); row.appendChild(link);
      listEl.appendChild(row);
    }
    countEl.textContent = vis.length ? t.countTpl.replace('{n}', vis.length) : t.none;
    if (fit && vis.length) { const b = L.latLngBounds(vis.map((x) => [x.it.lat, x.it.lon])); map.fitBounds(b, { padding: [40, 40], maxZoom: 13 }); }
  }

  // ---- 種類・地域の選択肢（データにあるものだけ） ----
  function buildFilters() {
    const kinds = new Set(); const prefs = new Set();
    items.forEach((x) => { x.k.forEach((k) => kinds.add(k)); prefs.add(x.pref); });
    const mkChip = (k, label) => { const b = el('button', 'mk-chip', label); b.type = 'button'; b.dataset.k = k; b.addEventListener('click', () => { state.kind = k; render(true); }); kindGrp.appendChild(b); };
    mkChip('all', t.allKinds); [...kinds].forEach((k) => mkChip(k, cfg.kinds[k] || k));
    prefSel.appendChild(new Option(t.allPrefs, 'all'));
    [...prefs].sort().forEach((p) => prefSel.appendChild(new Option(cfg.prefs[p] || p, p)));
  }

  locBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { countEl.textContent = t.locFail; return; }
    countEl.textContent = t.locating;
    navigator.geolocation.getCurrentPosition((pos) => { map.setView([pos.coords.latitude, pos.coords.longitude], 12); render(false); }, () => { countEl.textContent = t.locFail; render(false); }, { timeout: 10000, maximumAge: 600000 });
  });

  fetch(root.dataset.src).then((r) => r.json()).then((data) => {
    items = data;
    buildFilters();
    // 今週末に該当がなければ、今後30日にする
    if (!visible().length) state.range = 'd30';
    render(true);
  }).catch((e) => { console.error('map', e); countEl.textContent = t.none; });
})();
