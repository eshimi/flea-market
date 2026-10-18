// トップ：カレンダーの今日を見える位置へ／注目マーケットの「次へ」ボタン（はみ出しがあるときだけ表示）
(() => {
  const cur = document.querySelector('.cal-days [aria-current="date"]');
  const days = document.querySelector('.cal-days');
  if (cur && days) days.scrollLeft = Math.max(0, cur.offsetLeft - days.offsetLeft - 4);
  const row = document.querySelector('.mc-row');
  const next = document.querySelector('.mc-next');
  if (!row || !next) return;
  const sync = () => {
    const more = row.scrollWidth - row.clientWidth - row.scrollLeft > 8;
    next.hidden = !more;
  };
  next.addEventListener('click', () => row.scrollBy({ left: Math.round(row.clientWidth * 0.8), behavior: 'smooth' }));
  row.addEventListener('scroll', sync, { passive: true });
  addEventListener('resize', sync);
  sync();
})();
