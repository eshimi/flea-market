// 公式ページの確認（毎日の自動更新で実行）。
// - data/sources.json の台帳のうち、利用規約を確認して取得してよいもの（terms.ok === true）だけを取る
// - robots.txt で禁止されていれば取らない（robots.txt に届かないときも取らない）
// - 同じ URL は1日1回まで。開催が7日以内に近いシリーズの出典は毎日、それ以外は7日ごと
// - 同じサイトへのリクエストは、5秒（または Crawl-delay）以上あける。変更がなければ取り直さない（ETag / Last-Modified）
// - 取得した本文に、シリーズの出典の evidence（公式の語句）がすべてあれば、その出典の checkedAt を今日にする
//   合わなければ checkedAt は進めない（14日たつと、ページで「要確認」になる）
// 使い方: node scripts/check-sources.mjs [--all] [--today=YYYY-MM-DD] [--dry-run]
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, diffDays, todayJst } from './lib/dates.mjs';
import { buildOccurrences } from './lib/events.mjs';
import { crawlDelay, isAllowed, UA_TOKEN } from './lib/robots.mjs';
import { checkEvidence, decodeBody, htmlToText, pdfToText } from './lib/text.mjs';
import { SITE } from './lib/nav.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'data');
export const USER_AGENT = `${UA_TOKEN}/0.1 (+${SITE.url}/about/)`;
export const MIN_GAP_MS = 5000;
export const NEAR_DAYS = 7;
export const WEEKLY_DAYS = 7;

// 今回取るべき URL を決める（純粋な関数。テストする）
export function planChecks({ sources, state, series, occurrences, today, all = false }) {
  const occ = buildOccurrences(series, occurrences, today, NEAR_DAYS);
  const near = new Set(occ.map((o) => o.series.id));
  const plan = [];
  const skipped = [];
  for (const src of sources) {
    const st = state[src.url] || {};
    if (src.terms?.ok !== true) { skipped.push({ url: src.url, reason: '利用規約が未確認、または取得不可（リンクだけ掲載）' }); continue; }
    if (st.fetchedAt === today) { skipped.push({ url: src.url, reason: '今日は取得済み' }); continue; }
    const isNear = (src.series || []).some((id) => near.has(id));
    if (!all && !isNear && st.fetchedAt && diffDays(st.fetchedAt, today) < WEEKLY_DAYS) { skipped.push({ url: src.url, reason: '次の確認は ' + addDays(st.fetchedAt, WEEKLY_DAYS) }); continue; }
    plan.push(src);
  }
  return { plan, skipped };
}

// 取得結果を、シリーズの checkedAt と状態に反映する（純粋な関数。テストする）
export function applyResult({ src, result, series, state, today, venues = [] }) {
  const prev = state[src.url] || {};
  const st = { ...prev, fetchedAt: today, httpStatus: result.status };
  const notes = [];
  if (result.status === 304 || result.status === 200) {
    st.failCount = 0;
    if (result.etag) st.etag = result.etag;
    if (result.lastModified) st.lastModified = result.lastModified;
    st.mismatch = {};
    for (const vid of src.venues || []) {
      const v = venues.find((x) => x.id === vid);
      const entry = v?.sources.find((x) => x.url === src.url);
      const key = `venue:${vid}`;
      if (!entry) { notes.push(`${key}: venues.json の sources にこの URL がありません`); continue; }
      let ok;
      let missing = [];
      if (result.status === 304) ok = prev.evidenceOk?.[key] === true;
      else ({ ok, missing } = checkEvidence(result.text, entry.evidence));
      st.evidenceOk = { ...(st.evidenceOk || {}), [key]: ok };
      if (ok) entry.checkedAt = today;
      else {
        st.mismatch[key] = missing;
        notes.push(`${key}: 本文と合いません（見つからない語句：${missing.join('、') || '前回から不一致'}）`);
      }
    }
    for (const id of src.series || []) {
      const s = series.find((x) => x.id === id);
      const entry = s?.sources.find((x) => x.url === src.url);
      if (!entry) { notes.push(`${id}: series.json の sources にこの URL がありません`); continue; }
      let ok;
      let missing = [];
      if (result.status === 304) ok = prev.evidenceOk?.[id] === true;
      else ({ ok, missing } = checkEvidence(result.text, entry.evidence));
      st.evidenceOk = { ...(st.evidenceOk || {}), [id]: ok };
      if (ok) entry.checkedAt = today;
      else {
        st.mismatch[id] = missing;
        notes.push(`${id}: 本文と合いません（見つからない語句：${missing.join('、') || '前回から不一致'}）`);
      }
    }
  } else {
    st.failCount = (prev.failCount || 0) + 1;
    notes.push(`取得できません（${result.status || result.error}）。連続 ${st.failCount} 回`);
  }
  state[src.url] = st;
  return notes;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function get(url, headers = {}) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers }, redirect: 'follow', signal: AbortSignal.timeout(30000) });
    const type = res.headers.get('content-type') || '';
    let text = '';
    let pdf = false;
    if (res.status === 200) {
      const body = await res.arrayBuffer();
      if (/pdf/i.test(type) || new URL(url).pathname.toLowerCase().endsWith('.pdf')) {
        pdf = true;
        text = pdfToText(body);
      } else text = decodeBody(body, type);
    }
    return { status: res.status, text, pdf, etag: res.headers.get('etag'), lastModified: res.headers.get('last-modified') };
  } catch (e) {
    return { status: 0, error: e.cause?.code || e.message || e.name };
  }
}

async function main() {
  const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  const today = arg('today') || todayJst();
  const dry = process.argv.includes('--dry-run');
  const read = (f) => JSON.parse(readFileSync(join(DATA, f), 'utf8'));
  const sources = read('sources.json');
  const series = read('series.json');
  let venues = [];
  try { venues = read('venues.json'); } catch { /* スポットのデータがない場合 */ }
  const occurrences = read('occurrences.json');
  const state = read('source-state.json');
  const { plan, skipped } = planChecks({ sources, state, series, occurrences, today, all: process.argv.includes('--all') });
  const lines = [`## 公式ページの確認（${today}）`, '', `取得 ${plan.length} 件、見送り ${skipped.length} 件`, ''];
  const robotsCache = new Map();
  const lastHit = new Map();
  for (const src of plan) {
    const u = new URL(src.url);
    if (!robotsCache.has(u.origin)) {
      const r = await get(`${u.origin}/robots.txt`);
      // 4xx は「制限なし」、5xx・通信エラーは「取得しない」（RFC 9309）
      robotsCache.set(u.origin, r.status === 200 ? r.text : r.status >= 400 && r.status < 500 ? '' : null);
      lastHit.set(u.origin, Date.now());
    }
    const robots = robotsCache.get(u.origin);
    if (robots === null) { lines.push(`- ${src.url}：robots.txt に届かないため、取得しません`); continue; }
    if (!isAllowed(robots, u.pathname + u.search)) {
      lines.push(`- ${src.url}：robots.txt で禁止のため、取得しません（台帳の見直しが必要）`);
      state[src.url] = { ...(state[src.url] || {}), robots: 'disallowed', fetchedAt: today };
      continue;
    }
    const gap = Math.max(MIN_GAP_MS, (crawlDelay(robots) || 0) * 1000);
    const wait = (lastHit.get(u.origin) || 0) + gap - Date.now();
    if (wait > 0) await sleep(wait);
    const prev = state[src.url] || {};
    const headers = {};
    if (prev.etag) headers['If-None-Match'] = prev.etag;
    if (prev.lastModified) headers['If-Modified-Since'] = prev.lastModified;
    const res = await get(src.url, headers);
    lastHit.set(u.origin, Date.now());
    if (res.status === 200 && !res.pdf) res.text = htmlToText(res.text);
    const notes = applyResult({ src, result: res, series, state, today, venues });
    lines.push(`- ${src.url}：${res.status || res.error}${notes.length ? '\n  - ' + notes.join('\n  - ') : '（一致）'}`);
  }
  if (!dry) {
    writeFileSync(join(DATA, 'series.json'), JSON.stringify(series, null, 1) + '\n');
    if (venues.length) writeFileSync(join(DATA, 'venues.json'), JSON.stringify(venues, null, 1) + '\n');
    writeFileSync(join(DATA, 'source-state.json'), JSON.stringify(state, null, 1) + '\n');
  }
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
