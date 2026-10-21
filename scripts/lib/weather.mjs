// 天気予報の取得先（気象庁の予報 JSON）の地域。県ごとの府県予報区コードと、細分の地域（一次細分区域）。
// 気象庁の JSON は /api/weather/<府県予報区コード> で中継する（src/worker.js）。地域が決まらない県は、予報なし。
const OFFICE = { '01': '016000', '11': '110000', '12': '120000', '13': '130000', '26': '260000', '27': '270000' };
// 一次細分区域（コード）。県の既定と、市区町村ごとの上書き
const AREA = { '01': '016010', '11': '110010', '12': '120010', '13': '130010', '26': '260010', '27': '270000' };
const AREA_BY_CITY = { 羽生市: '110020' };

// シリーズ → { office, area }（県が未対応なら null）
export function weatherTarget(s) {
  const office = OFFICE[s.venue.pref];
  if (!office) return null;
  return { office, area: AREA_BY_CITY[s.venue.city] || AREA[s.venue.pref] };
}

// 地図・経路のリンク（Google マップ。API キー不要）。住所があれば住所、なければ会場名＋市区町村
export function mapQuery(s) {
  const v = s.venue;
  if (v.address) return { q: v.address, exact: true };
  return { q: [v.name, v.city].filter(Boolean).join(' '), exact: false };
}
// geo：公式に住所がないとき、会場名から地図で調べた位置（目安。data/geo.json の precision: 'name'）。あれば緯度経度で開く
export const mapUrls = (s, lang, geo = null) => {
  const pin = geo?.precision === 'name' && geo.lat != null && geo.lon != null;
  const { q, exact } = pin ? { q: `${geo.lat},${geo.lon}`, exact: false } : mapQuery(s);
  const e = encodeURIComponent(q);
  const hl = lang === 'ja' ? 'ja' : 'en';
  return {
    exact,
    pin,
    searched: !pin && s.venue.address && s.venue.addressFrom === 'search',
    open: `https://www.google.com/maps/search/?api=1&query=${e}&hl=${hl}`,
    route: `https://www.google.com/maps/dir/?api=1&destination=${e}&travelmode=transit&hl=${hl}`,
  };
};
