// キーワード検索：/events.json を読み、名前・地域・会場・種類・開催のきまりで絞り込む（すべての語を含むもの）
(async () => {
  const q = (new URLSearchParams(location.search).get('q') || '').trim();
  const input = document.querySelector('.search input');
  const status = document.getElementById('search-status');
  const out = document.getElementById('search-results');
  if (input) input.value = q;
  if (!q) { status.textContent = '地名・会場名・種類などを入れて、探してください。'; return; }
  const KIND = { flea: 'フリマ フリーマーケット', nomi: '蚤の市 のみの市', kotto: '骨董市 こっとう', handmade: '手作り市 手づくり市 クラフト', marche: 'マルシェ 朝市' };
  const LABEL = { confirmed: '公式で確認', scheduled: '予定（きまりから算出）', cancelled: '中止', postponed: '延期', unknown: '開催は要確認' };
  const CLS = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' };
  const WD = ['日', '月', '火', '水', '木', '金', '土'];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  try {
    const { events } = await (await fetch('/events.json')).json();
    const words = q.toLowerCase().split(/[\s　]+/).filter(Boolean);
    const hit = events.filter((e) => {
      const text = [e.n, e.p, e.ci, e.v, e.r, ...e.k.map((k) => KIND[k] || '')].join(' ').toLowerCase();
      return words.every((w) => text.includes(w));
    });
    status.textContent = `「${q}」の開催：${hit.length}件`;
    out.innerHTML = hit.slice(0, 200).map((e) => {
      const d = new Date(e.d + 'T00:00:00Z');
      const off = e.st === 'cancelled' || e.st === 'postponed';
      return `<article class="ev${off ? ' off' : ''}"><div class="ev-date"><small>${d.getUTCMonth() + 1}月</small><b>${d.getUTCDate()}</b><small>${WD[d.getUTCDay()]}</small></div><div class="ev-body"><h3><a href="/e/${esc(e.id)}/">${esc(e.n)}</a></h3><p class="meta">${esc([e.ci, e.v].filter(Boolean).join('・'))}${e.t ? ' ／ ' + esc(e.t) : ''}</p><div class="tags"><span class="tag">${esc(e.r)}</span><span class="tag ${CLS[e.st]}">${esc(LABEL[e.st])}</span></div></div></article>`;
    }).join('') || '<p class="empty">見つかりませんでした。言葉を短くするか、地域・種類から探してください。</p>';
  } catch {
    status.textContent = '読み込みに失敗しました。時間をおいて、もう一度お試しください。';
  }
})();
