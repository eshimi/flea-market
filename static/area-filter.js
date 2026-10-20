// 地域で絞り込む（日付・今週末の一覧）。都道府県のボタンを押すと、その県の開催だけを出す（#pref=13 で直接開ける）
(() => {
  const nav = document.querySelector('.af-chips');
  if (!nav) return;
  const chips = [...nav.querySelectorAll('.af-chip')];
  const cards = [...document.querySelectorAll('article.ev[data-pref]')];
  const apply = (pref) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.pref === pref)));
    cards.forEach((a) => { a.hidden = pref !== 'all' && a.dataset.pref !== pref; });
    // 中身が無くなった月の見出しは隠す
    document.querySelectorAll('.month-block').forEach((b) => { b.hidden = ![...b.querySelectorAll('article.ev')].some((a) => !a.hidden); });
  };
  chips.forEach((c) => c.addEventListener('click', () => { apply(c.dataset.pref); try { history.replaceState(null, '', c.dataset.pref === 'all' ? location.pathname : `#pref=${c.dataset.pref}`); } catch { /* 履歴を触れない環境では、そのまま */ } }));
  const m = /#pref=(\d{2})/.exec(location.hash);
  if (m && chips.some((c) => c.dataset.pref === m[1])) apply(m[1]);
})();
