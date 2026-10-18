// ページの共通の枠（ヘッダー・フッター・免責）と、HTML の小さな部品
import { FOOTER_GROUPS, INDEXABLE, SITE, TOP_LINKS } from './nav.mjs';
import { KINDS } from './kinds.mjs';
import { label } from './dates.mjs';
import { icon, logoSvg } from './icons.mjs';
import { T } from './i18n.mjs';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const DISCLAIMER = '開催の有無・内容は、変わることがあります。お出かけ・お申込みの前に、必ず主催者の公式情報でご確認ください。';

// ヘッダー（全ページ共通）。言語切替は /en/（英語のトップ）と /（日本語）への link
export function siteHeader(path, lang = 'ja') {
  const t = T[lang];
  const nav = TOP_LINKS.map((l) => `<a href="${l.href}"${path.startsWith(l.href) ? ' aria-current="page"' : ''}>${icon(l.icon, 17)}<span>${esc(t.nav[l.key])}</span></a>`).join('');
  return `<header class="site-head2"><div class="hd-in">
<a class="brand" href="${lang === 'en' ? '/en/' : '/'}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>FLEA MARKET JP</b><small>${esc(t.tagline)}</small></span></a>
<input type="checkbox" id="nav-t" class="nav-t" aria-hidden="true">
<label for="nav-t" class="burger" aria-label="${esc(t.menu)}">${icon('menu', 24)}</label>
<nav class="hd-nav" aria-label="${esc(t.navLabel)}">${nav}</nav>
<div class="hd-tools"><a class="hd-search" href="/search/" aria-label="${esc(t.search)}">${icon('search', 20)}</a>
<div class="langsw" role="group" aria-label="${esc(t.langLabel)}">${icon('globe', 18)}<a href="/en/" hreflang="en" lang="en"${lang === 'en' ? ' aria-current="true"' : ''}>EN</a><i aria-hidden="true">|</i><a href="/" hreflang="ja" lang="ja"${lang === 'ja' ? ' aria-current="true"' : ''}>日本語</a></div></div>
</div></header>`;
}

export function layout({ path, title, description, body, head = '', scripts = [], lang = 'ja', css = [] }) {
  const t = T[lang];
  const full = path === '/' || path === '/en/' ? `${SITE.name}｜${lang === 'en' ? 'Flea markets, antique fairs & handmade markets in Japan' : `${SITE.tagline}の開催情報`}` : `${title}｜${SITE.name}`;
  const foot = FOOTER_GROUPS.map((g) => `<div><h2>${esc(g.title)}</h2><ul>${g.links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul></div>`).join('');
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${INDEXABLE ? '' : '<meta name="robots" content="noindex,nofollow">\n'}<link rel="canonical" href="${SITE.url}${path}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${path}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@500;700&family=Noto+Sans+JP:wght@400;700&display=swap">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/chrome.css">
${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}${css.length ? '\n' : ''}${head}</head>
<body>
${siteHeader(path, lang)}
<main id="main">
${body}
</main>
<footer class="site-foot"><div class="in">
<p class="disclaimer">${esc(DISCLAIMER)}</p>
<div class="foot-groups">${foot}</div>
<p class="copy">© ${esc(SITE.name)}　主催者・自治体の公式情報と公開データをもとに掲載しています。</p>
</div></footer>
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

export function breadcrumb(items) {
  return `<nav class="crumbs" aria-label="現在地"><a href="/">トップ</a>${items.map((i) => (i.href ? ` › <a href="${i.href}">${esc(i.label)}</a>` : ` › <span>${esc(i.label)}</span>`)).join('')}</nav>`;
}

export const STATUS_LABEL = {
  confirmed: '公式で確認',
  scheduled: '予定（きまりから算出）',
  cancelled: '中止',
  postponed: '延期',
  unknown: '開催は要確認',
};

const STATUS_CLASS = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' };

export function md(s) {
  const [, m, d] = s.split('-');
  return `${+m}/${+d}`;
}

export function statusTag(o) {
  const when = o.status === 'confirmed' ? `${md(o.checkedAt)} ` : '';
  return `<span class="tag ${STATUS_CLASS[o.status]}" title="最終確認：${esc(o.checkedAt)}">${esc(when + STATUS_LABEL[o.status])}</span>`;
}

export function kindTags(kinds) {
  return kinds.map((k) => `<a class="tag" href="/kind/${k}/">${esc(KINDS[k].short)}</a>`).join('');
}

// 一覧の1件（案Aのカード）
export function eventCard(o) {
  const s = o.series;
  const [, , d] = o.date.split('-');
  const wd = label(o.date).slice(-2, -1);
  const place = [s.venue.city, s.venue.name].filter(Boolean).join('・');
  const meta = [place, s.time?.text].filter(Boolean).map(esc).join(' ／ ');
  const cls = o.status === 'cancelled' || o.status === 'postponed' ? ' off' : '';
  return `<article class="ev${cls}">
<div class="ev-date"><small>${md(o.date).split('/')[0]}月</small><b>${+d}</b><small>${wd}</small></div>
<div class="ev-body"><h3><a href="/e/${s.id}/">${esc(s.name)}</a></h3>
<p class="meta">${meta}</p>
<div class="tags">${kindTags(s.kinds)}${s.recurrence.type !== 'dates' ? `<span class="tag">${esc(s.recurrence.text)}</span>` : ''}${statusTag(o)}</div>
${o.note ? `<p class="ev-note">${esc(o.note)}</p>` : ''}</div>
</article>`;
}

export function eventList(list, empty = 'この条件の掲載は、まだありません。') {
  return list.length ? `<div class="ev-list">${list.map(eventCard).join('\n')}</div>` : `<p class="empty">${esc(empty)}</p>`;
}

// 件数が多い一覧は、月ごとに分ける（最初の月だけ開く。それ以降は <details> で折りたたむ。HTML には全件が入る）
export const MONTH_SPLIT_MIN = 20;

export function eventListByMonth(list, empty) {
  if (list.length <= MONTH_SPLIT_MIN) return eventList(list, empty);
  const groups = new Map();
  for (const o of list) {
    const m = o.date.slice(0, 7);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(o);
  }
  return [...groups].map(([m, items], i) => {
    const head = `${+m.slice(0, 4)}年${+m.slice(5)}月（${items.length}件）`;
    return i === 0
      ? `<section class="month-block"><h3 class="month-h">${head}</h3>${eventList(items)}</section>`
      : `<details class="month-block"><summary class="month-h">${head}</summary>${eventList(items)}</details>`;
  }).join('\n');
}
