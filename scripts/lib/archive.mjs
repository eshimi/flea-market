// 過去の開催の記録。日が過ぎた回のうち、公式で確認した回・中止・延期だけを残す（毎朝 scripts/update-archive.mjs が追記する）。
// きまりから算出しただけの回（scheduled）と、要確認の回（unknown）は残さない（実施されたかが分からないため）。
import { addDays } from './dates.mjs';
import { buildOccurrences } from './events.mjs';

export const ARCHIVE_STATUSES = ['confirmed', 'cancelled', 'postponed'];
export const MAX_CATCH_UP = 14; // 自動更新が止まったとき、さかのぼって追記する日数の上限

// その日の開催のうち、残すもの
export function snapshotDay(series, overrides, day) {
  return buildOccurrences(series, overrides, day, 0)
    .filter((o) => o.date === day && ARCHIVE_STATUSES.includes(o.status))
    .map((o) => ({ series: o.series.id, date: o.date, status: o.status, checkedAt: o.checkedAt, ...(o.note ? { note: o.note } : {}), source: o.source }));
}

// archive: { lastDate, items[] }。today より前の、まだ記録していない日を追記して返す
export function updateArchive(archive, series, overrides, today) {
  const items = [...(archive.items || [])];
  const seen = new Set(items.map((i) => `${i.series}|${i.date}`));
  const first = addDays(today, -MAX_CATCH_UP);
  let from = archive.lastDate ? addDays(archive.lastDate, 1) : addDays(today, -1);
  if (from < first) from = first;
  for (let d = from; d < today; d = addDays(d, 1)) {
    for (const i of snapshotDay(series, overrides, d)) if (!seen.has(`${i.series}|${i.date}`)) { items.push(i); seen.add(`${i.series}|${i.date}`); }
  }
  items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.series < b.series ? -1 : 1));
  const last = addDays(today, -1);
  return { lastDate: archive.lastDate && archive.lastDate > last ? archive.lastDate : last, items };
}

// 表示用: シリーズが今もあるものだけ、開催回の形（past: true）にする
export function pastOccurrences(archive, seriesList) {
  const byId = new Map(seriesList.map((s) => [s.id, s]));
  return (archive?.items || []).filter((i) => byId.has(i.series)).map((i) => ({ series: byId.get(i.series), date: i.date, status: i.status, checkedAt: i.checkedAt, note: i.note || null, source: i.source, past: true }));
}
