// 自動のブログ記事を作る（毎朝の自動更新で、npm run build の前に実行）。作った記事は data/blog-auto/ に保存する。
// 使い方: node scripts/generate-blog.mjs [--today=YYYY-MM-DD] [--data=dir]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/dates.mjs';
import { buildOccurrences } from './lib/events.mjs';
import { generate } from './lib/autoblog.mjs';
import { setTranslations } from './lib/tr-en.mjs';
import { loadData } from './build-site.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function run(dataDir, today) {
  const data = loadData(dataDir);
  setTranslations(data.translations);
  const dir = join(dataDir, 'blog-auto');
  mkdirSync(dir, { recursive: true });
  const existing = new Set(readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'state.json').map((f) => f.replace(/\.json$/, '')));
  const stateFile = join(dir, 'state.json');
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : null;
  const occ = buildOccurrences(data.series, data.occurrences, today);
  const { posts, state: next } = generate({ series: data.series, occ, today, existing, state, venues: (data.venues || []).map((v) => ({ ...v, name_en: data.translations?.venues?.[v.id]?.name })) });
  for (const p of posts) writeFileSync(join(dir, `${p.slug}.json`), JSON.stringify(p, null, 1) + '\n');
  writeFileSync(stateFile, JSON.stringify(next, null, 1) + '\n');
  return posts;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const posts = run(arg('data') ? resolve(ROOT, arg('data')) : join(ROOT, 'data'), arg('today') || todayJst());
  console.log(posts.length ? `ブログ記事を ${posts.length} 件作りました：${posts.map((p) => p.slug).join('、')}` : 'ブログ記事：今日は作るものがありません');
}
