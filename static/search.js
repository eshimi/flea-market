// キーワード検索：/events.json を読み、名前・地域・会場・種類・開催のきまりで絞り込む（すべての語を含むもの）。
// 表記のゆれは、検索語と本文の両方を同じ形にそろえてから比べる（全角・半角、カタカナ・ひらがな、ヶ・が、アクセント記号を一つに。中黒・空白・ハイフンなどの記号は無視）
(async () => {
  const ja = document.documentElement.lang === 'ja';
  const pre = ja ? '/ja' : '';
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  const input = document.querySelector('.search input');
  const status = document.getElementById('search-status');
  const out = document.getElementById('search-results');
  if (input) input.value = q;
  if (!q) { status.textContent = ja ? '地名・会場名・種類などを入れて、探してください。' : 'Enter a place, venue or market type to search.'; return; }
  const KIND = { flea: 'フリマ フリーマーケット flea market', nomi: '蚤の市 のみの市 nomi-no-ichi flea', kotto: '骨董市 こっとう antique antiques', handmade: '手作り市 手づくり市 クラフト handmade craft', engi: '縁日 露店 ennichi fair temple shrine', marche: 'マルシェ 朝市 marche market' };
  const LABEL = ja ? { confirmed: '公式で確認', scheduled: '予定（きまりから算出）', cancelled: '中止', postponed: '延期', unknown: '開催は要確認' } : { confirmed: 'Confirmed (official)', scheduled: 'Scheduled (from recurring rule)', cancelled: 'Cancelled', postponed: 'Postponed', unknown: 'To be confirmed' };
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const WDE = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const CLS = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' };
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const norm = (s) => String(s).normalize('NFKC').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').normalize('NFC')
    .replace(/[ヶヵ]/g, 'が')
    .replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\u3000・･·\-‐‑–—―_.,，、。'’"“”()（）［］\[\]「」『』【】〈〉《》/／!！?？:：;；~〜]/g, '');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  try {
    const { events, spots = [] } = await (await fetch('/events.json')).json();
    const words = q.split(/[\s　]+/).map(norm).filter(Boolean);
    const hit = events.filter((e) => {
      const text = norm([e.n, e.ne || '', e.p, e.pe || '', e.cie || '', e.ve || '', e.re || '', e.ci, e.v, e.r, ...e.k.map((k) => KIND[k] || '')].join(' '));
      return words.every((w) => text.includes(w));
    });
    const sh = spots.filter((x) => { const t = norm([x.n, x.ne || '', x.p, x.pe || '', x.ci, x.cie || '', x.pl].join(' ')); return words.every((w) => t.includes(w)); });
    const spotHtml = sh.length ? `<div class="sp-hl"><b>${ja ? 'スポット（会場）' : 'Spots'}</b>${sh.slice(0, 12).map((x) => `<a href="${pre}/spot/${esc(x.id)}/">${esc(!ja && x.ne ? x.ne : x.n)}</a>`).join('')}</div>` : '';
    status.textContent = ja ? `「${q}」の開催：${hit.length}件` : `${hit.length} result${hit.length === 1 ? '' : 's'} for “${q}”`;
    out.innerHTML = spotHtml + hit.slice(0, 200).map((e) => {
      const d = new Date(e.d + 'T00:00:00Z');
      const off = e.st === 'cancelled' || e.st === 'postponed';
      return `<article class="ev${off ? ' off' : ''}"><div class="ev-date"><small>${ja ? d.getUTCMonth() + 1 + '月' : MON[d.getUTCMonth()]}</small><b>${d.getUTCDate()}</b><small>${ja ? WD[d.getUTCDay()] : WDE[d.getUTCDay()]}</small></div><div class="ev-body"><h3><a href="${pre}/e/${esc(e.id)}/">${esc(!ja && e.ne ? e.ne : e.n)}</a></h3>${!ja && e.ne ? `<p class="orig-n" lang="ja">${esc(e.n)}</p>` : ''}<p class="meta">${esc((ja ? [e.ci || e.p, e.v].join('・') : [e.cie || e.ci || e.pe, e.ve || e.v].filter(Boolean).join(', ')))}${(ja ? e.t : e.te || e.t) ? (ja ? ' ／ ' : ' / ') + esc(ja ? e.t : e.te || e.t) : ''}</p><div class="tags">${(ja ? e.r : e.re) ? `<span class="tag">${esc(ja ? e.r : e.re)}</span>` : ''}<span class="tag ${CLS[e.st]}">${esc(LABEL[e.st])}</span></div></div></article>`;
    }).join('') || (ja ? '<p class="empty">見つかりませんでした。言葉を短くするか、地域・種類から探してください。</p>' : '<p class="empty">Nothing found. Try a shorter word, or browse by area or type.</p>');
  } catch {
    status.textContent = ja ? '読み込みに失敗しました。時間をおいて、もう一度お試しください。' : 'Failed to load. Please try again later.';
  }
})();
