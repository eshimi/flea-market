import { handleVotes, SpotVotes } from './votes.js';
import { handleReviews, ReviewGate } from './reviews.js';
export { SpotVotes, ReviewGate };

// 静的ファイル（dist/）を配る。/api/* は、今後の機能（保存・掲載申込みなど）のための場所
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

// 気象庁の予報 JSON を、府県予報区コード（6桁）で中継する。出典は気象庁。30分キャッシュ
export async function weather(code, fetchImpl = fetch, cache = typeof caches !== 'undefined' ? caches.default : null) {
  if (!/^\d{6}$/.test(code)) return Response.json({ error: 'bad code' }, { status: 400 });
  const url = `https://www.jma.go.jp/bosai/forecast/data/forecast/${code}.json`;
  const key = new Request(url);
  const hit = cache && (await cache.match(key));
  if (hit) return hit;
  let res;
  try { res = await fetchImpl(url, { headers: { 'User-Agent': 'FleaMarketJP/1.0 (+https://streetbazaars.jp)' } }); } catch { return Response.json({ error: 'upstream' }, { status: 502 }); }
  if (!res.ok) return Response.json({ error: 'upstream' }, { status: res.status === 404 ? 404 : 502 });
  const out = new Response(await res.text(), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=1800' } });
  if (cache) await cache.put(key, out.clone());
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/health') return Response.json({ ok: true });
      const m = /^\/api\/weather\/(\d+)$/.exec(url.pathname);
      if (m) return weather(m[1]);
      const v = /^\/api\/votes\/([a-z0-9-]+)$/.exec(url.pathname);
      if (v) return handleVotes(request, env, v[1]);
      const r = /^\/api\/reviews\/([a-z0-9-]+)$/.exec(url.pathname);
      if (r) return handleReviews(request, env, r[1]);
      return Response.json({ error: 'not found' }, { status: 404 });
    }
    // 以前の英語のトップ（/en/）は、英語が既定になったので / へ
    if (url.pathname === '/en/' || url.pathname === '/en') return Response.redirect(`${url.origin}/${url.search}`, 301);
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    if (url.pathname === '/events.json') out.headers.set('Cache-Control', 'public, max-age=600');
    return out;
  },
};
