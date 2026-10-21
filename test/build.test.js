import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPages, loadData, searchIndex } from '../scripts/build-site.mjs';
import { eventListByMonth, layout } from '../scripts/lib/html.mjs';
import { SITE, ADSENSE_CLIENT } from '../scripts/lib/nav.mjs';
import { mainHash, updateLastmod } from '../scripts/update-sitemap.mjs';
import { REVIEWS_ON } from '../scripts/lib/reviews-view.mjs';

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
  // 公式に記載のない項目は、「目安」の札つきで、会場の名前・市区町村・一般的な傾向だけから出す（番地・徒歩時間は作らない）
  assert.match(detail, /アクセス<\/dt><dd><span class="est"[^>]*>目安<\/span> 右の「ここへの経路を調べる」/);
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
  assert.match(en.body, /<h1 class="hero2-kicker" id="hero-h">Find Flea Markets in Japan<\/h1>/);
  assert.match(en.body, /<p class="hero2-title"><span>Find Japan’s<\/span><span>hidden market<\/span><em>treasures\.<\/em><\/p>/);
  assert.match(en.body, /Browse by date, city and market type, with links to official event information\./);
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
      if (/\.(css|js|webp|json|txt|xml|svg|png|ico)$/.test(h)) continue;
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
      if (/\.(css|js|webp|json|txt|xml|svg|png|ico)$/.test(m[1])) continue;
      assert.ok(paths.has(m[1]), `${p.path} → ${m[1]} がありません`);
    }
  }
  // 日本語のページには英語の内部リンクが残らない
  assert.ok(!layout(has('/ja/guide/')).includes('href="/weekend/"'));
  assert.match(layout(has('/ja/guide/')), /href="\/ja\/weekend\/"/);
  assert.match(layout(has('/faq/')), /"@type":"FAQPage"/);
  // 参考サイトと同じ構成：一覧（見出し帯・カテゴリ・記事の行・右の案内）、記事（種別・日付・読了時間・ポイント・目次・前後の記事・タグ）
  const blogPg = has('/blog/');
  const idx = blogPg.body + (blogPg.bannerText || '');
  for (const k of ['class="lp-s"', 'class="bl-chips"', 'class="bl-row"', 'class="side-cta"', 'side-tags']) assert.ok(idx.includes(k), k);
  const post = has('/blog/reading-the-labels/').body;
  for (const k of ['class="bl-meta"', 'class="bl-points"', 'class="art-box"', 'side-toc', 'class="bl-pn"', 'class="art-tags"']) assert.ok(post.includes(k), k);
  assert.match(has('/ja/blog/reading-the-labels/').body, /読了 約\d+分/);
  assert.match(has('/faq/').body, /side-toc/);
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

test('地図・経路のリンクと当日の天気（気象庁）', async () => {
  const { mapUrls, weatherTarget } = await import('../scripts/lib/weather.mjs');
  const real = loadData();
  const oedo = real.series.find((s) => s.id === 'oedo-antique-market-tokyo-international-forum');
  const m = mapUrls(oedo, 'en');
  assert.equal(m.exact, true);
  assert.ok(m.open.startsWith('https://www.google.com/maps/search/?api=1&query=') && m.open.includes(encodeURIComponent('東京都千代田区丸の内3-5-1')));
  assert.ok(m.route.startsWith('https://www.google.com/maps/dir/?api=1&destination=') && m.route.includes('travelmode=transit'));
  const noAddr = real.series.find((s) => !s.venue.address);
  assert.equal(mapUrls(noAddr, 'ja').exact, false);
  assert.deepEqual(weatherTarget(oedo), { office: '130000', area: '130010' });
  assert.deepEqual(weatherTarget(real.series.find((s) => s.venue.city === '羽生市')), { office: '110000', area: '110020' });
  assert.equal(weatherTarget({ venue: { pref: '47' } }), null);
  const { pages } = buildPages(real, '2026-10-18');
  const en = pages.find((p) => p.path === '/e/oedo-antique-market-tokyo-international-forum/');
  assert.match(en.body, /Open in Google Maps/);
  assert.match(en.body, /<div class="wx" data-office="130000" data-area="130010" data-date="2026-10-31" data-lang="en" data-region="Tokyo">/);
  // 公式に記載のない項目の「目安」：入場料の既定、市区町村までの所在地、会場名から分かる駅前
  const ja = (id) => pages.find((p) => p.path === `/ja/e/${id}/`).body;
  assert.match(ja('takahata-fudoson-gozareichi'), /入場料<\/dt><dd><span class="est"[^>]*>目安<\/span> 多くのフリーマーケット・市は入場無料です/);
  assert.match(ja('mizuho-aozora-ichi'), /所在地<\/dt><dd><span class="est"[^>]*>目安<\/span> 東京都瑞穂町（番地は要確認）/);
  assert.match(ja('setagaya-funabashi-nomi-no-ichi-2026-autumn'), /アクセス<\/dt><dd><span class="est"[^>]*>目安<\/span> 千歳船橋駅の駅前（会場名から/);
  assert.match(pages.find((p) => p.path === '/e/setagaya-funabashi-nomi-no-ichi-2026-autumn/').body, /In front of Chitose-Funabashi Station \(from the venue name/);
  assert.ok(!ja('oedo-antique-market-tokyo-international-forum').includes('多くのフリーマーケット・市は入場無料'), '公式の入場料があるものには、目安を出さない');
  // 評価フォームの script は、送信先（CONTACT_EMAIL）が設定されたときだけ
  assert.deepEqual(en.scripts, ['/weather.js', '/map.js', ...(REVIEWS_ON ? ['/review.js'] : [])]);
  assert.match(en.body, /<aside class="ev-side"/);
  // 位置のない会場は、押すと Google マップの埋め込みを読み込むボタン
  const noGeo = real.series.find((s) => !real.geo[s.id]);
  const ng = pages.find((p) => p.path === `/e/${noGeo.id}/`).body;
  assert.match(ng, /class="ev-map" data-src="https:\/\/maps\.google\.com\/maps\?q=/);
  assert.match(ng, /<button type="button" class="map-show">Show map<\/button>/);
  assert.match(pages.find((p) => p.path === '/ja/e/oedo-antique-market-tokyo-international-forum/').body, /Google マップで開く/);
});

test('天気の中継（Worker）：6桁のコードだけ受け、気象庁の JSON を返してキャッシュする', async () => {
  const { weather } = await import('../src/worker.js');
  const calls = [];
  const fetchImpl = async (url) => { calls.push(url); return new Response('[{"x":1}]', { status: 200 }); };
  const store = new Map();
  const cache = { match: async (k) => store.get(k.url)?.clone(), put: async (k, v) => store.set(k.url, v) };
  assert.equal((await weather('abc', fetchImpl, cache)).status, 400);
  const r = await weather('130000', fetchImpl, cache);
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '[{"x":1}]');
  assert.equal(r.headers.get('Cache-Control'), 'public, max-age=1800');
  await weather('130000', fetchImpl, cache);
  assert.deepEqual(calls, ['https://www.jma.go.jp/bosai/forecast/data/forecast/130000.json'], '2回目はキャッシュ');
  assert.equal((await weather('130000', async () => new Response('', { status: 500 }), null)).status, 502);
  assert.equal((await weather('999999', async () => new Response('', { status: 404 }), null)).status, 404);
});

test('ヘッダーのリンク先は、すべて右のナビ（主なページへの相互リンク）がある', () => {
  for (const lang of ['en', 'ja']) {
    const pre = lang === 'ja' ? '/ja' : '';
    for (const base of ['/weekend/', '/area/', '/kind/', '/shuten/', '/about/', '/search/', '/calendar/', '/area/13/', '/kind/kotto/', '/date/2026-10-18/']) {
      const pg_ = pages.find((p) => p.path === `${pre}${base}`);
      if (!pg_) continue;
      const html = layout(pg_);
      assert.match(html, /<aside class="ev-side"/, `${pre}${base}`);
      for (const h of ['/weekend/', '/calendar/', '/area/', '/kind/', '/shuten/', '/search/', '/guide/', '/faq/', '/blog/', '/about/']) assert.ok(html.includes(`href="${pre}${h}"`), `${pre}${base} → ${h}`);
      // いま見ているページは、目印（aria-current）つき
      const root = '/' + base.split('/')[1] + '/';
      assert.ok(new RegExp(`<a href="${pre}${root}" aria-current="page">`).test(html) || base.startsWith('/date/') || base.startsWith('/kind/') && root === '/kind/', `${pre}${base}: 現在地の目印`);
    }
  }
  const area = pages.find((p) => p.path === '/area/13/').body;
  assert.match(area, /sn-list/);
  assert.ok(area.includes('href="/area/13/13101/"'), '市区町村への相互リンク');
  assert.match(pages.find((p) => p.path === '/kind/kotto/').body, /<a href="\/kind\/kotto\/" aria-current="page">/);
});

test('自動のブログ記事：今週末・来月のまとめ・新着の掲載（掲載データの事実だけ）', async () => {
  const { generate } = await import('../scripts/lib/autoblog.mjs');
  const { buildOccurrences } = await import('../scripts/lib/events.mjs');
  const { setTranslations } = await import('../scripts/lib/tr-en.mjs');
  const real = loadData();
  setTranslations(real.translations);
  const occAt = (t) => buildOccurrences(real.series, real.occurrences, t);
  const run = (today, existing = new Set(), state = { seen: real.series.map((s) => s.id) }) => generate({ series: real.series, occ: occAt(today), today, existing, state });
  // 週末の4日前（木）：その週末の記事ができる。件数は、実際のその週末の開催の数
  const thu = run('2026-10-22').posts.find((p) => p.slug === 'weekend-2026-10-24');
  assert.ok(thu);
  const n = occAt('2026-10-22').filter((o) => ['2026-10-24', '2026-10-25'].includes(o.date) && o.status !== 'cancelled' && o.status !== 'postponed').length;
  assert.equal(thu.en.title, `This weekend’s markets in Japan (Oct 24–25): ${n} events`);
  assert.equal(thu.ja.title, `今週末（10月24日〜25日）のフリマ・蚤の市：${n}件`);
  assert.equal(thu.cat, 'weekly');
  assert.ok(thu.en.blocks.some((b) => b.ul?.some((x) => x.includes('](/e/'))), '開催詳細へのリンク');
  // すでにあれば作らない（公開した時点の記録を変えない）。週末の最中・5日以上前は作らない
  assert.equal(run('2026-10-22', new Set(['weekend-2026-10-24'])).posts.filter((p) => p.slug.startsWith('weekend-')).length, 0);
  assert.ok(!run('2026-10-25').posts.some((p) => p.slug.startsWith('weekend-')));
  assert.ok(!run('2026-10-19').posts.some((p) => p.slug.startsWith('weekend-')));
  // 25日以降：来月のまとめ
  const mon = run('2026-10-26').posts.find((p) => p.slug === 'month-2026-11');
  assert.ok(mon);
  assert.match(mon.en.title, /^Markets in Japan in November 2026: \d+ events$/);
  assert.match(mon.ja.title, /^2026年11月のフリマ・蚤の市：\d+件$/);
  assert.ok(!run('2026-10-24').posts.some((p) => p.slug.startsWith('month-')));
  // 新着：前回までに見ていないシリーズだけ。初回（state なし）は作らない
  const added = generate({ series: real.series, occ: occAt('2026-10-20'), today: '2026-10-20', existing: new Set(), state: { seen: real.series.slice(1).map((s) => s.id) } });
  const nw = added.posts.find((p) => p.slug === 'new-2026-10-20');
  assert.ok(nw && nw.en.title.includes('1 new listing') && nw.ja.title.includes('1件'));
  assert.ok(nw.en.blocks[1].ul[0].includes(`](/e/${real.series[0].id}/)`));
  assert.equal(generate({ series: real.series, occ: occAt('2026-10-20'), today: '2026-10-20', existing: new Set(), state: null }).posts.filter((p) => p.cat === 'new').length, 0);
  // ページになる：一覧・記事・RSS。開催が消えた記事のリンクは、リンクにしない
  const ghost = { ...thu, slug: 'weekend-ghost', en: { ...thu.en, blocks: [{ ul: ['[Gone](/e/no-such-series/): x'] }] }, ja: { ...thu.ja, blocks: [{ ul: ['[消えた](/e/no-such-series/)：x'] }] } };
  const built = buildPages({ ...real, autoPosts: [thu, mon, ghost] }, '2026-10-22');
  const page = (p) => built.pages.find((x) => x.path === p);
  assert.match(page('/blog/')?.body || '', /Weekend picks/);
  assert.ok(page('/blog/weekend-2026-10-24/') && page('/ja/blog/month-2026-11/'));
  const gh = page('/blog/weekend-ghost/').body;
  assert.ok(gh.includes('Gone') && !gh.includes('no-such-series'));
  assert.ok(built.files.every((f) => f.content.includes('weekend-2026-10-24')));
  const paths = new Set(built.pages.map((p) => p.path));
  for (const p of built.pages.filter((x) => x.path.includes('/blog/'))) {
    for (const m of layout(p).matchAll(/href="(\/[^"#?]*)/g)) {
      if (/\.(css|js|webp|json|txt|xml|svg|png|ico)$/.test(m[1])) continue;
      assert.ok(paths.has(m[1]), `${p.path} → ${m[1]}`);
    }
  }
});

test('地図の画像（OpenStreetMap）：位置のある会場だけ。ない会場は、押すと開く Google マップ', async () => {
  const { existsSync } = await import('node:fs');
  const real = loadData();
  const ids = Object.keys(real.geo);
  assert.ok(ids.length >= 20);
  for (const id of ids) {
    // 'spot-<id>' はスポット（会場）の位置
    assert.ok(id.startsWith('spot-') ? real.venues.some((v) => `spot-${v.id}` === id) : real.series.some((s) => s.id === id), `${id}: シリーズ（会場）がありません`);
    assert.ok(existsSync(new URL(`../static/img/maps/${id}.webp`, import.meta.url)), `${id}: 地図の画像がありません`);
    const g = real.geo[id];
    assert.ok(g.lat > 24 && g.lat < 46 && g.lon > 122 && g.lon < 146, `${id}: 日本の外の位置`);
  }
  const { pages } = buildPages(real, '2026-10-18');
  const body = (p) => pages.find((x) => x.path === p).body;
  const oedo = body('/e/oedo-antique-market-tokyo-international-forum/');
  assert.match(oedo, /<a class="ev-mapimg" href="https:\/\/www\.google\.com\/maps\/search\/\?api=1&amp;query=/);
  assert.ok(oedo.includes('src="/img/maps/oedo-antique-market-tokyo-international-forum.webp"'));
  assert.ok(!oedo.includes('class="map-show"'), '画像がある会場は、押して開くボタンを出さない');
  assert.match(oedo, /© OpenStreetMap contributors/);
  const noGeo = real.series.find((s) => !real.geo[s.id]);
  assert.match(body(`/e/${noGeo.id}/`), /class="map-show"/);
  assert.match(body('/about/'), /OpenStreetMap/);
});

test('過去の開催の記録：公式で確認した回・中止・延期だけを残し、過去の日別ページとカレンダーに出す', async () => {
  const { snapshotDay, updateArchive, pastOccurrences } = await import('../scripts/lib/archive.mjs');
  const { buildOccurrences } = await import('../scripts/lib/events.mjs');
  const day = '2026-11-01';
  const snap = snapshotDay(data.series, data.occurrences, day);
  assert.ok(snap.every((i) => ['confirmed', 'cancelled', 'postponed'].includes(i.status)));
  // きまりから算出しただけの回（scheduled）は残さない
  const sched = buildOccurrences(data.series, data.occurrences, day, 0).filter((o) => o.date === day && o.status === 'scheduled');
  for (const o of sched) assert.ok(!snap.some((i) => i.series === o.series.id));
  // 追記は重複せず、2回目は増えない
  const a1 = updateArchive({ lastDate: null, items: [] }, data.series, data.occurrences, '2026-11-02');
  assert.equal(a1.lastDate, '2026-11-01');
  const a2 = updateArchive(a1, data.series, data.occurrences, '2026-11-02');
  assert.equal(a2.items.length, a1.items.length);
  // 自動更新が止まっても、さかのぼるのは上限まで
  const a3 = updateArchive({ lastDate: '2020-01-01', items: [] }, data.series, data.occurrences, '2026-11-02');
  assert.ok(a3.items.every((i) => i.date >= '2026-10-19'));
  // 過去のページ
  const item = { series: data.series[0].id, date: '2026-10-01', status: 'confirmed', checkedAt: '2026-10-01', source: data.series[0].sources[0].url };
  assert.equal(pastOccurrences({ items: [item, { ...item, series: 'no-such-series' }] }, data.series).length, 1);
  const { pages } = buildPages({ ...data, archive: { items: [item] } }, '2026-11-02');
  const pg = pages.find((p) => p.path === '/date/2026-10-01/');
  assert.ok(pg && (pg.body + (pg.bannerText || "")).includes("past record") && (pg.body + (pg.bannerText || "")).includes("Confirmed (official) before the event"));
  assert.ok(pages.find((p) => p.path === '/ja/date/2026-10-01/').body.includes('開催前に公式で確認'));
  assert.ok(pages.find((p) => p.path === '/calendar/').body.includes('/date/2026-10-01/'));
  assert.ok(pages.find((p) => p.path === `/e/${item.series}/`).body.includes('/date/2026-10-01/'));
});

test('アクセス解析のタグ（Google タグ）が、すべてのページの head に入る', () => {
  const { pages } = buildPages(data, '2026-11-02');
  for (const p of pages) {
    const html = layout(p);
    assert.ok(/googletagmanager\.com\/gtag\/js\?id=G-[A-Z0-9]+/.test(html) && html.indexOf('gtag(') < html.indexOf('</head>'), p.path);
  }
});

test('スポット（会場）：一覧と個別のページ、開催回の集約、要確認、Place だけの構造化データ、検索とナビ', async () => {
  const { validateVenues, buildSpots } = await import('../scripts/lib/spots.mjs');
  assert.deepEqual(validateVenues(data.venues, data.series), []);
  assert.ok(validateVenues([{ ...data.venues[0], id: 'Bad Id' }], data.series).length);
  assert.ok(validateVenues([data.venues[0], data.venues[0]], data.series).some((e) => e.includes('重複')));
  assert.ok(validateVenues(data.venues, [{ ...data.series[0], venueId: 'no-such' }]).some((e) => e.includes('venueId')));
  const { pages, spots } = buildPages(data, '2026-10-19');
  const byPath = (p) => pages.find((x) => x.path === p);
  const idx = byPath('/spot/');
  assert.ok(idx && idx.body.includes('/spot/sample-park/') && idx.body.includes('/spot/sample-empty-venue/'));
  assert.ok(byPath('/ja/spot/') && byPath('/ja/spot/sample-park/'));
  // 開催回の集約：同じ venueId のシリーズの開催回が並ぶ
  const sp = spots.find((x) => x.venue.id === 'sample-park');
  assert.ok(sp.occ.length > 0 && sp.occ.every((o) => o.series.venueId === 'sample-park'));
  const page = byPath('/spot/sample-park/');
  assert.ok(page.body.includes('/e/sample-park-flea/'));
  // 書いていない項目は「要確認」
  assert.ok(page.body.includes('TBC'));
  // 開催がないスポットも、個別ページができる
  const empty = byPath('/spot/sample-empty-venue/');
  assert.ok(empty && empty.body.includes('TBC') && empty.body.includes('Upcoming dates are TBC'));
  assert.ok(byPath('/ja/spot/sample-empty-venue/').body.includes('要確認'));
  // 構造化データ：Place は出るが、Event は出ない
  assert.ok(page.head.includes('"@type":"Place"') && !page.head.includes('"@type":"Event"') && !page.body.includes('"@type":"Event"'));
  // ヘッダーのナビ・シリーズのページからのリンク・サイトマップ用の一覧
  assert.ok(layout(byPath('/')).includes('href="/spot/"'));
  assert.ok(byPath('/e/sample-park-flea/').body.includes('/spot/sample-park/'));
});

test('スポットの英訳：本番の venues に、名前と、数字の一致した訳がある', () => {
  const real = loadData();
  const nums = (t) => String(t || '').replace(/(\d),(\d)/g, '$1$2').match(/\d+/g) || [];
  for (const v of real.venues) {
    const t = real.translations.venues?.[v.id];
    assert.ok(t?.name, `${v.id}: 訳（name）がありません`);
    for (const k of ['place', 'address', 'access', 'summary', 'rules']) {
      if (!v[k]) continue;
      assert.ok(t[k], `${v.id}: ${k} の訳がありません`);
      const en = new Set(nums(t[k]));
      for (const n of nums(v[k])) if (n !== '1' && !en.has(n)) assert.fail(`${v.id} ${k}: 原文の数字 ${n} が訳にありません`);
    }
  }
});

test('スポットの右の列：地図・天気・アンケート。画像の出典。Worker のアンケート（回数制限・取り消し・拒否）', async () => {
  const real = loadData();
  const { pages } = buildPages(real, '2026-10-19');
  const pg_ = pages.find((p) => p.path === '/spot/komazawa-olympic-park/');
  assert.ok(pg_.body.includes('class="ev-split"') && !/<div class="ev-split"[\s\S]*<div class="ev-split"/.test(pg_.body), '2列は1つだけ');
  assert.ok(pg_.body.includes('src="/img/maps/spot-komazawa-olympic-park.webp"'));
  assert.ok(pg_.body.includes('class="wx"') && pg_.body.includes('data-office="130000"'));
  assert.ok(pg_.body.includes('class="ev-card poll"') && pg_.body.includes('data-choice="want"') && !pg_.body.includes('data-choice="bad"'));
  assert.ok(pg_.scripts.includes('/vote.js'));
  // 住所のない会場は、押すと開く地図
  assert.ok(pages.find((p) => p.path === '/spot/oi-racecourse/').body.includes('class="map-show"'));
  const { SpotVotes, handleVotes, resetIdsCache, CHOICES } = await import('../src/votes.js');
  assert.ok(!CHOICES.includes('bad'));
  const mem = new Map();
  const state = { storage: { get: async (k) => mem.get(k), put: async (k, v) => { mem.set(k, v); } } };
  const dobj = new SpotVotes(state);
  const env = {
    ASSETS: { fetch: async () => new Response(JSON.stringify(['komazawa-olympic-park'])) },
    SPOT_VOTES: { idFromName: (n) => n, get: () => ({ fetch: (u, init) => dobj.fetch(new Request(u, init)) }) },
  };
  resetIdsCache();
  const post = (body, headers = {}) => handleVotes(new Request('https://x.example/api/votes/komazawa-olympic-park', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://x.example', 'CF-Connecting-IP': '1.2.3.4', ...headers }, body: JSON.stringify(body) }), env, 'komazawa-olympic-park');
  const ok = { choice: 'want', on: true, voter: 'a'.repeat(20), t: 3000, website: '' };
  let r = await post(ok);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).counts.want, 1);
  assert.equal((await (await post(ok)).json()).counts.want, 1, '同じ人の同じ選択肢は1票');
  assert.equal((await (await post({ ...ok, on: false })).json()).counts.want, 0, '取り消し');
  assert.equal((await post({ ...ok, choice: 'bad' })).status, 400);
  assert.equal((await post({ ...ok, website: 'x' })).status, 400, 'ハニーポット');
  assert.equal((await post({ ...ok, t: 100 })).status, 400, '速すぎる');
  assert.equal((await post(ok, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await handleVotes(new Request('https://x.example/api/votes/nope'), env, 'nope')).status, 404, '知らない会場は作らない');
  // 回数制限：同じ IP は、1時間に10回まで
  let last;
  for (let i = 0; i < 12; i++) last = await post({ ...ok, voter: String(i).padStart(2, '0').repeat(10) });
  assert.equal(last.status, 429);
  assert.equal((await handleVotes(new Request('https://x.example/api/votes/komazawa-olympic-park'), env, 'komazawa-olympic-park')).status, 200);
});

test('スポットの写真：作者・ライセンスの表示と、本体・サムネイルのファイルがある', async () => {
  const { existsSync } = await import('node:fs');
  const real = loadData();
  for (const v of real.venues.filter((x) => x.image)) {
    for (const f of [v.image.file, v.image.file.replace(/\.webp$/, '-t.webp')]) assert.ok(existsSync(new URL(`../static/img/spots/${f}`, import.meta.url)), `${v.id}: ${f} がありません`);
    assert.ok(['CC0', 'CC BY', 'CC BY-SA', 'Public domain', 'PD'].some((l) => v.image.license.startsWith(l)), `${v.id}: ライセンス ${v.image.license}`);
  }
  const { pages } = buildPages(real, '2026-10-19');
  const withImg = real.venues.find((v) => v.image);
  const pg_ = pages.find((p) => p.path === `/spot/${withImg.id}/`);
  assert.ok(pg_.body.includes(withImg.image.author) && pg_.body.includes('class="sp-head has-photo"'));
  assert.ok(pages.find((p) => p.path === '/spot/').body.includes(withImg.image.file.replace(/\.webp$/, '-t.webp')));
});

test('ガイド記事：両言語・要約ボックス・日本語は800〜1300字・次回の開催日のシリーズと写真が実在する', async () => {
  const { GUIDES } = await import('../scripts/lib/content-guides.mjs');
  const real = loadData();
  const sids = new Set(real.series.map((s) => s.id));
  const vids = new Set(real.venues.map((v) => v.id));
  const len = (c) => c.blocks.map((b) => b.h2 || b.p || (b.ul || []).join('') || (b.facts || []).map((x) => x.join('')).join('')).join('').length;
  for (const g of GUIDES) {
    assert.ok(g.slug.startsWith('guide-') && g.date && g.cat === 'goer', g.slug);
    for (const lang of ['en', 'ja']) {
      const c = g[lang];
      assert.ok(c.title && c.summary && c.points?.length === 3, `${g.slug} ${lang}`);
      assert.ok(c.blocks.some((b) => b.dates), `${g.slug} ${lang}: 次回の開催日`);
      if (vids.has(g.slug.replace(/^guide-/, ''))) assert.ok(c.blocks.some((b) => b.facts), `${g.slug} ${lang}: 会場ガイドは要約ボックス`);
      for (const b of c.blocks) {
        for (const id of b.dates?.series || []) assert.ok(sids.has(id), `${g.slug}: シリーズ ${id}`);
        if (b.photo) assert.ok(vids.has(b.photo), `${g.slug}: スポット ${b.photo}`);
      }
    }
    const n = len(g.ja);
    assert.ok(n >= 800 && n <= 1300, `${g.slug}: 日本語 ${n} 字`);
  }
  const { pages } = buildPages(real, '2026-10-20');
  const pg_ = pages.find((p) => p.path === '/blog/guide-takahata-fudoson/');
  assert.ok(pg_.body.includes('class="bl-facts"') && pg_.body.includes('/e/takahata-fudoson-gozareichi/'));
  assert.ok(pages.find((p) => p.path === '/spot/takahata-fudoson/').body.includes('/blog/guide-takahata-fudoson/'));
});

test('トップ：英語は出店者を下の細いバナーだけにし、ブログ最新3本と更新情報3本の枠を出す（日本語は出店者区画を残す）', () => {
  const real = loadData();
  const { pages } = buildPages(real, '2026-10-20');
  const en = pages.find((p) => p.path === '/').body;
  const ja = pages.find((p) => p.path === '/ja/').body;
  for (const b of [en, ja]) {
    assert.ok(b.includes('hm-news'));
    assert.equal((b.match(/<ul class="news-list">[\s\S]*?<\/ul>/)[0].match(/<li>/g) || []).length, 3, 'ブログ3本');
    assert.equal((b.match(/<ul class="news-list upd">[\s\S]*?<\/ul>/)[0].match(/<li>/g) || []).length, 3, '更新情報3本');
  }
  assert.ok(!en.includes('class="hm-sec hm-vendors"') && en.includes('hm-vbanner'));
  assert.ok(ja.includes('class="hm-sec hm-vendors"') && !ja.includes('hm-vbanner'));
  assert.ok(en.indexOf('hm-vbanner') > en.indexOf('hm-about') || en.indexOf('hm-vbanner') > en.indexOf('about-text'), 'バナーは下');
});

test('AdSense の tag は、すべてのページの head に入る（ADSENSE_CLIENT が空なら入らない）', () => {
  if (!ADSENSE_CLIENT) return;
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  for (const p of pages.filter((x) => !x.path.endsWith('.html')).slice(0, 40)) {
    assert.ok(layout(p).includes(src), p.path);
    assert.ok(layout(p).includes(`<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">`), p.path);
  }
});

test('都道府県ページの概要：掲載データの件数・毎月の市・初めての方へ。東京・大阪・京都だけ、観光の枠と公式の観光サイト', () => {
  const real = loadData();
  const { pages } = buildPages(real, '2026-10-21');
  const tokyo = pages.find((p) => p.path === '/area/13/').body;
  assert.match(tokyo, /class="pov"/);
  assert.match(tokyo, /Flea Market JP lists \d+ markets in Tokyo/);
  assert.ok(tokyo.includes('/blog/guide-tokyo-flea-markets-visitors/'), '東京の旅行者ガイドへのリンク');
  assert.ok(tokyo.includes('https://www.gotokyo.org/en/index.html'));
  assert.ok(pages.find((p) => p.path === '/ja/area/26/').body.includes('https://ja.kyoto.travel/'));
  const saitama = pages.find((p) => p.path === '/area/11/').body;
  assert.match(saitama, /class="pov"/);
  assert.ok(!saitama.includes('pov-sights'), '観光の枠は東京・大阪・京都だけ');
});

test('SNS で共有したときの画像とカード（og:image・twitter:card）、Event の構造化データは言語ごとの名前と画像', () => {
  const real = loadData();
  const { pages } = buildPages(real, '2026-10-21');
  const top = layout(pages.find((p) => p.path === '/'));
  assert.ok(top.includes('<meta property="og:image" content="') && top.includes('/img/og/default.jpg"'));
  assert.ok(top.includes('<meta name="twitter:card" content="summary_large_image">'));
  const ev = pages.find((p) => p.path === '/e/oedo-antique-market-tokyo-international-forum/');
  const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/.exec(ev.head)[1]);
  assert.equal(ld[0].name, 'Oedo Antique Market (Tokyo International Forum)');
  assert.ok(ld[0].image?.length && ld[0].description && ld[0].location.address.addressCountry === 'JP');
  assert.ok(ev.body.includes('"@type":"BreadcrumbList"'));
});
