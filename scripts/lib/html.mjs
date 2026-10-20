import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// ページの共通の枠（ヘッダー・フッター・免責）と、HTML の小さな部品
import { INDEXABLE, SITE, HEADER_NAV, FOOTER_COLS, NAV_LABELS, ANALYTICS_ID, QR_URL } from './nav.mjs';
import { KINDS } from './kinds.mjs';
import { weekday } from './dates.mjs';
import { cityL, nameL, noteL, timeEn, venueL } from './tr-en.mjs';
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
  const L = { ...t.nav, ...NAV_LABELS[lang] };
  const here = (href) => path === href.split('#')[0] || (href !== '/' && path.startsWith(href.split('#')[0]));
  const nav = HEADER_NAV.map((l) => {
    if (!l.group) return `<a href="${langPath(l.href, lang)}"${here(l.href) ? ' aria-current="page"' : ''}>${icon(l.icon, 17)}<span>${esc(L[l.key])}</span></a>`;
    const cur = l.items.some(([h]) => here(h));
    return `<div class="dd${cur ? ' cur' : ''}"><button type="button" class="dd-b" aria-haspopup="true"${cur ? ' aria-current="true"' : ''}>${icon(l.icon, 17)}<span>${esc(L[l.group])}</span>${icon('chevdown', 14)}</button><div class="dd-m">${l.items.map(([h, k]) => `<a href="${langPath(h, lang)}"${here(h) && !h.includes('#') ? ' aria-current="page"' : ''}>${esc(L[k])}</a>`).join('')}</div></div>`;
  }).join('');
  return `<header class="site-head2"><div class="hd-in">
<a class="brand" href="${langPath('/', lang)}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>Flea Market <em>JP</em></b><small>${esc(t.tagline)}</small></span></a>
<input type="checkbox" id="nav-t" class="nav-t" aria-hidden="true">
<label for="nav-t" class="burger" aria-label="${esc(t.menu)}">${icon('menu', 24)}</label>
<nav class="hd-nav" aria-label="${esc(t.navLabel)}">${nav}</nav>
<div class="hd-tools"><a class="hd-search" href="${langPath('/search/', lang)}" aria-label="${esc(t.search)}">${icon('search', 20)}</a>
${langSwitch(path, lang)}</div>
</div></header>`;
}

// フッター（全ページ共通）。リンクは、これまでのフッターのリンクをすべて含む
// フッターの「人気の地域」。ビルドのたびに、今後の開催が多い都道府県（コード）を渡す（未設定なら「すべての都道府県」だけ）
let FOOT_AREAS = [];
export const setFooterAreas = (list) => { FOOT_AREAS = list; };

export function siteFooter(path, lang = 'en') {
  const f = S[lang].footer;
  const L = { ...T[lang].nav, ...NAV_LABELS[lang] };
  const col = (c) => {
    const title = L[`col${c.key[0].toUpperCase()}${c.key.slice(1)}`];
    const li = c.areas
      ? [...FOOT_AREAS.map((p) => `<li><a href="${langPath(`/area/${p}/`, lang)}">${esc(prefLabel(p, lang))}</a></li>`), `<li><a href="${langPath(c.more[0], lang)}">${esc(L[c.more[1]])} →</a></li>`]
      : c.items.map(([h, k]) => `<li><a href="${langPath(h, lang)}">${esc(L[k])}</a></li>`);
    return `<div class="ft-col"><h2>${esc(title)}</h2><ul>${li.join('')}</ul></div>`;
  };
  return `<footer class="site-foot2">
<div class="ft-in">
<div class="ft-brandcol"><a class="brand ft-brand" href="${langPath('/', lang)}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>Flea Market <em>JP</em></b><small>${esc(T[lang].tagline)}</small></span></a>${langSwitch(path, lang)}<figure class="ft-qr"><img src="/img/qr.svg" width="104" height="104" alt="" loading="lazy" decoding="async"><figcaption>${esc(lang === "en" ? "Scan to open on your phone" : "スマホで開く")}<small>${esc(QR_URL.replace(/^https?:\/\/|\/$/g, ""))}</small></figcaption></figure></div>
<nav class="ft-cols" aria-label="${esc(f.nav)}">${FOOTER_COLS.map(col).join('')}</nav>
</div>
<div class="ft-note"><p>${esc(disclaimer(lang))}</p><p>© ${esc(SITE.name)}　${esc(f.copy)}</p></div>
</footer>`;
}

// path は出力先の URL（日本語は /ja/ 以下）。head の hreflang は、すべてのページに付ける
// Google タグ（gtag.js）。ANALYTICS_ID が空なら出さない
function analyticsTag() {
  if (!ANALYTICS_ID) return '';
  return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${ANALYTICS_ID}');
</script>
`;
}

// キーワード（meta keywords）。検索エンジンは順位に使わないことが多いが、ページの内容語をそろえるために出す
const KW_SITE = {
  ja: ['フリーマーケット', 'フリマ', '蚤の市', '骨董市', '手作り市', 'マルシェ', '開催情報', '日本', '東京'],
  en: ['flea market Japan', 'antique fair Japan', 'handmade market Japan', 'Japan market schedule', 'flea market Tokyo', 'Japanese flea market'],
};
export function keywordMeta(keywords = [], lang = 'ja') {
  return [...new Set([...keywords.filter(Boolean), ...KW_SITE[lang]])].slice(0, 24).join(', ');
}

// 中のページの上のイラスト帯（添付の画像から切り出した10枚）。ページの種類ごとに決まった1枚を使う
const BANNER_BY_SECTION = { weekend: 'b2-target', calendar: 'b5-binoculars', date: 'b5-binoculars', area: 'b6-plan', kind: 'b8-idea', spot: 'b4-climb', e: 'b7-thinking', blog: 'b7-thinking', guide: 'b8-idea', faq: 'b1-question', about: 'b10-relax', shuten: 'b2-target', search: 'b9-tangle' };
// 画像（static/img/banner/<名前>.webp）が無いときは、帯を出さない
const STATIC_BANNER_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'static', 'img', 'banner');
// 画像（static/img/banner/<名前>.webp）が無いときは、帯を出さない
export function pageBanner(base) {
  if (base === '/' || base === '/404.html') return '';
  const sec = base.split('/').filter(Boolean)[0] || '';
  const name = BANNER_BY_SECTION[sec] || 'b10-relax';
  if (!existsSync(join(STATIC_BANNER_DIR, `${name}.webp`))) return '';
  return `<div class="pg-banner" aria-hidden="true" style="background-image:url(/img/banner/${name}.webp)"></div>\n`;
}

export function layout({ path, title, description, body, head = '', scripts = [], lang, css = [], keywords = [] }) {
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
${analyticsTag()}<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(keywordMeta(keywords, lang))}">
${INDEXABLE ? '' : '<meta name="robots" content="noindex,nofollow">\n'}<link rel="canonical" href="${SITE.url}${path}">
${alt}<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${path}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;700&family=Noto+Sans+JP:wght@400;700&display=swap">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/chrome.css">
${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}${css.length ? '\n' : ''}${head}</head>
<body>
${siteHeader(base, lang)}
<main id="main">
${pageBanner(base)}${localize(body, lang)}
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
  const past = o.past && o.status === 'confirmed';
  return `<span class="tag ${STATUS_CLASS[o.status]}" title="${lang === 'ja' ? '最終確認' : 'Last checked'}: ${esc(o.checkedAt)}">${esc(past ? S[lang].pastConfirmed : when + S[lang].status[o.status])}</span>`;
}

export function kindTags(kinds, lang = 'en') {
  return kinds.map((k) => `<a class="tag" href="/kind/${k}/">${esc(lang === 'ja' ? KINDS[k].short : KIND_SHORT_EN[k])}</a>`).join('');
}

// 一覧の1件（案Aのカード）
export function eventCard(o, lang = 'en') {
  const s = o.series;
  const [, m, d] = o.date.split('-');
  const wd = lang === 'ja' ? WD_JA[weekday(o.date)] : WD_EN[weekday(o.date)];
  const place = [cityL(s.venue.city, lang) || prefLabel(s.venue.pref, lang), venueL(s, lang)].filter(Boolean).join(lang === 'en' ? ', ' : '・');
  const meta = [place, (lang === 'en' && timeEn(s)) || s.time?.text].filter(Boolean).map(esc).join(lang === 'en' ? ' / ' : ' ／ ');
  const cls = o.status === 'cancelled' || o.status === 'postponed' ? ' off' : '';
  const rule = recurTag(s.recurrence, lang);
  return `<article class="ev${cls}" data-pref="${esc(s.venue.pref)}">
<div class="ev-date"><small>${lang === 'ja' ? `${+m}月` : MON_EN[+m - 1]}</small><b>${+d}</b><small>${wd}</small></div>
<div class="ev-body"><h3><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a></h3>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="orig-n" lang="ja">${esc(s.name)}</p>` : ''}
<p class="meta">${meta}</p>
<div class="tags">${kindTags(s.kinds, lang)}${rule ? `<span class="tag">${esc(rule)}</span>` : ''}${statusTag(o, lang)}</div>
${o.note ? `<p class="ev-note">${esc(noteL(o, lang))}</p>` : ''}</div>
</article>`;
}

// 地域で絞り込む（掲載のある都道府県だけ。1つだけなら出さない）。動きは static/area-filter.js
const AF = { ja: { label: '地域で絞り込む', all: 'すべて' }, en: { label: 'Filter by area', all: 'All' } };
export function areaFilter(list, lang = 'ja') {
  const counts = new Map();
  for (const o of list) counts.set(o.series.venue.pref, (counts.get(o.series.venue.pref) || 0) + 1);
  if (counts.size < 2) return '';
  const chips = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([p, n]) => `<button type="button" class="af-chip" data-pref="${esc(p)}" aria-pressed="false">${esc(prefLabel(p, lang))}<sup>${n}</sup></button>`).join('');
  return `<nav class="af-chips" aria-label="${esc(AF[lang].label)}"><button type="button" class="af-chip" data-pref="all" aria-pressed="true">${esc(AF[lang].all)}<sup>${list.length}</sup></button>${chips}</nav>`;
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
