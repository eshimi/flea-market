// 開催の繰り返しのきまりから、期間内の開催日を出す。
// きまりの形（data/series.json の recurrence）:
//   { "type": "monthly-nth", "byday": [{ "n": 1, "wd": 0 }], "text": "毎月第1日曜" }   n = -1 は最終週
//   { "type": "monthly-day", "days": [28], "text": "毎月28日" }
//   { "type": "weekly", "weekdays": [0, 6], "text": "毎週土・日曜" }
//   { "type": "dates", "dates": ["2026-12-15", "2026-12-16"], "text": "…" }
// 共通の追加項目: "exceptMonths": [1, 8]（その月は開かない）、"from" / "until"（このきまりが有効な期間）
import { addDays, daysInMonth, nthWeekday, parseYmd, weekday, ymd } from './dates.mjs';

export const TYPES = ['monthly-nth', 'monthly-day', 'weekly', 'dates'];

export function validateRecurrence(r) {
  const errs = [];
  if (!r || typeof r !== 'object') return ['recurrence がありません'];
  if (!TYPES.includes(r.type)) errs.push(`recurrence.type が不明: ${r.type}`);
  if (!r.text) errs.push('recurrence.text（公式の書き方）がありません');
  const wdOk = (w) => Number.isInteger(w) && w >= 0 && w <= 6;
  if (r.type === 'monthly-nth') {
    if (!Array.isArray(r.byday) || !r.byday.length) errs.push('byday がありません');
    else for (const b of r.byday) {
      if (![1, 2, 3, 4, 5, -1].includes(b.n) || !wdOk(b.wd)) errs.push(`byday が不正: ${JSON.stringify(b)}`);
    }
  }
  if (r.type === 'monthly-day' && !(Array.isArray(r.days) && r.days.length && r.days.every((d) => Number.isInteger(d) && d >= 1 && d <= 31))) errs.push('days が不正');
  if (r.type === 'weekly' && !(Array.isArray(r.weekdays) && r.weekdays.length && r.weekdays.every(wdOk))) errs.push('weekdays が不正');
  if (r.type === 'dates') {
    if (!Array.isArray(r.dates) || !r.dates.length) errs.push('dates がありません');
    else for (const d of r.dates) {
      try { parseYmd(d); } catch (e) { errs.push(e.message); }
    }
  }
  for (const k of ['from', 'until']) {
    if (r[k]) try { parseYmd(r[k]); } catch (e) { errs.push(`${k}: ${e.message}`); }
  }
  return errs;
}

// start 〜 end（両端を含む）の開催日を、昇順で返す
export function expand(r, start, end) {
  const lo = r.from && r.from > start ? r.from : start;
  const hi = r.until && r.until < end ? r.until : end;
  if (lo > hi) return [];
  const out = new Set();
  const inRange = (s) => s && s >= lo && s <= hi;
  if (r.type === 'dates') {
    for (const d of r.dates) if (inRange(d)) out.add(d);
  } else if (r.type === 'weekly') {
    for (let s = lo; s <= hi; s = addDays(s, 1)) if (r.weekdays.includes(weekday(s))) out.add(s);
  } else {
    const a = parseYmd(lo);
    const b = parseYmd(hi);
    for (let y = a.getUTCFullYear(), m = a.getUTCMonth() + 1; y < b.getUTCFullYear() || (y === b.getUTCFullYear() && m <= b.getUTCMonth() + 1); m === 12 ? (y++, m = 1) : m++) {
      if (r.type === 'monthly-nth') {
        for (const { n, wd } of r.byday) {
          const s = nthWeekday(y, m, n, wd);
          if (inRange(s)) out.add(s);
        }
      } else {
        for (const d of r.days) if (d <= daysInMonth(y, m)) {
          const s = ymd(y, m, d);
          if (inRange(s)) out.add(s);
        }
      }
    }
  }
  const ex = r.exceptMonths || [];
  return [...out].filter((s) => !ex.includes(parseYmd(s).getUTCMonth() + 1)).sort();
}

