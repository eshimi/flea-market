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

// サイトマップに入れないページ（検索に載せる価値のないもの）。ふだんは build-site.mjs が pages.json に入れないが、念のためここでも除く：
//  .html（404 など）、.ics（カレンダー追加のファイル）、検索（/search/）、マイリスト（/saved/）、管理画面（/admin/）。
//  noindex のページ（開催が0件の地域・終わった催し・月別ブログ・2ページ目以降の一覧など）は、build-site.mjs が pages.json から除いている
export const SITEMAP_EXCLUDE = [/\.(html|ics)$/, /\/ics\//, /^\/(ja\/)?(search|saved|admin)\//];
export const sitemapPaths = (paths) => paths.filter((p) => !SITEMAP_EXCLUDE.some((re) => re.test(p)));

// 1件分の <url>。hreflang（en・ja・x-default）は、相手の言語のページも、サイトマップにあるときだけ出す（なければ、ないページを示さない）
export function sitemapUrl(p, lastmod, inMap, siteUrl = SITE.url) {
  const { base } = splitPath(p);
  const en = langPath(base, 'en');
  const ja = langPath(base, 'ja');
  const alt = inMap.has(en) && inMap.has(ja)
    ? [['en', en], ['ja', ja], ['x-default', en]].map(([l, h]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${siteUrl}${h}"/>`).join('')
    : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) throw new Error(`lastmod の形式が不正: ${p} ${lastmod}`);
  return `<url><loc>${siteUrl}${p}</loc><lastmod>${lastmod}</lastmod>${alt}</url>`;
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
  const paths = sitemapPaths(JSON.parse(readFileSync(join(out, 'pages.json'), 'utf8')));
  const next = updateLastmod(state, paths.map((p) => [p, mainHash(readFileSync(join(out, p, 'index.html'), 'utf8'))]), today);
  writeFileSync(stateFile, JSON.stringify(next, null, 1) + '\n');
  // 英語（既定）と日本語は、お互いを hreflang で示す
  const inMap = new Set(paths);
  const urls = paths.map((p) => sitemapUrl(p, next[p].lastmod, inMap)).join('\n');
  writeFileSync(join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`);
  writeFileSync(join(out, 'robots.txt'), INDEXABLE ? `User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /ics/\nDisallow: /ja/ics/\nSitemap: ${SITE.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
  console.log(`sitemap.xml：${paths.length} ページ`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
