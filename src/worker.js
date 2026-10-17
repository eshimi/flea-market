// 静的ファイル（dist/）を配る。/api/* は、今後の機能（保存・掲載申込みなど）のための場所
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/health') return Response.json({ ok: true });
      return Response.json({ error: 'not found' }, { status: 404 });
    }
    const res = await env.ASSETS.fetch(request);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) out.headers.set(k, v);
    if (url.pathname === '/events.json') out.headers.set('Cache-Control', 'public, max-age=600');
    return out;
  },
};
