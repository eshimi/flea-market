// トップの「行きたい／出店したい」の切り替え。選んだ内容は localStorage に覚える（?aud=shop でも指定できる）
(() => {
  const KEY = 'fmjp:aud';
  const btns = document.querySelectorAll('[data-aud]');
  const secs = document.querySelectorAll('[data-for]');
  const set = (aud) => {
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.aud === aud)));
    secs.forEach((s) => { s.hidden = s.dataset.for !== aud; });
    try { localStorage.setItem(KEY, aud); } catch {}
  };
  btns.forEach((b) => b.addEventListener('click', () => set(b.dataset.aud)));
  let first = new URLSearchParams(location.search).get('aud');
  if (!first) try { first = localStorage.getItem(KEY); } catch {}
  if (first === 'shop' || first === 'visit') set(first);
})();
