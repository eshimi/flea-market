// マイリスト：気に入った市を、この端末のブラウザ（localStorage）だけに保存する。アカウントなし・サーバーへ送らない
(() => {
  const KEY = 'fm-saved';
  const ja = document.documentElement.lang === 'ja';
  const pre = ja ? '/ja' : '';
  const read = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 200) : []; } catch { return []; } };
  const write = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* 保存できない環境では、何もしない */ } };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const paint = () => {
    const ids = read();
    document.querySelectorAll('.save-btn[data-id]').forEach((b) => {
      const on = ids.includes(b.dataset.id);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.setAttribute('aria-label', on ? b.dataset.on : b.dataset.off);
      const sp = b.querySelector('span[data-t-on]');
      if (sp) sp.textContent = on ? sp.dataset.tOn : sp.dataset.tOff;
    });
    document.querySelectorAll('.hd-saved .cnt').forEach((c) => { c.textContent = ids.length; c.hidden = !ids.length; });
  };
  const toggle = (id) => { const ids = read(); const i = ids.indexOf(id); if (i >= 0) ids.splice(i, 1); else ids.unshift(id); write(ids); paint(); };
  const flash = (btn, text) => { const sp = btn.querySelector('span'); if (!sp) return; const old = sp.textContent; sp.textContent = text; setTimeout(() => { sp.textContent = old; }, 1800); };
  const share = async (btn, url) => {
    const title = btn.dataset.title || document.title;
    try { if (navigator.share) { await navigator.share({ title, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); flash(btn, btn.dataset.copied || 'OK'); } catch { window.prompt('', url); }
  };
  document.addEventListener('click', (e) => {
    const s = e.target.closest('.save-btn[data-id]');
    if (s) { e.preventDefault(); toggle(s.dataset.id); render(); return; }
    const h = e.target.closest('.share-btn[data-url]');
    if (h) { e.preventDefault(); share(h, h.dataset.url); }
  });
  paint();

  // マイリストのページ
  const box = document.getElementById('saved-list');
  async function render() {
    if (!box) return;
    const shared = (new URLSearchParams(location.search).get('ids') || '').split(',').map((x) => x.trim()).filter((x) => /^[a-z0-9-]{1,80}$/.test(x)).slice(0, 60);
    const mine = read();
    const ids = shared.length ? shared : mine;
    const note = document.getElementById('saved-shared-note');
    const shareBtn = document.getElementById('saved-share');
    const all = document.getElementById('saved-saveall');
    if (note) note.hidden = !shared.length;
    if (!ids.length) { box.innerHTML = `<p class="empty">${esc(box.dataset.empty)}</p>`; if (shareBtn) shareBtn.hidden = true; if (all) all.hidden = true; return; }
    let data;
    try { data = await (await fetch('/events.json')).json(); } catch { box.innerHTML = `<p class="empty">${esc(box.dataset.fail)}</p>`; return; }
    const by = new Map();
    for (const e of data.events) { if (!by.has(e.id)) by.set(e.id, []); by.get(e.id).push(e); }
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmt = (d) => { const [y, m, dd] = d.split('-').map(Number); return ja ? `${m}月${dd}日` : `${MON[m - 1]} ${dd}`; };
    box.innerHTML = `<ul class="saved-ul">${ids.map((id) => {
      const list = by.get(id) || [];
      const e = list[0];
      if (!e) return shared.length ? '' : `<li class="saved-li"><span>${esc(id)}</span><button type="button" class="saved-rm" data-id="${esc(id)}">${esc(box.dataset.remove)}</button></li>`;
      const name = !ja && e.ne ? e.ne : e.n;
      const place = ja ? [e.ci || e.p, e.v].filter(Boolean).join('・') : [e.cie || e.ci || e.pe, e.ve || e.v].filter(Boolean).join(', ');
      const dates = list.slice(0, 3).map((x) => fmt(x.d)).join(' / ');
      return `<li class="saved-li"><div><a href="${pre}/e/${esc(id)}/">${esc(name)}</a><p class="meta">${esc(place)}</p><p class="meta"><b>${esc(box.dataset.upcoming)}:</b> ${esc(dates || box.dataset.none)}</p></div>${shared.length ? '' : `<button type="button" class="saved-rm" data-id="${esc(id)}">${esc(box.dataset.remove)}</button>`}</li>`;
    }).join('')}</ul>`;
    if (shareBtn) { shareBtn.hidden = !mine.length || !!shared.length; shareBtn.dataset.url = `${location.origin}${pre}/saved/?ids=${mine.join(',')}`; }
    if (all) all.hidden = !shared.length;
  }
  if (box) {
    box.addEventListener('click', (e) => { const r = e.target.closest('.saved-rm'); if (r) { toggle(r.dataset.id); render(); } });
    const all = document.getElementById('saved-saveall');
    if (all) all.addEventListener('click', () => {
      const shared = (new URLSearchParams(location.search).get('ids') || '').split(',').filter((x) => /^[a-z0-9-]{1,80}$/.test(x));
      write([...new Set([...shared, ...read()])].slice(0, 200)); history.replaceState(null, '', location.pathname); paint(); render();
    });
    render();
  }
})();
