// フリマ（シリーズ）ごとの「評価・情報提供」フォーム。/api/reviews/<シリーズ id>
// 投稿は保存せず、サイト専用のメールアドレスへ届ける（EMAIL：Email Service の send_email バインディング）。
// 掲載は運営が内容を確かめてから data/reviews.json に書く。個人情報（氏名・連絡先）は集めない。
// IP は、回数制限のためにハッシュにしてだけ使う（Durable Object ReviewGate）。
export const STARS = [1, 2, 3, 4, 5];
export const COMMENT_MAX = 600;
export const LIMIT_PER_HOUR = 3; // 1つの IP（のハッシュ）が、1つのフリマに対して、1時間に送れる数
const HOUR = 3600 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// 入力の検査（純粋な関数。テストできる）
export function validateReview(body) {
  if (!body || typeof body !== 'object') return { error: 'bad request' };
  // ボット対策：人には見えない欄（website）が埋まっている、ページを開いてから1.5秒たっていない
  if (body.website || !(Number(body.t) >= 1500)) return { error: 'rejected' };
  const stars = Number(body.stars);
  if (!STARS.includes(stars)) return { error: 'stars' };
  const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
  if (!comment || comment.length > COMMENT_MAX) return { error: 'comment' };
  const visitedOn = typeof body.visitedOn === 'string' ? body.visitedOn.trim() : '';
  if (visitedOn && !DATE_RE.test(visitedOn)) return { error: 'date' };
  return { value: { stars, comment, visitedOn: visitedOn || null } };
}

// 回数制限：IP のハッシュ＋フリマごとに、1時間 LIMIT_PER_HOUR 回まで
export class ReviewGate {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    const now = Date.now();
    const log = ((await this.state.storage.get('log')) || []).filter((t) => now - t < HOUR);
    if (log.length >= LIMIT_PER_HOUR) return json({ allowed: false }, 429);
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

export async function handleReviews(request, env, id) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 120 || !(await knownSeries(env, id))) return json({ error: 'not found' }, 404);
  // 同じサイトからの送信だけ受ける
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json({ error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'type' }, 415);
  const text = await request.text();
  if (text.length > 2000) return json({ error: 'too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
  const v = validateReview(body);
  if (v.error) return json({ error: v.error }, 400);
  // 送る先と差出人が決まっていない間は受け付けない（準備中）
  if (!env.EMAIL || !env.MAIL_TO || !env.MAIL_FROM) return json({ error: 'not ready' }, 503);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const gateKey = await sha256(`${env.VOTE_SALT || 'flea-market-jp'}|${ip}|${id}`);
  const gate = env.REVIEW_GATE.get(env.REVIEW_GATE.idFromName(gateKey.slice(0, 32)));
  const allowed = await gate.fetch('https://do/');
  if (!allowed.ok) return json({ error: 'rate limit' }, 429);
  const { stars, comment, visitedOn } = v.value;
  const page = `https://${new URL(request.url).host}/e/${id}/`;
  try {
    await env.EMAIL.send({
      to: env.MAIL_TO,
      from: env.MAIL_FROM,
      subject: `[Flea Market JP] 評価・情報提供：${id}`,
      text: `フリマのページ：${page}\n評価：${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}（${stars}/5）\n訪れた日：${visitedOn || '未記入'}\n\n${comment}\n\n---\n掲載するときは data/reviews.json に書いてください（公開前に内容を確かめる）。`,
    });
  } catch {
    return json({ error: 'send failed' }, 502);
  }
  return json({ ok: true });
}
