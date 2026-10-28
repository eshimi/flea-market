// スポット（会場）のワンクリック・アンケート。保存は Durable Object（会場ごとに1つ）。
// 選択肢は中立的なものだけ（「よくない」は置かない）。個人情報は集めない：
// 重複の防止は、ブラウザの匿名 ID（localStorage の乱数）と、IP から作った識別できないハッシュ（1時間あたりの回数制限だけに使う）。
export const CHOICES = ['want', 'been', 'again', 'crowded', 'finds'];
export const RATE_LIMIT = 10; // 1つの IP（のハッシュ）が、1つの会場に対して、1時間にできる操作の数
const HOUR = 3600 * 1000;

const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });

export class SpotVotes {
  constructor(state) {
    this.state = state;
  }

  async counts() {
    const out = {};
    for (const c of CHOICES) out[c] = (await this.state.storage.get(`c:${c}`)) || 0;
    return out;
  }

  // Worker から内部で呼ぶ。GET: 集計。POST: { voter, ip, choice, on }
  async fetch(request) {
    if (request.method === 'GET') return json({ counts: await this.counts() });
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    const { voter, ip, choice, on } = await request.json();
    if (!CHOICES.includes(choice) || !/^[0-9a-f-]{16,64}$/.test(voter || '')) return json({ error: 'bad request' }, 400);
    // 回数制限（IP のハッシュごと）
    const now = Date.now();
    const rk = `r:${ip}`;
    const log = ((await this.state.storage.get(rk)) || []).filter((t) => now - t < HOUR);
    if (log.length >= RATE_LIMIT) return json({ error: 'rate limit' }, 429);
    log.push(now);
    await this.state.storage.put(rk, log);
    // 1人（匿名 ID）が、同じ選択肢に入れられるのは1票。もう一度押すと取り消し
    const vk = `v:${voter}`;
    const mine = new Set((await this.state.storage.get(vk)) || []);
    const had = mine.has(choice);
    if (on && !had) {
      mine.add(choice);
      await this.state.storage.put(`c:${choice}`, ((await this.state.storage.get(`c:${choice}`)) || 0) + 1);
    } else if (!on && had) {
      mine.delete(choice);
      await this.state.storage.put(`c:${choice}`, Math.max(0, ((await this.state.storage.get(`c:${choice}`)) || 0) - 1));
    }
    await this.state.storage.put(vk, [...mine]);
    return json({ counts: await this.counts(), mine: [...mine] });
  }
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 会場の id（/spot-ids.json。ビルドで作る）。存在しない id では Durable Object を作らない
let idsCache = { at: 0, ids: null };
export async function knownSpot(env, id) {
  if (!idsCache.ids || Date.now() - idsCache.at > 10 * 60 * 1000) {
    try {
      const get = async (name) => { const r = await env.ASSETS.fetch(new Request(`https://assets.local/${name}`)); return r.ok ? await r.json() : []; };
      idsCache = { at: Date.now(), ids: new Set(await get('spot-ids.json')), series: new Set(await get('series-ids.json')) };
    } catch { return false; }
  }
  return idsCache.ids.has(id);
}
// 開催（シリーズ）の id。会場の id と重なるときは会場が優先
export async function knownSeries(env, id) {
  await knownSpot(env, id);
  return Boolean(idsCache.series?.has(id));
}
export const resetIdsCache = () => { idsCache = { at: 0, ids: null }; };

async function verifyTurnstile(env, token, ip, fetchImpl) {
  if (!env.TURNSTILE_SECRET) return true; // 未設定の間は使わない
  if (!token) return false;
  try {
    const r = await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token, remoteip: ip || '' }) });
    return (await r.json()).success === true;
  } catch { return false; }
}

// /api/votes/<会場id>
export async function handleVotes(request, env, id, fetchImpl = fetch) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id) || id.length > 80) return json({ error: 'not found' }, 404);
  const isSpot = await knownSpot(env, id);
  if (!isSpot && !(await knownSeries(env, id))) return json({ error: 'not found' }, 404);
  // 会場と開催は、別の Durable Object（名前の前に s: を付ける）
  const stub = env.SPOT_VOTES.get(env.SPOT_VOTES.idFromName(isSpot ? id : `s:${id}`));
  if (request.method === 'GET') {
    const r = await stub.fetch('https://do/', { method: 'GET' });
    return json((await r.json()), 200, { 'Cache-Control': 'public, max-age=20' });
  }
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  // 同じサイトからの送信だけ受ける
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json({ error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'type' }, 415);
  const text = await request.text();
  if (text.length > 600) return json({ error: 'too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
  // ボット対策：ハニーポット（人には見えない欄）が埋まっている、ページを開いてから1.5秒たっていない
  if (body.website || !(Number(body.t) >= 1500)) return json({ error: 'rejected' }, 400);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  if (!(await verifyTurnstile(env, body.token, ip, fetchImpl))) return json({ error: 'challenge' }, 403);
  const ipHash = (await sha256(`${env.VOTE_SALT || 'flea-market-jp'}|${ip}|${id}`)).slice(0, 32);
  const r = await stub.fetch('https://do/', { method: 'POST', body: JSON.stringify({ voter: String(body.voter || ''), ip: ipHash, choice: body.choice, on: body.on !== false }) });
  return new Response(r.body, { status: r.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
