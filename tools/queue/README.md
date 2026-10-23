# 確認待ちの処理（週2回。月・木）の作業用ツール

- `BRIEF-QUEUE.md`：担当（サブエージェント）への指示。`queue-todo-<n>.json`（確認待ちを、サイトごとにまとめた入力）を読んで、`out/queue-<n>.json` に結果を書かせる。
- `peek.mjs`：robots.txt を確かめて1ページ取得し、本文を `pages/` に保存する（`NODE_USE_ENV_PROXY=1 node peek.mjs <URL> <保存名>`）。**作業フォルダ（scratchpad）に置いて使う**。
- `verify_queue.mjs`：`out/queue-*.json` の変更（addDates・newSeries・occurrenceUpdates）の evidence を、公式ページの本文と突き合わせる。`QUEUE_WORK=<作業フォルダ> node tools/queue/verify_queue.mjs`。
- `integrate_queue.py`：突き合わせに通った結果を、data/ に取り込む（日付の追加・新しい掲載・中止の反映・確認待ちの処理済み）。`QUEUE_WORK=<作業フォルダ> python3 tools/queue/integrate_queue.py`。新しい掲載の市区町村コード・英訳（市区町村・主催者・住所）は、取り込み後に test が不足を教える。
