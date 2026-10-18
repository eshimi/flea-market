# Flea Market JP 作業メモ

全国のフリーマーケット・蚤の市・骨董市・手作り市・マルシェの開催情報を、**主催者と自治体の公式情報だけ**から集めて表示するサイト。
作り方は「補助金ネット」（eshimi/subsidy。引き継ぎ資料は、そのリポジトリのブランチ `claude/sharp-allen-xrugio` の `docs/new-site-handoff.md`）と同じ。

ユーザーは日本語。**返答は常に日本語**。

## 作業の決まり（毎回）
1. **事実だけを書く**。確認できないことは「要確認」と書く（推測・一般論で埋めない）。
2. 変更ごとに `npm test`（node --test）を回してから、コミットする。テストの失敗は、直すか、原因を説明する。
3. PR は、ユーザーが頼んだときだけ。コミットしたら `main` へプッシュする（ネットワークのエラーは、間隔を空けて再試行。ユーザーが手動実行した GitHub Actions の最中はプッシュしない）。
4. コミットメッセージの末尾に `Co-Authored-By:` と `Claude-Session:` の行（セッションの指示に従う）。
5. 大きな書き起こしを担当に分けて並行するときは、**同時に動かすのは4つまで**（週の利用上限のため）。担当ごとに作業場所を分け、検証に通ったものだけを統合する。
6. デザインは、先に画像で案を見せ、選んでもらってから実装する（Playwright で HTML を撮る）。画面は実際のブラウザで確認する（PC と、スマホ幅 390px）。
7. 他サイトの掲載内容は複製しない。使うのは、主催者・自治体の公式ページと、公開データだけ。

## 決まったこと（2026-10-17）
- トップのデザイン：**案A（日付が中心）**。「今週末、近くでやっているフリマ・蚤の市を探す」＋「行きたい／出店したい」の切り替え＋検索＋日付の帯（件数つき）＋その日の一覧＋右に都道府県・掲載のきまり。生成り色（#fbf6ee）とテラコッタ（#c8553d）。
- 最初の範囲（段階1）：**東京都の定期市**（毎月開催の骨董市・蚤の市など）＋自治体の公開データ。
- サイト名（仮）：**Flea Market JP**。ドメインは未定（要確認）。
- リポジトリ：`eshimi/flea-market`（既定ブランチ `main`。2026-10-18 に接続・初回プッシュ）。

## 仕組みの要点
- 日付は日本時間の暦日を `'YYYY-MM-DD'` で持つ（`scripts/lib/dates.mjs`。祝日・振替休日・国民の休日も計算。春分・秋分は 1980〜2099 年の近似式）。「今週末」＝今日以降で最初の、連続した土日・祝日。
- データは2段：
  - `data/series.json`：シリーズ（定期市・主催者ごと）。繰り返しのきまり `recurrence`（monthly-nth / monthly-day / weekly / dates。`exceptMonths`・`from`・`until`）、会場、来場者向け・出店者向けの項目、出典 `sources[{url,type,checkedAt}]`。確認できない項目は書かない（ページでは「要確認」）。
  - `data/occurrences.json`：開催回ごとの、公式での確認結果（confirmed / cancelled / postponed / unknown。`checkedAt` と `source` 必須）。きまりの外の臨時開催もここに書く。
- 表示の状態（`scripts/lib/events.mjs` の buildOccurrences）：公式で確認した回＝「公式で確認」（日付を列挙したきまり `dates` は、出典で日付そのものを突き合わせているので、これも「公式で確認」）、きまりから算出した回＝「予定（きまりから算出）」、中止・延期は消さずに表示、最終確認から14日（`STALE_DAYS`）を超えたら「要確認」。一覧に出すのは今日から120日（`WINDOW_DAYS`）。
- 種類は `scripts/lib/kinds.mjs`（flea / nomi / kotto / handmade / marche）、都道府県コードは `scripts/lib/areas.mjs`。市区町村は、データに書いた `cityCode`（5桁）と `city` を使う。

- ページ生成：`scripts/build-site.mjs` が `data/` から `dist/` を作る（`dist/` はコミットしない。毎日、日本時間の今日を基準に作り直す。`--today=` `--data=` `--out=` で指定可）。`static/`（style.css・home.js・search.js）をそのまま写す。部品は `scripts/lib/html.mjs`（layout・開催カード・状態の札）、ナビは `scripts/lib/nav.mjs` の1か所。
  - ページ：`/` `/weekend/` `/calendar/` `/date/<日付>/`（開催がある日だけ） `/area/` `/area/<都道府県>/` `/area/<都道府県>/<市区町村コード>/` `/kind/` `/kind/<種類>/` `/e/<id>/`（詳細・Event の構造化データ） `/shuten/` `/search/`（/events.json を読む） `/about/` `/404.html`。
  - 書いていない項目は「要確認」と表示する。サイトの URL は環境変数 `SITE_URL`（未定の間は example のドメイン）。
- サイトマップ：`scripts/update-sitemap.mjs`。更新日は本文（`<main>`）のハッシュが変わった日（`data/sitemap-lastmod.json`。毎日変わる「更新日」の表示は除いて比べる）。robots.txt もここで作る。**ローカルで build すると sitemap-lastmod.json が変わるので、コミットしない**（`git checkout data/sitemap-lastmod.json`）。
- 情報源：台帳 `data/sources.json`（`{url, series:[id], terms:{ok:true|false|null, checkedAt, note}}`。利用規約を確認して取得してよいものだけ `ok: true`）。シリーズの出典 `sources[].evidence` に、公式の本文にそのまま書いてある短い語句（開催のきまり・会場名など）を入れる。
- 公式ページの確認：`scripts/check-sources.mjs`（毎日の自動更新で実行）。規約未確認は取らない／robots.txt で禁止・届かないなら取らない／同じ URL は1日1回、開催が7日以内なら毎日・それ以外は7日ごと／同じサイトへは5秒（または Crawl-delay）以上あける／ETag・Last-Modified。本文に evidence がすべてあれば、その出典の checkedAt を今日にする（合わなければ進めず、14日で「要確認」）。状態は `data/source-state.json`。結果は Actions の概要に出る。
- データの検証：`scripts/validate-data.mjs`（`npm run build` の最初に走る。シリーズ・開催回・台帳の形と、出典が台帳にあるか）。
- テストの見本データ：`test/fixtures/`（**架空**。本番の `data/` に「架空」「example.org」が入っていないことをテストで確かめる）。
- 毎日の自動更新：`.github/workflows/deploy.yml`（毎朝 5:17 JST ＝ 20:17 UTC と手動）。npm test → check-sources → npm run build → `data/` の確認結果をコミット `[skip ci]` → `wrangler deploy`（`wrangler.jsonc`。build.command は `npm run build`、静的ファイルは `dist/`、`/api/*` は `src/worker.js`）。必要な Secrets：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`（未設定ならデプロイを飛ばす）。Variables：`SITE_URL`。
- この作業環境から Node の fetch で外へ出るときは `NODE_USE_ENV_PROXY=1` が要る（補助金ネットと同じ）。
- 画面の確認：Playwright（`/opt/node-tools/node_modules/playwright`）で、PC 1280px とスマホ 390px。横のはみ出しとコンソールのエラーも見る。

## 掲載の進め方（段階1：東京都の定期市）
- 手順：公式ページを読む（robots.txt を確かめてから。作業用の取得は1ページずつ数秒あける）→ 利用規約・免責のページを確かめる → 公式の本文にある事実だけを `data/` に書く（evidence も）→ `npm run validate` → `NODE_USE_ENV_PROXY=1 node scripts/check-sources.mjs --all`（evidence が本文にすべてあるかを確かめる。合わないものは直すか、書かない）→ build して画面を確認。
- 利用規約の扱い（2026-10-18）：利用規約のページがなく、robots.txt で許可されていれば `terms.ok: true`（note にその旨）。**規約で「無断での使用・転載、二次利用を禁じます」とあるサイトは `ok: null` のまま掲載しない**（ユーザーの判断待ち）。
- 他のまとめ・一覧サイト（例：kottouichi.jp の「骨董市サイト」）は、情報源にしない。
- 掲載済み（2026-10-18、5件）：大江戸骨董市（東京国際フォーラム）、高幡不動尊 ござれ市・リサイクル市、東京蚤の市’26 AUTUMN、雑司ヶ谷 手創り市。
- 候補と状態（2026-10-18）：
  - 世田谷のボロ市：世田谷区の「著作権・リンク・免責事項」に、オープンデータ以外の二次利用を禁じる記載 → 掲載保留（区のオープンデータに載っていないか要確認）。
  - 富岡八幡宮・花園神社：この作業環境から公式サイトに接続できない（ECONNRESET・タイムアウト）→ 本番の Actions から、または別の日に再試行。
  - 新井薬師・東郷神社・乃木神社：公式サイトのトップに市の情報がない（下層ページは要確認）。
  - 青山のファーマーズマーケット（farmersmarkets.jp）：「毎週土日 10時-16時」は公式にあるが、会場名が本文にない（地図リンクの住所だけ）→ 要確認。
  - 高幡不動尊：2027年1月は「迎春期間の諸行事休止のお知らせ」（内容が画像）があるため、1月の回は occurrences で「要確認」。

## 未対応・次にやること
- 東京都の定期市の洗い出し → 利用規約・robots.txt の確認 → 公式ページから書き起こし（evidence 付き）→ 検証 → 掲載。
- 掲載の修正・削除の依頼の窓口（`/about/#remove`。いまは「準備中（要確認）」）。
- ドメイン（要確認）、Cloudflare の Secrets の登録。
