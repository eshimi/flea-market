// HERO の写真。アクセスごとに、写真をランダムに選ぶ。同じ人（同じブラウザ）には、前に見た写真を出す（ブラウザに保存）。点を押すと、その写真に切り替わり、それを覚える
(() => {
  const photos = [...document.querySelectorAll('.hero2-photo img.hp')];
  const dots = [...document.querySelectorAll('.hero2-dots button')];
  if (photos.length < 2 || dots.length !== photos.length) return;
  const KEY = 'fm-hero-photo';
  const show = (i) => {
    photos.forEach((p, k) => { p.hidden = k !== i; });
    dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === i)));
    try { localStorage.setItem(KEY, String(i)); } catch { /* 保存できない環境では、このアクセスだけ */ }
  };
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* 読めない環境では、ランダムに選ぶ */ }
  const idx = saved !== null && Number(saved) < photos.length ? Number(saved) : Math.floor(Math.random() * photos.length);
  show(idx);
  dots.forEach((d, k) => d.addEventListener('click', () => show(k)));
})();
