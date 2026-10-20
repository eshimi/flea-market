// HERO の写真を切り替える（点を押すと、その写真に入れ替わる）。写真が1枚だけのときは何もしない
(() => {
  const photos = [...document.querySelectorAll('.hero2-photo img.hp')];
  const dots = [...document.querySelectorAll('.hero2-dots button')];
  if (photos.length < 2 || dots.length !== photos.length) return;
  const show = (i) => {
    photos.forEach((p, k) => { p.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
  };
  dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
})();
