// 評価・情報提供フォーム。/api/reviews/<シリーズ id> に、評価・コメント・訪れた日だけを送る（個人情報は集めない）
(() => {
  document.querySelectorAll('form.rv-form').forEach((form) => {
    const id = form.dataset.series;
    const ja = form.dataset.lang === 'ja';
    const msg = form.querySelector('.rv-st-msg');
    const t0 = Date.now();
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const stars = fd.get('stars');
      const comment = String(fd.get('comment') || '').trim();
      if (!stars || !comment) { msg.textContent = ja ? '評価とコメントを入れてください。' : 'Please choose a rating and write a comment.'; return; }
      const btn = form.querySelector('button');
      btn.disabled = true;
      msg.textContent = '';
      try {
        const r = await fetch(`/api/reviews/${encodeURIComponent(id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stars: Number(stars), comment, visitedOn: fd.get('visitedOn') || '', website: fd.get('website') || '', t: Date.now() - t0 }),
        });
        if (r.ok) { form.reset(); msg.textContent = ja ? '送信しました。内容を確かめてから掲載します。ありがとうございます。' : 'Thank you. We will check the content before publishing it.'; }
        else msg.textContent = ja ? '送信できませんでした。時間をおいて、もう一度お試しください。' : 'Could not send. Please try again later.';
      } catch {
        msg.textContent = ja ? '送信できませんでした。通信を確かめて、もう一度お試しください。' : 'Could not send. Check your connection and try again.';
      }
      btn.disabled = false;
    });
  });
})();
