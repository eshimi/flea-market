// 過去の開催の記録を追記する（毎朝の自動更新で、npm run build の前に実行）。data/archive.json に保存する。
// 使い方: node scripts/update-archive.mjs [--today=YYYY-MM-DD] [--data=dir]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/dates.mjs';
import { updateArchive } from './lib/archive.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function run(dataDir, today) {
  const read = (f) => JSON.parse(readFileSync(join(dataDir, f), 'utf8'));
  const file = join(dataDir, 'archive.json');
  const before = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { lastDate: null, items: [] };
  const next = updateArchive(before, read('series.json'), read('occurrences.json'), today);
  writeFileSync(file, JSON.stringify(next, null, 1) + '\n');
  return { added: next.items.length - before.items.length, total: next.items.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = run(resolve(arg('data') || join(ROOT, 'data')), arg('today') || todayJst());
  console.log(`過去の開催の記録：${r.added} 件を追記（合計 ${r.total} 件）`);
}
