// マップで探すページ：/map/（英語）と /ja/map/。位置（data/geo.json）がある市を、地図の上に出す
// 地図は Leaflet（static/vendor/leaflet。BSD-2）と、国土地理院の地理院タイル。位置は、公式の所在地や会場名から求めた目安
import { langPath, prefLabel } from './l10n.mjs';
import { S } from './i18n.mjs';
import { breadcrumb, esc } from './html.mjs';
import { isActive } from './events.mjs';
import { cityL, nameL, timeEn, venueL } from './tr-en.mjs';

const T = {
  ja: {
    crumb: 'マップで探す', h1: 'マップで探すフリマ・蚤の市', title: 'マップで探す', desc: '全国のフリーマーケット・蚤の市・骨董市・手作り市・マルシェを、地図の上で探せます。日付・種類・地域で絞り込み。',
    lead: '位置がわかる市を、地図の上に出しています。位置は、公式の所在地や会場名から求めた目安です。',
    when: '日付', weekend: '今週末', d7: '今後7日', d30: '今後30日', all: 'すべて（今後120日）', kind: '種類', pref: '地域', allPrefs: 'すべての地域', allKinds: 'すべて',
    countTpl: '{n}件を表示', none: '条件に合う市は、地図にありません。条件を変えてみてください。', locate: '現在地へ', locating: '現在地を調べています…', locFail: '現在地を取得できませんでした。',
    next: '次回', open: '開催詳細を見る', approx: '位置は目安', list: '一覧', credit: '地図：国土地理院（地理院タイル）', noscript: '地図には JavaScript が必要です。一覧は「今週末」「地域」のページからご覧ください。',
    unlocated: (n) => `位置が未確認の市が${n}件あります（地図には出ません）。`, locNote: '「現在地へ」を押すと、ブラウザが位置情報の許可を求めます。位置は、地図を動かすためだけに使い、送信・保存はしません。',
  },
  en: {
    crumb: 'Search by map', h1: 'Flea markets on the map', title: 'Search by map', desc: 'Find flea markets, antique fairs, handmade markets and marchés across Japan on a map. Filter by date, type and area.',
    lead: 'Markets whose location is known are shown on the map. Locations are estimates from the official address or the venue name.',
    when: 'Date', weekend: 'This weekend', d7: 'Next 7 days', d30: 'Next 30 days', all: 'All (next 120 days)', kind: 'Type', pref: 'Area', allPrefs: 'All areas', allKinds: 'All',
    countTpl: '{n} shown', none: 'No markets match. Try changing the filters.', locate: 'My location', locating: 'Finding your location…', locFail: 'Could not get your location.',
    next: 'Next', open: 'View details', approx: 'Approximate location', list: 'List', credit: 'Map: Geospatial Information Authority of Japan (GSI tiles)', noscript: 'The map needs JavaScript. Browse by “This weekend” or “Area” instead.',
    unlocated: (n) => `${n} markets have no confirmed location and are not on the map.`, locNote: 'Pressing “My location” makes your browser ask for permission. The location is used only to move the map; it is not sent or stored.',
  },
};
export const mapText = (lang) => T[lang];

const short = (x) => String(x || '').split(/[（(。]|\.\s|\s\(/)[0].trim();

// 地図のデータ（日英を1つのファイルに。位置があり、今後の開催がある市だけ）
export function mapData(ctx, geo, ended = new Set()) {
  const out = [];
  let unlocated = 0;
  for (const s of ctx.series) {
    if (ended.has(s.id)) continue;
    const dates = ctx.occ.filter((o) => o.series.id === s.id && isActive(o)).map((o) => o.date);
    if (!dates.length) continue;
    const g = geo[s.id] || (s.venueId && geo[`spot-${s.venueId}`]);
    if (!g || typeof g.lat !== 'number' || typeof g.lon !== 'number') { unlocated++; continue; }
    out.push({
      id: s.id, lat: +g.lat.toFixed(5), lon: +g.lon.toFixed(5), pr: g.precision || '',
      pref: s.venue.pref, k: s.kinds,
      n: [s.name, nameL(s, 'en')],
      v: [[s.venue.city, s.venue.name].filter(Boolean).join(' '), [cityL(s.venue.city, 'en') || prefLabel(s.venue.pref, 'en'), venueL(s, 'en')].filter(Boolean).join(', ')],
      t: [short(s.time?.text), short(timeEn(s) || s.time?.text)],
      d: dates.slice(0, 16),
    });
  }
  return { items: out, unlocated };
}

export function mapPage(ctx, lang, data, today, weekend) {
  const t = T[lang];
  const prefs = [...new Set(data.items.map((x) => x.pref))].sort();
  const tj = Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v !== 'function'));
  const i18n = {
    t: tj, today, weekend,
    kinds: Object.fromEntries(Object.entries(S[lang].kinds)),
    prefs: Object.fromEntries(prefs.map((p) => [p, prefLabel(p, lang)])),
    lang,
  };
  const body = `<div class="in page mk-page">${breadcrumb([{ label: t.crumb }], lang)}
<h1>${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p>
<div id="mk-root" data-src="/map-data.json" data-lang="${lang}">
<div class="mk-bar" role="group" aria-label="${esc(t.crumb)}"></div>
<div class="mk-grid"><div class="mk-side"><p class="mk-count" aria-live="polite"></p><ol class="mk-list"></ol></div><div class="mk-mapwrap"><div id="mk-map" role="application" aria-label="${esc(t.crumb)}"></div></div></div>
</div>
<noscript><p class="note">${esc(t.noscript)}</p></noscript>
<p class="note mk-note">${esc(t.unlocated(data.unlocated))} ${esc(t.locNote)}</p>
<p class="note">${esc(t.credit)} ／ Leaflet</p>
<script type="application/json" id="mk-i18n">${JSON.stringify(i18n).replace(/</g, '\\u003c')}</script></div>`;
  return { path: langPath('/map/', lang), lang, title: t.title, description: t.desc, body, css: ['/vendor/leaflet/leaflet.css', '/map-page.css'], scripts: ['/vendor/leaflet/leaflet.js', '/map-page.js'], keywords: [t.crumb] };
}
