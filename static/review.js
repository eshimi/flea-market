// 評価・情報提供。/api/reviews/<シリーズ id> から公開中の書き込みを読み、投稿・通報する（個人情報は集めない）。
// 通報は1回で非表示になり、管理者が判断する。
(() => {
  const box = document.querySelector('section.rv[data-series]');
  if (!box) return;
  const id = box.dataset.series;
  const ja = box.dataset.lang === 'ja';
  const MIN = Number(box.dataset.min || 5);
  const list = box.querySelector('.rv-list');
  const sum = box.querySelector('.rv-sum');
  const form = box.querySelector('form.rv-form');
  const msg = form.querySelector('.rv-st-msg');
  const t0 = Date.now();
  const T = ja
    ? { none: 'まだ書き込みはありません。', few: (n) => `書き込みは ${n} 件です（平均は ${MIN} 件から表示します）。`, avg: (a, n) => `平均 ${a} / 5（${n} 件）`, visited: '訪れた日：', report: '不適切を通報', confirm: 'この書き込みを「不適切」として通報しますか？　すぐに非表示になり、管理者が判断します。', reason: '通報の理由（任意。200字まで）', reported: '通報を受け付けました。この書き込みは非表示になりました。', fail: '送信できませんでした。時間をおいて、もう一度お試しください。', posted: '投稿しました。ありがとうございます。', need: '評価とコメントを入れてください。', blocked: 'URL・メールアドレス・電話番号は書けません。', limit: '短い時間に送れる回数を超えました。時間をおいてお試しください。', load: '書き込みを読み込めませんでした。' }
    : { none: 'No reviews yet.', few: (n) => `${n} review${n === 1 ? '' : 's'} so far; the average appears from ${MIN}.`, avg: (a, n) => `Average ${a} / 5 (${n} reviews)`, visited: 'Visited on: ', report: 'Report as inappropriate', confirm: 'Report this post as inappropriate? It will be hidden at once, and we will review it.', reason: 'Reason (optional, up to 200 characters)', reported: 'Thank you. The post has been hidden for review.', fail: 'Could not send. Please try again later.', posted: 'Posted. Thank you.', need: 'Please choose a rating and write a comment.', blocked: 'URLs, email addresses and phone numbers are not allowed.', limit: 'Too many posts in a short time. Please try again later.', load: 'Could not load reviews.' };
  const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
  let items = [];

  const render = () => {
    list.textContent = '';
    for (const r of items) {
      const li = document.createElement('li');
      li.className = 'rv-item';
      const st = document.createElement('span');
      st.className = 'rv-st';
      st.textContent = stars(r.stars);
      st.setAttribute('aria-label', `${r.stars} / 5`);
      li.append(st);
      if (r.visitedOn) {
        const d = document.createElement('span');
        d.className = 'rv-date';
        d.textContent = ` ${T.visited}${r.visitedOn}`;
        li.append(d);
      }
      const p = document.createElement('p');
      p.textContent = r.comment;
      li.append(p);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rv-report';
      b.textContent = T.report;
      b.addEventListener('click', () => report(r, b));
      li.append(b);
      list.append(li);
    }
    const n = items.length;
    if (!n) sum.textContent = T.none;
    else if (n < MIN) sum.textContent = T.few(n);
    else {
      const a = (items.reduce((s, r) => s + r.stars, 0) / n).toFixed(1);
      sum.textContent = `${stars(Math.round(a))} ${T.avg(a, n)}`;
    }
  };

  const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  async function report(r, btn) {
    if (!confirm(T.confirm)) return;
    const reason = (prompt(T.reason) || '').slice(0, 200);
    btn.disabled = true;
    try {
      const res = await post(`/api/reviews/${encodeURIComponent(id)}/${encodeURIComponent(r.id)}/report`, { reason });
      if (res.ok) {
        items = items.filter((x) => x.id !== r.id);
        render();
        msg.textContent = T.reported;
      } else {
        btn.disabled = false;
        msg.textContent = res.status === 429 ? T.limit : T.fail;
      }
    } catch {
      btn.disabled = false;
      msg.textContent = T.fail;
    }
  }

  (async () => {
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error();
      items = (await res.json()).reviews || [];
      render();
    } catch {
      sum.textContent = T.load;
    }
  })();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const s = fd.get('stars');
    const comment = String(fd.get('comment') || '').trim();
    if (!s || !comment) { msg.textContent = T.need; return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    msg.textContent = '';
    try {
      const res = await post(`/api/reviews/${encodeURIComponent(id)}`, { stars: Number(s), comment, visitedOn: fd.get('visitedOn') || '', website: fd.get('website') || '', t: Date.now() - t0 });
      if (res.ok) {
        const { review } = await res.json();
        if (review) items.unshift(review);
        render();
        form.reset();
        msg.textContent = T.posted;
      } else {
        const err = (await res.json().catch(() => ({}))).error;
        msg.textContent = err === 'blocked' ? T.blocked : res.status === 429 ? T.limit : T.fail;
      }
    } catch {
      msg.textContent = T.fail;
    }
    btn.disabled = false;
  });
})();
