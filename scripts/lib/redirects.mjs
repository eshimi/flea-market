// 終了した催しの URL を、開催会場（スポット）のページ、なければ市区町村・県のページへ 301 でリダイレクトする（Cloudflare の静的ファイル配信の _redirects）。
// 対象：日付を列挙したきまり（dates 型）の単発の催し（日付が14日以内）で、最後の開催日から GRACE_DAYS 日をすぎたシリーズだけ。毎月などの定期市（日付を足し続ける一覧を含む）は、次回があるので対象にしない。
// 過去の開催の記録（/date/<過去の日>/）は残す。リダイレクトした催しのページは作らない（サイトマップにも出ない）。
import { addDays, diffDays } from './dates.mjs';

export const GRACE_DAYS = 30;
export const ONE_OFF_DAYS = 14;
export const MAX_RULES = 1900; // Cloudflare の _redirects の上限（静的な規則 2,000 行）より少なめ

export function endedSeries(series, occurrences, today, grace = GRACE_DAYS) {
  const limit = addDays(today, -grace);
  const lastRecorded = new Map();
  for (const o of occurrences) if (!lastRecorded.has(o.series) || o.date > lastRecorded.get(o.series)) lastRecorded.set(o.series, o.date);
  return series.filter((s) => {
    const d = s.recurrence?.dates;
    if (s.recurrence?.type !== 'dates' || !d?.length) return false;
    // 単発の催し（日付が14日以内にまとまっているもの）だけ。日付を足し続ける「毎月○回」などの一覧は、次の日付を足すので対象にしない
    if (diffDays(d[0], d.at(-1)) > ONE_OFF_DAYS) return false;
    const last = [d.at(-1), lastRecorded.get(s.id) || ''].sort().at(-1);
    return last < limit;
  });
}

// 行き先：スポット → 市区町村 → 県。すべて、いま作っているページだけ
export function redirectTarget(s, { spotIds, cities, prefs }) {
  const v = s.venue;
  if (s.venueId && spotIds.has(s.venueId)) return `/spot/${s.venueId}/`;
  if (v.cityCode && cities.has(v.cityCode)) return `/area/${v.pref}/${v.cityCode}/`;
  if (prefs.has(v.pref)) return `/area/${v.pref}/`;
  return '/area/';
}

export function redirectRules(ended, ctx) {
  const lines = [];
  for (const s of ended) {
    const to = redirectTarget(s, ctx);
    for (const [from, dest] of [[`/e/${s.id}`, to], [`/ja/e/${s.id}`, `/ja${to}`]]) {
      lines.push(`${from}/ ${dest} 301`, `${from} ${dest} 301`);
    }
  }
  return lines;
}
