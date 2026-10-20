import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateReview, handleReviews } from '../src/reviews.js';
import { validateReviews } from '../scripts/lib/reviews-view.mjs';

const ok = { stars: 4, comment: 'いい市でした。', visitedOn: '2026-10-11', website: '', t: 2000 };
const gate = { REVIEW_GATE: { idFromName: () => 'g', get: () => ({ fetch: async () => Response.json({ allowed: true }) }) } };
const assets = (ids) => ({ ASSETS: { fetch: async () => Response.json(ids) } });
const req = (id, body, origin = 'https://streetbazaars.jp') => new Request(`https://streetbazaars.jp/api/reviews/${id}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origin },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('評価の入力：正しいものを通し、ボット・不正な値を止める', () => {
  assert.deepEqual(validateReview(ok), { value: { stars: 4, comment: 'いい市でした。', visitedOn: '2026-10-11' } });
  assert.equal(validateReview({ ...ok, website: 'spam' }).error, 'rejected');
  assert.equal(validateReview({ ...ok, t: 300 }).error, 'rejected');
  assert.equal(validateReview({ ...ok, stars: 0 }).error, 'stars');
  assert.equal(validateReview({ ...ok, stars: 4.5 }).error, 'stars');
  assert.equal(validateReview({ ...ok, comment: '   ' }).error, 'comment');
  assert.equal(validateReview({ ...ok, comment: 'あ'.repeat(601) }).error, 'comment');
  assert.equal(validateReview({ ...ok, visitedOn: '2026/10/11' }).error, 'date');
  assert.deepEqual(validateReview({ ...ok, visitedOn: '' }).value.visitedOn, null);
});

test('掲載の検査：個人情報・リンクらしき文字は、掲載させない', () => {
  const base = { series: 'a-1', stars: 3, comment: '良い', visitedOn: null };
  assert.equal(validateReviews([base], new Set(['a-1'])), true);
  assert.throws(() => validateReviews([{ ...base, comment: '連絡は info@example.jp へ' }], new Set(['a-1'])));
  assert.throws(() => validateReviews([{ ...base, comment: 'https://example.jp を見て' }], new Set(['a-1'])));
  assert.throws(() => validateReviews([{ ...base, comment: '電話 03-1234-5678' }], new Set(['a-1'])));
  assert.throws(() => validateReviews([{ ...base, series: 'unknown' }], new Set(['a-1'])));
});

test('送信の受付：準備中（送信先なし）は 503、不正な場所・元は弾く', async () => {
  const env = { ...assets(['a-1', 'a-2']), ...gate };
  assert.equal((await handleReviews(req('a-1', ok), env, 'a-1')).status, 503);
  assert.equal((await handleReviews(req('zz', ok), env, 'zz')).status, 404);
  assert.equal((await handleReviews(req('a-1', ok, 'https://evil.example'), env, 'a-1')).status, 403);
  assert.equal((await handleReviews(req('a-1', { ...ok, website: 'x' }), env, 'a-1')).status, 400);
});

test('送信できたら、サイト専用アドレスへ1通送る。送信に失敗したら 502', async () => {
  const sent = [];
  const env = { ...assets(['a-1', 'a-2']), ...gate, MAIL_TO: 'site@example.jp', MAIL_FROM: 'info@example.jp', EMAIL: { send: async (m) => { sent.push(m); } } };
  const r = await handleReviews(req('a-2', ok), env, 'a-2');
  assert.equal(r.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'site@example.jp');
  assert.equal(sent[0].from, 'info@example.jp');
  assert.match(sent[0].text, /★★★★☆/);
  const bad = { ...env, EMAIL: { send: async () => { throw Object.assign(new Error('x'), { code: 'E' }); } } };
  assert.equal((await handleReviews(req('a-2', ok), bad, 'a-2')).status, 502);
});
