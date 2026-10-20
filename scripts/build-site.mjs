// data/ から、dist/ に静的サイトを作る（毎日、日本時間の今日を基準に作り直す）。
// 使い方: node scripts/build-site.mjs [--today=YYYY-MM-DD] [--out=dist]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, holidayName, isDayOff, parseYmd, todayJst, upcomingWeekend, weekday, WEEKDAYS } from './lib/dates.mjs';
import { buildOccurrences, isActive, lastChecked } from './lib/events.mjs';
import { pastOccurrences } from './lib/archive.mjs';
import { buildSpots } from './lib/spots.mjs';
import { spotIndex, spotPage } from './lib/spot-view.mjs';
import { KINDS } from './lib/kinds.mjs';
import { PREFS } from './lib/areas.mjs';
import { CONTACT_EMAIL, SITE } from './lib/nav.mjs';
import { renderHomeBody } from './lib/home-view.mjs';
import { S, T, WD_EN } from './lib/i18n.mjs';
import { BLOG, FAQ, GUIDE } from './lib/content.mjs';
import { ART_CSS, blogBanner, docSections, faqSections, renderBlogIndex, renderDoc, renderPost } from './lib/article-view.mjs';
import { mannersBanner, mannersIndex, tipsBanner, tipsBody } from './lib/tips-view.mjs';
import { mapQuery, mapUrls, weatherTarget } from './lib/weather.mjs';
import { spotL, venueTrEn, cityEn, cityL, fieldEn, labelEn, nameEn, nameL, noteL, orgEn, setTranslations, timeEn, venueEn, venueL } from './lib/tr-en.mjs';
import { disclaimer, dlabel, holiday, KIND_DESC_EN, langPath, splitPath, monthTitle, P, prefLabel, recurEn, TBC } from './lib/l10n.mjs';
import { setFooterAreas, areaFilter, breadcrumb, esc, eventList, eventListByMonth, kindTags, layout, statusTag } from './lib/html.mjs';

const LANGS_ORDER = ['en', 'ja'];

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function loadData(dir = join(ROOT, 'data')) {
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  let credits = [];
  try { credits = read('image-credits.json'); } catch { /* 画像の出典がないデータ（テストの見本など）は空 */ }
  let translations = {};
  try { translations = read('translations-en.json'); } catch { /* 英語の訳がないデータ（テストの見本など）は、日本語のまま出す */ }
  // 自動で作ったブログ記事（scripts/generate-blog.mjs が data/blog-auto/ に保存する）
  const autoDir = join(dir, 'blog-auto');
  const autoPosts = existsSync(autoDir) ? readdirSync(autoDir).filter((f) => f.endsWith('.json') && f !== 'state.json').map((f) => JSON.parse(readFileSync(join(autoDir, f), 'utf8'))) : [];
  let geo = {};
  try { geo = read('geo.json'); } catch { /* 位置のデータがないもの（テストの見本など）は、地図の画像なし */ }
  let archive = { items: [] };
  try { archive = read('archive.json'); } catch { /* 過去の記録がないデータ（テストの見本など）は、過去のページなし */ }
  let venues = [];
  try { venues = read('venues.json'); } catch { /* スポットのデータがない場合（テストの見本など）は、スポットのページなし */ }
  let siteUpdates = [];
  try { siteUpdates = read('site-updates.json'); } catch { /* 更新情報がないデータ（テストの見本など）は、枠を出さない */ }
  let tips = [];
  try { tips = read('tips.json'); } catch { /* TIPS がないデータ（テストの見本など）は、TIPS のページなし */ }
  let manners = [];
  try { manners = read('tips-manners.json'); } catch { /* 日本でのふるまい（TIPSコーナー）がないデータは、そのページなし */ }
  return { series: read('series.json'), occurrences: read('occurrences.json'), credits, translations, autoPosts, geo, archive, venues, siteUpdates, tips, manners };
}

// ---- 各ページ ----
// 本文の内部リンクは、英語の URL で書く（layout() が、日本語のページでは /ja/ 付きにする）。
// 各ページは lang（'en' が既定、'ja'）ごとに作り、path は出力先の URL（日本語は /ja/ 以下）。

const val = (v, lang) => (v ? esc(v) : TBC(lang));
// 英語のページでは、訳があれば「英語＋公式の日本語（小さく）」で出す。訳がなければ日本語のまま
const orig = (en, ja) => `${esc(en)}<small class="orig" lang="ja">${esc(ja)}</small>`;
const tv = (s, key, ja, lang) => (!ja ? TBC(lang) : lang === 'en' && fieldEn(s, key) ? orig(fieldEn(s, key), ja) : esc(ja));
const pg = (lang, base, x) => ({ path: langPath(base, lang), lang, ...x });

function dayStrip(occ, today, current, lang) {
  const counts = new Map();
  for (const o of occ) if (isActive(o)) counts.set(o.date, (counts.get(o.date) || 0) + 1);
  const cells = [];
  for (let i = 0; i < 14; i++) {
    const s = addDays(today, i);
    const n = counts.get(s) || 0;
    const wd = weekday(s);
    const cls = ['day', wd === 6 && !holidayName(s) ? 'sat' : isDayOff(s) ? 'off' : '', n ? '' : 'none'].filter(Boolean).join(' ');
    const inner = `<small>${lang === 'ja' ? WEEKDAYS[wd] : WD_EN[wd]}</small><b>${+s.slice(8)}</b><i>${n ? P[lang].cnt(n) : P[lang].none}</i>`;
    cells.push(n ? `<a class="${cls}" href="/date/${s}/"${s === current ? ' aria-current="date"' : ''}>${inner}</a>` : `<span class="${cls}">${inner}</span>`);
  }
  return `<nav class="days" aria-label="${esc(P[lang].stripAria)}">${cells.join('')}</nav>`;
}

function exhibitorList(seriesList, lang) {
  const rows = seriesList.filter((s) => s.exhibitor);
  const p = P[lang].shuten;
  if (!rows.length) return `<p class="empty">${esc(p.empty)}</p>`;
  const tbc = lang === 'ja' ? '要確認' : 'TBC';
  return `<ul class="grid-links">${rows.map((s) => `<li><a href="/e/${s.id}/#shuten">${esc(nameL(s, lang))}<small>${esc(p.fee)}${esc((lang === 'en' && fieldEn(s, 'fee')) || s.exhibitor.fee || tbc)}${lang === 'ja' ? '／' : ' / '}${esc(p.apply)}${esc((lang === 'en' && fieldEn(s, 'apply')) || s.exhibitor.apply || tbc)}</small></a></li>`).join('')}</ul>`;
}

// トップ。構成は scripts/lib/home-view.mjs（HERO → カレンダー → 注目マーケット → 出店者 → 地域・種類 → サイト情報）
function home(ctx, lang) {
  const body = renderHomeBody(ctx, lang, disclaimer(lang));
  const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&family=Noto+Serif+JP:wght@900&family=Caveat:wght@600&display=swap">\n<link rel="preload" as="image" href="/img/hero.webp" type="image/webp" fetchpriority="high">\n';
  return pg(lang, '/', { title: SITE.name, description: T[lang].description, body, css: ['/home.css'], scripts: ['/home.js', '/hero-switch.js'], head: fonts });
}

function listPage(lang, base, crumbs, h1, lead, list, extra = '', filter = false) {
  const af = filter ? areaFilter(list, lang) : '';
  const body = `<div class="in page">${breadcrumb(crumbs, lang)}<h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}${extra}${af}${eventListByMonth(list, lang)}</div>`;
  return pg(lang, base, { title: h1, description: P[lang].listDesc(h1), body, scripts: af ? ['/area-filter.js'] : [], keywords: [h1, ...crumbs.map((c) => c.label)] });
}

function weekendPage(ctx, lang) {
  const days = upcomingWeekend(ctx.today);
  const p = P[lang].weekend;
  const title = p.title(dlabel(days[0], lang), days.length > 1 ? dlabel(days.at(-1), lang) : '');
  return listPage(lang, '/weekend/', [{ label: p.crumb }], title, p.lead, ctx.occ.filter((o) => days.includes(o.date)), dayStrip(ctx.occ, ctx.today, undefined, lang), true);
}

function datePages(ctx, lang) {
  const dates = [...new Set(ctx.occ.map((o) => o.date))];
  const upcoming = dates.map((d) => listPage(lang, `/date/${d}/`, [{ href: '/calendar/', label: P[lang].date.crumb }, { label: dlabel(d, lang) }], P[lang].date.h1(dlabel(d, lang, { year: true }), holiday(d, lang)), '', ctx.occ.filter((o) => o.date === d), dayStrip(ctx.occ, ctx.today, d, lang), true));
  // 過去の日（公式で確認した回の記録）
  const pastDates = [...new Set(ctx.past.map((o) => o.date))];
  const pastPages = pastDates.map((d) => listPage(lang, `/date/${d}/`, [{ href: '/calendar/', label: P[lang].date.crumb }, { label: dlabel(d, lang) }], P[lang].date.h1Past(dlabel(d, lang, { year: true }), holiday(d, lang)), P[lang].date.pastNote, ctx.past.filter((o) => o.date === d)));
  return [...upcoming, ...pastPages];
}

// 過去の記録の日付の一覧（新しい順）
function pastBlock(past, lang) {
  if (!past.length) return '';
  const counts = new Map();
  for (const o of past) counts.set(o.date, (counts.get(o.date) || 0) + 1);
  const p = P[lang].cal;
  const items = [...counts].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([d, n]) => `<li><a href="/date/${d}/">${esc(dlabel(d, lang, { year: true }))}<small>${esc(P[lang].cnt(n))}</small></a></li>`).join('');
  return `<section class="month past"><h2>${esc(p.pastH)}</h2><p class="lead">${esc(p.pastLead)}</p><ul class="grid-links">${items}</ul></section>`;
}

function calendarPage(ctx, lang) {
  const byMonth = new Map();
  for (const o of ctx.occ) {
    const m = o.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(o);
  }
  const p = P[lang].cal;
  const months = [...byMonth].map(([m, list]) => `<section class="month"><h2>${esc(monthTitle(m, lang))}</h2>${eventList(list, lang)}</section>`).join('');
  const body = `<div class="in page">${breadcrumb([{ label: p.h1 }], lang)}<h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead(ctx.days))}</p>${dayStrip(ctx.occ, ctx.today, undefined, lang)}${months || `<p class="empty">${esc(P[lang].soon)}</p>`}${pastBlock(ctx.past, lang)}</div>`;
  return pg(lang, '/calendar/', { title: p.h1, description: p.desc, body });
}

function areaPages(ctx, lang) {
  const pages = [];
  const A = P[lang].area;
  const prefs = new Map();
  for (const s of ctx.series) {
    const p = s.venue.pref;
    if (!prefs.has(p)) prefs.set(p, new Map());
    if (s.venue.cityCode) prefs.get(p).set(s.venue.cityCode, s.venue.city);
  }
  const count = (f) => ctx.occ.filter((o) => isActive(o) && f(o.series)).length;
  const idx = [...prefs.keys()].sort().map((p) => `<li><a class="pref-card" href="/area/${p}/"><img src="/img/pref/${p}.webp" alt="" width="182" height="172" loading="lazy" decoding="async"><span class="pc-t">${esc(prefLabel(p, lang))}<small>${count((s) => s.venue.pref === p)}</small></span></a></li>`).join('');
  const countNote = lang === 'en' ? 'Numbers are markets in the next 120 days.' : '数字は、今後120日の開催の件数です。';
  pages.push(pg(lang, '/area/', { title: A.h1, description: A.desc, bannerText: `${breadcrumb([{ label: A.h1 }], lang)}<h1>${esc(A.h1)}</h1><p class="lead">${esc(A.lead)}</p>`, body: `<div class="in page"><p class="count-note">${esc(countNote)}</p>${idx ? `<ul class="grid-links">${idx}</ul>` : `<p class="empty">${esc(P[lang].soon)}</p>`}</div>` }));
  for (const [p, cities] of prefs) {
    const pn = prefLabel(p, lang);
    const cityLinks = [...cities].sort().map(([c, name]) => `<li><a href="/area/${p}/${c}/">${esc(cityL(name, lang))}<small>${esc(P[lang].cnt(count((s) => s.venue.cityCode === c)))}</small></a></li>`).join('');
    const extra = cityLinks ? `<h2 class="sec-h">${esc(A.byCity)}</h2><ul class="grid-links">${cityLinks}</ul><h2 class="sec-h">${esc(A.list)}</h2>` : '';
    pages.push({ ...listPage(lang, `/area/${p}/`, [{ href: '/area/', label: A.crumb }, { label: pn }], A.prefH1(pn), '', ctx.occ.filter((o) => o.series.venue.pref === p), extra), bannerArt: `/img/pref/${p}.webp` });
    for (const [c, name] of cities) {
      pages.push(listPage(lang, `/area/${p}/${c}/`, [{ href: '/area/', label: A.crumb }, { href: `/area/${p}/`, label: pn }, { label: cityL(name, lang) }], A.cityH1(cityL(name, lang), pn), '', ctx.occ.filter((o) => o.series.venue.cityCode === c)));
    }
  }
  return pages;
}

const kindName = (k, lang) => S[lang].kinds[k];
const kindDesc = (k, lang) => (lang === 'ja' ? KINDS[k].desc : KIND_DESC_EN[k]);

function kindPages(ctx, lang) {
  const K = P[lang].kind;
  const idx = Object.keys(KINDS).map((k) => `<li><a href="/kind/${k}/">${esc(kindName(k, lang))}<small>${esc(kindDesc(k, lang))}</small></a></li>`).join('');
  return [
    pg(lang, '/kind/', { keywords: Object.keys(KINDS).map((k) => kindName(k, lang)), title: K.h1, description: lang === 'ja' ? 'フリーマーケット・蚤の市・骨董市・手作り市・マルシェの種類から探せます。' : 'Find flea markets, nomi-no-ichi, antique fairs, handmade markets and marchés by type.', body: `<div class="in page">${breadcrumb([{ label: K.h1 }], lang)}<h1>${esc(K.h1)}</h1><ul class="grid-links">${idx}</ul></div>` }),
    ...Object.keys(KINDS).map((k) => listPage(lang, `/kind/${k}/`, [{ href: '/kind/', label: K.crumb }, { label: kindName(k, lang) }], K.listH1(kindName(k, lang)), kindDesc(k, lang), ctx.occ.filter((o) => o.series.kinds.includes(k)))),
  ];
}

function eventLd(s, list) {
  const map = { confirmed: 'EventScheduled', scheduled: 'EventScheduled', cancelled: 'EventCancelled', postponed: 'EventPostponed' };
  const items = list.filter((o) => map[o.status]).slice(0, 3).map((o) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: s.name,
    startDate: s.time?.start ? `${o.date}T${s.time.start}:00+09:00` : o.date,
    ...(s.time?.end ? { endDate: `${o.date}T${s.time.end}:00+09:00` } : {}),
    eventStatus: `https://schema.org/${map[o.status]}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: s.venue.name, address: s.venue.address || `${PREFS[s.venue.pref]}${s.venue.city || ''}` },
    // organizer.label があるもの（主催者ではなく問い合わせ先など）は、主催者として出さない
    ...(s.organizer.label ? {} : { organizer: { '@type': 'Organization', name: s.organizer.name, ...(s.organizer.url ? { url: s.organizer.url } : {}) } }),
    url: `${SITE.url}/e/${s.id}/`,
  }));
  return items.length ? `<script type="application/ld+json">${JSON.stringify(items).replace(/</g, '\\u003c')}</script>\n` : '';
}

// この会場の「スポット」ページへのリンク（venueId があるとき）
function spotLink(s, ctx, lang) {
  const sp = s.venueId && ctx.spots.find((x) => x.venue.id === s.venueId);
  return sp ? `<br><a href="/spot/${sp.venue.id}/">${esc(lang === 'ja' ? 'この会場のスポットページ' : 'Spot page for this venue')}</a>` : '';
}

function pastDatesBlock(list, lang) {
  if (!list.length) return '';
  const p = P[lang].series;
  return `<h2 class="sec-h">${esc(p.secPast)}</h2><p class="note">${esc(P[lang].date.pastNote)}</p><ul class="sources">${list.slice(0, 10).map((o) => `<li><a href="/date/${o.date}/">${esc(dlabel(o.date, lang, { year: true }))}</a>　${statusTag(o, lang)}${o.note ? `　<span class="tbd">${esc(noteL(o, lang))}</span>` : ''}</li>`).join('')}</ul>`;
}

function seriesPage(s, ctx, lang) {
  const p = P[lang].series;
  const list = ctx.occ.filter((o) => o.series.id === s.id);
  const v = s.venue;
  const pn = prefLabel(v.pref, lang);
  const next = list.find(isActive);
  const dates = list.length
    ? `<ul class="sources">${list.slice(0, 12).map((o) => `<li>${esc(dlabel(o.date, lang, { year: true }))}　${statusTag(o, lang)}${o.note ? `　<span class="tbd">${esc(noteL(o, lang))}</span>` : ''}</li>`).join('')}</ul>`
    : `<p class="empty">${esc(p.noDates)}</p>`;
  const row = (k, x) => `<div><dt>${esc(k)}</dt><dd>${x}</dd></div>`;
  // 公式に記載がない項目の「目安」（会場の名前・市区町村・一般的な傾向だけから。札を付けて区別する。住所の番地・徒歩時間は作らない）
  const est = (text, pp) => `<span class="est" title="${esc(pp.estTitle)}">${esc(pp.est)}</span> ${esc(text)}`;
  const station = /^([^\s・（(駅]+駅)前/.exec(v.name)?.[1];
  const stationEn = /^(.+? Station)\b/.exec(venueEn(s))?.[1];
  const estAddress = p.estAddr(lang === 'ja' ? `${PREFS[v.pref]}${v.city || ''}` : [cityL(v.city, lang), pn].filter(Boolean).join(', '));
  const estAccess = station && (lang === 'ja' || stationEn) ? p.estStation(lang === 'ja' ? station : stationEn) : p.estRoute;
  const ex = s.exhibitor;
  const t = (x) => val(x, lang);
  const checked = lang === 'ja' ? '最終確認 ' : 'last checked ';
  const rule = lang === 'ja' ? esc(s.recurrence.text) : fieldEn(s, 'rule') ? orig(fieldEn(s, 'rule'), s.recurrence.text) : `${esc(recurEn(s.recurrence) || 'Selected dates (see below)')}<small class="orig" lang="ja">${esc(s.recurrence.text)}</small>`;
  const oen = lang === 'en' ? orgEn(s.organizer.name) : '';
  const oShown = oen ? orig(oen, s.organizer.name) : esc(s.organizer.name);
  const orgName = s.organizer.url ? `<a href="${esc(s.organizer.url)}" rel="noopener">${oShown}</a>` : oShown;
  const mu = mapUrls(s, lang);
  const wt = weatherTarget(s);
  const wxBox = next && wt ? `<section class="ev-card"><h2>${esc(p.secWx)}</h2><div class="wx" data-office="${wt.office}" data-area="${wt.area || ''}" data-date="${next.date}" data-lang="${lang}" data-region="${esc(prefLabel(v.pref, 'en'))}"><p class="wx-st">${esc(p.wxLoading)}</p></div><p class="note">${esc(p.wxNote)} ${esc(p.wxSrc)}<a href="https://www.jma.go.jp/bosai/forecast/" rel="noopener">${esc(p.wxJma)}</a>${lang === 'ja' ? '' : ' (気象庁)'}</p></section>` : '';
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(s).q)}&hl=${lang === 'ja' ? 'ja' : 'en'}&z=16&output=embed`;
  const side = `<aside class="ev-side" aria-label="${esc(p.secMap)}"><section class="ev-card"><h2>${esc(p.secMap)}</h2>${hasMapImg(s.id) ? `<a class="ev-mapimg" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow" title="${esc(p.mapOpen)}"><img src="/img/maps/${s.id}.webp" alt="${esc(p.mapImgAlt(lang === 'en' ? venueL(s, lang) : v.name))}" width="640" height="400" loading="lazy" decoding="async"></a><p class="note">${esc(p.mapApprox)}</p>` : `<div class="ev-map" data-src="${esc(mapSrc)}" data-title="${esc(p.secMap)}"><div class="ev-map-ph"><span aria-hidden="true">📍</span><b>${esc(lang === 'en' ? venueL(s, lang) : v.name)}</b><button type="button" class="map-show">${esc(p.mapShow)}</button><small>${esc(p.mapPrivacy)}</small></div></div>`}<p class="map-btns"><a class="map-btn" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow">${esc(p.mapOpen)} ↗</a><a class="map-btn s" href="${esc(mu.route)}" target="_blank" rel="noopener nofollow">${esc(p.mapRoute)} ↗</a></p><p class="note">${esc(mu.exact ? p.mapExact : p.mapLoose)}</p></section>${wxBox}</aside>`;
  const body = `<div class="in page">${breadcrumb([{ href: `/area/${v.pref}/`, label: pn }, ...(v.cityCode ? [{ href: `/area/${v.pref}/${v.cityCode}/`, label: cityL(v.city, lang) }] : []), { label: nameL(s, lang) }], lang)}
<h1>${esc(nameL(s, lang))}</h1>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="orig-h" lang="ja">${esc(s.name)}</p>` : ''}
<div class="tags">${kindTags(s.kinds, lang)}</div>
${next ? `<p class="banner">${esc(p.next)}${lang === 'ja' ? '：' : ': '}<b>${esc(dlabel(next.date, lang, { year: true }))}</b>　${esc(S[lang].status[next.status])}${lang === 'ja' ? '（' : ' ('}${checked}${esc(next.checkedAt)}${lang === 'ja' ? '）' : ')'}</p>` : ''}
${p.quoted ? `<p class="note">${esc(p.quoted)}</p>` : ''}
<div class="ev-split"><div class="ev-main">
<h2 class="sec-h">${esc(p.secInfo)}</h2>
<dl class="facts">
${row(p.when, rule)}
${row(p.time, lang === 'en' && timeEn(s) ? (s.time.text === timeEn(s).replace('–', '〜') ? esc(timeEn(s)) : orig(timeEn(s), s.time.text)) : t(s.time?.text))}
${row(p.venue, (lang === 'en' && venueL(s, lang) !== v.name ? orig(venueL(s, lang), v.name) : esc(v.name)) + spotLink(s, ctx, lang))}
${row(p.address, v.address ? tv(s, 'address', v.address, lang) : est(estAddress, p))}
${row(p.access, v.access ? tv(s, 'access', v.access, lang) : est(estAccess, p))}
${row(p.admission, s.visitor?.admission ? tv(s, 'admission', s.visitor.admission, lang) : est(p.estFree, p))}
${row(p.rain, tv(s, 'rain', s.visitor?.rain, lang))}
${row(s.organizer.label ? (lang === 'en' ? labelEn(s.organizer.label) || p.orgLabel(s.organizer.label) : p.orgLabel(s.organizer.label)) : p.org, orgName)}
</dl>
<h2 class="sec-h">${esc(p.secDates)}</h2>
${dates}
${pastDatesBlock(ctx.past.filter((o) => o.series.id === s.id), lang)}
<h2 class="sec-h" id="shuten">${esc(p.secVendor)}</h2>
${ex ? `<dl class="facts">${row(p.fee, tv(s, 'fee', ex.fee, lang))}${row(p.apply, tv(s, 'apply', ex.apply, lang))}${row(p.applyAt, ex.applyUrl ? `<a href="${esc(ex.applyUrl)}" rel="noopener">${esc(p.applyLink)}</a>` : TBC(lang))}${ex.notes ? row(p.notes, tv(s, 'notes', ex.notes, lang)) : ''}</dl>` : `<p class="empty">${esc(p.noVendor)}</p>`}
<h2 class="sec-h">${esc(p.secSrc)}</h2>
<ul class="sources">${s.sources.map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.url)}</a>（${checked}${esc(x.checkedAt)}）</li>`).join('')}</ul>
<p class="note">${s.recurrence.type === 'dates' ? '' : esc(p.rule(lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence)))} ${esc(disclaimer(lang))}</p>
</div>${side}</div>
</div>`;
  return pg(lang, `/e/${s.id}/`, { title: p.title(nameL(s, lang), pn, cityL(v.city, lang)), description: p.desc(nameL(s, lang), lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence) || s.recurrence.text, lastChecked(s)), body, head: eventLd(s, list), scripts: ['/weather.js', '/map.js'], keywords: [nameL(s, lang), prefLabel(s.venue.pref, lang), cityL(v.city, lang), ...s.kinds.map((k) => kindName(k, lang))].filter(Boolean) });
}

function shutenPage(ctx, lang) {
  const p = P[lang].shuten;
  const body = `<div class="in page">${breadcrumb([{ label: p.crumb }], lang)}<h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p>${exhibitorList(ctx.series, lang)}</div>`;
  return pg(lang, '/shuten/', { title: p.title, description: p.desc, body });
}

function searchPage(lang) {
  const p = P[lang].search;
  const body = `<div class="in page">${breadcrumb([{ label: p.h1 }], lang)}<h1>${esc(p.h1)}</h1>
<form class="search" action="/search/" role="search"><input name="q" type="search" placeholder="${esc(p.ph)}" aria-label="${esc(p.kw)}"><button>${esc(p.btn)}</button></form>
<p class="lead" id="search-status" aria-live="polite"></p><div id="search-results"></div></div>`;
  return pg(lang, '/search/', { title: p.h1, description: p.desc, body, scripts: ['/search.js'], css: ['/spot.css'] });
}

function aboutPage(ctx, lang) {
  const st = S[lang].status;
  const removeMail = CONTACT_EMAIL ? `<a href="mailto:${esc(CONTACT_EMAIL)}">${esc(CONTACT_EMAIL)}</a>` : '';
  const cr = (c) => (lang === 'ja' ? c : { ...c, ...c.en });
  const venuePhotos = (ctx.spots || []).filter((sp) => sp.venue.image).map((sp) => sp.venue);
  const photoCredits = venuePhotos.length ? `<h2>${lang === 'ja' ? 'スポットの写真の出典' : 'Spot photo credits'}</h2>
<ul>${venuePhotos.map((v) => `<li>${esc(lang === 'ja' ? v.name : spotL(v, 'name', 'en'))}：「${esc(v.image.title || v.image.file)}」${esc(v.image.author)}（<a href="${esc(v.image.sourceUrl)}" rel="noopener">Wikimedia Commons</a>。${esc(v.image.license)}${lang === 'ja' ? '。トリミング・縮小' : '. Cropped and resized'}）</li>`).join('')}</ul>` : '';
  const credits = photoCredits + (ctx.credits?.length ? `<h2>${lang === 'ja' ? '画像の出典' : 'Image credits'}</h2>
<ul>${ctx.credits.map(cr).map((c) => (lang === 'ja' ? `<li>${esc(c.use)}：「${esc(c.title)}」${esc(c.photographer)}（<a href="${esc(c.sourceUrl)}" rel="noopener">${esc(c.source)}</a>。${esc(c.license)}）</li>` : `<li>${esc(c.use)}: “${esc(c.title)}” — ${esc(c.photographer)} (<a href="${esc(c.sourceUrl)}" rel="noopener">${esc(c.source)}</a>; ${esc(c.license)})</li>`)).join('')}</ul>` : '');
  const ja = `<h1>掲載のきまり・出典</h1>
<h2>集めている情報</h2>
<p>主催者の公式ページ、自治体の公式ページ、自治体などが公開しているオープンデータだけを使います。ほかのイベント情報サイト・まとめサイト・SNS の掲載内容は、使いません。</p>
<p>掲載するのは、開催日・時間・会場・入場料・出店料・申込み方法などの事実だけです。公式ページの文章や写真は転載しません。すべての掲載に、出典（公式ページへのリンク）と最終確認日を付けています。</p>
<h2>開催日の表示</h2>
<ul>
<li><b>${esc(st.confirmed)}</b>：その回の開催を、公式の情報で確認しました。</li>
<li><b>${esc(st.scheduled)}</b>：公式に書かれた開催のきまり（例：毎月第1日曜）から計算した日です。その回について、個別の確認はしていません。</li>
<li><b>${esc(st.cancelled)}・${esc(st.postponed)}</b>：公式の情報で、中止・延期を確認しました。</li>
<li><b>${esc(st.unknown)}</b>：公式の情報で確認できない、または最終確認から日数がたっています。</li>
</ul>
<p>${esc(disclaimer('ja'))}</p>
<h2>地図・天気</h2>
<p>開催詳細の地図・経路は、Google マップへのリンクです（住所がなければ会場名で検索するため、位置は要確認）。公式の所在地が分かる会場の地図の画像は、OpenStreetMap（© OpenStreetMap contributors。ODbL）から作り、位置は国土地理院の住所検索で求めた目安です。天気予報は気象庁が公開している予報を、開催日の約7日前から表示します（地域の単位の予報で、会場ごとではありません。出典：気象庁）。</p>
<h2>アクセス解析</h2>
<p>このサイトは、利用状況（閲覧されたページの数など）を把握するために、Google アナリティクスを使っています。Google が Cookie 等を用いて、個人を特定しない形でデータを集めます。</p>
<h2>情報の取得</h2>
<p>公式ページの取得は、robots.txt と各サイトの利用規約に従い、同じサイトへは1日1回までに抑えています。取得が認められていないページは、リンクだけを掲載します。</p>
<h2 id="remove">掲載の修正・削除の依頼</h2>
<p>主催者の方からの、掲載内容の修正・削除のご依頼を受け付けています。${CONTACT_EMAIL ? `次のメールアドレスへ、主催者名・該当ページのURL・ご希望の内容をお送りください：${removeMail}` : '窓口は準備中です（要確認）。'}</p>`;
  const en = `<h1>Listing Policy & Sources</h1>
<h2>What we collect</h2>
<p>We use only the official pages of organizers, the official pages of local governments, and open data published by local governments. We do not use listings from other event-information sites, aggregator sites or social media.</p>
<p>We list only facts: dates, times, venues, admission, stall fees and how to apply. We do not copy text or photos from official pages. Every listing carries a source (a link to the official page) and the date it was last checked.</p>
<p>Names, venues, times, fees and similar details are this site’s unofficial English translations of the official Japanese wording. The Japanese original is shown in small type beside each item, and the official Japanese page applies if the two differ. Items without a translation are shown in Japanese.</p>
<h2>How dates are shown</h2>
<ul>
<li><b>${esc(st.confirmed)}</b>: this occurrence was confirmed from official information.</li>
<li><b>${esc(st.scheduled)}</b>: calculated from the recurrence rule stated officially (for example, every 1st Sunday). This specific occurrence has not been individually confirmed.</li>
<li><b>${esc(st.cancelled)} / ${esc(st.postponed)}</b>: a cancellation or postponement was confirmed from official information.</li>
<li><b>${esc(st.unknown)}</b>: not confirmed from official information, or it has been a while since the last check.</li>
</ul>
<p>${esc(disclaimer('en'))}</p>
<h2>Maps and weather</h2>
<p>The map and directions on each listing are links to Google Maps (if the official page gives no address, the link searches by venue name, so the location is TBC). Where the official address is known, the map image is made from OpenStreetMap (© OpenStreetMap contributors, ODbL), with the position looked up by the Geospatial Information Authority of Japan address search; it is an estimate. Weather forecasts come from the Japan Meteorological Agency and are shown from about 7 days before the event (a forecast for the JMA regional unit, not for the venue).</p>
<h2>Analytics</h2>
<p>This site uses Google Analytics to understand how it is used (for example, how many times pages are viewed). Google collects data with cookies and similar technologies, without identifying individuals.</p>
<h2>How we fetch pages</h2>
<p>We follow robots.txt and each site’s terms of use, and fetch from the same site at most once a day. For pages we are not allowed to fetch, we only link to them.</p>
<h2 id="remove">Correction / removal requests</h2>
<p>We accept requests from organizers to correct or remove a listing. ${CONTACT_EMAIL ? `Please email the organizer name, the URL of the page and what you would like changed to ${removeMail}.` : 'The contact point is being prepared (TBC).'}</p>`;
  const upd = lang === 'ja' ? `<h2>更新</h2>\n<p>毎朝、自動で更新しています。最終更新：${esc(ctx.today)}</p>` : `<h2>Updates</h2>\n<p>Updated automatically every morning. Last updated: ${esc(ctx.today)}</p>`;
  const body = `<div class="in page prose">${breadcrumb([{ label: lang === 'ja' ? 'サイトについて' : 'About' }], lang)}${lang === 'ja' ? ja : en}
${credits}
${upd}
</div>`;
  return pg(lang, '/about/', { title: lang === 'ja' ? '掲載のきまり・出典' : 'Listing Policy & Sources', description: lang === 'ja' ? 'Flea Market JP の情報の集め方・表示のきまり・出典・削除依頼について。' : 'How Flea Market JP collects information, how listings are shown, sources, and removal requests.', body });
}


// ---- 使い方・よくある質問・ブログ（本文は scripts/lib/content.mjs） ----

let TIPS = [];
let MANNERS = [];
function mannersPage(lang) {
  const title = lang === 'ja' ? '日本でのふるまい（TIPS）' : 'How to behave at Japanese flea markets';
  return pg(lang, '/tips/manners/', { title, description: lang === 'ja' ? '日本のフリーマーケット・骨董市で、気持ちよく過ごすためのコラム。' : 'Columns on how to enjoy a Japanese flea market or antique fair in a pleasant way.', bannerText: mannersBanner(lang), body: `<div class=\"in page\">${mannersIndex(MANNERS, lang)}</div>`, css: ART_CSS });
}

function mannerArticlePage(x, lang) {
  const c = x[lang];
  return pg(lang, `/tips/manners/${x.slug}/`, { title: c.title, description: c.lead, body: renderDoc({ title: c.title, lead: c.lead, secs: docSections(c.blocks, lang), lang }), css: ART_CSS });
}

function tipsPage(lang) {
  const tips = TIPS;
  const title = lang === 'ja' ? 'TIPS：楽しく体験するためのコツ' : 'Tips for enjoying flea markets';
  return pg(lang, '/tips/', { title, description: lang === 'ja' ? '日本のフリーマーケット・骨董市で、気持ちよく過ごすための10のコツ。出典は公式ページ。' : 'Ten tips for a good visit to a flea market or antique fair in Japan, each with its official source.', bannerText: tipsBanner(lang), body: `<div class="in page">${tipsBody(tips, lang)}</div>`, css: ART_CSS });
}

function guidePage(lang) {
  const g = GUIDE[lang];
  const body = renderDoc({ title: g.title, lead: g.lead, secs: docSections(g.blocks, lang), lang });
  return pg(lang, '/guide/', { title: g.title, description: g.lead, body, css: ART_CSS });
}

function faqPage(lang) {
  const f = FAQ[lang];
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: f.items.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') } })) };
  const body = renderDoc({ title: f.title, lead: f.lead, secs: faqSections(f.items, lang), lang });
  return pg(lang, '/faq/', { title: f.title, description: f.lead, body, css: ART_CSS, head: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n` });
}

const blogTitle = (lang) => (lang === 'ja' ? 'ブログ' : 'Blog');
const feedLink = (lang) => `<link rel="alternate" type="application/rss+xml" title="${esc(`${SITE.name} ${blogTitle(lang)}`)}" href="${langPath('/blog/feed.xml', lang)}">\n`;
// 手で書いた記事（content.mjs）＋自動で作った記事（data/blog-auto）。新しい順
let ALL_POSTS = [...BLOG];

// ガイド記事の動的ブロック：{ dates: { series: [id…], limit } }＝次回の開催日（公式で確認／予定）、{ photo: <スポット id> }＝スポットの写真（出典つき）。ビルドのたびに、最新のデータから作る
function resolvePost(post, ctx) {
  const out = { ...post };
  for (const lang of ['en', 'ja']) {
    out[lang] = { ...post[lang], blocks: post[lang].blocks.map((b) => (b.dates ? datesBlock(b.dates, ctx, lang) : b.photo ? photoBlock_(b.photo, ctx, lang) : b)) };
  }
  return out;
}
function datesBlock(d, ctx, lang) {
  const ids = new Set(d.series);
  const list = ctx.occ.filter((o) => ids.has(o.series.id) && isActive(o)).slice(0, d.limit || 8);
  if (!list.length) return { p: lang === 'ja' ? '今後の開催日は、公式の情報で確認できていません（要確認）。' : 'No upcoming dates are confirmed from official sources (TBC).' };
  const checked = list.map((o) => o.checkedAt).sort().at(-1);
  return { ul: [...list.map((o) => `**${dlabel(o.date, lang, { year: true })}** ${S[lang].status[o.status]}${o.note ? `（${noteL(o, lang)}）` : ''} — [${nameL(o.series, lang)}](/e/${o.series.id}/)`), lang === 'ja' ? `最終確認：${checked}（毎朝の自動更新で更新されます）` : `Last checked: ${checked} (updated by the daily refresh)`] };
}
function photoBlock_(vid, ctx, lang) {
  const v = ctx.spots.find((x) => x.venue.id === vid)?.venue;
  const im = v?.image;
  if (!im) return { html: '' };
  const cap = `${lang === 'ja' ? '写真' : 'Photo'}: ${esc(im.author)} / <a href="${esc(im.licenseUrl || im.sourceUrl)}" rel="noopener nofollow">${esc(im.license)}</a> / <a href="${esc(im.sourceUrl)}" rel="noopener nofollow">Wikimedia Commons</a>`;
  return { html: `<figure class="bl-photo"><img src="/img/spots/${esc(im.file)}" alt="${esc(lang === 'ja' ? im.altJa : im.altEn)}" width="800" height="533" loading="lazy" decoding="async"><figcaption>${cap}</figcaption></figure>` };
}
// 地図の画像（static/img/maps/<id>.webp）がある会場の位置（data/geo.json）
let GEO = {};
const hasMapImg = (id) => Boolean(GEO[id]) && existsSync(join(ROOT, 'static', 'img', 'maps', `${id}.webp`));
const posts = () => [...ALL_POSTS].sort((a, b) => b.date.localeCompare(a.date) || b.slug.localeCompare(a.slug));
// 自動の記事の本文にある開催詳細へのリンクは、その開催がもうなければ、リンクにしない
const cleanLinks = (post, ids) => {
  const fix = (t) => (typeof t === 'string' ? t.replace(/\[([^\]]+)\]\(\/e\/([a-z0-9-]+)\/\)/g, (m, text, id) => (ids.has(id) ? m : text)) : t);
  const lang = (c) => ({ ...c, blocks: c.blocks.map((b) => (b.p ? { p: fix(b.p) } : b.ul ? { ul: b.ul.map(fix) } : b)) });
  return { ...post, en: lang(post.en), ja: lang(post.ja) };
};

function blogIndex(lang) {
  const lead = lang === 'ja' ? 'マーケットの探し方・読み方・お出かけの前の確認について。公式ページの記載に基づいて書いています。' : 'How to find markets, read listings and check before you go, based on what official pages say.';
  return pg(lang, '/blog/', { title: blogTitle(lang), description: lead, bannerText: blogBanner(lang), body: renderBlogIndex(posts(), lang), css: ART_CSS, scripts: ['/blog.js'], head: feedLink(lang) });
}

function blogPost(post, lang) {
  const c = post[lang];
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: c.title, datePublished: post.date, inLanguage: lang, url: `${SITE.url}${langPath(`/blog/${post.slug}/`, lang)}` };
  return pg(lang, `/blog/${post.slug}/`, { title: c.title, description: c.summary, body: renderPost(post, posts(), lang), css: ART_CSS, keywords: [...(c.tags || []), c.title], head: `${feedLink(lang)}<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n` });
}

// RSS（/blog/feed.xml、/ja/blog/feed.xml）
function feedXml(lang) {
  const x = (t) => esc(t).replace(/&#39;/g, "&apos;");
  const items = posts().map((p) => `<item><title>${x(p[lang].title)}</title><link>${SITE.url}${langPath(`/blog/${p.slug}/`, lang)}</link><guid>${SITE.url}${langPath(`/blog/${p.slug}/`, lang)}</guid><pubDate>${new Date(`${p.date}T00:00:00+09:00`).toUTCString()}</pubDate><description>${x(p[lang].summary)}</description></item>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${x(`${SITE.name} ${blogTitle(lang)}`)}</title><link>${SITE.url}${langPath('/blog/', lang)}</link><description>${x(blogIndexLead(lang))}</description><language>${lang}</language>\n${items}\n</channel></rss>\n`;
}
const blogIndexLead = (lang) => (lang === 'ja' ? 'マーケットの探し方・読み方・お出かけの前の確認について。' : 'How to find markets, read listings and check before you go.');

function notFound(lang) {
  const p = P[lang].nf;
  return pg(lang, '/404.html', { title: p.title, description: p.title, body: `<div class="in page"><h1>${esc(p.title)}</h1><p class="lead">${esc(p.lead)}<a href="/">${esc(p.back)}</a></p></div>` });
}


// ---- 右のナビ（ヘッダーのリンク先のページ）：サイト内の主なページへの相互リンク＋そのページに合う絞り込み ----
function sideNav(ctx, lang, base) {
  const sd = P[lang].side;
  const li = (href, text, right = '→', cur = false) => `<li><a href="${href}"${cur ? ' aria-current="page"' : ''}><span>${esc(text)}</span><i aria-hidden="true">${esc(right)}</i></a></li>`;
  const card = (title, items, aria) => `<nav class="ev-card sn" aria-label="${esc(aria || title)}"><h2>${esc(title)}</h2><ul class="sn-list">${items.join('')}</ul></nav>`;
  const active = ctx.occ.filter(isActive);
  const curRoot = (href) => (href === '/' ? base === '/' : base === href || (href !== '/about/' && base.startsWith(href)) || (href === '/about/' && base.startsWith('/about/')));
  const links = S[lang].footer.links.filter(([h]) => !h.includes('#'));
  const browse = card(sd.browse, links.map(([h, t]) => li(h, t, '→', curRoot(h))), sd.browseAria);
  let extra = '';
  const m = /^\/(date)\/(\d{4}-\d\d-\d\d)\/$/.exec(base);
  if (base === '/weekend/' || base === '/calendar/' || m) {
    const counts = new Map();
    for (const o of active) counts.set(o.date, (counts.get(o.date) || 0) + 1);
    const days = [];
    for (let i = 0; i < 14; i++) { const d = addDays(ctx.today, i); if (counts.get(d)) days.push(li(`/date/${d}/`, dlabel(d, lang), P[lang].cnt(counts.get(d)), m?.[2] === d)); }
    if (days.length) extra = card(sd.dates, days);
  } else if (base.startsWith('/area/')) {
    const [, , pref, city] = base.split('/');
    const prefs = new Map();
    for (const s of ctx.series) { if (!prefs.has(s.venue.pref)) prefs.set(s.venue.pref, new Map()); if (s.venue.cityCode) prefs.get(s.venue.pref).set(s.venue.cityCode, s.venue.city); }
    const count = (f) => active.filter((o) => f(o.series)).length;
    const cards = [];
    if (pref && prefs.has(pref) && prefs.get(pref).size) cards.push(card(sd.cities, [...prefs.get(pref)].sort().map(([c, n]) => li(`/area/${pref}/${c}/`, cityL(n, lang), P[lang].cnt(count((s) => s.venue.cityCode === c)), c === city))));
    cards.push(card(sd.pref, [...prefs.keys()].sort().map((k) => li(`/area/${k}/`, prefLabel(k, lang), P[lang].cnt(count((s) => s.venue.pref === k)), k === pref && !city))));
    extra = cards.join('');
  } else if (base.startsWith('/kind/') || base === '/shuten/' || base === '/search/') {
    const cur = /^\/kind\/(\w+)\/$/.exec(base)?.[1];
    extra = card(sd.types, Object.keys(KINDS).map((k) => li(`/kind/${k}/`, kindName(k, lang), P[lang].cnt(active.filter((o) => o.series.kinds.includes(k)).length), k === cur)));
  } else if (base === '/about/') {
    extra = card(sd.removeReq, [li('/about/#remove', sd.removeReq)]);
  }
  return `<aside class="ev-side" aria-label="${esc(sd.browse)}">${browse}${extra}</aside>`;
}

// ページの本文（パンくずのあと）を、本文＋右のナビの2列にする
// 本文の先頭（パンくず・見出し・説明）を、帯の中へ移す（地域のページと同じ形）
function splitBanner(page) {
  if (page.bannerText || page.body.includes('class="ev-split"')) return page;
  const m = /^<div class="in page[^"]*">((?:<nav class="crumbs"[\s\S]*?<\/nav>)?<h1[\s\S]*?<\/h1>(?:<p class="lead">[\s\S]*?<\/p>)?)([\s\S]*)<\/div>$/.exec(page.body);
  if (m) return { ...page, bannerText: m[1], body: `<div class="in page">${m[2]}</div>` };
  // 読み物（ガイド・よくある質問・ブログ記事）：パンくず・見出し・説明（art-head）を帯へ
  const a = /^<div class="art-wrap">\s*(<nav class="crumbs art-crumbs"[\s\S]*?<\/nav>)\s*<header class="art-head">(<h1[\s\S]*?<\/h1>(?:<p class="art-k">[\s\S]*?<\/p>)?(?:<p class="art-lead">[\s\S]*?<\/p>)?)([\s\S]*?)<\/header>([\s\S]*)$/.exec(page.body);
  if (a) return { ...page, bannerText: `${a[1].replace('art-crumbs', 'art-crumbs-x')}${a[2]}`, body: `<div class="art-wrap">${a[3].trim() ? `<header class="art-head">${a[3]}</header>` : ''}${a[4]}` };
  return page;
}

function withSide(page0, ctx, lang) {
  const page = splitBanner(page0);
  const base = splitPath(page.path).base;
  if (!/^\/(weekend|calendar|date|area|kind|spot|shuten|search|about)\//.test(base)) return page;
  if (page.body.includes('class="ev-split"')) return page; // 個別ページ（スポットなど）は、自前の2列
  // 帯に文字を置くページ（パンくずが帯の中）：本文の右に、同じ右の列を付ける
  if (page.bannerText) {
    const inner = /^<div class="in page[^"]*">([\s\S]*)<\/div>$/.exec(page.body);
    if (!inner) return page;
    return { ...page, body: `<div class="in page"><div class="ev-split"><div class="ev-main">${inner[1]}</div>${sideNav(ctx, lang, base)}</div></div>` };
  }
  const m = /^(<div class="in page[^"]*">)(<nav class="crumbs"[\s\S]*?<\/nav>)([\s\S]*)<\/div>$/.exec(page.body);
  if (!m) return page;
  return { ...page, body: `${m[1]}${m[2]}<div class="ev-split"><div class="ev-main">${m[3]}</div>${sideNav(ctx, lang, base)}</div></div>` };
}

// ---- 全体 ----

export function buildPages({ series, occurrences, credits = [], translations = {}, autoPosts = [], geo = {}, archive = { items: [] }, venues = [], siteUpdates = [], tips = [], manners = [] }, today, days = 120) {
  setTranslations(translations);
  TIPS = tips;
  MANNERS = manners;
  GEO = geo;
  const ids = new Set(series.map((x) => x.id));
  const occ = buildOccurrences(series, occurrences, today, days);
  { const n = new Map(); for (const o of occ) if (isActive(o)) n.set(o.series.venue.pref, (n.get(o.series.venue.pref) || 0) + 1); setFooterAreas([...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([p]) => p)); }
  const past = pastOccurrences(archive, series).filter((o) => o.date < today);
  const spots = buildSpots(venues, series, occ, today);
  const spotMapImg = (id) => Boolean(GEO[`spot-${id}`]) && existsSync(join(ROOT, 'static', 'img', 'maps', `spot-${id}.webp`));
  const ctx = { series, occ, past, spots, spotMapImg, guideSlugs: new Set(BLOG.map((b) => b.slug)), siteUpdates: [...siteUpdates].sort((a, b) => b.date.localeCompare(a.date)), weekend: upcomingWeekend(today), today, days, credits };
  ALL_POSTS = [...BLOG.map((b) => cleanLinks(resolvePost(b, ctx), ids)), ...autoPosts.map((a) => cleanLinks(a, ids))];
  ctx.latestPosts = posts().slice(0, 3);
  // 英語が既定（/）。日本語は /ja/
  const pages = LANGS_ORDER.flatMap((lang) => [home(ctx, lang), weekendPage(ctx, lang), calendarPage(ctx, lang), ...datePages(ctx, lang), ...areaPages(ctx, lang), ...kindPages(ctx, lang), ...series.map((s) => seriesPage(s, ctx, lang)), ...(spots.length ? [spotIndex(ctx, lang), ...spots.map((sp) => spotPage(sp, ctx, lang))] : []), shutenPage(ctx, lang), searchPage(lang), aboutPage(ctx, lang), guidePage(lang), tipsPage(lang), mannersPage(lang), ...MANNERS.map((x) => mannerArticlePage(x, lang)), faqPage(lang), blogIndex(lang), ...ALL_POSTS.map((b) => blogPost(b, lang)), notFound(lang)].map((pg_) => withSide(pg_, ctx, lang)));
  // ページではないファイル（RSS）
  const files = LANGS_ORDER.map((lang) => ({ path: langPath('/blog/feed.xml', lang), content: feedXml(lang) }));
  return { pages, occ, files, spots };
}

export function searchIndex(occ) {
  // 検索用：開催回ごとの小さな JSON（/events.json）
  return occ.map((o) => ({
    d: o.date, st: o.status, c: o.checkedAt, id: o.series.id, n: o.series.name, ne: nameEn(o.series), k: o.series.kinds,
    p: PREFS[o.series.venue.pref], pe: prefLabel(o.series.venue.pref, 'en'), ci: o.series.venue.city || '', cie: cityEn(o.series.venue.city), v: o.series.venue.name, ve: venueEn(o.series), t: o.series.time?.text || '', te: timeEn(o.series), r: o.series.recurrence.text, re: recurEn(o.series.recurrence),
  }));
}

// 検索用：スポット（会場）の小さな JSON（/events.json の spots）
function spotIndexData(spots) {
  return spots.map((sp) => ({ id: sp.venue.id, n: sp.venue.name, ne: venueTrEn(sp.venue.id, 'name'), ci: sp.venue.area.city || '', cie: cityEn(sp.venue.area.city), p: PREFS[sp.venue.area.pref], pe: prefLabel(sp.venue.area.pref, 'en'), k: sp.venue.kind, pl: sp.venue.place || '', c: sp.count }));
}

function main() {
  const today = arg('today') || todayJst();
  parseYmd(today);
  const out = resolve(ROOT, arg('out') || 'dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(ROOT, 'static'), out, { recursive: true });
  const { pages, occ, files, spots } = buildPages(loadData(arg('data') ? resolve(ROOT, arg('data')) : undefined), today);
  for (const p of pages) {
    const file = p.path.endsWith('.html') ? join(out, p.path) : join(out, p.path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, layout(p));
  }
  for (const f of files) {
    mkdirSync(dirname(join(out, f.path)), { recursive: true });
    writeFileSync(join(out, f.path), f.content);
  }
  writeFileSync(join(out, 'spot-ids.json'), JSON.stringify(spots.map((sp) => sp.venue.id)));
  writeFileSync(join(out, 'events.json'), JSON.stringify({ today, events: searchIndex(occ), spots: spotIndexData(spots) }));
  writeFileSync(join(out, 'pages.json'), JSON.stringify(pages.filter((p) => !p.path.endsWith('.html')).map((p) => p.path)));
  console.log(`${today} 基準で ${pages.length} ページ、開催 ${occ.length} 件を ${out} に書き出しました`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
