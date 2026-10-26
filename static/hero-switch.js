// HERO の写真の切替（点）。開いたときの1枚は、ページの中の小さな script が選んで読む（scripts/lib/home-view.mjs の HERO_PICK_JS）。
// 点を押すと、その写真を読んで、切り替える（そのアクセスだけ）
(() => {
  const photos = [...document.querySelectorAll('.hero2-photo img.hp')];
  const dots = [...document.querySelectorAll('.hero2-dots button')];
  if (photos.length < 2 || dots.length !== photos.length) return;
  const load = (i) => {
    const a = photos[i];
    if (a.getAttribute('src')) return;
    a.srcset = a.getAttribute('data-srcset');
    a.sizes = '100vw';
    a.src = a.getAttribute('data-src');
  };
  const show = (i) => {
    load(i);
    photos.forEach((p, k) => { p.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
  };
  const cur = photos.findIndex((p) => !p.hidden);
  show(cur < 0 ? 0 : cur);
  dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
})();
