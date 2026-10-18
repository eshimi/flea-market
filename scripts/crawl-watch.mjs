// 巡回するサイト（data/crawl-list.json）を取得して、前回から本文が変わったものを「確認待ち」（data/review-queue.json）に入れる。
// 開催情報をデータにするのは、確認待ちを処理する作業（公式の本文と突き合わせて書き起こす）。ここでは、サイトの本文は保存しない（指紋だけ）。
// - 利用規約・robots.txt を確認した（terms.ok: true）active のものだけ。robots.txt で禁止・届かないなら取らない
// - 同じサイトへは5秒（または Crawl-delay）以上あける。ETag・Last-Modified。1日1回、everyDays（既定7日）ごと
// 使い方: node scripts/crawl-watch.mjs [--all] [--today=YYYY-MM-DD] [--dry-run]
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/dates.mjs';
import { crawlDelay, isAllowed } from './lib/robots.mjs';
import { htmlToText } from './lib/text.mjs';
import { applyCrawl, planCrawl } from './lib/crawl.mjs';
import { get, MIN_GAP_MS, sleep } from './check-sources.mjs';

const DATA = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

async function main() {
  const today = arg('today') || todayJst();
  const dry = process.argv.includes('--dry-run');
  const read = (f, d) => (existsSync(join(DATA, f)) ? JSON.parse(readFileSync(join(DATA, f), 'utf8')) : d);
  const list = read('crawl-list.json', []);
  const state = read('crawl-state.json', {});
  const queue = read('review-queue.json', []);
  const { plan, skipped } = planCrawl({ list, state, today, all: process.argv.includes('--all') });
  const lines = [`## 巡回するサイトの確認（${today}）`, '', `取得 ${plan.length} 件、見送り ${skipped.length} 件`, ''];
  const robotsCache = new Map();
  const lastHit = new Map();
  for (const e of plan) {
    const u = new URL(e.url);
    if (!robotsCache.has(u.origin)) {
      const r = await get(`${u.origin}/robots.txt`);
      robotsCache.set(u.origin, r.status === 200 ? r.text : r.status >= 400 && r.status < 500 ? '' : null); // 4xx は制限なし、5xx・通信エラーは取らない
      lastHit.set(u.origin, Date.now());
    }
    const robots = robotsCache.get(u.origin);
    if (robots === null) { lines.push(`- ${e.name}：robots.txt に届かないため、取得しません`); continue; }
    if (!isAllowed(robots, u.pathname + u.search)) {
      lines.push(`- ${e.name}：robots.txt で禁止のため、取得しません（リストの見直しが必要）`);
      state[e.id] = { ...(state[e.id] || {}), robots: 'disallowed', fetchedAt: today };
      continue;
    }
    const wait = (lastHit.get(u.origin) || 0) + Math.max(MIN_GAP_MS, (crawlDelay(robots) || 0) * 1000) - Date.now();
    if (wait > 0) await sleep(wait);
    const prev = state[e.id] || {};
    const headers = {};
    if (prev.etag) headers['If-None-Match'] = prev.etag;
    if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified;
    const res = await get(e.url, headers);
    lastHit.set(u.origin, Date.now());
    if (res.status === 200 && !res.pdf) res.text = htmlToText(res.text);
    lines.push(`- ${e.name}：${applyCrawl({ entry: e, result: res, state, queue, today })}`);
  }
  const pending = queue.filter((q) => q.status === 'pending');
  lines.push('', `確認待ち：${pending.length} 件${pending.length ? '（' + pending.map((q) => q.name).join('、') + '）' : ''}`);
  if (!dry) {
    writeFileSync(join(DATA, 'crawl-state.json'), JSON.stringify(state, null, 1) + '\n');
    writeFileSync(join(DATA, 'review-queue.json'), JSON.stringify(queue, null, 1) + '\n');
  }
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
