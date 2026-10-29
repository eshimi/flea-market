// トップの「今週末の開催」：地域で絞り込む。既定は東京（HTML の初期状態と同じ）。HTML には全件が入っていて、押すと、その地域の先頭6件を出す
(() => {
  const card = document.getElementById('wk-card');
  if (!card) return;
  const chips = [...card.querySelectorAll('.wk-chip')];
  const rows = [...card.querySelectorAll('.wk-row')];
  const empty = card.querySelector('.wk-empty');
  const all = document.getElementById('wk-all');
  const SHOW = 6;
  const apply = (pref) => {
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.pref === pref)));
    let n = 0;
    rows.forEach((r) => { const ok = (pref === 'all' || r.dataset.pref === pref) && n < SHOW; r.hidden = !ok; if (ok) n++; });
    if (empty) empty.hidden = n > 0;
    if (all) all.setAttribute('href', all.dataset.base + (pref === 'all' || all.dataset.base !== '/weekend/' ? '' : `#pref=${pref}`));
  };
  chips.forEach((c) => c.addEventListener('click', () => apply(c.dataset.pref)));
  const cur = chips.find((c) => c.getAttribute('aria-pressed') === 'true');
  if (cur) apply(cur.dataset.pref);
})();
