// 公式の所在地から位置を求める（国土地理院 住所検索。1.2秒に1回）。結果を見て、番地まで合っていない（町・丁目だけ）ものは、地図が目安になる。
import { readFileSync, writeFileSync } from 'node:fs';
import { PREFS } from '../../scripts/lib/areas.mjs';
const series = JSON.parse(readFileSync(new URL('../../data/series.json', import.meta.url), 'utf8'));
const out = {};
for (const s of series.filter((x) => x.venue.address)) {
  let q = s.venue.address;
  if (!q.startsWith(PREFS[s.venue.pref])) q = (s.venue.pref === '26' || s.venue.pref === '27' || s.venue.pref === '01') && /^(京都|大阪|札幌)市/.test(q) ? PREFS[s.venue.pref] + q : q.startsWith('東京都') ? q : PREFS[s.venue.pref] + q;
  const r = await fetch('https://msearch.gsi.go.jp/address-search/AddressSearch?q=' + encodeURIComponent(q), { headers: { 'User-Agent': 'FleaMarketJP/1.0 (+https://streetbazaars.jp)' } });
  const j = await r.json();
  const f = j[0];
  out[s.id] = { query: q, name: s.venue.name, cands: j.length, title: f?.properties.title, lon: f?.geometry.coordinates[0], lat: f?.geometry.coordinates[1] };
  console.log(s.id.padEnd(48), q, '=>', f?.properties.title, f?.geometry.coordinates.join(','), `(${j.length})`);
  await new Promise((r) => setTimeout(r, 1200));
}
import { mkdirSync } from 'node:fs';
const work = (process.env.MAPS_WORK || '/tmp/maps-work');
mkdirSync(work, { recursive: true });
writeFileSync(work + '/geo-raw.json', JSON.stringify(out, null, 1));
