// HERO の写真。ページを開くたびに、3枚からランダムに選ぶ（前回と同じ写真は続けて出さない）。点を押すと、その写真に切り替わる（そのアクセスだけ）
(() => {
  const photos = [...document.querySelectorAll('.hero2-photo img.hp')];
  const dots = [...document.querySelectorAll('.hero2-dots button')];
  if (photos.length < 2 || dots.length !== photos.length) return;
  const KEY = 'fm-hero-last';
  const show = (i) => {
    photos.forEach((p, k) => { p.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
  };
  let last = -1;
  try { last = Number(sessionStorage.getItem(KEY)); } catch { /* 読めない環境では、前回との重複を避けない */ }
  const pool = photos.map((_, k) => k).filter((k) => k !== last);
  const idx = pool[Math.floor(Math.random() * pool.length)];
  try { sessionStorage.setItem(KEY, String(idx)); } catch { /* 保存できない環境では、このアクセスだけ */ }
  show(idx);
  dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
})();
