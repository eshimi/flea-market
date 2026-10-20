// HERO の写真を切り替える。6秒ごとに次の写真へ進み、点を押したら、その写真で止める（点を押すと、その写真に入れ替わる）。写真が1枚だけのときは何もしない
(() => {
  const photos = [...document.querySelectorAll('.hero2-photo img.hp')];
  const dots = [...document.querySelectorAll('.hero2-dots button')];
  if (photos.length < 2 || dots.length !== photos.length) return;
  let current = 0;
  let timer = null;
  const show = (i) => {
    current = i;
    photos.forEach((p, k) => { p.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  dots.forEach((d, k) => d.addEventListener('click', () => { stop(); show(k); }));
  // 動きを減らす設定のときは、自動では切り替えない
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timer = setInterval(() => show((current + 1) % photos.length), 6000);
  }
})();
