import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crawlDelay, isAllowed } from '../scripts/lib/robots.mjs';
import { checkEvidence, decodeBody, htmlToText, normalize, pdfToText } from '../scripts/lib/text.mjs';
const normalizeText = (h) => normalize(htmlToText(h));
import { execFileSync } from 'node:child_process';
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

test('文字コード：Shift_JIS のページも読める', () => {
  const sjis = Uint8Array.from([0x8d, 0x9c, 0x93, 0x9f, 0x8e, 0x73]); // 「骨董市」
  assert.equal(decodeBody(sjis, 'text/html; charset=Shift_JIS'), '骨董市');
  const html = new Uint8Array([...new TextEncoder().encode('<meta charset="x-sjis">'), ...sjis]);
  assert.match(decodeBody(html, 'text/html'), /骨董市/);
  assert.equal(decodeBody(new TextEncoder().encode('骨董市'), ''), '骨董市');
});

const hasPdftotext = (() => { try { execFileSync('pdftotext', ['-v'], { stdio: 'ignore' }); return true; } catch (e) { return e.status !== undefined; } })();

test('PDF の本文を読んで、突き合わせに使える', { skip: !hasPdftotext && 'pdftotext がない環境' }, () => {
  const stream = 'BT /F1 18 Tf 50 700 Td (Date 10/18 8:30-12:00 Mizuho) Tj ET';
  const pdf = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length ${stream.length}>>stream
${stream}
endstream endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
trailer<</Root 1 0 R/Size 6>>
%%EOF`;
  assert.deepEqual(checkEvidence(pdfToText(new TextEncoder().encode(pdf)), ['Date 10/18 8:30-12:00 Mizuho']), { ok: true, missing: [] });
});

test('PDF でないものを渡すと、読めない旨の例外', { skip: !hasPdftotext && 'pdftotext がない環境' }, () => {
  assert.throws(() => pdfToText(new TextEncoder().encode('not a pdf')), /PDF を読めません/);
});

test('本文化：記号の表記（&times; など）を戻す', () => {
  assert.equal(normalizeText('1.5m&times;1.8m&nbsp;&emsp;A'), '1.5m×1.8mA');
});

test('文字コード：宣言が Shift_JIS でも、中身が UTF-8 なら UTF-8 で読む', () => {
  const html = new TextEncoder().encode('<meta http-equiv="Content-Type" content="text/html; charset=Shift_JIS">フリーマーケット');
  assert.match(decodeBody(html, 'text/html'), /フリーマーケット/);
  assert.match(decodeBody(new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('骨董市')]), ''), /骨董市/);
});

test('文字コード：宣言がなく UTF-8 でもないバイト列（Shift_JIS の市報テキストなど）は Shift_JIS で読む', () => {
  // 「押立公園」を Shift_JIS にしたバイト列
  const sjis = new Uint8Array([0x89, 0x9f, 0x97, 0xa7, 0x8c, 0xf6, 0x89, 0x80]);
  assert.equal(decodeBody(sjis, 'text/plain'), '押立公園');
  assert.equal(decodeBody(new TextEncoder().encode('押立公園'), 'text/plain'), '押立公園');
});

test('スポット（venues）の出典も、本文に evidence があれば確認日が進み、合わなければ進まない', () => {
  const venues = [{ id: 'v1', sources: [{ url: 'https://o.example/p', checkedAt: '2026-10-01', evidence: ['見本広場'] }] }];
  const src = { url: 'https://o.example/p', series: [], venues: ['v1'], terms: { ok: true } };
  const state = {};
  let notes = applyResult({ src, result: { status: 200, text: '会場：見本広場' }, series: [], state, today: '2026-10-19', venues });
  assert.equal(venues[0].sources[0].checkedAt, '2026-10-19');
  assert.deepEqual(notes, []);
  notes = applyResult({ src, result: { status: 200, text: '別の内容' }, series: [], state, today: '2026-10-20', venues });
  assert.equal(venues[0].sources[0].checkedAt, '2026-10-19');
  assert.ok(notes[0].includes('venue:v1'));
  // 取得対象の判定：series が空でも、venues があれば計画に入る
  const { plan } = planChecks({ sources: [src], state: {}, series: [], occurrences: [], today: '2026-10-19', all: true });
  assert.equal(plan.length, 1);
});
