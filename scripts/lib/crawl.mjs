// 巡回するサイトのリスト（data/crawl-list.json）と、変更の検知（scripts/crawl-watch.mjs）の、判定の部分（純粋な関数。テストする）
import { createHash } from 'node:crypto';
import { diffDays } from './dates.mjs';
import { normalize } from './text.mjs';

// 情報源にしないサイト（まとめ・ポータル・SNS）。リストに入れても、検証で弾く
export const BLOCKED_DOMAINS = ['fmfm.jp', 'marche.pozo.jp', 'walkerplus.com', 'iko-yo.net', 'kottouichi.jp', 'flima.jp', 'jmty.jp', 'instagram.com', 'x.com', 'twitter.com', 'facebook.com', 'line.me', 'youtube.com', 'tiktok.com'];
export const KINDS_OK = ['organizer', 'municipality', 'opendata'];
export const DEFAULT_EVERY_DAYS = 7;

export const hostBlocked = (url) => {
  const h = new URL(url).hostname.toLowerCase();
  return BLOCKED_DOMAINS.find((d) => h === d || h.endsWith(`.${d}`));
};

export function validateCrawlList(list) {
  const errs = [];
  if (!Array.isArray(list)) return ['crawl-list.json は配列にしてください'];
  const ids = new Set();
  const urls = new Set();
  for (const e of list) {
    const at = `crawl-list[${e?.id || '?'}]`;
    const bad = (m) => errs.push(`${at}: ${m}`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e?.id || '')) bad('id は英小文字・数字・ハイフンだけ');
    if (ids.has(e.id)) bad('id が重複');
    ids.add(e.id);
    if (!/^https?:\/\/[^\s]+$/.test(e.url || '')) { bad('url が不正'); continue; }
    if (urls.has(e.url)) bad('url が重複');
    urls.add(e.url);
    if (!e.name) bad('name（サイトの名前）がありません');
    if (!KINDS_OK.includes(e.kind)) bad(`kind が不正: ${e.kind}（organizer / municipality / opendata）`);
    if (typeof e.active !== 'boolean') bad('active は true / false');
    const blocked = hostBlocked(e.url);
    if (blocked && e.active) bad(`情報源にしないサイト（${blocked}）は、active にできません`);
    if (e.active && e.terms?.ok !== true) bad('active にするには、terms.ok: true（利用規約・robots.txt の確認）が要ります');
    if (e.terms && ![true, false, null].includes(e.terms.ok)) bad('terms.ok は true / false / null');
    if (e.everyDays != null && !(Number.isInteger(e.everyDays) && e.everyDays >= 1)) bad('everyDays は1以上の整数');
  }
  return errs;
}

// 本文の指紋（空白・全角半角の違いは無視）
export const textHash = (text) => createHash('sha256').update(normalize(text)).digest('hex').slice(0, 16);

// 今回取るべきもの
export function planCrawl({ list, state, today, all = false }) {
  const plan = [];
  const skipped = [];
  for (const e of list) {
    if (!e.active) { skipped.push({ id: e.id, reason: '対象外（active: false）' }); continue; }
    const st = state[e.id] || {};
    if (st.fetchedAt === today) { skipped.push({ id: e.id, reason: '今日は取得済み' }); continue; }
    const every = e.everyDays || DEFAULT_EVERY_DAYS;
    if (!all && st.fetchedAt && diffDays(st.fetchedAt, today) < every) { skipped.push({ id: e.id, reason: `次は ${every} 日ごと` }); continue; }
    plan.push(e);
  }
  return { plan, skipped };
}

// 取得結果を、状態と「確認待ち」の一覧に反映する
export function applyCrawl({ entry, result, state, queue, today }) {
  const prev = state[entry.id] || {};
  const st = { ...prev, fetchedAt: today, httpStatus: result.status };
  let note;
  if (result.status === 304) {
    st.failCount = 0;
    note = '変更なし（304）';
  } else if (result.status === 200) {
    st.failCount = 0;
    if (result.etag) st.etag = result.etag; else delete st.etag;
    if (result.lastModified) st.lastModified = result.lastModified; else delete st.lastModified;
    const hash = textHash(result.text);
    st.len = result.text.length;
    if (!prev.hash) { note = '初回の取得'; queueAdd(queue, entry, today, 'new', hash); }
    else if (prev.hash !== hash) { note = '本文が変わりました'; st.changedAt = today; queueAdd(queue, entry, today, 'changed', hash); }
    else note = '変更なし';
    st.hash = hash;
  } else {
    st.failCount = (prev.failCount || 0) + 1;
    note = `取得できません（${result.status || result.error}）。連続 ${st.failCount} 回`;
  }
  state[entry.id] = st;
  return note;
}

// 同じサイトの「確認待ち」は1件だけ（新しい検知で、日付と指紋を更新）
export function queueAdd(queue, entry, today, reason, hash) {
  const cur = queue.find((q) => q.id === entry.id && q.status === 'pending');
  if (cur) { cur.detectedAt = today; cur.hash = hash; if (cur.reason !== 'new') cur.reason = reason; return; }
  queue.push({ id: entry.id, url: entry.url, name: entry.name, detectedAt: today, reason, hash, status: 'pending' });
}
