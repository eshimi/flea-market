// 日本語の名前・住所のコピーボタン。押すとクリップボードにコピーし、少しのあいだ「Copied」と出す
(() => {
  const copy = async (text) => {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return; }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { ta.remove(); }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('.copy-btn');
    if (!b) return;
    const label = b.dataset.label || (b.dataset.label = b.textContent);
    copy(b.dataset.copy || '').then(() => {
      b.textContent = b.dataset.done || 'Copied';
      b.classList.add('done');
      setTimeout(() => { b.textContent = label; b.classList.remove('done'); }, 1800);
    }).catch(() => { /* コピーできない環境では、何もしない */ });
  });
})();
