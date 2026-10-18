import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPages, loadData, searchIndex } from '../scripts/build-site.mjs';
import { eventListByMonth, layout } from '../scripts/lib/html.mjs';
import { mainHash, updateLastmod } from '../scripts/update-sitemap.mjs';

const FIX = join(fileURLToPath(new URL('.', import.meta.url)), 'fixtures');
const data = loadData(FIX);
const { pages, occ } = buildPages(data, '2026-10-17');
const page = (p) => pages.find((x) => x.path === p);

test('見本データ（架空）は、本番のデータに入れない', () => {
  const real = loadData();
  assert.ok(!JSON.stringify(real).includes('架空'));
  assert.ok(!JSON.stringify(real).includes('example.org'));
});

test('作るページ：トップ・今週末・日別・地域・市区町村・種類・詳細・出店者・検索・掲載のきまり', () => {
  for (const p of ['/', '/weekend/', '/calendar/', '/date/2026-10-18/', '/area/', '/area/13/', '/area/13/13101/', '/kind/kotto/', '/e/sample-shrine-kotto/', '/shuten/', '/search/', '/about/', '/404.html']) {
    assert.ok(page(p), `${p} がありません`);
  }
  // 開催のない日のページは作らない
  assert.ok(!page('/date/2026-10-19/'));
});

test('今週末（10/17 土・10/18 日）の一覧と、要確認・中止の表示', () => {
  const home = page('/').body;
  // 今週末の開催は、写真つきカードとして並ぶ（日付のバッジは、実データの 10/17 と 10/18）
  assert.match(home, /<span class="mc-m">10月<\/span><b>17<\/b><span class="mc-w">土<\/span>/);
  assert.match(home, /<span class="mc-m">10月<\/span><b>18<\/b><span class="mc-w">日<\/span>/);
  assert.match(home, /見本手づくり市/);
  assert.match(home, /開催は要確認/);
  const detail = page('/e/sample-shrine-kotto/').body;
  assert.match(detail, /中止/);
  assert.match(detail, /境内の行事のため/);
  // 書いていない項目は「要確認」
  assert.match(detail, /アクセス<\/dt><dd><span class="tbd">要確認/);
  assert.match(page('/e/sample-park-flea/').body, /出店の募集について、公式の情報で確認できていません/);
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
  assert.deepEqual(Object.keys(idx[0]).sort(), ['c', 'ci', 'd', 'id', 'k', 'n', 'p', 'r', 'st', 't', 'v']);
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

test('トップ（新デザイン）：HERO・検索・種類の入口・ヘッダー・言語切替', () => {
  const ja = page('/');
  const en = page('/en/');
  assert.ok(en, '/en/ がありません');
  assert.equal(ja.lang, 'ja');
  assert.equal(en.lang, 'en');
  assert.match(en.body, /<h1[^>]*><span>Find Japan’s<\/span><span>hidden market<\/span><em>treasures\.<\/em><\/h1>/);
  assert.match(en.body, /Flea markets, antique fairs &amp; handmade markets — happening near you\./);
  for (const p of [ja, en]) {
    // 既存の検索（/search/?q=）へ送る
    assert.match(p.body, /<form class="hsearch" action="\/search\/" role="search">[\s\S]*?<input name="q" type="search"/);
    // 種類の入口は、既存の /kind/<種類>/
    for (const k of ['kotto', 'handmade', 'flea', 'marche']) assert.ok(p.body.includes(`href="/kind/${k}/"`), `${k}`);
    assert.ok(!p.body.includes('data-aud'), '旧「行きたい／出店したい」の切り替えは廃止');
    assert.ok(p.head.includes('hreflang="en"') && p.head.includes('hreflang="ja"'));
  }
  const html = layout(en);
  assert.match(html, /<html lang="en">/);
  assert.ok(html.includes('<link rel="stylesheet" href="/home.css">'));
  // ヘッダーの5つのリンクは、既存の行き先のまま。言語切替は /en/ と /
  for (const h of ['/weekend/', '/area/', '/kind/', '/shuten/', '/about/', '/search/', '/en/']) assert.ok(html.includes(`href="${h}"`), h);
  assert.match(html, /<a href="\/" hreflang="ja" lang="ja">日本語<\/a>/);
  assert.match(layout(page('/about/')), /class="site-head2"/, '全ページに新ヘッダー');
});

test('画像の出典は「掲載のきまり」に表示し、内部メモは出さない', () => {
  const { pages } = buildPages({ ...data, credits }, '2026-10-17');
  const about = pages.find((x) => x.path === '/about/').body;
  assert.match(about, /画像の出典/);
  assert.match(about, /Test Photo/);
  assert.ok(!about.includes('内部メモ'));
  assert.ok(!page('/about/').body.includes('画像の出典'), '出典がなければ見出しも出さない');
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

test('トップの下部：カレンダー・注目・出店者・地域・種類・サイト情報・フッター', () => {
  for (const p of [page('/'), page('/en/')]) {
    const b = p.body;
    // カレンダーの件数は、日別ページと同じ実データ
    const chips = [...b.matchAll(/href="\/date\/(\d{4}-\d\d-\d\d)\/"/g)].map((m) => m[1]);
    assert.ok(chips.length > 0);
    for (const d of chips) assert.ok(page(`/date/${d}/`), d);
    assert.ok(b.includes('href="/calendar/"'));
    // 種類のカードは、開催がある種類だけ
    const have = new Set(occ.flatMap((o) => o.series.kinds));
    for (const m of b.matchAll(/class="tcard" href="\/kind\/(\w+)\//g)) assert.ok(have.has(m[1]), m[1]);
    // 内部リンクは、すべて作ったページにある
    for (const m of b.matchAll(/href="(\/[^"#?]*)/g)) {
      const h = m[1];
      if (/\.(css|js|webp|json|txt|xml)$/.test(h)) continue;
      assert.ok(page(h), `${h} がありません`);
    }
    assert.ok(!/12,345|1,234|99\+/.test(b), 'ダミーの数字');
  }
  assert.ok(!page('/en/').body.includes('ofdata'));
  // フッターには、これまでのリンクが残る
  const foot = layout(page('/'));
  for (const h of ['/weekend/', '/calendar/', '/area/', '/kind/', '/shuten/', '/about/', '/about/#remove']) assert.ok(foot.includes(`href="${h}"`), h);
});
