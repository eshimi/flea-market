# 担当の仕事：巡回の「確認待ち」を処理する（Flea Market JP）

毎朝、巡回リストの公式サイトを取得し、変化を「確認待ち」に入れている。多くは「初回の取得」で、そのページは既に掲載（series）の出典になっている。**このページに、まだ掲載していない開催（日付・催し）が出ていないか**を調べる。

## 入力
`queue-todo-<担当番号>.json`。1件＝確認待ち1ページ：id・url・name・note・series（このページを出典にしている既存の掲載。id・name・recurrence（開催のきまり。`dates` 型は日付の一覧）・venue）。

## 手順（1ページずつ）
1. 取得：`NODE_USE_ENV_PROXY=1 node peek.mjs <URL> <保存名>`（robots.txt を確かめ、許可なら本文を `pages/<保存名>.txt` に保存。禁止・届かない・403 なら使わない。回避しない。同じサイトへは5秒以上あける）。同じ URL は1回だけ。
2. 本文を読み、**今日（2026-10-23）以降の開催日・催し**を挙げる。`series` の recurrence と比べ、
   - すべて既存の掲載に含まれている → `nochange`
   - 既存シリーズの `dates` 型に**足りない日付**がある（きまり型のシリーズに例外の日がある場合も）→ `addDates`
   - 既存のどのシリーズにもない**新しい催し・会場** → `newSeries`（下の形）
   - 本文に開催情報がない・JavaScript 描画で読めない → `nochange`（理由を note に）
3. 事実は**公式の本文にあるものだけ**。evidence は、本文にそのまま含まれる**短い語句**（HTML タグや改行をまたぐ長い文は避ける）。電話番号・メール・SNS・個人名は載せない。公式で取れない項目（時間・入場料・雨天・出店料・申込み・住所・アクセス）は空にしてよい（後でまとめて補う）。

## 出力：`out/queue-<担当番号>.json`（配列。1ページ＝1要素。書けた分から保存）
```json
[{"id":"nadeshiko-furima-schedule","result":"nochange","note":"表の日付はすべて既存"},
 {"id":"…","result":"changes",
  "addDates":[{"series":"jfma-ikea-kobe-loppis","dates":["2026-12-12"],"evidence":["12月12日（土）"],"url":"https://…"}],
  "newSeries":[{"id":"新しい-id（英小文字・数字・ハイフン）","name":"催しの名前（公式のまま）","kinds":["flea"],
    "organizer":{"name":"主催者名","url":"https://…"},
    "venue":{"name":"会場名","pref":"13","city":"○○区","address":"（公式にあれば）"},
    "recurrence":{"type":"dates","dates":["2026-11-21"],"text":"公式の書き方"},
    "time":{"text":"10:00〜15:00","start":"10:00","end":"15:00"},
    "sources":[{"url":"https://…","type":"organizer","evidence":["短い語句","…"]}],
    "en":{"name":"英語名","venue":"英語の会場名","rule":"英語のきまり","time":"10:00–15:00"}}]}]
```
- 都道府県コード（pref）は2桁（東京13・大阪27・京都26 など）。種類 kinds は flea / nomi / kotto / handmade / engi / marche。
- 英語 `en` は必須（日本語の数字をすべて含める）。
- 作業はこのフォルダの中だけ。リポジトリ（/home/user/flea-market）は変更しない。

## 報告
`nochange` の数、`changes` の数（追加した日付・新しい催しの数）、取得できなかったページの数と理由を、短く日本語で。
