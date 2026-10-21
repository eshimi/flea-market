// 評価の管理画面。/api/admin/reviews を ADMIN_TOKEN つきで呼ぶ。トークンは sessionStorage（このタブの間だけ）
(() => {
  const $ = (s) => document.querySelector(s);
  const KEY = 'fm-admin-token';
  const LABEL = { public: '公開中', reported: '通報あり（非表示）', removed: '非公開' };
  let status = 'reported';
  const store = (v) => { try { if (v === undefined) return sessionStorage.getItem(KEY) || ''; if (v) sessionStorage.setItem(KEY, v); else sessionStorage.removeItem(KEY); } catch { /* 保存できない環境 */ } return ''; };
  let token = store();
  const msg = (t) => { $('#msg').textContent = t; };
  const api = (path, opts = {}) => fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

  async function load() {
    msg('読み込み中…');
    const r = await api(`/api/admin/reviews?status=${status}`);
    if (r.status === 401) { msg('トークンが違います。'); store(null); token = ''; return; }
    if (r.status === 503) { msg('管理用トークン（ADMIN_TOKEN）がサーバーに設定されていません。'); return; }
    if (!r.ok) { msg('読み込めませんでした。'); return; }
    const { reviews } = await r.json();
    $('#tabs').hidden = false;
    const list = $('#list');
    list.textContent = '';
    msg(`${reviews.length} 件`);
    for (const rv of reviews) list.append(card(rv));
  }

  function card(rv) {
    const ta = el('textarea', { rows: 3, value: rv.comment, maxLength: 600 });
    const sel = el('select');
    for (let n = 1; n <= 5; n++) sel.append(el('option', { value: n, textContent: `★${n}`, selected: n === rv.stars }));
    const act = async (action, extra = {}) => {
      if (action === 'delete' && !confirm('この書き込みを完全に削除しますか？（元に戻せません）')) return;
      const r = await api(`/api/admin/reviews/${encodeURIComponent(rv.series)}/${encodeURIComponent(rv.id)}`, { method: 'POST', body: JSON.stringify({ action, ...extra }) });
      msg(r.ok ? '更新しました。' : `更新できませんでした（${r.status}）。`);
      if (r.ok) load();
    };
    return el('div', { className: 'item' },
      el('div', { className: 'meta' },
        el('span', { className: `st ${rv.status}`, textContent: LABEL[rv.status] || rv.status }),
        el('a', { href: `/ja/e/${rv.series}/#reviews`, target: '_blank', rel: 'noopener', textContent: rv.series }),
        el('span', { textContent: `投稿：${rv.createdAt.slice(0, 16).replace('T', ' ')}` }),
        ...(rv.visitedOn ? [el('span', { textContent: `訪れた日：${rv.visitedOn}` })] : []),
        ...(rv.reports ? [el('span', { textContent: `通報 ${rv.reports} 回${rv.reportReason ? `（理由：${rv.reportReason}）` : ''}` })] : []),
        ...(rv.editedAt ? [el('span', { textContent: '編集済み' })] : [])),
      ta,
      el('div', { className: 'acts' },
        sel,
        el('button', { type: 'button', textContent: '編集を保存', onclick: () => act('edit', { comment: ta.value, stars: Number(sel.value) }) }),
        ...(rv.status !== 'public' ? [el('button', { type: 'button', className: 'pri', textContent: '公開に戻す', onclick: () => act('restore') })] : []),
        ...(rv.status !== 'removed' ? [el('button', { type: 'button', textContent: '非公開にする', onclick: () => act('remove') })] : []),
        el('button', { type: 'button', className: 'danger', textContent: '完全に削除', onclick: () => act('delete') })));
  }

  $('#login').addEventListener('submit', (e) => {
    e.preventDefault();
    token = $('#token').value.trim();
    store(token);
    if (token) load();
  });
  $('#tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-s]');
    if (!b) return;
    status = b.dataset.s;
    for (const x of $('#tabs').querySelectorAll('button')) x.classList.toggle('on', x === b);
    load();
  });
  if (token) load();
})();
