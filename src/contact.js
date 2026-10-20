// お問い合わせフォーム。/api/contact。投稿は保存せず、サイト専用のメールアドレス（MAIL_TO）へ届ける。
// 差出人（MAIL_FROM）は Email Service で有効にしたドメイン。返信用のメールアドレスは任意（書かれたときだけ replyTo に入れる）。
import { ReviewGate, LIMIT_PER_HOUR } from './reviews.js';
export { ReviewGate };

export const CATEGORIES = ['remove', 'info', 'vendor', 'media', 'other'];
export const CATEGORY_LABEL = { remove: '掲載の修正・削除（主催者の方）', info: '情報提供（開催の実際など）', vendor: '出店について', media: '取材・広報・掲載のご相談', other: 'その他・不具合のご報告' };
export const MESSAGE_MAX = 2000;
const EMAIL_RE = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/;

const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

// 入力の検査（純粋な関数）
export function validateContact(body) {
  if (!body || typeof body !== 'object') return { error: 'bad request' };
  // ボット対策：隠し欄（website）が埋まっている、ページを開いてから1.5秒たっていない
  if (body.website || !(Number(body.t) >= 1500)) return { error: 'rejected' };
  if (!CATEGORIES.includes(body.category)) return { error: 'category' };
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MESSAGE_MAX) return { error: 'message' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length > 100) return { error: 'name' };
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  if (email && (email.length > 200 || !EMAIL_RE.test(email))) return { error: 'email' };
  return { value: { category: body.category, message, name, email } };
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') return json({ error: 'method' }, 405);
  const origin = request.headers.get('Origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json({ error: 'origin' }, 403);
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ error: 'type' }, 415);
  const text = await request.text();
  if (text.length > 8000) return json({ error: 'too large' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: 'bad json' }, 400); }
  const v = validateContact(body);
  if (v.error) return json({ error: v.error }, 400);
  if (!env.EMAIL || !env.MAIL_TO || !env.MAIL_FROM) return json({ error: 'not ready' }, 503);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const gateKey = await sha256(`${env.VOTE_SALT || 'flea-market-jp'}|contact|${ip}`);
  const gate = env.REVIEW_GATE.get(env.REVIEW_GATE.idFromName(gateKey.slice(0, 32)));
  const allowed = await gate.fetch('https://do/');
  if (!allowed.ok) return json({ error: 'rate limit' }, 429);
  const { category, message, name, email } = v.value;
  const label = CATEGORY_LABEL[category];
  const msg = {
    to: env.MAIL_TO,
    from: env.MAIL_FROM,
    subject: `[Flea Market JP] お問い合わせ：${label}`,
    text: `種類：${label}\nお名前：${name || '未記入'}\n返信先：${email || '未記入（返信できません）'}\n\n${message}\n`,
  };
  if (email) msg.replyTo = email;
  try {
    await env.EMAIL.send(msg);
  } catch {
    return json({ error: 'send failed' }, 502);
  }
  return json({ ok: true });
}
