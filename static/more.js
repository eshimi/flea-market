// スマホ幅だけ、長い開催の一覧を12件ずつ「もっと見る」で開く（HTML には全件が入っている。CSS が @media で、スマホのときだけ隠す。パソコン幅では何も変わらない）
(() => {
  const STEP = 12;
  const ja = (document.documentElement.lang || '').startsWith('ja');
  const lists = [...document.querySelectorAll('.ev-list')].filter((l) => l.querySelectorAll(':scope > article.ev').length > STEP);
  if (!lists.length) return;
  const reveal = () => {
    document.querySelectorAll('.ev-more').forEach((a) => a.classList.remove('ev-more'));
    document.querySelectorAll('.ev-more-btn').forEach((b) => b.remove());
  };
  lists.forEach((list) => {
    const cards = [...list.querySelectorAll(':scope > article.ev')];
    cards.slice(STEP).forEach((a) => a.classList.add('ev-more'));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ev-more-btn';
    const left = () => list.querySelectorAll(':scope > article.ev.ev-more').length;
    const label = () => (ja ? `もっと見る（あと${left()}件）` : `Show more (${left()} more)`);
    btn.textContent = label();
    btn.addEventListener('click', () => {
      cards.filter((a) => a.classList.contains('ev-more')).slice(0, STEP).forEach((a) => a.classList.remove('ev-more'));
      if (left()) btn.textContent = label(); else btn.remove();
    });
    list.after(btn);
  });
  // 地域の絞り込みを使うときは、隠れていた件も含めて絞り込めるように、すべて開く
  document.querySelectorAll('.af-chip').forEach((c) => c.addEventListener('click', reveal));
  if (/#pref=\d{2}/.test(location.hash)) reveal();
})();
