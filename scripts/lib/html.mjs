import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// ページの共通の枠（ヘッダー・フッター・免責）と、HTML の小さな部品
import { FACEBOOK_GROUP, FACEBOOK_PAGE, INDEXABLE, SITE, HEADER_NAV, FOOTER_COLS, NAV_LABELS, ANALYTICS_ID, ADSENSE_CLIENT, QR_URL } from './nav.mjs';
import { KINDS } from './kinds.mjs';
import { weekday } from './dates.mjs';
import { cityL, nameL, noteL, timeEn, venueL } from './tr-en.mjs';
import { fbLogo, icon, logoSvg } from './icons.mjs';
import { SV } from './saved-txt.mjs';
import { MON_EN, S, T, WD_EN, WD_JA } from './i18n.mjs';
import { disclaimer, DISCLAIMER_JA, KIND_SHORT_EN, langPath, localize, P, prefLabel, recurTag, splitPath, monthHead } from './l10n.mjs';

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const DISCLAIMER = '開催の有無・内容は、変わることがあります。お出かけ・お申込みの前に、必ず主催者の公式情報でご確認ください。';

// ヘッダー（全ページ共通）。path は英語側の URL（例 /weekend/）。言語切替は、同じページの英語・日本語へ
// 言語の自動切替（初めて来た人だけ）：端末の言語が日本語なら /ja/、それ以外は英語のページへ。
// 言語切替のリンクを押した人は、その選択を覚えて（localStorage の fm-lang）、以後は自動で切り替えない。検索エンジンのロボットには切り替えない
export const LANG_JS = "(function(){try{var d=document;d.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('.langsw a[hreflang]');if(a){try{localStorage.setItem('fm-lang',a.getAttribute('hreflang'))}catch(x){}}});var p=location.pathname;if(/^\\/(admin|api)\\//.test(p)||/bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent))return;var ja=p==='/ja'||p.indexOf('/ja/')===0;var pref=null;try{pref=localStorage.getItem('fm-lang')}catch(x){}var l=((navigator.languages&&navigator.languages[0])||navigator.language||'').toLowerCase();var want=pref||(l.indexOf('ja')===0?'ja':'en');if(want==='ja'&&!ja)location.replace('/ja'+p+location.search+location.hash);else if(want==='en'&&ja)location.replace((p.replace(/^\\/ja/,'')||'/')+location.search+location.hash)}catch(e){}})();";

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
<div class="hd-tools"><a class="hd-saved" href="${langPath('/saved/', lang)}" aria-label="${esc(SV[lang].nav)}">${icon('heart', 20)}<span class="cnt" hidden></span></a><a class="hd-search" href="${langPath('/search/', lang)}" aria-label="${esc(t.search)}">${icon('search', 20)}</a>
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
<div class="ft-brandcol"><a class="brand ft-brand" href="${langPath('/', lang)}" aria-label="Flea Market JP">${logoSvg()}<span class="brand-t"><b>Flea Market <em>JP</em></b><small>${esc(T[lang].tagline)}</small></span></a>${langSwitch(path, lang)}<p class="ft-social"><a class="ft-fb" href="${FACEBOOK_PAGE}" target="_blank" rel="noopener" aria-label="${esc(f.fbFollow)}">${fbLogo(32)}</a><a class="ft-fbtext" href="${FACEBOOK_PAGE}" target="_blank" rel="noopener">${esc(f.fbFollow)}</a><a class="ft-join" href="${FACEBOOK_GROUP}" target="_blank" rel="noopener">${esc(f.fbJoin)}</a></p><figure class="ft-qr"><img src="/img/qr.svg" width="104" height="104" alt="" loading="lazy" decoding="async"><figcaption>${esc(lang === "en" ? "Scan to open on your phone" : "スマホで開く")}<small>${esc(QR_URL.replace(/^https?:\/\/|\/$/g, ""))}</small></figcaption></figure></div>
<nav class="ft-cols" aria-label="${esc(f.nav)}">${FOOTER_COLS.map(col).join('')}</nav>
</div>
<div class="ft-note"><p>${esc(disclaimer(lang))}</p><p><a class="ft-admin" href="/admin/reviews" rel="nofollow">©</a> ${esc(SITE.name)}　${esc(f.copy)}</p></div>
</footer>`;
}

// path は出力先の URL（日本語は /ja/ 以下）。head の hreflang は、すべてのページに付ける
// Google タグ（gtag.js）。ANALYTICS_ID が空なら出さない
function analyticsTag() {
  if (!ANALYTICS_ID) return '';
  return `<!-- Google tag (gtag.js) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${ANALYTICS_ID}');
</script>
`;
}

// SNS で共有したときの画像（1200×630。ページごとの指定がなければこれ）
export const OG_DEFAULT = '/img/og/default.jpg';

// Google AdSense（広告の自動配信のスクリプト）。ADSENSE_CLIENT が空なら出さない
function adsenseTag() {
  if (!ADSENSE_CLIENT) return '';
  return `<meta name="google-adsense-account" content="${ADSENSE_CLIENT}">
`;
}

// アクセス解析（gtag.js）と広告（AdSense）の読み込みは、ページの表示が終わってから（load のあと）にする。
// 画像・文字の表示と取り合わないようにして、スマホでの表示開始を早める。gtag の設定（dataLayer）は先に入っているので、ページビューは取りこぼさない
function deferredScripts() {
  const urls = [];
  if (ANALYTICS_ID) urls.push([`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`, 0]);
  if (ADSENSE_CLIENT) urls.push([`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`, 1]);
  if (!urls.length) return '';
  return `<script>(function(){var u=${JSON.stringify(urls)};function go(){u.forEach(function(x){var s=document.createElement('script');s.async=true;s.src=x[0];if(x[1])s.crossOrigin='anonymous';document.head.appendChild(s)})}if(document.readyState==='complete')setTimeout(go,0);else addEventListener('load',function(){setTimeout(go,0)})})();</script>
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
// 帯の中に文字（パンくず・見出し・説明）を置くとき：左に文字、右に画像（バランスをとる）
export function pageBanner(base, text = '', artOverride = '') {
  if (base === '/' || base === '/404.html') return '';
  const sec = base.split('/').filter(Boolean)[0] || '';
  if (sec === 'e' || sec === 'press' || (sec === 'spot' && base !== '/spot/')) return ''; // 開催の詳細ページ・メディア向けの紹介ページは、上部の帯なし
  const name = BANNER_BY_SECTION[sec] || 'b10-relax';
  const art = artOverride || (existsSync(join(STATIC_BANNER_DIR, `${name}.webp`)) ? `/img/banner/${name}.webp` : '');
  if (text) {
    // パンくずは帯の一番上、見出し・説明とイラストは上下の中央
    const cm = /^(<nav class="crumbs[\s\S]*?<\/nav>(?:<script type="application\/ld\+json">[\s\S]*?<\/script>)?)([\s\S]*)$/.exec(text);
    const crumbs = cm ? cm[1] : '';
    const rest = cm ? cm[2] : text;
    return `<div class="pg-banner has-text"><div class="in pg-banner-in">${crumbs ? `<div class="pg-banner-crumbs">${crumbs}</div>` : ''}<div class="pg-banner-main"><div class="pg-banner-text">${rest}</div>${art ? `<div class="pg-banner-art" aria-hidden="true" style="background-image:url(${art})"></div>` : ''}</div></div></div>\n`;
  }
  if (!art) return '';
  return `<div class="pg-banner" aria-hidden="true" style="background-image:url(${art})"></div>\n`;
}

// トップページの構造化データ（Organization と WebSite）。sameAs に Facebook ページ
function orgLd() {
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: `${SITE.url}/`, logo: `${SITE.url}/favicon-512.png`, sameAs: [FACEBOOK_PAGE] },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, url: `${SITE.url}/` },
  ];
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
}

export function layout({ path, title, description, body, head = '', scripts = [], lang, css = [], keywords = [], bannerText = '', bannerArt = '', ogImage = '' }) {
  const sp = splitPath(path);
  lang = lang || sp.lang;
  const base = sp.base;
  const t = T[lang];
  const isHome = base === '/';
  const full = isHome ? (lang === 'en' ? `Flea Markets in Japan: Dates, Locations & Calendar | ${SITE.name}` : `全国のフリーマーケット・骨董市の開催日・場所・カレンダー｜${SITE.name}`) : `${title}${P[lang].titleSep}${SITE.name}`;
  const alt = base === '/404.html' ? '' : `<link rel="alternate" hreflang="en" href="${SITE.url}${langPath(base, 'en')}">\n<link rel="alternate" hreflang="ja" href="${SITE.url}${langPath(base, 'ja')}">\n<link rel="alternate" hreflang="x-default" href="${SITE.url}${langPath(base, 'en')}">\n`;
  return `<!doctype html>
<html lang="${t.htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>${LANG_JS}</script>
${analyticsTag()}${adsenseTag()}${deferredScripts()}<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<meta name="keywords" content="${esc(keywordMeta(keywords, lang))}">
${INDEXABLE ? '' : '<meta name="robots" content="noindex,nofollow">\n'}<link rel="canonical" href="${SITE.url}${path}">
${alt}<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${SITE.url}${path}">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:locale" content="${lang === 'ja' ? 'ja_JP' : 'en_US'}">
<meta property="og:image" content="${SITE.url}${ogImage || OG_DEFAULT}">
${ogImage ? '' : '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(full)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${SITE.url}${ogImage || OG_DEFAULT}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/favicon-48.png" sizes="48x48" type="image/png">
<link rel="icon" href="/favicon-96.png" sizes="96x96" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/style.css">
<link rel="stylesheet" href="/chrome.css">
<link rel="stylesheet" href="/redesign.css">
${css.map((c) => `<link rel="stylesheet" href="${c}">`).join('\n')}${css.length ? '\n' : ''}${head}${isHome ? orgLd() : ''}</head>
<body>
${siteHeader(base, lang)}
<main id="main">
${pageBanner(base, bannerText ? localize(bannerText, lang) : '', bannerArt)}${localize(body, lang)}
</main>
${siteFooter(base, lang)}
${[...scripts, '/more.js'].map((s) => `<script src="${s}" defer></script>`).join('\n')}
<script src="/saved.js" defer></script>
</body>
</html>
`;
}

export function breadcrumb(items, lang = 'en') {
  const p = P[lang];
  // 検索エンジン向けのパンくず（BreadcrumbList）。最後の項目（このページ）は URL なし
  const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ href: '/', label: p.home }, ...items].map((i, n) => ({ '@type': 'ListItem', position: n + 1, name: i.label, ...(i.href ? { item: `${SITE.url}${langPath(i.href, lang)}` } : {}) })) };
  return `<nav class="crumbs" aria-label="${esc(p.crumbsLabel)}"><a href="/">${esc(p.home)}</a>${items.map((i) => (i.href ? ` › <a href="${i.href}">${esc(i.label)}</a>` : ` › <span>${esc(i.label)}</span>`)).join('')}</nav><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}

export const STATUS_LABEL = S.ja.status;

const STATUS_CLASS = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' };

export function md(s) {
  const [, m, d] = s.split('-');
  return `${+m}/${+d}`;
}

// 開催回の状態の札。「公式で確認」はふつうの状態なので札を出さない（ユーザーの指示 2026-10-21）。
// 予定（きまりから算出）・中止・延期・要確認と、過去の記録の札は出す
export function statusTag(o, lang = 'en') {
  const past = o.past && o.status === 'confirmed';
  if (o.status === 'confirmed' && !past) return '';
  return `<span class="tag ${STATUS_CLASS[o.status]}" title="${lang === 'ja' ? '最終確認' : 'Last checked'}: ${esc(o.checkedAt)}">${esc(past ? S[lang].pastConfirmed : S[lang].status[o.status])}</span>`;
}

// 日本語の名前・住所のコピーボタン（英語のページだけ。地図アプリ・タクシー・窓口で、そのまま見せられるように）。動きは static/copy.js
const COPY = { name: 'Copy Japanese name', address: 'Copy Japanese address', done: 'Copied' };
export function copyBtn(text, kind = 'name') {
  if (!text) return '';
  return `<button type="button" class="copy-btn" data-copy="${esc(text)}" data-done="${COPY.done}" lang="en">${kind === 'address' ? COPY.address : COPY.name}</button>`;
}

export function kindTags(kinds, lang = 'en') {
  return kinds.map((k) => `<a class="tag" href="/kind/${k}/">${esc(lang === 'ja' ? KINDS[k].short : KIND_SHORT_EN[k])}</a>`).join('');
}

// 一覧の1件（案Aのカード）
// カードの写真：種類ごとの既存の写真（フリマは3種類から、シリーズ id で決める）
const CARD_FLEA = ['/img/kinds/flea-400.webp', '/img/kinds/flea-2-400.webp', '/img/kinds/flea-3-400.webp'];
export function cardImg(s) {
  const k = s.kinds[0];
  if (k !== 'flea') return `/img/kinds/${k}-400.webp`;
  let h = 0;
  for (const ch of s.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CARD_FLEA[h % 3];
}

export function eventCard(o, lang = 'en') {
  const s = o.series;
  const [, m, d] = o.date.split('-');
  const wd = lang === 'ja' ? WD_JA[weekday(o.date)] : WD_EN[weekday(o.date)];
  const place = [cityL(s.venue.city, lang) || prefLabel(s.venue.pref, lang), venueL(s, lang)].filter(Boolean).join(lang === 'en' ? ', ' : '・');
  const meta = [place, (lang === 'en' && timeEn(s)) || s.time?.text].filter(Boolean).map(esc).join(lang === 'en' ? ' / ' : ' ／ ');
  const cls = o.status === 'cancelled' || o.status === 'postponed' ? ' off' : '';
  const rule = recurTag(s.recurrence, lang);
  return `<article class="ev${cls}" data-pref="${esc(s.venue.pref)}" data-kinds="${esc(s.kinds.join(' '))}">
<a class="ev-ph" href="/e/${s.id}/" tabindex="-1" aria-hidden="true"><img src="${cardImg(s)}" alt="" width="400" height="300" loading="lazy" decoding="async"></a>
<div class="ev-date"><small>${lang === 'ja' ? `${+m}月` : MON_EN[+m - 1]}</small><b>${+d}</b><small>${wd}</small></div>
<button type="button" class="save-btn" data-id="${s.id}" aria-pressed="false" aria-label="${esc(SV[lang].saveAria)}" data-on="${esc(SV[lang].removeAria)}" data-off="${esc(SV[lang].saveAria)}">${icon('heart', 20)}</button>
<div class="ev-body"><h3><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a></h3>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="orig-n" lang="ja">${esc(s.name)}</p>` : ''}
<p class="meta">${meta}</p>
<div class="tags">${kindTags(s.kinds, lang)}${rule ? `<span class="tag">${esc(rule)}</span>` : ''}${statusTag(o, lang)}</div>
${o.note ? `<p class="ev-note">${esc(noteL(o, lang))}</p>` : ''}</div>
</article>`;
}

// 同じ市（シリーズ）の開催を、1つにまとめる（先頭の開催の日付順を保つ）。地域・種類のページの一覧に使う
export function groupBySeries(list) {
  const m = new Map();
  for (const o of list) {
    if (!m.has(o.series.id)) m.set(o.series.id, []);
    m.get(o.series.id).push(o);
  }
  return [...m.values()];
}

const DATES_SHOWN = 6; // 次回のあとに並べる日付の数
export function seriesCard(g, lang = 'en') {
  const o = g[0];
  const s = o.series;
  const [, m, d] = o.date.split('-');
  const wd = lang === 'ja' ? WD_JA[weekday(o.date)] : WD_EN[weekday(o.date)];
  const place = [cityL(s.venue.city, lang) || prefLabel(s.venue.pref, lang), venueL(s, lang)].filter(Boolean).join(lang === 'en' ? ', ' : '・');
  const meta = [place, (lang === 'en' && timeEn(s)) || s.time?.text].filter(Boolean).map(esc).join(lang === 'en' ? ' / ' : ' ／ ');
  const cls = o.status === 'cancelled' || o.status === 'postponed' ? ' off' : '';
  const rule = recurTag(s.recurrence, lang);
  const rest = g.slice(1);
  const lab = (x) => { const [, mm, dd] = x.date.split('-'); return lang === 'ja' ? `${+mm}/${+dd}（${WD_JA[weekday(x.date)]}）` : `${MON_EN[+mm - 1]} ${+dd}`; };
  const chips = rest.length
    ? `<p class="ev-dates"><span class="ev-n">${lang === 'ja' ? `全${g.length}日` : `${g.length} dates`}</span>${rest.slice(0, DATES_SHOWN).map((x) => `<a href="/e/${s.id}/"${x.status === 'cancelled' || x.status === 'postponed' ? ' class="off"' : ''}>${esc(lab(x))}</a>`).join('')}${rest.length > DATES_SHOWN ? `<a class="more" href="/e/${s.id}/">${lang === 'ja' ? `ほか${rest.length - DATES_SHOWN}日` : `+${rest.length - DATES_SHOWN} more`}</a>` : ''}</p>`
    : '';
  return `<article class="ev ev-s${cls}" data-pref="${esc(s.venue.pref)}" data-kinds="${esc(s.kinds.join(' '))}">
<a class="ev-ph" href="/e/${s.id}/" tabindex="-1" aria-hidden="true"><img src="${cardImg(s)}" alt="" width="400" height="300" loading="lazy" decoding="async"></a>
<div class="ev-date"><small>${lang === 'ja' ? `${+m}月` : MON_EN[+m - 1]}</small><b>${+d}</b><small>${wd}</small></div>
<button type="button" class="save-btn" data-id="${s.id}" aria-pressed="false" aria-label="${esc(SV[lang].saveAria)}" data-on="${esc(SV[lang].removeAria)}" data-off="${esc(SV[lang].saveAria)}">${icon('heart', 20)}</button>
<div class="ev-body"><h3><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a></h3>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="orig-n" lang="ja">${esc(s.name)}</p>` : ''}
<p class="meta">${meta}</p>
<div class="tags">${kindTags(s.kinds, lang)}${rule ? `<span class="tag">${esc(rule)}</span>` : ''}${statusTag(o, lang)}</div>
${o.note ? `<p class="ev-note">${esc(noteL(o, lang))}</p>` : ''}${chips}</div>
</article>`;
}

export function seriesList(groups, lang = 'en', empty) {
  return groups.length ? `<div class="ev-list">${groups.map((g) => seriesCard(g, lang)).join('\n')}</div>` : `<p class="empty">${esc(empty || P[lang].evEmpty)}</p>`;
}

// 地域・種類で絞り込む（掲載のある都道府県・種類だけ。1つだけなら、その行は出さない）。動きは static/area-filter.js
const AF = { ja: { label: '地域で絞り込む', all: 'すべて', kindLabel: '種類で絞り込む' }, en: { label: 'Filter by area', all: 'All', kindLabel: 'Filter by type' } };
export function areaFilter(list, lang = 'ja') {
  const counts = new Map();
  for (const o of list) counts.set(o.series.venue.pref, (counts.get(o.series.venue.pref) || 0) + 1);
  const kinds = new Map();
  for (const o of list) for (const k of o.series.kinds) kinds.set(k, (kinds.get(k) || 0) + 1);
  const rows = [];
  if (counts.size >= 2) {
    const chips = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([p, n]) => `<button type="button" class="af-chip" data-pref="${esc(p)}" aria-pressed="false">${esc(prefLabel(p, lang))}<sup>${n}</sup></button>`).join('');
    rows.push(`<nav class="af-chips" aria-label="${esc(AF[lang].label)}"><button type="button" class="af-chip" data-pref="all" aria-pressed="true">${esc(AF[lang].all)}<sup>${list.length}</sup></button>${chips}</nav>`);
  }
  if (kinds.size >= 2) {
    const chips = [...kinds].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, n]) => `<button type="button" class="af-chip" data-kind="${esc(k)}" aria-pressed="false">${esc(lang === 'ja' ? KINDS[k].short : KIND_SHORT_EN[k])}<sup>${n}</sup></button>`).join('');
    rows.push(`<nav class="af-chips af-kinds" aria-label="${esc(AF[lang].kindLabel)}"><button type="button" class="af-chip" data-kind="all" aria-pressed="true">${esc(AF[lang].all)}<sup>${list.length}</sup></button>${chips}</nav>`);
  }
  return rows.join('');
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
