// 地域・種類で絞り込む（日付・今週末の一覧）。都道府県と種類のボタンを押すと、その条件の開催だけを出す（両方を選ぶと、両方に合うものだけ。#pref=13&kind=kotto で直接開ける）
(() => {
  const navs = [...document.querySelectorAll('.af-chips')];
  if (!navs.length) return;
  const cards = [...document.querySelectorAll('article.ev[data-pref]')];
  const state = { pref: 'all', kind: 'all' };
  const apply = () => {
    navs.forEach((n) => n.querySelectorAll('.af-chip').forEach((c) => {
      const key = c.dataset.pref !== undefined ? 'pref' : 'kind';
      c.setAttribute('aria-pressed', String(c.dataset[key] === state[key]));
    }));
    cards.forEach((a) => {
      const okPref = state.pref === 'all' || a.dataset.pref === state.pref;
      const okKind = state.kind === 'all' || (a.dataset.kinds || '').split(' ').includes(state.kind);
      a.hidden = !(okPref && okKind);
    });
    // 中身が無くなった月の見出しは隠す
    document.querySelectorAll('.month-block').forEach((b) => { b.hidden = ![...b.querySelectorAll('article.ev')].some((a) => !a.hidden); });
    const parts = [];
    if (state.pref !== 'all') parts.push(`pref=${state.pref}`);
    if (state.kind !== 'all') parts.push(`kind=${state.kind}`);
    try { history.replaceState(null, '', parts.length ? `#${parts.join('&')}` : location.pathname); } catch { /* 履歴を触れない環境では、そのまま */ }
  };
  navs.forEach((n) => n.querySelectorAll('.af-chip').forEach((c) => c.addEventListener('click', () => {
    if (c.dataset.pref !== undefined) state.pref = c.dataset.pref; else state.kind = c.dataset.kind;
    apply();
  })));
  const pm = /[#&]pref=(\d{2})/.exec(location.hash);
  const km = /[#&]kind=([a-z]+)/.exec(location.hash);
  if (pm && navs.some((n) => n.querySelector(`[data-pref="${pm[1]}"]`))) state.pref = pm[1];
  if (km && navs.some((n) => n.querySelector(`[data-kind="${km[1]}"]`))) state.kind = km[1];
  if (state.pref !== 'all' || state.kind !== 'all') apply();
})();
