// スポット（会場）。data/venues.json と、series.json の venueId から作る。
// 会場の説明は公式の事実だけ（書いていない項目は省く＝ページでは「要確認」）。日程は新しく作らず、紐づくシリーズの開催回を集める。
import { PREFS } from './areas.mjs';
import { addDays } from './dates.mjs';
import { isActive } from './events.mjs';

export const SPOT_KINDS = {
  park: { ja: '公園', en: 'Park' },
  plaza: { ja: '広場', en: 'Plaza' },
  racecourse: { ja: '競馬場', en: 'Racecourse' },
  commercial: { ja: '商業施設', en: 'Commercial facility' },
  shrine: { ja: '神社・寺', en: 'Shrine / Temple' },
  other: { ja: 'その他', en: 'Other' },
};
const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HTTP_RE = /^https?:\/\//;

export function validateVenues(venues, series, sources = []) {
  const errs = [];
  if (!Array.isArray(venues)) return ['venues.json は配列にしてください'];
  const ids = new Set();
  const ledger = new Map(sources.map((s) => [s.url, s]));
  for (const v of venues) {
    const e = (m) => errs.push(`venues[${v?.id || '?'}]: ${m}`);
    if (!v?.id || !ID_RE.test(v.id)) e('id は英小文字・数字・ハイフンだけ');
    if (ids.has(v.id)) e('id が重複');
    ids.add(v.id);
    if (!v.name) e('name がありません');
    if (!SPOT_KINDS[v.kind]) e(`kind が不正: ${v.kind}`);
    const a = v.area || {};
    if (!PREFS[a.pref]) e(`area.pref が不正: ${a.pref}`);
    if (a.cityCode && !/^\d{5}$/.test(a.cityCode)) e('area.cityCode は5桁');
    if (a.cityCode && a.pref && !a.cityCode.startsWith(a.pref)) e('area.cityCode と pref が合いません');
    if (a.cityCode && !a.city) e('area.cityCode があるのに area.city がありません');
    if (v.officialUrl && !HTTP_RE.test(v.officialUrl)) e('officialUrl が不正');
    if (v.image) {
      const im = v.image;
      for (const k of ['file', 'altJa', 'altEn', 'author', 'license', 'sourceUrl']) if (!im[k]) e(`image.${k} がありません（作者・ライセンス・出典の表示が必要）`);
      if (im.file && !/^[a-z0-9-]+\.webp$/.test(im.file)) e('image.file は英小文字・数字・ハイフンの .webp');
      if (im.sourceUrl && !HTTP_RE.test(im.sourceUrl)) e('image.sourceUrl が不正');
    }
    if (!Array.isArray(v.sources) || !v.sources.length) e('sources（出典）がありません');
    else for (const s of v.sources) {
      if (!HTTP_RE.test(s.url || '')) e(`sources.url が不正: ${s.url}`);
      if (!['official', 'municipal'].includes(s.type)) e(`sources.type が不正: ${s.type}`);
      if (!/^\d{4}-\d\d-\d\d$/.test(s.checkedAt || '')) e(`sources.checkedAt が不正: ${s.checkedAt}`);
      const l = ledger.get(s.url);
      if (sources.length && !l) e(`出典 ${s.url} が sources.json にありません`);
      else if (l && !(l.venues || []).includes(v.id)) e(`sources.json の ${s.url} の venues に ${v.id} を足してください`);
    }
  }
  for (const s of series) if (s.venueId && !ids.has(s.venueId)) errs.push(`series[${s.id}]: venueId ${s.venueId} が venues.json にありません`);
  return errs;
}

// 会場ごとの開催のまとめ。occ は buildOccurrences の結果（今日から WINDOW_DAYS 日）
export function buildSpots(venues, series, occ, today) {
  const soon = addDays(today, 30);
  return venues.map((v) => {
    const mine = series.filter((s) => s.venueId === v.id);
    const ids = new Set(mine.map((s) => s.id));
    const list = occ.filter((o) => ids.has(o.series.id));
    const active = list.filter(isActive);
    const next = active[0] || null;
    return { venue: v, series: mine, occ: list, active, next, count: active.length, soon: active.some((o) => o.date <= soon) };
  }).sort((a, b) => (a.venue.area.cityCode || '99999').localeCompare(b.venue.area.cityCode || '99999') || a.venue.name.localeCompare(b.venue.name, 'ja'));
}
