// 以前の #pref=13 形式のリンクを、種類×都道府県の実URLへ送る
(() => {
  const m = /#pref=(\d{2})/.exec(location.hash);
  if (!m) return;
  const a = document.querySelector(`.af-links a[data-pref="${m[1]}"]`);
  if (a) location.replace(a.getAttribute('href'));
})();
