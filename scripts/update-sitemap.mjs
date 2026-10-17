// dist/sitemap.xml と dist/robots.txt を作る。
// 更新日は、ページの本文（<main>）のハッシュが変わった日（data/sitemap-lastmod.json に記録。補助金ネットと同じ考え方）。
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/dates.mjs';
import { SITE } from './lib/nav.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function mainHash(html) {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
  // 「○日 更新」のような、毎日変わる表示は除いて比べる
  const body = (m ? m[1] : html).replace(/\d{4}[/-]\d{2}[/-]\d{2} 更新|最終更新：\d{4}-\d{2}-\d{2}/g, '').replace(/\s+/g, ' ');
  return 'v1:' + createHash('sha256').update(body).digest('hex').slice(0, 16);
}

export function updateLastmod(state, pages, today) {
  const next = {};
  for (const [path, hash] of pages) {
    const prev = state[path];
    next[path] = prev && prev.hash === hash ? prev : { hash, lastmod: today };
  }
  return next;
}

function main() {
  const out = resolve(ROOT, arg('out') || 'dist');
  const today = arg('today') || todayJst();
  const stateFile = join(ROOT, 'data', 'sitemap-lastmod.json');
  const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {};
  const paths = JSON.parse(readFileSync(join(out, 'pages.json'), 'utf8'));
  const next = updateLastmod(state, paths.map((p) => [p, mainHash(readFileSync(join(out, p, 'index.html'), 'utf8'))]), today);
  writeFileSync(stateFile, JSON.stringify(next, null, 1) + '\n');
  const urls = paths.map((p) => `<url><loc>${SITE.url}${p}</loc><lastmod>${next[p].lastmod}</lastmod></url>`).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
  writeFileSync(join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE.url}/sitemap.xml\n`);
  console.log(`sitemap.xml：${paths.length} ページ`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
