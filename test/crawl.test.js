import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyCrawl, hostBlocked, planCrawl, textHash, validateCrawlList } from '../scripts/lib/crawl.mjs';

const ok = { id: 'a-site', url: 'https://example.org/', name: 'テスト', kind: 'organizer', active: true, terms: { ok: true, checkedAt: '2026-10-18', note: '' } };

test('巡回リストの検証：形・重複・情報源にしないサイト・規約の確認', () => {
  assert.deepEqual(validateCrawlList([ok]), []);
  assert.ok(validateCrawlList([ok, ok]).some((e) => e.includes('重複')));
  assert.ok(validateCrawlList([{ ...ok, url: 'https://fmfm.jp/area/tokyo' }]).some((e) => e.includes('情報源にしないサイト')));
  assert.ok(validateCrawlList([{ ...ok, url: 'https://www.instagram.com/x/' }]).some((e) => e.includes('instagram.com')));
  assert.deepEqual(validateCrawlList([{ ...ok, url: 'https://www.flima.jp/', active: false, terms: { ok: null } }]), [], 'active:false なら、リストに残せる');
  assert.ok(validateCrawlList([{ ...ok, terms: { ok: null } }]).some((e) => e.includes('terms.ok: true')));
  assert.ok(validateCrawlList([{ ...ok, kind: 'portal' }]).some((e) => e.includes('kind')));
  assert.equal(hostBlocked('https://sub.walkerplus.com/x'), 'walkerplus.com');
  assert.equal(hostBlocked('https://rpa.flima.net/'), undefined);
});

test('巡回の計画：1日1回、everyDays ごと、active だけ', () => {
  const list = [ok, { ...ok, id: 'b-site', url: 'https://example.org/b', active: false }, { ...ok, id: 'c-site', url: 'https://example.org/c', everyDays: 3 }];
  const state = { 'c-site': { fetchedAt: '2026-10-17' } };
  const { plan, skipped } = planCrawl({ list, state, today: '2026-10-18' });
  assert.deepEqual(plan.map((e) => e.id), ['a-site']);
  assert.equal(skipped.length, 2);
  assert.deepEqual(planCrawl({ list, state, today: '2026-10-20' }).plan.map((e) => e.id), ['a-site', 'c-site']);
  assert.equal(planCrawl({ list, state: { 'a-site': { fetchedAt: '2026-10-18' } }, today: '2026-10-18', all: true }).plan.length, 1, '同じ日は2回取らない（c-site のみ）');
});

test('変更の検知：初回は確認待ちに入れ、本文が変われば入れ、同じなら入れない。同じサイトの確認待ちは1件', () => {
  const state = {};
  const queue = [];
  const run = (text, today, status = 200) => applyCrawl({ entry: ok, result: { status, text }, state, queue, today });
  assert.equal(run('開催 10月25日', '2026-10-18'), '初回の取得');
  assert.deepEqual(queue.map((q) => [q.reason, q.status]), [['new', 'pending']]);
  assert.equal(run('開催　１０月２５日', '2026-10-25'), '変更なし', '全角・空白の違いは変更にしない');
  assert.equal(run('開催 11月1日', '2026-11-01'), '本文が変わりました');
  assert.equal(queue.length, 1, '確認待ちは1件のまま');
  assert.equal(queue[0].reason, 'new', '初回の「new」は、処理されるまで残る');
  assert.equal(queue[0].detectedAt, '2026-11-01');
  queue[0].status = 'done';
  assert.equal(run('開催 12月1日', '2026-11-08'), '本文が変わりました');
  assert.equal(queue.length, 2);
  assert.match(run('', '2026-11-15', 0), /取得できません/);
  assert.equal(state['a-site'].failCount, 1);
  assert.equal(run('x', '2026-11-16', 304), '変更なし（304）');
  assert.equal(textHash('a  b'), textHash('ａ　ｂ'));
});
