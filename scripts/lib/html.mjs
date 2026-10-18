// ページの共通の枠（ヘッダー・フッター・免責）と、HTML の小さな部品
import { INDEXABLE, SITE, TOP_LINKS } from './nav.mjs';
import { KINDS } from './kinds.mjs';
import { weekday } from './dates.mjs';
import { icon, logoSvg } from './icons.mjs';
import { MON_EN, S, T, WD_EN, WD_JA } from './i18n.mjs';
import { disclaimer, DISCLAIMER_JA, KIND_SHORT_EN, langPath, localize, P, prefLabel, recurTag, splitPath, monthHead } from './l10n.mjs';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const DISCLAIMER = '開催の有無・内容は、変わることがあります。お出かけ・お申込みの前に、必ず主催者の公式情報でご確認ください。';

// ヘッダー（全ページ共通）。path は英語側の URL（例 /weekend/）。言語切替は、同じページの英語・日本語へ
export function langSwitch(path, lang) {
  const a = (l, text, code) => `<a href="${langPath(path, l)}" hreflang="${code}" lang="${code}"${lang === l ? ' aria-current="true"' : ''}>${text}</a>`;
  return `<div class="langsw" role="group" aria-label="${esc(T[lang].langLabel)}">${icon('globe', 18)}${a('en', 'EN', 'en')}<i aria-hidden="true">|</i>${a('ja', '日本語', 'ja')}</div>`;
}

export function siteHeader(path, lang = 'en') {
  const t = T[lang];
  const nav = TOP_LINKS.map((l) => `<a href="${langPath(l.href, lang)}"${path.startsWith(l.href) ? ' aria-current="page"' : ''}>${icon(l.icon, 17)}<span>${esc(t.nav[l.key])}</span></a>`).join('');
  return `<header class="site-head2"><div class="hd-in">
<a class="brand" href="${langPath('/', lang)}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>FLEA MARKET JP</b><small>${esc(t.tagline)}</small></span></a>
<input type="checkbox" id="nav-t" class="nav-t" aria-hidden="true">
<label for="nav-t" class="burger" aria-label="${esc(t.menu)}">${icon('menu', 24)}</label>
<nav class="hd-nav" aria-label="${esc(t.navLabel)}">${nav}</nav>
<div class="hd-tools"><a class="hd-search" href="${langPath('/search/', lang)}" aria-label="${esc(t.search)}">${icon('search', 20)}</a>
${langSwitch(path, lang)}</div>
</div></header>`;
}

// フッター（全ページ共通）。リンクは、これまでのフッターのリンクをすべて含む
export function siteFooter(path, lang = 'en') {
  const f = S[lang].footer;
  const links = f.links.map(([href, text]) => `<a href="${langPath(href, lang)}">${esc(text)}</a>`).join('<i aria-hidden="true">|</i>');
  return `<footer class="site-foot2">
<div class="ft-in">
<a class="brand ft-brand" href="${langPath('/', lang)}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>FLEA MARKET JP</b><small>${esc(T[lang].tagline)}</small></span></a>
<nav class="ft-nav" aria-label="${esc(f.nav)}">${links}</nav>
${langSwitch(path, lang)}
</div>
<div class="ft-note"><p>${esc(disclaimer(lang))}</p><p>© ${esc(SITE.name)}　${esc(f.copy)}</p></div>
</footer>`;
}

// path は出力先の URL（日本語は /ja/ 以下）。head の hreflang は、すべてのページに付ける
export function layout({ path, title, description, body, head = '', scripts = [], lang, css = [] }) {
  const sp = splitPath(path);
  lang = lang || sp.lang;
  const base = sp.base;
  const t = T[lang];
  const isHome = base === '/';
  const full = isHome ? `${SITE.name}｜${lang === 'en' ? 'Flea markets, antique fairs & handmade markets in Japan' : `${SITE.tagline}の開催情報`}` : `${title}${P[lang].titleSep}${SITE.name}`;
  const alt = base === '/404.html' ? '' : `<link rel="alternate" hreflang="en" href="${SITE.url}${langPath(base, 'en')}">\n<link rel="alternate" hreflang="ja" href="${SITE.url}${langPath(base, 'ja')}">\n<link rel="alternate" hreflang="x-default" href="${SITE.url}${langPath(base, 'en')}">\n`;
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${INDEXABLE ? '' : '<meta name="robots" content="noindex,nofollow">\n'}<link rel="canonical" href="${SITE.url}${path}">
${alt}<meta property="og:title" content="${esc(full)}">
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
${siteHeader(base, lang)}
<main id="main">
${localize(body, lang)}
</main>
${siteFooter(base, lang)}
${scripts.map((s) => `<script src="${s}" defer></script>`).join('\n')}
</body>
</html>
`;
}

export function breadcrumb(items, lang = 'en') {
  const p = P[lang];
  return `<nav class="crumbs" aria-label="${esc(p.crumbsLabel)}"><a href="/">${esc(p.home)}</a>${items.map((i) => (i.href ? ` › <a href="${i.href}">${esc(i.label)}</a>` : ` › <span>${esc(i.label)}</span>`)).join('')}</nav>`;
}

export const STATUS_LABEL = S.ja.status;

const STATUS_CLASS = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' };

export function md(s) {
  const [, m, d] = s.split('-');
  return `${+m}/${+d}`;
}

export function statusTag(o, lang = 'en') {
  const when = o.status === 'confirmed' ? `${md(o.checkedAt)} ` : '';
  return `<span class="tag ${STATUS_CLASS[o.status]}" title="${lang === 'ja' ? '最終確認' : 'Last checked'}: ${esc(o.checkedAt)}">${esc(when + S[lang].status[o.status])}</span>`;
}

export function kindTags(kinds, lang = 'en') {
  return kinds.map((k) => `<a class="tag" href="/kind/${k}/">${esc(lang === 'ja' ? KINDS[k].short : KIND_SHORT_EN[k])}</a>`).join('');
}

// 一覧の1件（案Aのカード）
export function eventCard(o, lang = 'en') {
  const s = o.series;
  const [, m, d] = o.date.split('-');
  const wd = lang === 'ja' ? WD_JA[weekday(o.date)] : WD_EN[weekday(o.date)];
  const place = [s.venue.city || prefLabel(s.venue.pref, lang), s.venue.name].filter(Boolean).join('・');
  const meta = [place, s.time?.text].filter(Boolean).map(esc).join(' ／ ');
  const cls = o.status === 'cancelled' || o.status === 'postponed' ? ' off' : '';
  const rule = recurTag(s.recurrence, lang);
  return `<article class="ev${cls}">
<div class="ev-date"><small>${lang === 'ja' ? `${+m}月` : MON_EN[+m - 1]}</small><b>${+d}</b><small>${wd}</small></div>
<div class="ev-body"><h3><a href="/e/${s.id}/">${esc(s.name)}</a></h3>
<p class="meta">${meta}</p>
<div class="tags">${kindTags(s.kinds, lang)}${rule ? `<span class="tag">${esc(rule)}</span>` : ''}${statusTag(o, lang)}</div>
${o.note ? `<p class="ev-note">${esc(o.note)}</p>` : ''}</div>
</article>`;
}

export function eventList(list, lang = 'en', empty) {
  return list.length ? `<div class="ev-list">${list.map((o) => eventCard(o, lang)).join('\n')}</div>` : `<p class="empty">${esc(empty || P[lang].evEmpty)}</p>`;
}

// 件数が多い一覧は、月ごとに分ける（最初の月だけ開く。それ以降は <details> で折りたたむ。HTML には全件が入る）
export const MONTH_SPLIT_MIN = 20;

export function eventListByMonth(list, lang = 'ja', empty) {
  if (list.length <= MONTH_SPLIT_MIN) return eventList(list, lang, empty);
  const groups = new Map();
  for (const o of list) {
    const m = o.date.slice(0, 7);
    if (!groups.has(m)) groups.set(m, []);
    groups.get(m).push(o);
  }
  return [...groups].map(([m, items], i) => {
    const head = monthHead(m, items.length, lang);
    return i === 0
      ? `<section class="month-block"><h3 class="month-h">${head}</h3>${eventList(items, lang)}</section>`
      : `<details class="month-block"><summary class="month-h">${head}</summary>${eventList(items, lang)}</details>`;
  }).join('\n');
}
