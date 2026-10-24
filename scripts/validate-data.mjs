// data/series.json と data/occurrences.json の形を検証する。問題があれば、一覧を出して終了コード 1
import { loadData } from './build-site.mjs';
import { readFileSync } from 'node:fs';
import { validateCrawlList } from './lib/crawl.mjs';
import { validateVenues } from './lib/spots.mjs';
import { validateHub } from './lib/hub.mjs';
import { KINDS } from './lib/kinds.mjs';
import { PREFS } from './lib/areas.mjs';
import { validateOccurrences, validateSeries, validateSources } from './lib/events.mjs';

const { series, occurrences, venues, hub } = loadData();
const sources = JSON.parse(readFileSync(new URL('../data/sources.json', import.meta.url), 'utf8'));
const crawl = JSON.parse(readFileSync(new URL('../data/crawl-list.json', import.meta.url), 'utf8'));
const hubCheck = validateHub(hub, { prefs: new Set(Object.keys(PREFS)), cities: new Set(series.map((s) => s.venue.cityCode).filter(Boolean)), kinds: new Set(Object.keys(KINDS)) });
if (hubCheck.warns.length) console.warn(hubCheck.warns.map((w) => `注意：${w}`).join('\n'));
const errs = [...hubCheck.errs, ...validateCrawlList(crawl), ...validateSources(sources, series), ...validateSeries(series), ...validateVenues(venues, series, sources), ...validateOccurrences(occurrences, new Set(series.map((s) => s.id)))];
if (errs.length) {
  console.error(errs.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log(`データの検証：シリーズ ${series.length} 件、開催回の確認 ${occurrences.length} 件、情報源 ${sources.length} 件、巡回するサイト ${crawl.length} 件、問題なし`);
