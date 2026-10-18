// ブログ一覧：カテゴリで絞り込む（#cat=… で直接開ける）
(() => {
  const chips = [...document.querySelectorAll('.bl-chip')];
  const rows = [...document.querySelectorAll('.bl-row')];
  if (!chips.length) return;
  const apply = (cat) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === cat)));
    rows.forEach((r) => { r.hidden = cat !== 'all' && r.dataset.cat !== cat; });
  };
  chips.forEach((c) => c.addEventListener('click', () => { apply(c.dataset.cat); try { history.replaceState(null, '', c.dataset.cat === 'all' ? location.pathname : `#cat=${c.dataset.cat}`); } catch { /* 履歴を触れない環境では、そのまま */ } }));
  const m = /#cat=([a-z]+)/.exec(location.hash);
  if (m && chips.some((c) => c.dataset.cat === m[1])) apply(m[1]);
})();
