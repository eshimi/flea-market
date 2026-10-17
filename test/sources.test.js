import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlDelay, isAllowed } from '../scripts/lib/robots.mjs';
import { checkEvidence, htmlToText } from '../scripts/lib/text.mjs';
import { applyResult, planChecks } from '../scripts/check-sources.mjs';
import { validateSources } from '../scripts/lib/events.mjs';

test('robots.txt：最長一致・自分のグループ・Crawl-delay', () => {
  const txt = `User-agent: *\nDisallow: /private/\nAllow: /private/open\nCrawl-delay: 10\n\nUser-agent: BadBot\nDisallow: /`;
  assert.equal(isAllowed(txt, '/events/'), true);
  assert.equal(isAllowed(txt, '/private/x'), false);
  assert.equal(isAllowed(txt, '/private/open.html'), true);
  assert.equal(crawlDelay(txt), 10);
  assert.equal(isAllowed('User-agent: FleaMarketJPBot\nDisallow: /\n\nUser-agent: *\nAllow: /', '/a'), false);
  assert.equal(isAllowed('User-agent: *\nDisallow:', '/a'), true);
  assert.equal(isAllowed('User-agent: *\nDisallow: /*.pdf$', '/a.pdf'), false);
  assert.equal(isAllowed('', '/a'), true);
});

test('本文との突き合わせ：全角・空白・波ダッシュの違いは吸収', () => {
  const text = htmlToText('<p>毎月 第１日曜日</p><script>x="毎月第3土曜"</script><p>７:００～１５:００</p>');
  assert.deepEqual(checkEvidence(text, ['毎月第1日曜日', '7:00〜15:00']), { ok: true, missing: [] });
  assert.equal(checkEvidence(text, ['毎月第3土曜']).ok, false, 'script の中は本文にしない');
  assert.equal(checkEvidence(text, []).ok, false, 'evidence がなければ確認にならない');
});

const series = () => [{ id: 'a', recurrence: { type: 'weekly', weekdays: [0], text: '毎週日曜' }, sources: [{ url: 'https://x.example/a', type: 'organizer', checkedAt: '2026-10-01', evidence: ['毎週日曜'] }] }];
const src = { url: 'https://x.example/a', series: ['a'], terms: { ok: true, checkedAt: '2026-10-01' } };

test('取得の計画：規約未確認は取らない・1日1回・遠い開催は7日ごと', () => {
  const base = { series: series(), occurrences: [], today: '2026-10-14' };
  assert.equal(planChecks({ ...base, sources: [{ ...src, terms: { ok: null } }], state: {} }).plan.length, 0);
  assert.equal(planChecks({ ...base, sources: [src], state: { [src.url]: { fetchedAt: '2026-10-14' } } }).plan.length, 0);
  // 10/18（日）が7日以内なので、前日に取っていても取る
  assert.equal(planChecks({ ...base, sources: [src], state: { [src.url]: { fetchedAt: '2026-10-13' } } }).plan.length, 1);
  const far = [{ ...series()[0], recurrence: { type: 'dates', dates: ['2026-12-01'], text: 'x' } }];
  assert.equal(planChecks({ ...base, series: far, sources: [src], state: { [src.url]: { fetchedAt: '2026-10-13' } } }).plan.length, 0);
  assert.equal(planChecks({ ...base, series: far, sources: [src], state: { [src.url]: { fetchedAt: '2026-10-07' } } }).plan.length, 1);
});

test('取得結果の反映：一致なら確認日を進め、不一致・失敗なら進めない', () => {
  const s1 = series(); const st = {};
  applyResult({ src, result: { status: 200, text: '開催：毎週日曜', etag: '"e1"' }, series: s1, state: st, today: '2026-10-14' });
  assert.equal(s1[0].sources[0].checkedAt, '2026-10-14');
  assert.equal(st[src.url].etag, '"e1"');
  applyResult({ src, result: { status: 304 }, series: s1, state: st, today: '2026-10-15' });
  assert.equal(s1[0].sources[0].checkedAt, '2026-10-15', '変更なし（304）で、前回一致なら進める');
  const notes = applyResult({ src, result: { status: 200, text: '今後の開催は未定です' }, series: s1, state: st, today: '2026-10-16' });
  assert.equal(s1[0].sources[0].checkedAt, '2026-10-15');
  assert.match(notes[0], /毎週日曜/);
  applyResult({ src, result: { status: 404 }, series: s1, state: st, today: '2026-10-17' });
  assert.equal(st[src.url].failCount, 1);
});

test('台帳の検証：出典はすべて台帳に', () => {
  assert.deepEqual(validateSources([src], series()), []);
  assert.ok(validateSources([], series()).some((e) => e.includes('sources.json にありません')));
  assert.ok(validateSources([{ ...src, terms: { ok: 'yes' } }], series()).length);
});
