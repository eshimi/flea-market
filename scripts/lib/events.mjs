// シリーズ（data/series.json）と、開催回ごとの確認結果（data/occurrences.json）から、表示用の開催の一覧を作る。
import { addDays, diffDays, parseYmd } from './dates.mjs';
import { expand, validateRecurrence } from './recurrence.mjs';
import { KINDS } from './kinds.mjs';
import { PREFS } from './areas.mjs';

// 最終確認から、この日数を超えたものは「要確認」にする
export const STALE_DAYS = 14;
// 一覧に出す期間（今日から）
export const WINDOW_DAYS = 120;

export const OCC_STATUSES = ['confirmed', 'cancelled', 'postponed', 'unknown'];
export const SOURCE_TYPES = ['organizer', 'municipality', 'opendata', 'submission'];

const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_RE = /^https?:\/\/[^\s]+$/;

export function validateSeries(list) {
  const errs = [];
  const ids = new Set();
  if (!Array.isArray(list)) return ['series.json は配列にしてください'];
  for (const s of list) {
    const at = `series[${s?.id || '?'}]`;
    const e = (m) => errs.push(`${at}: ${m}`);
    if (!s?.id || !ID_RE.test(s.id)) e('id は英小文字・数字・ハイフンだけ');
    if (ids.has(s.id)) e('id が重複');
    ids.add(s.id);
    if (!s.name) e('name がありません');
    if (!Array.isArray(s.kinds) || !s.kinds.length || !s.kinds.every((k) => KINDS[k])) e(`kinds が不正: ${JSON.stringify(s.kinds)}`);
    if (!s.organizer?.name) e('organizer.name がありません');
    if (s.organizer?.url && !HTTP_RE.test(s.organizer.url)) e('organizer.url が不正');
    // 公式に記載がなく、ネットで調べて補った項目（値は通常の項目に書き、ここに出典の URL を書く）
    for (const [k, u] of Object.entries(s.searched || {})) {
      if (!['time', 'admission', 'rain', 'fee', 'apply', 'notes'].includes(k)) e(`searched.${k} は項目名として不正`);
      if (!HTTP_RE.test(u || '')) e(`searched.${k} の出典 URL が不正`);
    }
    const v = s.venue || {};
    if (!v.name) e('venue.name がありません');
    if (!PREFS[v.pref]) e(`venue.pref（都道府県コード）が不正: ${v.pref}`);
    if (v.cityCode && !/^\d{5}$/.test(v.cityCode)) e('venue.cityCode は5桁');
    if (v.cityCode && v.pref && !v.cityCode.startsWith(v.pref)) e('venue.cityCode と pref が合いません');
    if (v.cityCode && !v.city) e('venue.cityCode があるのに venue.city がありません');
    for (const m of validateRecurrence(s.recurrence)) e(m);
    if (!Array.isArray(s.sources) || !s.sources.length) e('sources（出典）がありません');
    else for (const src of s.sources) {
      if (!HTTP_RE.test(src.url || '')) e(`sources.url が不正: ${src.url}`);
      if (!SOURCE_TYPES.includes(src.type)) e(`sources.type が不正: ${src.type}`);
      try { parseYmd(src.checkedAt); } catch { e(`sources.checkedAt が不正: ${src.checkedAt}`); }
    }
  }
  return errs;
}

export function validateOccurrences(list, seriesIds) {
  const errs = [];
  if (!Array.isArray(list)) return ['occurrences.json は配列にしてください'];
  const seen = new Set();
  for (const o of list) {
    const at = `occurrences[${o?.series} ${o?.date}]`;
    const e = (m) => errs.push(`${at}: ${m}`);
    if (!seriesIds.has(o.series)) e('series が series.json にありません');
    try { parseYmd(o.date); } catch { e('date が不正'); }
    if (seen.has(`${o.series}|${o.date}`)) e('同じ開催回が重複');
    seen.add(`${o.series}|${o.date}`);
    if (!OCC_STATUSES.includes(o.status)) e(`status が不正: ${o.status}`);
    if (o.status === 'postponed' && o.movedTo) try { parseYmd(o.movedTo); } catch { e('movedTo が不正'); }
    try { parseYmd(o.checkedAt); } catch { e('checkedAt が不正'); }
    if (!HTTP_RE.test(o.source || '')) e('source（確認した公式のURL）がありません');
  }
  return errs;
}

// 情報源の台帳（data/sources.json）：シリーズの出典はすべて台帳にあること。terms は利用規約の確認結果
export function validateSources(sources, series) {
  const errs = [];
  if (!Array.isArray(sources)) return ['sources.json は配列にしてください'];
  const urls = new Map(sources.map((s) => [s.url, s]));
  if (urls.size !== sources.length) errs.push('sources.json に同じ URL が重複');
  const ids = new Set(series.map((s) => s.id));
  for (const src of sources) {
    const e = (m) => errs.push(`sources[${src.url}]: ${m}`);
    if (!HTTP_RE.test(src.url || '')) e('url が不正');
    if ((!Array.isArray(src.series) || !src.series.length) && !(src.venues || []).length) e('series（この出典を使うシリーズ）がありません');
    else for (const id of src.series || []) if (!ids.has(id)) e(`series に ${id} がありません`);
    if (!src.terms || ![true, false, null].includes(src.terms.ok)) e('terms.ok は true / false / null（未確認）');
    else if (src.terms.ok !== null) try { parseYmd(src.terms.checkedAt); } catch { e('terms.checkedAt（利用規約を確認した日）が不正'); }
  }
  for (const s of series) for (const x of s.sources || []) {
    const src = urls.get(x.url);
    if (!src) errs.push(`series[${s.id}]: 出典 ${x.url} が sources.json にありません`);
    else if (!src.series?.includes(s.id)) errs.push(`sources[${x.url}]: series に ${s.id} を足してください`);
  }
  return errs;
}

// シリーズの最終確認日（出典のうち、いちばん新しい日）
export function lastChecked(series) {
  return series.sources.map((s) => s.checkedAt).sort().at(-1);
}

// 表示用の状態:
//   confirmed … その回を公式で確認した
//   scheduled … 繰り返しのきまり（毎月第n曜日など）から算出（きまり自体は最終確認日に公式で確認）
//   cancelled / postponed … 中止・延期（消さずに出す）
//   unknown   … 要確認（公式で確認できない、または最終確認が古い）
export function buildOccurrences(seriesList, overrides, today, days = WINDOW_DAYS) {
  const end = addDays(today, days);
  const byKey = new Map(overrides.map((o) => [`${o.series}|${o.date}`, o]));
  const out = [];
  for (const s of seriesList) {
    const checked = lastChecked(s);
    const stale = diffDays(checked, today) > STALE_DAYS;
    const dates = new Set(expand(s.recurrence, today, end));
    // きまりの外で、公式に個別に載っている回（臨時開催・延期先など）
    for (const o of overrides) if (o.series === s.id && o.date >= today && o.date <= end) dates.add(o.date);
    for (const date of [...dates].sort()) {
      const o = byKey.get(`${s.id}|${date}`);
      let status;
      let checkedAt;
      let note = null;
      if (o) {
        status = o.status;
        checkedAt = o.checkedAt;
        if (status === 'postponed') note = o.movedTo ? `延期（${o.movedTo} に変更）` : '延期（日程は要確認）';
        if (o.reason) note = note ? `${note}：${o.reason}` : o.reason;
        if (status === 'confirmed' && diffDays(checkedAt, today) > STALE_DAYS) {
          status = 'unknown';
          note = `最終確認から${STALE_DAYS}日を超えています`;
        }
      } else {
        // 日付を列挙したきまり（dates）は、公式の日程表の日付そのものを出典で確認しているので「公式で確認」
        status = stale ? 'unknown' : s.recurrence.type === 'dates' ? 'confirmed' : 'scheduled';
        checkedAt = checked;
        if (stale) note = `最終確認から${STALE_DAYS}日を超えています`;
      }
      out.push({ series: s, date, status, checkedAt, note, source: o?.source || s.sources[0].url });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.series.name.localeCompare(b.series.name, 'ja')));
}

// 一覧で「行ける」開催として数えるもの（中止は除く）
export function isActive(o) {
  return o.status !== 'cancelled' && o.status !== 'postponed';
}
