import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReview, handleReviews, handleAdminReviews, ReviewStore, resetSeriesCache } from '../src/reviews.js';

const ok = { stars: 4, comment: 'いい市でした。', visitedOn: '2026-10-11', website: '', t: 2000 };

// Durable Object の保存を、メモリの Map で置き換える
function memoryStore() {
  const m = new Map();
  const storage = {
    get: async (k) => m.get(k),
    put: async (k, v) => { m.set(k, structuredClone(v)); },
    delete: async (k) => m.delete(k),
    list: async ({ prefix }) => new Map([...m].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])),
  };
  const obj = new ReviewStore({ storage });
  return { idFromName: () => 'all', get: () => ({ fetch: (url, init) => obj.fetch(new Request(url, init)) }) };
}
const allow = { idFromName: () => 'g', get: () => ({ fetch: async () => Response.json({ allowed: true }) }) };
const deny = { idFromName: () => 'g', get: () => ({ fetch: async () => Response.json({ allowed: false }, { status: 429 }) }) };
const makeEnv = (extra = {}) => ({ ASSETS: { fetch: async () => Response.json(['a-1', 'a-2']) }, REVIEW_STORE: memoryStore(), REVIEW_GATE: allow, ADMIN_TOKEN: 'secret-token-123', ...extra });
const req = (path, body, { origin = 'https://streetbazaars.jp', method = 'POST', auth } = {}) => new Request(`https://streetbazaars.jp${path}`, {
  method,
  headers: { 'Content-Type': 'application/json', Origin: origin, ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
  ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
});

test('評価の入力：正しいものを通し、ボット・不正な値・個人情報らしき文字を止める', () => {
  assert.deepEqual(validateReview(ok), { value: { stars: 4, comment: 'いい市でした。', visitedOn: '2026-10-11' } });
  assert.equal(validateReview({ ...ok, website: 'spam' }).error, 'rejected');
  assert.equal(validateReview({ ...ok, t: 300 }).error, 'rejected');
  assert.equal(validateReview({ ...ok, stars: 0 }).error, 'stars');
  assert.equal(validateReview({ ...ok, stars: 4.5 }).error, 'stars');
  assert.equal(validateReview({ ...ok, comment: '   ' }).error, 'comment');
  assert.equal(validateReview({ ...ok, comment: 'あ'.repeat(601) }).error, 'comment');
  assert.equal(validateReview({ ...ok, visitedOn: '2026/10/11' }).error, 'date');
  for (const c of ['連絡は info@example.jp へ', 'https://example.jp を見て', 'www.example.jp', '電話 03-1234-5678']) assert.equal(validateReview({ ...ok, comment: c }).error, 'blocked', c);
});

test('書き込みはすぐ公開。1回の通報で非表示になり、管理者が公開に戻す・編集・削除できる', async () => {
  resetSeriesCache();
  const env = makeEnv();
  const posted = await handleReviews(req('/api/reviews/a-1', ok), env, 'a-1');
  assert.equal(posted.status, 200);
  const { review } = await posted.json();
  assert.ok(review.id && review.stars === 4 && !('status' in review), '公開用の項目だけを返す');
  let list = await (await handleReviews(req('/api/reviews/a-1', null, { method: 'GET' }), env, 'a-1')).json();
  assert.equal(list.reviews.length, 1, 'すぐ公開');
  assert.equal((await (await handleReviews(req('/api/reviews/a-2', null, { method: 'GET' }), env, 'a-2')).json()).reviews.length, 0, '別のフリマには出ない');

  assert.equal((await handleReviews(req(`/api/reviews/a-1/${review.id}/report`, { reason: '宣伝' }), env, 'a-1', review.id)).status, 200);
  list = await (await handleReviews(req('/api/reviews/a-1', null, { method: 'GET' }), env, 'a-1')).json();
  assert.equal(list.reviews.length, 0, '1回の通報で非表示');

  const admin = (path, body, auth = 'secret-token-123') => req(path, body, { method: body ? 'POST' : 'GET', auth });
  let reported = await (await handleAdminReviews(admin('/api/admin/reviews?status=reported'), env)).json();
  assert.equal(reported.reviews.length, 1);
  assert.equal(reported.reviews[0].reportReason, '宣伝');
  assert.equal((await handleAdminReviews(admin('/api/admin/reviews/a-1/x', { action: 'restore' }), env, 'a-1', review.id)).status, 200);
  list = await (await handleReviews(req('/api/reviews/a-1', null, { method: 'GET' }), env, 'a-1')).json();
  assert.equal(list.reviews.length, 1, '管理者が公開に戻した');

  await handleAdminReviews(admin('/x', { action: 'edit', comment: '書き直した内容', stars: 3 }), env, 'a-1', review.id);
  list = await (await handleReviews(req('/api/reviews/a-1', null, { method: 'GET' }), env, 'a-1')).json();
  assert.equal(list.reviews[0].comment, '書き直した内容');
  assert.equal(list.reviews[0].stars, 3);

  await handleAdminReviews(admin('/x', { action: 'remove' }), env, 'a-1', review.id);
  assert.equal((await (await handleReviews(req('/api/reviews/a-1', null, { method: 'GET' }), env, 'a-1')).json()).reviews.length, 0, '非公開');
  await handleAdminReviews(admin('/x', { action: 'delete' }), env, 'a-1', review.id);
  assert.equal((await (await handleAdminReviews(admin('/api/admin/reviews?status=all'), env)).json()).reviews.length, 0, '削除');
});

test('管理の API は、トークンがないと使えない。書き込みの API は、別の元・存在しないフリマ・回数超過を弾く', async () => {
  resetSeriesCache();
  const env = makeEnv();
  assert.equal((await handleAdminReviews(req('/api/admin/reviews', null, { method: 'GET' }), env)).status, 401);
  assert.equal((await handleAdminReviews(req('/api/admin/reviews', null, { method: 'GET', auth: 'wrong-token-1234' }), env)).status, 401);
  assert.equal((await handleAdminReviews(req('/api/admin/reviews', null, { method: 'GET', auth: 'x' }), makeEnv({ ADMIN_TOKEN: '' }))).status, 503, 'トークン未設定');
  assert.equal((await handleReviews(req('/api/reviews/zz', ok), env, 'zz')).status, 404);
  assert.equal((await handleReviews(req('/api/reviews/a-1', ok, { origin: 'https://evil.example' }), env, 'a-1')).status, 403);
  assert.equal((await handleReviews(req('/api/reviews/a-1', { ...ok, website: 'x' }), env, 'a-1')).status, 400);
  assert.equal((await handleReviews(req('/api/reviews/a-1', ok), makeEnv({ REVIEW_GATE: deny }), 'a-1')).status, 429);
  assert.equal((await handleReviews(req('/api/reviews/a-1/abcd1234/report', {}), env, 'a-1', 'abcd1234')).status, 404, '存在しない書き込みの通報');
});

test('メールが設定されていれば、書き込みと通報を管理者へ知らせる（失敗しても書き込みは通る）', async () => {
  resetSeriesCache();
  const sent = [];
  const env = makeEnv({ MAIL_TO: 'info@streetbazaars.jp', MAIL_FROM: 'noreply@streetbazaars.jp', EMAIL: { send: async (m) => { sent.push(m); } } });
  const { review } = await (await handleReviews(req('/api/reviews/a-2', ok), env, 'a-2')).json();
  await handleReviews(req(`/api/reviews/a-2/${review.id}/report`, {}), env, 'a-2', review.id);
  assert.equal(sent.length, 2);
  assert.match(sent[1].subject, /不適切の通報/);
  const bad = makeEnv({ MAIL_TO: 'a@b.jp', MAIL_FROM: 'c@d.jp', EMAIL: { send: async () => { throw new Error('x'); } } });
  assert.equal((await handleReviews(req('/api/reviews/a-2', ok), bad, 'a-2')).status, 200);
});
