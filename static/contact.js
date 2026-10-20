// お問い合わせフォーム。/api/contact に、種類・内容・任意の名前とメールだけを送る。?cat=remove のように開くと、種類を選んだ状態で始まる
(() => {
  const form = document.querySelector('form.contact-form');
  if (!form) return;
  const ja = form.dataset.lang === 'ja';
  const msg = form.querySelector('.rv-st-msg');
  const sel = form.querySelector('select[name=category]');
  const pre = new URLSearchParams(location.search).get('cat');
  if (pre && [...sel.options].some((o) => o.value === pre)) sel.value = pre;
  const t0 = Date.now();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const message = String(fd.get('message') || '').trim();
    if (!message) { msg.textContent = ja ? '内容を入れてください。' : 'Please write a message.'; return; }
    const btn = form.querySelector('button');
    btn.disabled = true;
    msg.textContent = '';
    try {
      const r = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: fd.get('category'), name: fd.get('name') || '', email: fd.get('email') || '', message, website: fd.get('website') || '', t: Date.now() - t0 }),
      });
      if (r.ok) { form.reset(); msg.textContent = ja ? '送信しました。内容を確かめて、必要な場合はご返信します。ありがとうございます。' : 'Thank you. We will check your message and reply if needed.'; }
      else msg.textContent = ja ? '送信できませんでした。時間をおいて、もう一度お試しください。' : 'Could not send. Please try again later.';
    } catch {
      msg.textContent = ja ? '送信できませんでした。通信を確かめて、もう一度お試しください。' : 'Could not send. Check your connection and try again.';
    }
    btn.disabled = false;
  });
})();
