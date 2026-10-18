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
  assert.match(home, /10月17日（土）〜10月18日（日）/);
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
