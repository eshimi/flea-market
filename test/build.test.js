import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPages, loadData, searchIndex } from '../scripts/build-site.mjs';
import { eventListByMonth, layout } from '../scripts/lib/html.mjs';
import { SITE } from '../scripts/lib/nav.mjs';
import { mainHash, updateLastmod } from '../scripts/update-sitemap.mjs';

const FIX = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
const data = loadData(FIX);
const { pages, occ } = buildPages(data, '2026-10-17');
const page = (p) => pages.find((x) => x.path === p);
// 英語が既定（/）。日本語は /ja/ 以下
const jp = (p) => page(p === '/' ? '/ja/' : `/ja${p}`);

test('見本データ（架空）は、本番のデータに入れない', () => {
  const real = loadData();
  assert.ok(!JSON.stringify(real).includes('架空'));
  assert.ok(!JSON.stringify(real).includes('example.org'));
});

test('作るページ：トップ・今週末・日別・地域・市区町村・種類・詳細・出店者・検索・掲載のきまり', () => {
  for (const p of ['/', '/weekend/', '/calendar/', '/date/2026-10-18/', '/area/', '/area/13/', '/area/13/13101/', '/kind/kotto/', '/e/sample-shrine-kotto/', '/shuten/', '/search/', '/about/', '/404.html']) {
    assert.ok(page(p), `${p} がありません`);
    assert.ok(jp(p), `/ja${p} がありません`);
    assert.equal(page(p).lang, 'en');
    assert.equal(jp(p).lang, 'ja');
  }
  // 開催のない日のページは作らない
  assert.ok(!page('/date/2026-10-19/'));
  assert.ok(!jp('/date/2026-10-19/'));
});

test('今週末（10/17 土・10/18 日）の一覧と、要確認・中止の表示', () => {
  const home = jp('/').body;
  // 今週末の開催は、写真つきカードとして並ぶ（日付のバッジは、実データの 10/17 と 10/18）
  assert.match(home, /<span class="mc-m">10月<\/span><b>17<\/b><span class="mc-w">土<\/span>/);
  assert.match(home, /<span class="mc-m">10月<\/span><b>18<\/b><span class="mc-w">日<\/span>/);
  assert.match(home, /見本手づくり市/);
  assert.match(home, /開催は要確認/);
  const detail = jp('/e/sample-shrine-kotto/').body;
  assert.match(detail, /中止/);
  assert.match(detail, /境内の行事のため/);
  // 書いていない項目は「要確認」
  assert.match(detail, /アクセス<\/dt><dd><span class="tbd">要確認/);
  assert.match(jp('/e/sample-park-flea/').body, /出店の募集について、公式の情報で確認できていません/);
});

test('構造化データ（Event）は、中止を EventCancelled にする', () => {
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(page('/e/sample-shrine-kotto/').head)[1]);
  assert.equal(ld[0].startDate, '2026-10-17');
  assert.ok(ld.some((e) => e.eventStatus.endsWith('EventCancelled')));
});

test('HTML のエスケープと、検索用の索引', () => {
  const html = layout({ path: '/x/', title: '<a>', description: '"', body: '' });
  assert.ok(!html.includes('<title><a>'));
  const idx = searchIndex(occ);
  assert.equal(idx.length, occ.length);
  assert.deepEqual(Object.keys(idx[0]).sort(), ['c', 'ci', 'cie', 'd', 'id', 'k', 'n', 'ne', 'p', 'pe', 'r', 're', 'st', 't', 'te', 'v', 've']);
});

test('サイトマップの更新日は、本文が変わったページだけ進む', () => {
  const a = mainHash('<nav>x</nav><main><p>本文</p><p>2026/10/17 更新</p></main>');
  const b = mainHash('<nav>y</nav><main><p>本文</p><p>2026/10/18 更新</p></main>');
  assert.equal(a, b);
  const s1 = updateLastmod({}, [['/', a]], '2026-10-17');
  const s2 = updateLastmod(s1, [['/', a], ['/new/', 'v1:z']], '2026-10-18');
  assert.equal(s2['/'].lastmod, '2026-10-17');
  assert.equal(s2['/new/'].lastmod, '2026-10-18');
});

test('件数が多い一覧は、月ごとに分ける（最初の月だけ開く）', () => {
  const base = occ[0];
  const many = Array.from({ length: 25 }, (_, i) => ({ ...base, date: i < 5 ? '2026-10-18' : '2026-11-0' + (1 + (i % 9)) }));
  const html = eventListByMonth(many);
  assert.equal((html.match(/<details/g) || []).length, 1);
  assert.match(html, /<section class="month-block"><h3 class="month-h">2026年10月（5件）/);
  assert.match(html, /<summary class="month-h">2026年11月（20件）/);
  assert.equal((html.match(/<article class="ev/g) || []).length, 25, '全件が HTML に入る');
  assert.ok(!eventListByMonth(many.slice(0, 20)).includes('<details'), '20件以下は分けない');
});

test('SITE_URL が未設定の間は、検索に載せない（noindex）', async () => {
  const { execFileSync } = await import('node:child_process');
  const env = { ...process.env };
  delete env.SITE_URL;
  delete env.CONTACT_EMAIL;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', "import('./scripts/lib/nav.mjs').then((m) => console.log(m.INDEXABLE))"], { env, encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname });
  assert.equal(out.trim(), 'false');
});

test('依頼の窓口：メールアドレスの形でなければ使わない', async () => {
  const { execFileSync } = await import('node:child_process');
  const run = (email) => execFileSync(process.execPath, ['--input-type=module', '-e', "import('./scripts/lib/nav.mjs').then((m) => console.log(JSON.stringify([m.CONTACT_EMAIL, m.INDEXABLE])))"], { env: { ...process.env, SITE_URL: 'https://flea.example.jp', CONTACT_EMAIL: email }, encoding: 'utf8', cwd: new URL('..', import.meta.url).pathname });
  assert.equal(run('info@flea.example.jp').trim(), '["info@flea.example.jp",true]');
  assert.equal(run('<script>x</script>').trim(), '["",false]');
  assert.equal(run('').trim(), '["",false]');
});

const credits = [{ id: 'hero', use: 'トップページの写真', title: 'Test Photo', photographer: 'Test Person', source: 'Pexels', sourceUrl: 'https://www.pexels.com/photo/x/', license: 'Pexels License', note: '内部メモ（公開しない）' }];

test('トップ（新デザイン）：HERO・検索・種類の入口・ヘッダー・言語切替（英語が既定）', () => {
  const en = page('/');
  const ja = page('/ja/');
  assert.ok(!page('/en/'), '/en/ は作らない（Worker が / へ転送する）');
  assert.equal(ja.lang, 'ja');
  assert.equal(en.lang, 'en');
  assert.match(en.body, /<h1[^>]*><span>Find Japan’s<\/span><span>hidden market<\/span><em>treasures\.<\/em><\/h1>/);
  assert.match(en.body, /Flea markets, antique fairs &amp; handmade markets — happening near you\./);
  for (const p of [ja, en]) {
    assert.match(p.body, /<form class="hsearch" action="\/search\/" role="search">[\s\S]*?<input name="q" type="search"/);
    for (const k of ['kotto', 'handmade', 'flea', 'marche']) assert.ok(p.body.includes(`href="/kind/${k}/"`), `${k}`);
    assert.ok(!p.body.includes('data-aud'), '旧「行きたい／出店したい」の切り替えは廃止');
  }
  const eh = layout(en);
  const jh = layout(ja);
  assert.match(eh, /<html lang="en">/);
  assert.match(jh, /<html lang="ja">/);
  assert.ok(eh.includes('<link rel="stylesheet" href="/home.css">'));
  // hreflang：英語が x-default
  for (const h of [eh, jh]) {
    assert.ok(h.includes(`hreflang="en" href="${SITE.url}/"`));
    assert.ok(h.includes(`hreflang="ja" href="${SITE.url}/ja/"`));
    assert.ok(h.includes(`hreflang="x-default" href="${SITE.url}/"`));
  }
  // 英語：リンクは / 以下。日本語：リンクは /ja/ 以下。言語切替は同じページの反対側
  for (const h of ['/weekend/', '/area/', '/kind/', '/shuten/', '/about/', '/search/']) {
    assert.ok(eh.includes(`href="${h}"`), `en ${h}`);
    assert.ok(jh.includes(`href="/ja${h}"`), `ja ${h}`);
    assert.ok(!jh.includes(`href="${h}"`), `ja に英語の ${h} が残っている`);
  }
  assert.match(eh, /<a href="\/" hreflang="en" lang="en" aria-current="true">EN<\/a><i aria-hidden="true">\|<\/i><a href="\/ja\/" hreflang="ja" lang="ja">日本語<\/a>/);
  assert.match(jh, /<a href="\/" hreflang="en" lang="en">EN<\/a><i aria-hidden="true">\|<\/i><a href="\/ja\/" hreflang="ja" lang="ja" aria-current="true">日本語<\/a>/);
  const wk = layout(jp('/weekend/'));
  assert.match(wk, /<a href="\/weekend\/" hreflang="en"/);
  assert.match(wk, /<a href="\/ja\/weekend\/" hreflang="ja"/);
  assert.match(layout(page('/about/')), /class="site-head2"/, '全ページに新ヘッダー');
  // 英語のページに、日本語の UI 文言（データ以外）が残らない：ナビ・見出し
  assert.match(layout(page('/weekend/')), /<h1>This weekend’s markets/);
  assert.match(layout(page('/e/sample-park-flea/')), /Stall recruitment is not confirmed from official sources \(TBC\)/);
  assert.match(layout(page('/e/sample-shrine-kotto/')), /Cancelled/);
});

test('画像の出典は「掲載のきまり」に表示し、内部メモは出さない（日本語・英語）', () => {
  const credits2 = credits.map((c) => ({ ...c, en: { use: 'Top page photo', title: 'Test Photo', photographer: 'Test Person', source: 'Pexels', license: 'Pexels License' } }));
  const { pages } = buildPages({ ...data, credits: credits2 }, '2026-10-17');
  const about = (p) => pages.find((x) => x.path === p).body;
  assert.match(about('/ja/about/'), /画像の出典/);
  assert.match(about('/about/'), /Image credits/);
  assert.match(about('/about/'), /Top page photo/);
  assert.match(about('/ja/about/'), /Test Photo/);
  assert.ok(!about('/ja/about/').includes('内部メモ') && !about('/about/').includes('内部メモ'));
  assert.ok(!page('/ja/about/').body.includes('画像の出典'), '出典がなければ見出しも出さない');
});

test('トップの写真・出典は、リポジトリにそろっている', async () => {
  const { existsSync, readFileSync } = await import('node:fs');
  const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
  const real = JSON.parse(readFileSync(join(root, 'data/image-credits.json'), 'utf8'));
  for (const c of real) {
    assert.ok(c.files?.length, `${c.id}: files`);
    for (const f of c.files) assert.ok(existsSync(join(root, f)), `${f} がありません`);
    for (const k of ['title', 'photographer', 'source', 'sourceUrl', 'license', 'use']) assert.ok(c[k], `${c.id}: ${k}`);
  }
});

test('トップの下部：カレンダー・注目・出店者・地域・種類・サイト情報・フッター（英語・日本語）', () => {
  for (const p of [page('/'), page('/ja/')]) {
    const b = p.body;
    const pre = p.lang === 'ja' ? '/ja' : '';
    // カレンダーの日付は、日別ページがある（件数は実データ）
    const chips = [...b.matchAll(/href="\/date\/(\d{4}-\d\d-\d\d)\/"/g)].map((m) => m[1]);
    assert.ok(chips.length > 0);
    for (const d of chips) assert.ok(page(`${pre}/date/${d}/`), d);
    assert.ok(b.includes('href="/calendar/"'));
    // 種類のカードは、開催がある種類だけ
    const have = new Set(occ.flatMap((o) => o.series.kinds));
    for (const m of b.matchAll(/class="tcard" href="\/kind\/(\w+)\//g)) assert.ok(have.has(m[1]), m[1]);
    // 内部リンクは、その言語で作ったページにある
    for (const m of layout(p).matchAll(/href="(\/[^"#?]*)/g)) {
      const h = m[1];
      if (/\.(css|js|webp|json|txt|xml)$/.test(h)) continue;
      assert.ok(page(h) || (p.lang === 'en' && h === '/ja/'), `${h} がありません`);
    }
    assert.ok(!/12,345|1,234|99\+/.test(b), 'ダミーの数字');
  }
  // フッターには、これまでのリンクが残る（両言語）
  for (const [pg, pre] of [[page('/'), ''], [page('/ja/'), '/ja']]) {
    const foot = layout(pg);
    for (const h of ['/weekend/', '/calendar/', '/area/', '/kind/', '/shuten/', '/about/', '/about/#remove', '/search/']) assert.ok(foot.includes(`href="${pre}${h}"`), `${pre}${h}`);
  }
});

test('英語の開催のきまり・日付・地名', async () => {
  const { recurEn, dlabel, prefLabel } = await import('../scripts/lib/l10n.mjs');
  assert.equal(recurEn({ type: 'monthly-nth', byday: [{ n: 1, wd: 0 }, { n: 3, wd: 0 }] }), '1st & 3rd Sunday of every month');
  assert.equal(recurEn({ type: 'monthly-nth', byday: [{ n: -1, wd: 6 }], exceptMonths: [12] }), 'Last Saturday of every month (except December)');
  assert.equal(recurEn({ type: 'monthly-day', days: [21] }), '21st of every month');
  assert.equal(recurEn({ type: 'weekly', weekdays: [0, 6] }), 'Every Sunday & Saturday');
  assert.equal(recurEn({ type: 'dates', dates: [] }), '');
  assert.equal(dlabel('2026-10-17', 'en'), 'Sat, Oct 17');
  assert.equal(dlabel('2026-10-17', 'en', { year: true }), 'Sat, Oct 17, 2026');
  assert.equal(dlabel('2026-10-17', 'ja'), '10月17日（土）');
  assert.equal(prefLabel('26', 'en'), 'Kyoto');
  assert.equal(prefLabel('13', 'ja'), '東京都');
});

test('日本語のリンク書き換え：ページのリンクだけを /ja/ にして、静的ファイルはそのまま', async () => {
  const { localize } = await import('../scripts/lib/l10n.mjs');
  const h = '<a href="/">a</a><a href="/weekend/">b</a><a href="/e/x/#shuten">c</a><form action="/search/"></form><link href="/style.css"><img src="/img/hero.webp"><a href="https://x.jp/weekend/">d</a>';
  const out = localize(h, 'ja');
  assert.equal(out, '<a href="/ja/">a</a><a href="/ja/weekend/">b</a><a href="/ja/e/x/#shuten">c</a><form action="/ja/search/"></form><link href="/style.css"><img src="/img/hero.webp"><a href="https://x.jp/weekend/">d</a>');
  assert.equal(localize(h, 'en'), h);
});

test('使い方・よくある質問・ブログ：両言語のページ・RSS・サイトマップ・リンク', async () => {
  const { BLOG } = await import('../scripts/lib/content.mjs');
  const { buildPages: bp } = await import('../scripts/build-site.mjs');
  const real = loadData();
  const built = bp(real, '2026-10-18');
  const has = (p) => built.pages.find((x) => x.path === p);
  for (const base of ['/guide/', '/faq/', '/blog/', ...BLOG.map((b) => `/blog/${b.slug}/`)]) {
    assert.ok(has(base), base);
    assert.ok(has(`/ja${base}`), `/ja${base}`);
  }
  assert.deepEqual(built.files.map((f) => f.path).sort(), ['/blog/feed.xml', '/ja/blog/feed.xml']);
  for (const f of built.files) {
    assert.match(f.content, /^<\?xml/);
    for (const b of BLOG) assert.ok(f.content.includes(`/blog/${b.slug}/`));
  }
  // 本文の内部リンクは、すべて作ったページにある（両言語・本番のデータ）
  const paths = new Set(built.pages.map((p) => p.path));
  for (const p of built.pages) {
    const html = layout(p);
    for (const m of html.matchAll(/href="(\/[^"#?]*)/g)) {
      if (/\.(css|js|webp|json|txt|xml)$/.test(m[1])) continue;
      assert.ok(paths.has(m[1]), `${p.path} → ${m[1]} がありません`);
    }
  }
  // 日本語のページには英語の内部リンクが残らない
  assert.ok(!layout(has('/ja/guide/')).includes('href="/weekend/"'));
  assert.match(layout(has('/ja/guide/')), /href="\/ja\/weekend\/"/);
  assert.match(layout(has('/faq/')), /"@type":"FAQPage"/);
  // フッターに出る
  for (const h of ['/guide/', '/faq/', '/blog/']) assert.ok(layout(page('/')).includes(`href="${h}"`) && layout(page('/ja/')).includes(`href="/ja${h}"`), h);
});

test('英語の訳：すべての掲載に訳があり、数字が日本語の原文と一致する', () => {
  const real = loadData();
  const T = real.translations;
  const WORDS = { once: 1, twice: 2, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, january: 1, february: 2, march: 3, april: 4, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const nums = (t) => new Set([...(String(t).replace(/(\d),(\d)/g, '$1$2').match(/\d+/g) || []).map(Number), ...(String(t).toLowerCase().match(/[a-z]+/g) || []).map((w) => WORDS[w])].filter((n) => n > 0));
  const same = (ja, en, where) => {
    // 「第36回」→「36th」、「令和8年」など、年号・序数の数字は訳で言い換えることがあるので、原文の数字がすべて訳にあるかを見る
    const e = nums(en);
    for (const n of nums(ja)) {
      if (e.has(n) || n === 1) continue; // 1 は「a」「each」などに言い換わるので見ない
      // 令和の年（8→2026、9→2027）だけは、西暦への言い換えを許す
      if ((n === 8 && e.has(2026)) || (n === 9 && e.has(2027))) continue;
      assert.fail(`${where}: 原文の数字 ${n} が訳にありません\n  ja: ${ja}\n  en: ${en}`);
    }
  };
  for (const s of real.series) {
    const t = T.series[s.id];
    assert.ok(t?.name && t?.venue, `${s.id}: 訳（name・venue）がありません`);
    same(s.name, t.name, `${s.id} name`);
    same(s.venue.name, t.venue, `${s.id} venue`);
    if (s.time?.text && !/^\d{1,2}:\d{2}〜\d{1,2}:\d{2}$/.test(s.time.text)) { assert.ok(t.time, `${s.id}: time の訳`); same(s.time.text, t.time, `${s.id} time`); }
    const pairs = [['rule', s.recurrence.text], ['admission', s.visitor?.admission], ['rain', s.visitor?.rain], ['access', s.venue.access], ['fee', s.exhibitor?.fee], ['apply', s.exhibitor?.apply], ['notes', s.exhibitor?.notes]];
    for (const [k, ja] of pairs) {
      if (!ja) continue;
      if (k === 'rule' && !t.rule) continue; // きまりは構造から英語を作る
      assert.ok(t[k], `${s.id}: ${k} の訳がありません`);
      same(ja, t[k], `${s.id} ${k}`);
    }
    if (s.venue.address) {
      assert.ok(t.address, `${s.id}: 住所の訳がありません`);
      // 住所の番地は、順番も含めて原文と同じ（「四丁目」は 4 として数える）
      const adr = (x) => (String(x).replace(/([一二三四五六七八九])丁目/g, (_, k) => '一二三四五六七八九'.indexOf(k) + 1 + '-').match(/\d+/g) || []).join(',');
      assert.equal(adr(t.address), adr(s.venue.address), `${s.id}: 住所の数字\n  ja: ${s.venue.address}\n  en: ${t.address}`);
    }
    assert.ok(!s.venue.city || T.cities[s.venue.city], `${s.id}: 市区町村の訳 ${s.venue.city}`);
    assert.ok(T.organizers[s.organizer.name], `${s.id}: 主催者の訳 ${s.organizer.name}`);
    if (s.organizer.label) assert.ok(T.labels[s.organizer.label], `${s.id}: 見出しの訳 ${s.organizer.label}`);
  }
  for (const o of real.occurrences) {
    const n = o.reason || o.note;
    if (n) { const en = T.notes[`${o.series}|${o.date}`]; assert.ok(en, `${o.series} ${o.date}: 注記の訳`); same(n, en, `${o.series} ${o.date} note`); }
  }
  // 英語のページには、訳が出る（日本語の原文は小さく添える）
  const { pages } = buildPages(real, '2026-10-18');
  const d = pages.find((p) => p.path === '/e/oedo-antique-market-tokyo-international-forum/').body;
  assert.match(d, /<h1>Oedo Antique Market \(Tokyo International Forum\)<\/h1>/);
  assert.match(d, /class="orig" lang="ja">東京国際フォーラム 地上広場/);
  assert.match(d, /Free admission/);
  const area = pages.find((p) => p.path === '/area/13/').body;
  assert.match(area, /Chiyoda Ward/);
  assert.ok(!/千代田区<small/.test(area), '英語の市区町村一覧に日本語が残る');
});
