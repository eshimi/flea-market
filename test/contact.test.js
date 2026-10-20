import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateContact, handleContact } from '../src/contact.js';

const ok = { category: 'info', message: '本日の開催を確認しました。', name: '', email: '', website: '', t: 2000 };
const gate = { REVIEW_GATE: { idFromName: () => 'g', get: () => ({ fetch: async () => Response.json({ allowed: true }) }) } };
const req = (body, origin = 'https://streetbazaars.jp') => new Request('https://streetbazaars.jp/api/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: origin },
  body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('問い合わせの入力：種類・内容・任意の項目を検査し、ボットは止める', () => {
  assert.equal(validateContact(ok).value.category, 'info');
  assert.equal(validateContact({ ...ok, website: 'x' }).error, 'rejected');
  assert.equal(validateContact({ ...ok, t: 10 }).error, 'rejected');
  assert.equal(validateContact({ ...ok, category: 'spam' }).error, 'category');
  assert.equal(validateContact({ ...ok, message: '  ' }).error, 'message');
  assert.equal(validateContact({ ...ok, message: 'あ'.repeat(2001) }).error, 'message');
  assert.equal(validateContact({ ...ok, email: 'not-an-email' }).error, 'email');
  assert.equal(validateContact({ ...ok, email: 'a@example.jp' }).value.email, 'a@example.jp');
});

test('問い合わせの受付：準備中は 503、別の元からは 403、送信できたら届く（返信先つき）', async () => {
  assert.equal((await handleContact(req(ok), { ...gate })).status, 503);
  assert.equal((await handleContact(req(ok, 'https://evil.example'), { ...gate })).status, 403);
  const sent = [];
  const env = { ...gate, MAIL_TO: 'info@streetbazaars.jp', MAIL_FROM: 'noreply@streetbazaars.jp', EMAIL: { send: async (m) => { sent.push(m); } } };
  assert.equal((await handleContact(req({ ...ok, email: 'reply@example.jp' }), env)).status, 200);
  assert.equal(sent[0].to, 'info@streetbazaars.jp');
  assert.equal(sent[0].replyTo, 'reply@example.jp');
  assert.match(sent[0].subject, /情報提供/);
  await handleContact(req(ok), env);
  assert.equal(sent[1].replyTo, undefined);
  const bad = { ...env, EMAIL: { send: async () => { throw new Error('x'); } } };
  assert.equal((await handleContact(req(ok), bad)).status, 502);
});
