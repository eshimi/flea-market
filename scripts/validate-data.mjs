// data/series.json と data/occurrences.json の形を検証する。問題があれば、一覧を出して終了コード 1
import { loadData } from './build-site.mjs';
import { validateOccurrences, validateSeries } from './lib/events.mjs';

const { series, occurrences } = loadData();
const errs = [...validateSeries(series), ...validateOccurrences(occurrences, new Set(series.map((s) => s.id)))];
if (errs.length) {
  console.error(errs.map((e) => `- ${e}`).join('\n'));
  process.exit(1);
}
console.log(`データの検証：シリーズ ${series.length} 件、開催回の確認 ${occurrences.length} 件、問題なし`);
