// 開催詳細の地図：ボタンを押したときだけ Google マップの埋め込みを読み込む（押すまで、閲覧者の情報を Google に送らない）
document.querySelectorAll('.ev-map').forEach((box) => {
  const btn = box.querySelector('.map-show');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = box.dataset.src;
    f.title = box.dataset.title || 'Map';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    f.setAttribute('allowfullscreen', '');
    box.replaceChildren(f);
  });
});
