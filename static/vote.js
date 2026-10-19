// スポットのワンクリック・アンケート。/api/votes/<会場id> に、匿名の ID と選択肢だけを送る（個人情報は集めない）
(() => {
  const box = document.querySelector('.poll');
  if (!box) return;
  const id = box.dataset.spot;
  const ja = box.dataset.lang === 'ja';
  const MIN = Number(box.dataset.min || 5);
  const status = box.querySelector('.poll-st');
  const btns = [...box.querySelectorAll('button[data-choice]')];
  const t0 = Date.now();
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; } return null; };
  let vid = store('fm_vid');
  if (!vid || !/^[0-9a-f-]{16,64}$/.test(vid)) {
    vid = (crypto.randomUUID ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join(''));
    store('fm_vid', vid);
  }
  let mine = new Set(JSON.parse(store(`fm_votes_${id}`) || '[]'));
  const msg = (text) => { status.textContent = text; };
  const render = (counts) => {
    const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;
    for (const b of btns) {
      const c = b.dataset.choice;
      b.setAttribute('aria-pressed', mine.has(c) ? 'true' : 'false');
      b.classList.toggle('on', mine.has(c));
      const n = b.querySelector('.n');
      n.textContent = counts && total >= MIN ? String(counts[c] || 0) : '';
    }
    if (counts) msg(total >= MIN ? (ja ? `${total} 件の回答があります（匿名）。` : `${total} anonymous responses.`) : (ja ? `まだ回答が少ないため、集計は ${MIN} 件から表示します。` : `Not enough responses yet; counts appear from ${MIN} responses.`));
  };
  const load = async () => {
    try { const r = await fetch(`/api/votes/${encodeURIComponent(id)}`); if (r.ok) render((await r.json()).counts); else render(null); } catch { render(null); }
  };
  const widget = box.dataset.turnstile;
  let token = '';
  if (widget) {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = () => window.turnstile && window.turnstile.render(box.querySelector('.poll-ts'), { sitekey: widget, size: 'compact', callback: (t) => { token = t; } });
    document.head.appendChild(s);
  }
  const hp = box.querySelector('input[name=website]');
  for (const b of btns) {
    b.addEventListener('click', async () => {
      const choice = b.dataset.choice;
      const on = !mine.has(choice);
      b.disabled = true;
      try {
        const r = await fetch(`/api/votes/${encodeURIComponent(id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ choice, on, voter: vid, t: Date.now() - t0, website: hp ? hp.value : '', token }) });
        if (r.ok) {
          const j = await r.json();
          mine = new Set(j.mine || []);
          store(`fm_votes_${id}`, JSON.stringify([...mine]));
          render(j.counts);
        } else if (r.status === 429) msg(ja ? '短い時間に押しすぎです。しばらくしてからお試しください。' : 'Too many clicks. Please try again later.');
        else if (r.status === 403 && widget) msg(ja ? '確認（チェック）をしてから、もう一度押してください。' : 'Please complete the check, then press again.');
        else msg(ja ? '送信できませんでした。時間をおいてお試しください。' : 'Could not send. Please try again later.');
      } catch { msg(ja ? '送信できませんでした。' : 'Could not send.'); }
      b.disabled = false;
    });
  }
  load();
})();
