// dist/sitemap.xml と dist/robots.txt を作る。
// 更新日は、ページの本文（<main>）のハッシュが変わった日（data/sitemap-lastmod.json に記録。補助金ネットと同じ考え方）。
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { todayJst } from './lib/dates.mjs';
import { INDEXABLE, SITE } from './lib/nav.mjs';
import { langPath, splitPath } from './lib/l10n.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function mainHash(html) {
  const m = /<main[^>]*>([\s\S]*?)<\/main>/.exec(html);
  // 「○日 更新」のような、毎日変わる表示は除いて比べる
  const body = (m ? m[1] : html).replace(/\d{4}[/-]\d{2}[/-]\d{2} 更新|最終更新：\d{4}-\d{2}-\d{2}|Last updated: \d{4}-\d{2}-\d{2}|Last updated: [A-Z][a-z]{2} \d{1,2}, \d{4}|最終更新日：\d{4}年\d{1,2}月\d{1,2}日/g, '').replace(/\s+/g, ' ');
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
  // 静的に追加するメディア紹介ページも、存在する場合はサイトマップへ含める。
  for (const p of ['/press/', '/ja/press/']) {
    if (existsSync(join(out, p, 'index.html')) && !paths.includes(p)) paths.push(p);
  }
  const next = updateLastmod(state, paths.map((p) => [p, mainHash(readFileSync(join(out, p, 'index.html'), 'utf8'))]), today);
  writeFileSync(stateFile, JSON.stringify(next, null, 1) + '\n');
  // 英語（既定）と日本語は、お互いを hreflang で示す
  const urls = paths.map((p) => {
    const { base } = splitPath(p);
    const alt = [['en', langPath(base, 'en')], ['ja', langPath(base, 'ja')], ['x-default', langPath(base, 'en')]].map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE.url}${h}"/>`).join('');
    return `<url><loc>${SITE.url}${p}</loc><lastmod>${next[p].lastmod}</lastmod>${alt}</url>`;
  }).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
  writeFileSync(join(out, 'robots.txt'), INDEXABLE ? `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${SITE.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  console.log(`sitemap.xml：${paths.length} ページ`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
