// 運営者への通知メール。/api/admin/mail（POST）。ADMIN_TOKEN が要る。
// 宛先は、設定の MAIL_TO（サイト専用のメールアドレス）に固定する（リクエストでは指定できない）。
// 使い道：毎週金曜に、Facebook グループへ貼る投稿文を、運営者へ送る（.github/workflows/facebook-weekly.yml）。
import { sameToken } from './reviews.js';

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function handleAdminMail(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  if (!env.ADMIN_TOKEN) return json({ error: 'not ready' }, 503);
  const auth = request.headers.get('Authorization') || '';
  if (!sameToken(auth.replace(/^Bearer\s+/i, ''), env.ADMIN_TOKEN)) return json({ error: 'unauthorized' }, 401);
  if (!env.EMAIL || !env.MAIL_TO || !env.MAIL_FROM) return json({ error: 'mail not ready' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const subject = String(body.subject || '').replace(/[\r\n]+/g, ' ').trim();
  const text = String(body.text || '');
  if (!subject || subject.length > 200 || !text || text.length > 20000) return json({ error: 'bad input' }, 400);
  try {
    await env.EMAIL.send({ to: env.MAIL_TO, from: env.MAIL_FROM, subject, text });
  } catch (e) {
    return json({ error: 'send failed', detail: String(e?.message || e).slice(0, 200) }, 502);
  }
  return json({ ok: true });
}
