// フリマ（シリーズ）ごとの「評価・情報提供」。書き込みはすぐ公開し、利用者が「不適切」と通報したら、
// 1回で非公開（reported）にして、管理者の判断を待つ。保存は Durable Object（ReviewStore。全シリーズで1つ）。
//   GET  /api/reviews/<シリーズ id>                 公開中の書き込み
//   POST /api/reviews/<シリーズ id>                 書き込む（★1〜5・コメント・訪れた日）
//   POST /api/reviews/<シリーズ id>/<書き込み id>/report  通報（1回で非公開）
//   GET  /api/admin/reviews?status=reported|public|removed|all   管理（ADMIN_TOKEN が要る）
//   POST /api/admin/reviews/<シリーズ id>/<書き込み id>  { action: restore|remove|delete|edit, comment?, stars? }
// 個人情報（氏名・連絡先）は集めない。IP は、回数制限のためにハッシュにしてだけ使う（ReviewGate）。
// サイト専用メール（EMAIL・MAIL_TO・MAIL_FROM）が設定されていれば、書き込みと通報を管理者へ知らせる（なくても動く）。
export const STARS = [1, 2, 3, 4, 5];
export const COMMENT_MAX = 600;
export const LIMIT_PER_HOUR = 3; // 1つの IP（のハッシュ）が、1つのフリマに書き込める数（1時間）
export const REPORT_LIMIT_PER_HOUR = 10; // 1つの IP（のハッシュ）が通報できる数（1時間）
const HOUR = 3600 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// 書き込みに入れさせないもの：メールアドレス・URL・電話番号らしき文字（個人情報と宣伝を防ぐ）
const BLOCKED_RE = /@|https?:\/\/|www\.|\d{2,4}-\d{2,4}-\d{3,4}/i;

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

// 入力の検査（純粋な関数。テストできる）
export function validateReview(body) {
  if (!body || typeof body !== 'object') return { error: 'bad request' };
  // ボット対策：人には見えない欄（website）が埋まっている、ページを開いてから1.5秒たっていない
  if (body.website || !(Number(body.t) >= 1500)) return { error: 'rejected' };
  const stars = Number(body.stars);
  if (!STARS.includes(stars)) return { error: 'stars' };
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (!comment || comment.length > COMMENT_MAX) return { error: 'comment' };
  if (BLOCKED_RE.test(comment)) return { error: 'blocked' };
  const visitedOn = typeof body.visitedOn === 'string' ? body.visitedOn.trim() : '';
  if (visitedOn && !DATE_RE.test(visitedOn)) return { error: 'date' };
  return { value: { stars, comment, visitedOn: visitedOn || null } };
}

// 公開してよい項目だけ
const publicView = (r) => ({ id: r.id, stars: r.stars, comment: r.comment, visitedOn: r.visitedOn, createdAt: r.createdAt });

// 書き込みの保存。Worker から内部で呼ぶ（POST { op, ... }）
export class ReviewStore {
  constructor(state) {
    this.state = state;
  }

  async all(prefix) {
    return [...(await this.state.storage.list({ prefix })).values()];
  }

  async fetch(request) {
    const b = await request.json();
    const st = this.state.storage;
    const key = (series, id) => `rv:${series}:${id}`;
    if (b.op === 'list') {
      const list = (await this.all(`rv:${b.series}:`)).filter((r) => r.status === 'public').sort((x, y) => y.createdAt.localeCompare(x.createdAt));
      return json({ reviews: list.map(publicView) });
    }
    if (b.op === 'add') {
      const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const r = { id, series: b.series, stars: b.stars, comment: b.comment, visitedOn: b.visitedOn, createdAt: new Date().toISOString(), status: 'public', reports: 0 };
      await st.put(key(b.series, id), r);
      return json({ review: publicView(r) });
    }
    if (b.op === 'report') {
      const r = await st.get(key(b.series, b.id));
      if (!r) return json({ error: 'not found' }, 404);
      r.reports = (r.reports || 0) + 1;
      r.reportedAt = new Date().toISOString();
      r.reportReason = String(b.reason || '').slice(0, 200);
      if (r.status === 'public') r.status = 'reported';
      await st.put(key(b.series, b.id), r);
      return json({ ok: true, status: r.status, review: r });
    }
    if (b.op === 'admin-list') {
      const list = (await this.all('rv:')).filter((r) => b.status === 'all' || r.status === (b.status || 'reported'));
      return json({ reviews: list.sort((x, y) => (y.reportedAt || y.createdAt).localeCompare(x.reportedAt || x.createdAt)) });
    }
    if (b.op === 'admin-update') {
      const k = key(b.series, b.id);
      const r = await st.get(k);
      if (!r) return json({ error: 'not found' }, 404);
      if (b.action === 'delete') { await st.delete(k); return json({ ok: true, deleted: true }); }
      if (b.action === 'restore') r.status = 'public';
      else if (b.action === 'remove') r.status = 'removed';
      else if (b.action === 'edit') {
        if (typeof b.comment === 'string') {
          const c = b.comment.trim();
          if (!c || c.length > COMMENT_MAX) return json({ error: 'comment' }, 400);
          r.comment = c;
        }
        if (b.stars !== undefined) {
          if (!STARS.includes(Number(b.stars))) return json({ error: 'stars' }, 400);
          r.stars = Number(b.stars);
        }
        r.editedAt = new Date().toISOString();
      } else return json({ error: 'action' }, 400);
      r.decidedAt = new Date().toISOString();
      await st.put(k, r);
      return json({ ok: true, review: r });
    }
    return json({ error: 'op' }, 400);
  }
}

// 回数制限：キーごと（IP のハッシュ＋フリマ、または IP のハッシュ＋「通報」）に、1時間の上限まで
export class ReviewGate {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const limit = Number(new URL(request.url).searchParams.get('limit')) || LIMIT_PER_HOUR;
    const now = Date.now();
    const log = ((await this.state.storage.get('log')) || []).filter((t) => now - t < HOUR);
    if (log.length >= limit) return json({ allowed: false }, 429);
    log.push(now);
    await this.state.storage.put('log', log);
    return json({ allowed: true });
  }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// シリーズの id（/series-ids.json。ビルドで作る）。存在しない id では何もしない
let idsCache = { at: 0, ids: null };
async function knownSeries(env, id) {
  if (!idsCache.ids || Date.now() - idsCache.at > 10 * 60 * 1000) {
    try {
      const r = await env.ASSETS.fetch(new Request('https://assets.local/series-ids.json'));
      idsCache = { at: Date.now(), ids: new Set(r.ok ? await r.json() : []) };
    } catch { return false; }
  }
  return idsCache.ids.has(id);
}
export const resetSeriesCache = () => { idsCache = { at: 0, ids: null }; };

const store = (env) => env.REVIEW_STORE.get(env.REVIEW_STORE.idFromName('all'));
const call = async (env, body) => {
  const r = await store(env).fetch('https://do/', { method: 'POST', body: JSON.stringify(body) });
  return { status: r.status, data: await r.json() };
};

async function gate(env, key, limit) {
  const g = env.REVIEW_GATE.get(env.REVIEW_GATE.idFromName(key.slice(0, 32)));
  return (await g.fetch(`https://do/?limit=${limit}`)).ok;
}

// 管理者へのお知らせ（メールが設定されているときだけ。失敗しても書き込み・通報は止めない）
async function notify(env, subject, text) {
  if (!env.EMAIL || !env.MAIL_TO || !env.MAIL_FROM) return;
  try { await env.EMAIL.send({ to: env.MAIL_TO, from: env.MAIL_FROM, subject, text }); } catch { /* 知らせられなくても続ける */ }
}

const stars = (n) => `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;

async function readBody(request, max) {
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return { error: json({ error: 'origin' }, 403) };
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return { error: json({ error: 'type' }, 415) };
  const text = await request.text();
  if (text.length > max) return { error: json({ error: 'too large' }, 413) };
  try { return { body: JSON.parse(text) }; } catch { return { error: json({ error: 'bad json' }, 400) }; }
}

export async function handleReviews(request, env, id, reviewId = null) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 120 || !(await knownSeries(env, id))) return json({ error: 'not found' }, 404);
  if (!env.REVIEW_STORE) return json({ error: 'not ready' }, 503);
  const host = new URL(request.url).host;
  const page = `https://${host}/e/${id}/`;
  // 通報
  if (reviewId) {
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    if (!/^[a-z0-9]{4,20}$/.test(reviewId)) return json({ error: 'not found' }, 404);
    const { body, error } = await readBody(request, 1000);
    if (error) return error;
    if (body.website) return json({ error: 'rejected' }, 400);
    const ip = request.headers.get('CF-Connecting-IP') || '';
    if (!(await gate(env, await sha256(`${env.VOTE_SALT || 'flea-market-jp'}|report|${ip}`), REPORT_LIMIT_PER_HOUR))) return json({ error: 'rate limit' }, 429);
    const r = await call(env, { op: 'report', series: id, id: reviewId, reason: body.reason });
    if (r.status !== 200) return json(r.data, r.status);
    const rv = r.data.review;
    await notify(env, `[Flea Market JP] 不適切の通報：${id}`, `通報がありました。この書き込みは非公開になっています。管理画面で判断してください。\n\nフリマのページ：${page}\n評価：${stars(rv.stars)}\n通報の理由：${rv.reportReason || '（記入なし）'}\n\n${rv.comment}\n\n管理画面：https://${host}/admin/reviews`);
    return json({ ok: true });
  }
  if (request.method === 'GET') {
    const r = await call(env, { op: 'list', series: id });
    return json(r.data, r.status, { 'Cache-Control': 'no-store' });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const { body, error } = await readBody(request, 2000);
  if (error) return error;
  const v = validateReview(body);
  if (v.error) return json({ error: v.error }, 400);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await gate(env, await sha256(`${env.VOTE_SALT || 'flea-market-jp'}|${ip}|${id}`), LIMIT_PER_HOUR))) return json({ error: 'rate limit' }, 429);
  const r = await call(env, { op: 'add', series: id, ...v.value });
  await notify(env, `[Flea Market JP] 新しい評価：${id}`, `新しい書き込みが公開されました。\n\nフリマのページ：${page}\n評価：${stars(v.value.stars)}\n訪れた日：${v.value.visitedOn || '未記入'}\n\n${v.value.comment}\n\n管理画面：https://${host}/admin/reviews`);
  return json(r.data, r.status);
}

// 時間が一定の比較（トークンの推測を防ぐ）
function sameToken(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export async function handleAdminReviews(request, env, series = null, reviewId = null) {
  if (!env.ADMIN_TOKEN || !env.REVIEW_STORE) return json({ error: 'not ready' }, 503);
  const auth = request.headers.get('Authorization') || '';
  if (!sameToken(auth.replace(/^Bearer\s+/i, ''), env.ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);
  if (request.method === 'GET' && !series) {
    const status = new URL(request.url).searchParams.get('status') || 'reported';
    if (!['reported', 'public', 'removed', 'all'].includes(status)) return json({ error: 'status' }, 400);
    const r = await call(env, { op: 'admin-list', status });
    return json(r.data, r.status);
  }
  if (request.method === 'POST' && series && reviewId) {
    let body;
    try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
    if (!['restore', 'remove', 'delete', 'edit'].includes(body.action)) return json({ error: 'action' }, 400);
    const r = await call(env, { op: 'admin-update', series, id: reviewId, action: body.action, comment: body.comment, stars: body.stars });
    return json(r.data, r.status);
  }
  return json({ error: 'method' }, 405);
}
