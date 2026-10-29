// data/ から、dist/ に静的サイトを作る（毎日、日本時間の今日を基準に作り直す）。
// 使い方: node scripts/build-site.mjs [--today=YYYY-MM-DD] [--out=dist]
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, holidayName, isDayOff, parseYmd, todayJst, upcomingWeekend, weekday, WEEKDAYS } from './lib/dates.mjs';
import { buildOccurrences, isActive, lastChecked, WINDOW_DAYS } from './lib/events.mjs';
import { pastOccurrences } from './lib/archive.mjs';
import { buildSpots } from './lib/spots.mjs';
import { pollBlock, spotIndex, spotPage } from './lib/spot-view.mjs';
import { KINDS } from './lib/kinds.mjs';
import { PREFS } from './lib/areas.mjs';
import { CONTACT_EMAIL, SITE } from './lib/nav.mjs';
import { REVIEWS_ON, reviewsSection } from './lib/reviews-view.mjs';
import { CONTACT_ON, contactBanner, contactBody } from './lib/contact-view.mjs';
import { renderCalendar, renderHomeBody } from './lib/home-view.mjs';
import { S, T, WD_EN } from './lib/i18n.mjs';
import { BLOG, FAQ, GUIDE } from './lib/content.mjs';
import { ART_CSS, blogBanner, docSections, faqSections, renderBlogIndex, renderDoc, renderPost } from './lib/article-view.mjs';
import { tipsBanner, tipsIndex } from './lib/tips-view.mjs';
import { hubText } from './lib/hub.mjs';
import { icsDates, icsFor, icsPath } from './lib/ics.mjs';
import { SV } from './lib/saved-txt.mjs';
import { icon } from './lib/icons.mjs';
import { endedSeries, MAX_RULES, redirectRules } from './lib/redirects.mjs';
import { mapQuery, mapUrls, weatherTarget } from './lib/weather.mjs';
import { spotL, venueTrEn, cityEn, cityL, fieldEn, labelEn, nameEn, nameL, noteL, orgEn, setTranslations, timeEn, venueEn, venueL } from './lib/tr-en.mjs';
import { disclaimer, dlabel, holiday, KIND_DESC_EN, langPath, splitPath, monthTitle, P, prefLabel, recurEn, TBC } from './lib/l10n.mjs';
import { setFooterAreas, areaFilter, breadcrumb, esc, cardImg, eventList, eventListByMonth, kindTags, layout, OG_DEFAULT, statusTag } from './lib/html.mjs';

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
  let hub = {};
  try { hub = read('hub-content.json'); } catch { /* 解説文のデータがない場合は、掲載データから作る導入文だけ */ }
  return { series: read('series.json'), occurrences: read('occurrences.json'), credits, translations, autoPosts, geo, archive, venues, siteUpdates, tips, hub };
}

// ---- 各ページ ----
// 本文の内部リンクは、英語の URL で書く（layout() が、日本語のページでは /ja/ 付きにする）。
// 各ページは lang（'en' が既定、'ja'）ごとに作り、path は出力先の URL（日本語は /ja/ 以下）。

const val = (v, lang) => (v ? esc(v) : TBC(lang));
// 英語のページでは、訳があれば「英語＋公式の日本語（小さく）」で出す。訳がなければ日本語のまま
const orig = (en, ja) => `${esc(en)}<small class="orig" lang="ja">${esc(ja)}</small>`;
const ORIG_KEYS = new Set(['address', 'venue', 'name']);
const tv = (s, key, ja, lang) => (!ja ? TBC(lang) : lang === 'en' && fieldEn(s, key) ? (ORIG_KEYS.has(key) ? orig(fieldEn(s, key), ja) : esc(fieldEn(s, key))) : esc(ja));
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
  const fonts = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@600&display=swap">\n';
  return pg(lang, '/', { title: SITE.name, description: T[lang].description, body, css: ['/home.css'], scripts: ['/home.js', '/hero-switch.js'], head: fonts });
}

function listPage(lang, base, crumbs, h1, lead, list, extra = '', filter = false, seo = {}) {
  const af = filter ? areaFilter(list, lang) : '';
  const body = `<div class="in page">${breadcrumb(crumbs, lang)}<h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}${extra}${af}${eventListByMonth(list, lang)}${seo.after || ''}</div>`;
  return pg(lang, base, { title: seo.title || h1, description: seo.description || P[lang].listDesc(h1), body, scripts: [...(af ? ['/area-filter.js'] : []), ...(seo.scripts || [])], css: extra.includes('hm-cal') ? ['/cal-band.css'] : [], keywords: [h1, ...crumbs.map((c) => c.label)], ...(seo.head ? { head: seo.head } : {}) });
}


// ---- 長い一覧は、実URLのページに分ける（1ページ40件。2ページ目以降は noindex,follow・サイトマップに入れない）----
export const PAGE_SIZE = 40;
const PG_TXT = {
  en: { page: (n) => `Page ${n}`, of: (n, t) => `Page ${n} of ${t}`, prev: 'Previous', next: 'Next', nav: 'Pages' },
  ja: { page: (n) => `${n}ページ目`, of: (n, t) => `${n} / ${t} ページ`, prev: '前へ', next: '次へ', nav: 'ページ送り' },
};
function pager(base, n, total, lang) {
  if (total < 2) return '';
  const x = PG_TXT[lang];
  const href = (i) => (i === 1 ? base : `${base}page/${i}/`);
  const link = (i, label, rel) => `<a href="${href(i)}" rel="${rel}">${esc(label)}</a>`;
  const nums = Array.from({ length: total }, (_, i) => i + 1).map((i) => (i === n ? `<b aria-current="page">${i}</b>` : `<a href="${href(i)}">${i}</a>`)).join('');
  return `<nav class="pager" aria-label="${esc(x.nav)}">${n > 1 ? link(n - 1, `‹ ${x.prev}`, 'prev') : ''}<span class="pg-nums">${nums}</span>${n < total ? link(n + 1, `${x.next} ›`, 'next') : ''}<small>${esc(x.of(n, total))}</small></nav>`;
}
function listPaged(lang, base, crumbs, h1, lead, list, extra = '', filterHtml = '', seo = {}) {
  const total = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const x = PG_TXT[lang];
  return Array.from({ length: total }, (_, i) => {
    const n = i + 1;
    const slice = list.slice(i * PAGE_SIZE, (i + 1) * PAGE_SIZE);
    const path = n === 1 ? base : `${base}page/${n}/`;
    const cr = n === 1 ? crumbs : [...crumbs.slice(0, -1), { href: base, label: crumbs[crumbs.length - 1].label }, { label: x.page(n) }];
    const rel = (k, m) => `<link rel="${k}" href="${SITE.url}${langPath(m === 1 ? base : `${base}page/${m}/`, lang)}">\n`;
    const head = `${listLd(h1, slice, lang)}${n > 1 ? rel('prev', n - 1) : ''}${n < total ? rel('next', n + 1) : ''}${n > 1 ? '<meta name="robots" content="noindex,follow">\n' : ''}`;
    const title = n === 1 ? (seo.title || h1) : `${seo.title || h1} (${x.page(n)})`;
    const first = n === 1;
    return listPage(lang, path, cr, first ? h1 : `${h1} (${x.page(n)})`, first ? lead : '', slice, first ? extra + filterHtml : '', false, { title, description: first ? seo.description : undefined, head, scripts: first ? seo.scripts : [], after: pager(base, n, total, lang) + (first ? seo.after || '' : '') });
  });
}

// ---- 地域 × 月のページ（年つき。/area/13/2026-11/）。今後120日の開催が MONTH_MIN 件以上ある月だけ ----
export const MONTH_MIN = 5;
function monthPrefs(ctx, p) {
  const m = new Map();
  for (const o of ctx.occ) if (isActive(o) && o.series.venue.pref === p) m.set(o.date.slice(0, 7), (m.get(o.date.slice(0, 7)) || 0) + 1);
  return new Map([...m].filter(([, n]) => n >= MONTH_MIN).sort((a, b) => (a[0] < b[0] ? -1 : 1)));
}
function monthNav(mp, p, cur, lang) {
  if (!mp.size) return '';
  const label = lang === 'en' ? 'Browse by month' : '月から探す';
  const chips = [...mp].map(([ym, n]) => (ym === cur ? `<span class="af-chip" aria-current="page">${esc(monthTitle(ym, lang))}<sup>${n}</sup></span>` : `<a class="af-chip" href="/area/${p}/${ym}/">${esc(monthTitle(ym, lang))}<sup>${n}</sup></a>`)).join('');
  return `<nav class="af-chips af-links" aria-label="${esc(label)}">${chips}</nav>`;
}
function monthPages(ctx, lang, p, pn, ym, mp, A) {
  const mt = monthTitle(ym, lang);
  const all = ctx.occ.filter((o) => o.series.venue.pref === p && o.date.startsWith(ym));
  const act = all.filter(isActive);
  const days = new Set(act.map((o) => o.date)).size;
  const kinds = new Map();
  for (const o of act) for (const k of o.series.kinds) kinds.set(k, (kinds.get(k) || 0) + 1);
  const kl = [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, n]) => `${kindName(k, lang)} ${n}`).join(lang === 'ja' ? '、' : ', ');
  const h1 = lang === 'en' ? `${pn} Flea Markets in ${mt}` : `${mt}の${pn}のフリーマーケット・蚤の市`;
  const lead = lang === 'en'
    ? `${act.length} market${act.length === 1 ? '' : 's'} on ${days} day${days === 1 ? '' : 's'} in ${pn} in ${mt}${kl ? ` (${kl})` : ''}. Dates come from official organizer and municipal pages.`
    : `${pn}の${mt}の開催は、${days}日にわたって${act.length}件です${kl ? `（${kl}）` : ''}。日程は、主催者・自治体の公式ページをもとにしています。`;
  const desc = lang === 'en'
    ? `${pn} flea markets, antique fairs and craft markets in ${mt}: ${act.length} events on ${days} days, from official organizer and municipal pages.`
    : `${mt}の${pn}のフリーマーケット・蚤の市・骨董市：${days}日で${act.length}件。主催者・自治体の公式情報をもとにしています。`;
  return listPaged(lang, `/area/${p}/${ym}/`, [{ href: '/area/', label: A.crumb }, { href: `/area/${p}/`, label: pn }, { label: mt }], h1, lead, all, monthNav(mp, p, ym, lang), '', { title: h1, description: desc })
    .map((x) => ({ ...x, bannerArt: `/img/pref/${p}.webp` }));
}

// ---- 日別・今週末ページの SEO（タイトル・説明・書き出しの文・構造化データ・日別への導線）----
// 検索する人の言葉（Japan・flea market・this weekend・件数）をタイトルの前に置く。件数・内訳は実データから作る
const AREA_TOP = 3;
function seoStats(list, lang) {
  const act = list.filter(isActive);
  const conf = act.filter((o) => o.status === 'confirmed').length;
  const m = new Map();
  for (const o of act) m.set(o.series.venue.pref, (m.get(o.series.venue.pref) || 0) + 1);
  const top = [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, AREA_TOP).map(([p, n]) => `${prefLabel(p, lang)} ${n}`);
  return { act, n: act.length, conf, top };
}
function seoText(lang, scope, label, st, holidayLabel) {
  const { n, conf, top } = st;
  if (lang === 'ja') {
    const hol = holidayLabel ? `（${holidayLabel}）` : '';
    return {
      title: scope === 'weekend' ? `今週末（${label}）の全国のフリマ・蚤の市・骨董市：${n}件` : `${label}${hol}の全国のフリマ・蚤の市・骨董市：${n}件`,
      description: `${scope === 'weekend' ? `今週末（${label}）` : `${label}${hol}`}に開催されるフリマ・蚤の市・骨董市・手作り市${n}件の一覧。東京・大阪・京都ほか。主催者・自治体の公式情報をもとに、毎朝更新しています。`,
      lead: `${scope === 'weekend' ? `今週末（${label}）` : `${label}${hol}`}の開催は${n}件です。そのうち${conf}件は主催者・自治体の公式ページで確認した回で、残りは公式のきまりから算出した予定です。${top.length ? `地域別の多い順：${top.join('、')}。` : ''}`,
    };
  }
  const events = `${n} event${n === 1 ? '' : 's'}`;
  const hol = holidayLabel ? ` (${holidayLabel})` : '';
  return {
    title: scope === 'weekend' ? `Flea Markets in Japan This Weekend (${label}): ${events}` : `Flea Markets in Japan on ${label}${hol}: ${events}`,
    description: `${n} flea market${n === 1 ? '' : 's'}, antique fair${n === 1 ? '' : 's'} and handmade market${n === 1 ? '' : 's'} in Japan ${scope === 'weekend' ? `this weekend (${label})` : `on ${label}`}${n === 1 ? '' : ' — Tokyo, Osaka, Kyoto and more'}. Listed from official organizer and municipal pages, updated every morning.`,
    lead: `${n === 1 ? 'There is 1 market' : `There are ${n} markets`} in Japan ${scope === 'weekend' ? 'this weekend' : `on ${label}`}${hol}. ${conf} of ${n} ${conf === 1 ? 'is' : 'are'} confirmed from official organizer or municipal pages; the rest follow their recurring schedules.${top.length ? ` Most by area: ${top.join(', ')}.` : ''}`,
  };
}
function listLd(name, list, lang) {
  const items = list.filter(isActive).slice(0, 50).map((o, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE.url}${langPath(`/e/${o.series.id}/`, lang)}`, name: nameL(o.series, lang) }));
  if (!items.length) return '';
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ItemList', name, numberOfItems: list.filter(isActive).length, itemListElement: items }).replace(/</g, '\\u003c')}</script>\n`;
}
// 今週末の土曜・日曜（開催のある日）のページと、今週末のページへの相互リンク
function weekendLinks(ctx, current, lang) {
  const days = upcomingWeekend(ctx.today);
  const cnt = (d) => ctx.occ.filter((o) => o.date === d && isActive(o)).length;
  const num = (d) => (lang === 'ja' ? `（${cnt(d)}）` : ` (${cnt(d)})`);
  const tabs = days.filter((d) => cnt(d) > 0).map((d) => (d === current ? `<b aria-current="page">${esc(dlabel(d, lang))}${num(d)}</b>` : `<a href="/date/${d}/">${esc(dlabel(d, lang))}${num(d)}</a>`));
  if (!tabs.length || (current !== 'weekend' && !days.includes(current))) return '';
  const all = days.length > 1 ? (current === 'weekend' ? `<b aria-current="page">${lang === 'ja' ? '両日' : 'Both days'}</b>` : `<a href="/weekend/">${lang === 'ja' ? '両日' : 'Both days'}</a>`) : '';
  return `<nav class="day-tabs" aria-label="${lang === 'ja' ? '今週末' : 'This weekend'}">${tabs.join('')}${all}</nav>`;
}

function weekendPage(ctx, lang) {
  const days = upcomingWeekend(ctx.today);
  const p = P[lang].weekend;
  const title = p.title(dlabel(days[0], lang), days.length > 1 ? dlabel(days.at(-1), lang) : '');
  const list = ctx.occ.filter((o) => days.includes(o.date));
  const label = days.length > 1 ? `${dlabel(days[0], lang)}${lang === 'ja' ? '〜' : ' – '}${dlabel(days.at(-1), lang)}` : dlabel(days[0], lang);
  const t = seoText(lang, 'weekend', label, seoStats(list, lang));
  return listPage(lang, '/weekend/', [{ label: p.crumb }], t.title, t.lead, list, weekendLinks(ctx, 'weekend', lang), true, { title: t.title, description: t.description, head: listLd(t.title, list, lang) });
}

function datePages(ctx, lang) {
  const dates = [...new Set(ctx.occ.map((o) => o.date))];
  const upcoming = dates.map((d) => {
    const list = ctx.occ.filter((o) => o.date === d);
    const t = seoText(lang, 'date', dlabel(d, lang, { year: true }), seoStats(list, lang), holiday(d, lang));
    return listPage(lang, `/date/${d}/`, [{ href: '/calendar/', label: P[lang].date.crumb }, { label: dlabel(d, lang) }], t.title, t.lead, list, weekendLinks(ctx, d, lang) + dayStrip(ctx.occ, ctx.today, d, lang), true, { title: t.title, description: t.description, head: listLd(t.title, list, lang) });
  });
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

// 都道府県ページの「この地域の概要」：掲載データの事実だけから作る（件数・種類・毎月の市・初めての方への案内）。
// 東京・大阪・京都は、社寺の境内で開かれる市（会場名から）と、公式の観光サイトへのリンクを小さく添える
const TOURISM = {
  13: { en: ['GO TOKYO, the official travel guide of Tokyo', 'https://www.gotokyo.org/en/index.html'], ja: ['東京の観光公式サイト GO TOKYO', 'https://www.gotokyo.org/jp/index.html'] },
  27: { en: ['OSAKA-INFO, Osaka official tourism guide', 'https://osaka-info.jp/en/'], ja: ['大阪観光公式ガイド OSAKA-INFO', 'https://osaka-info.jp/'] },
  26: { en: ['Kyoto City Official Guide', 'https://kyoto.travel/en/'], ja: ['京都市公式 京都観光Navi', 'https://ja.kyoto.travel/'] },
};
const SACRED = /(寺|神社|天満宮|八幡宮|大社|大師|不動尊|観音|稲荷|神宮)/;
const REGULAR = new Set(['monthly-nth', 'monthly-day', 'weekly']);
function prefOverview(p, ctx, lang) {
  const ja = lang === 'ja';
  const pn = prefLabel(p, lang);
  const ser = ctx.series.filter((s) => s.venue.pref === p);
  if (!ser.length) return '';
  const occ = ctx.occ.filter((o) => isActive(o) && o.series.venue.pref === p);
  const end30 = addDays(ctx.today, 30);
  const in30 = occ.filter((o) => o.date <= end30);
  const days30 = new Set(in30.map((o) => o.date)).size;
  const wk = occ.filter((o) => ctx.weekend.includes(o.date)).length;
  const kinds = Object.keys(KINDS).map((k) => [k, ser.filter((s) => s.kinds.includes(k)).length]).filter(([, n]) => n);
  const kindTxt = kinds.map(([k, n]) => `<li>${esc(kindName(k, lang))} <b>${n}</b></li>`).join('');
  const regular = ser.filter((s) => REGULAR.has(s.recurrence.type)).slice(0, 6)
    .map((s) => `<li><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a> <span>${esc(ja ? s.recurrence.text : fieldEn(s, 'rule') || recurEn(s.recurrence) || s.recurrence.text)}</span></li>`).join('');
  const areaPost = ALL_POSTS.filter((b) => b.slug.startsWith(`area-${p}-`)).sort((x, y) => y.slug.localeCompare(x.slug))[0];
  const visitorPost = ALL_POSTS.find((b) => b.slug === `guide-${{ 13: 'tokyo', 27: 'osaka', 26: 'kyoto' }[p] || 'x'}-flea-markets-visitors`);
  const firstLinks = [
    ...(visitorPost ? [[`/blog/${visitorPost.slug}/`, visitorPost[lang].title]] : []),
    ...(areaPost ? [[`/blog/${areaPost.slug}/`, areaPost[lang].title]] : []),
    ['/tips/before-you-go/', ja ? '出かける前に確かめたいこと' : 'Before you go'],
    ['/tips/shopping-and-payment/', ja ? '買い物と支払いのコツ' : 'Shopping and payment'],
    ['/tips/manners-and-photos/', ja ? '会場でのふるまい：ことばと写真' : 'Manners at the market: words and photos'],
  ].map(([h, t]) => `<li><a href="${h}">${esc(t)}</a></li>`).join('');
  let sights = '';
  const tour = TOURISM[p];
  if (tour) {
    const seen = new Set();
    const sacred = ser.filter((s) => SACRED.test(s.venue.name) && !seen.has(s.venue.name) && seen.add(s.venue.name)).slice(0, 5)
      .map((s) => `<li><a href="/e/${s.id}/">${esc(venueL(s, lang))}</a></li>`).join('');
    const [tName, tUrl] = tour[lang];
    sights = `<div class="pov-box pov-sights"><h3>${ja ? '観光と組み合わせる' : 'Combine with sightseeing'}</h3>${sacred ? `<p>${ja ? '次の市は、寺社の境内や門前などで開かれます（会場名から）。市と一緒に、寺社そのものも訪ねられます。' : 'These markets are held at or next to temples and shrines (by venue name), so you can visit the temple or shrine on the same trip.'}</p><ul>${sacred}</ul>` : ''}<p>${ja ? 'ほかの観光地は、公式の観光サイトで：' : 'For other sights, see the official guide: '}<a href="${tUrl}" rel="noopener">${esc(tName)} ↗</a></p></div>`;
  }
  const lead = ja
    ? `${pn}の掲載は${ser.length}件（主催者・自治体の公式情報から）。今後30日の開催は${days30}日、今週末は${wk}件です。`
    : `Flea Market JP lists ${ser.length} market${ser.length === 1 ? '' : 's'} in ${pn}, all from official organizer and municipal pages. In the next 30 days there are markets on ${days30} day${days30 === 1 ? '' : 's'}; ${wk} this weekend.`;
  return { lead, html: `<section class="pov" aria-label="${ja ? `${pn}の概要` : `${pn} at a glance`}">
<p class="pov-links"><a href="/weekend/#pref=${p}">${ja ? `今週末の${pn}の開催` : `This weekend in ${pn}`} →</a> <a href="/calendar/">${ja ? 'カレンダーで見る' : 'Calendar'} →</a></p>
<div class="pov-grid">
<div class="pov-box"><h3>${ja ? '種類別の掲載数' : 'Markets by type'}</h3><ul class="pov-kinds">${kindTxt}</ul></div>
${regular ? `<div class="pov-box"><h3>${ja ? '毎月・毎週の市' : 'Regular markets'}</h3><ul class="pov-reg">${regular}</ul></div>` : ''}
<div class="pov-box"><h3>${ja ? '初めての方へ' : 'First visit?'}</h3><ul>${firstLinks}</ul></div>
${sights}
</div>
</section>` };
}

// 地域ページ上部の小さな枠（掲載データから数えた事実だけ）
function areaFacts(list, lang) {
  const sers = new Map();
  for (const o of list) sers.set(o.series.id, o.series);
  if (!sers.size) return '';
  const next = list.find(isActive);
  const kinds = new Set([...sers.values()].flatMap((x) => x.kinds));
  const chk = [...sers.values()].map(lastChecked).filter(Boolean).sort().at(-1) || '';
  const t = lang === 'ja' ? ['掲載されている市', '次の開催', '市の種類', '最終確認'] : ['Markets in this area', 'Next market', 'Market types', 'Last checked'];
  const tile = (k, v) => `<div><small>${esc(k)}</small><b>${esc(v)}</b></div>`;
  return `<div class="area-facts">${tile(t[0], String(sers.size))}${tile(t[1], next ? dlabel(next.date, lang) : '—')}${tile(t[2], String(kinds.size))}${tile(t[3], chk || '—')}</div>`;
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
  const idx = [...prefs.keys()].sort().map((p) => `<li><a class="pref-card" href="/area/${p}/"><img src="/img/pref/${p}.webp" alt="${esc(lang === 'en' ? `${prefLabel(p, lang)} illustration` : `${prefLabel(p, lang)}のイラスト`)}" width="182" height="172" loading="lazy" decoding="async"><span class="pc-t">${esc(prefLabel(p, lang))}<small>${count((s) => s.venue.pref === p)}</small></span></a></li>`).join('');
  const countNote = lang === 'en' ? 'Numbers are markets in the next 120 days.' : '数字は、今後120日の開催の件数です。';
  pages.push(pg(lang, '/area/', { title: A.h1, description: A.desc, bannerText: `${breadcrumb([{ label: A.h1 }], lang)}<h1>${esc(A.h1)}</h1><p class="lead">${esc(A.lead)}</p>`, body: `<div class="in page"><p class="count-note">${esc(countNote)}</p>${idx ? `<ul class="grid-links">${idx}</ul>` : `<p class="empty">${esc(P[lang].soon)}</p>`}</div>` }));
  for (const [p, cities] of prefs) {
    const pn = prefLabel(p, lang);
    const cityLinks = [...cities].sort().map(([c, name]) => `<li><a href="/area/${p}/${c}/">${esc(cityL(name, lang))}<small>${esc(P[lang].cnt(count((s) => s.venue.cityCode === c)))}</small></a></li>`).join('');
    const ov = prefOverview(p, ctx, lang);
    const calP = renderCalendar(ctx, lang, { occ: ctx.occ.filter((o) => o.series.venue.pref === p), hash: `#pref=${p}`, title: lang === 'en' ? `Markets by date: ${pn}` : `${pn}の開催カレンダー`, area: true });
    const mp = monthPrefs(ctx, p);
    const extra = areaFacts(ctx.occ.filter((o) => o.series.venue.pref === p), lang) + calP + monthNav(mp, p, null, lang) + (hubText(ctx.hub, 'area', p, lang) ? hubBlock(ctx, lang, 'area', p, pn) : '') + ov.html + (cityLinks ? `<h2 class="sec-h">${esc(A.byCity)}</h2><ul class="grid-links">${cityLinks}</ul><h2 class="sec-h">${esc(A.list)}</h2>` : '');
    pages.push(...listPaged(lang, `/area/${p}/`, [{ href: '/area/', label: A.crumb }, { label: pn }], A.prefH1(pn), ov.lead, ctx.occ.filter((o) => o.series.venue.pref === p), extra).map((x) => ({ ...x, bannerArt: `/img/pref/${p}.webp` })));
    for (const ym of mp.keys()) pages.push(...monthPages(ctx, lang, p, pn, ym, mp, A));
    for (const [c, name] of cities) {
      pages.push(...listPaged(lang, `/area/${p}/${c}/`, [{ href: '/area/', label: A.crumb }, { href: `/area/${p}/`, label: pn }, { label: cityL(name, lang) }], A.cityH1(cityL(name, lang), pn), '', ctx.occ.filter((o) => o.series.venue.cityCode === c), areaFacts(ctx.occ.filter((o) => o.series.venue.cityCode === c), lang) + renderCalendar(ctx, lang, { occ: ctx.occ.filter((o) => o.series.venue.cityCode === c), title: lang === 'en' ? `Markets by date: ${cityL(name, lang)}` : `${cityL(name, lang)}の開催カレンダー`, area: true }) + hubBlock(ctx, lang, 'city', c, `${cityL(name, lang)}, ${pn}`)));
    }
  }
  return pages;
}

const kindName = (k, lang) => S[lang].kinds[k];
const kindDesc = (k, lang) => (lang === 'ja' ? KINDS[k].desc : KIND_DESC_EN[k]);

// 地域・種類の一覧ページの解説ブロック：data/hub-content.json の文があればそれ、なければ掲載データから作る事実だけの導入文
function hubBlock(ctx, lang, type, key, label) {
  const manual = hubText(ctx.hub, type, key, lang);
  let text = manual;
  if (!text) {
    const ja = lang === 'ja';
    const pick = type === 'city' ? (s) => s.venue.cityCode === key : type === 'kind' ? (s) => s.kinds.includes(key) : (s) => s.venue.pref === key;
    const ser = ctx.series.filter(pick);
    const act = ctx.occ.filter((o) => isActive(o) && pick(o.series));
    const next = act.map((o) => o.date).sort()[0];
    if (!ser.length) return '';
    const prefs = new Map();
    for (const s of ser) prefs.set(s.venue.pref, (prefs.get(s.venue.pref) || 0) + 1);
    const top = [...prefs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${prefLabel(p, lang)} ${n}`);
    if (type === 'kind') {
      text = ja
        ? `${kindDesc(key, lang)}。${ser.length}件の掲載があり、今後${WINDOW_DAYS}日の開催は${act.length}件です。${top.length ? `掲載が多い地域：${top.join('、')}。` : ''}すべて主催者・自治体の公式情報をもとにしています。`
        : `${kindDesc(key, lang)}. ${ser.length} listing${ser.length === 1 ? '' : 's'}, with ${act.length} event${act.length === 1 ? '' : 's'} in the next ${WINDOW_DAYS} days.${top.length ? ` Most listings: ${top.join(', ')}.` : ''} Everything is based on official organizer and municipal pages.`;
    } else {
      text = ja
        ? `${label}の掲載は${ser.length}件で、今後${WINDOW_DAYS}日の開催は${act.length}件です。${next ? `直近の開催日は${dlabel(next, 'ja', { year: true })}です。` : ''}主催者・自治体の公式ページの情報だけを載せ、確認した日を各ページに示しています。`
        : `${ser.length} listing${ser.length === 1 ? '' : 's'} in ${label}, with ${act.length} event${act.length === 1 ? '' : 's'} in the next ${WINDOW_DAYS} days.${next ? ` The next is on ${dlabel(next, 'en', { year: true })}.` : ''} Only information from official organizer and municipal pages is listed, and each page shows when it was last checked.`;
    }
  }
  return `<section class="hub-intro" data-hub="${esc(type)}:${esc(key)}"${manual ? ' data-manual="1"' : ''}><p>${esc(text)}</p></section>`;
}

// 種類のページ（全国）と、種類×都道府県のページ（件数が COMBO_MIN 以上のものだけ。実URL）
export const COMBO_MIN = 3;
const KFAQ = {
  en: {
    h: 'Frequently asked questions',
    qCount: (kn) => `How many ${kn} are listed?`,
    aCount: (s, n, top) => `${s} listing${s === 1 ? '' : 's'}, with ${n} event${n === 1 ? '' : 's'} in the next ${WINDOW_DAYS} days.${top ? ` Most listings: ${top}.` : ''}`,
    qFreq: (kn) => `Are ${kn} held regularly?`,
    aFreq: (rec, one) => `${rec} listing${rec === 1 ? ' repeats' : 's repeat'} on a regular rule such as a fixed day every month; ${one} ${one === 1 ? 'is' : 'are'} held on specific dates. Each detail page shows the recurrence rule or the dates.`,
    qRain: 'What happens if it rains?',
    aRain: (m, s) => `${m} of ${s} listings show an official rain policy on their detail page. Where none is shown, it is not stated on the official page, so please check the organizer before you go.`,
    qOff: 'Is the information official?',
    aOff: 'Dates are taken from organizer and municipal pages. Each listing shows when it was last checked; items not checked for 14 days are marked “to be confirmed”.',
    qNear: 'How do I find one near me?',
    aNear: 'Use the prefecture buttons on this page, or browse by area.',
  },
  ja: {
    h: 'よくある質問',
    qCount: (kn) => `${kn}は何件載っていますか？`,
    aCount: (s, n, top) => `${s}件の掲載があり、今後${WINDOW_DAYS}日の開催は${n}件です。${top ? `掲載が多い地域：${top}。` : ''}`,
    qFreq: (kn) => `${kn}は定期的に開かれていますか？`,
    aFreq: (rec, one) => `${rec}件は「毎月第○日曜」のようなきまりで繰り返し開かれ、${one}件は日付が決まった開催です。各詳細ページに、開催のきまり、または日付があります。`,
    qRain: '雨のときはどうなりますか？',
    aRain: (m, s) => `${s}件のうち${m}件は、公式の雨天時の扱いを詳細ページに載せています。載せていないものは、公式ページに記載がないため、主催者に確認してください。`,
    qOff: '載っている情報は公式のものですか？',
    aOff: '日程は、主催者・自治体の公式ページをもとにしています。各掲載に最終確認日があり、14日以上確認できていないものは「要確認」と表示します。',
    qNear: '近くの市を探すには？',
    aNear: 'このページの都道府県ボタン、または地域のページから探せます。',
  },
};
function kindFaq(ctx, k, lang, ser, act) {
  const f = KFAQ[lang];
  const kn = kindName(k, lang);
  const prefs = new Map();
  for (const s of ser) prefs.set(s.venue.pref, (prefs.get(s.venue.pref) || 0) + 1);
  const top = [...prefs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${prefLabel(p, lang)} ${n}`).join(lang === 'ja' ? '、' : ', ');
  const rec = ser.filter((s) => s.recurrence.type !== 'dates').length;
  const rain = ser.filter((s) => s.visitor?.rain).length;
  const qa = [[f.qCount(kn), f.aCount(ser.length, act.length, top)], [f.qFreq(kn), f.aFreq(rec, ser.length - rec)], [f.qRain, f.aRain(rain, ser.length)], [f.qOff, f.aOff], [f.qNear, f.aNear]];
  const ld = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };
  const html = `<section class="kind-faq"><h2 class="sec-h">${esc(f.h)}</h2><dl>${qa.map(([q, a]) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join('')}</dl><script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script></section>`;
  return html;
}
function kindSection(ctx, lang, k) {
  const K = P[lang].kind;
  const kn = kindName(k, lang);
  const lst = ctx.occ.filter((o) => o.series.kinds.includes(k));
  const act = lst.filter(isActive);
  const ser = ctx.series.filter((s) => s.kinds.includes(k));
  const byPref = new Map();
  for (const o of act) byPref.set(o.series.venue.pref, (byPref.get(o.series.venue.pref) || 0) + 1);
  const combos = [...byPref].filter(([, n]) => n >= COMBO_MIN).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const AF = { en: { label: 'Filter by prefecture', all: 'All' }, ja: { label: '都道府県で絞り込む', all: 'すべて' } }[lang];
  const nav = (cur) => {
    const chips = combos.map(([p, n]) => (p === cur ? `<span class="af-chip" aria-current="page">${esc(prefLabel(p, lang))}<sup>${n}</sup></span>` : `<a class="af-chip" data-pref="${esc(p)}" href="/kind/${k}/${p}/">${esc(prefLabel(p, lang))}<sup>${n}</sup></a>`)).join('');
    if (!chips) return '';
    return `<nav class="af-chips af-links" aria-label="${esc(AF.label)}">${cur ? `<a class="af-chip" href="/kind/${k}/">${esc(AF.all)}<sup>${act.length}</sup></a>` : `<span class="af-chip" aria-current="page">${esc(AF.all)}<sup>${act.length}</sup></span>`}${chips}</nav>`;
  };
  const cal = (occ, title) => renderCalendar(ctx, lang, { occ, title, area: true });
  const out = listPaged(lang, `/kind/${k}/`, [{ href: '/kind/', label: K.crumb }, { label: kn }], K.listH1(kn), kindDesc(k, lang), lst,
    cal(lst, lang === 'en' ? `${kn} by date` : `${kn}の開催カレンダー`) + hubBlock(ctx, lang, 'kind', k, kn), nav(null),
    { after: kindFaq(ctx, k, lang, ser, act), scripts: ['/kind-redir.js'] }).map((x) => ({ ...x, bannerArt: `/img/kind-banner/${k}.webp` }));
  for (const [p] of combos) {
    const pn = prefLabel(p, lang);
    const cl = lst.filter((o) => o.series.venue.pref === p);
    const ca = cl.filter(isActive);
    const cs = new Set(ca.map((o) => o.series.id)).size;
    const cities = new Set(ca.map((o) => o.series.venue.city).filter(Boolean));
    const h1 = lang === 'en' ? `${kn} in ${pn}` : `${pn}の${kn}`;
    const lead = lang === 'en'
      ? `${cs} ${kn} listing${cs === 1 ? '' : 's'} in ${pn}, with ${ca.length} event${ca.length === 1 ? '' : 's'} in the next ${WINDOW_DAYS} days${cities.size ? ` across ${cities.size} ${cities.size === 1 ? 'city or ward' : 'cities and wards'}` : ''}. All dates come from official organizer and municipal pages.`
      : `${pn}の${kn}：${cs}件の掲載があり、今後${WINDOW_DAYS}日の開催は${ca.length}件です。日程は、主催者・自治体の公式ページをもとにしています。`;
    const desc = lang === 'en'
      ? `${kn} in ${pn}: ${ca.length} events in the next ${WINDOW_DAYS} days, from official organizer and municipal pages, updated every morning.`
      : `${pn}の${kn}：今後${WINDOW_DAYS}日で${ca.length}件。主催者・自治体の公式情報をもとに、毎朝更新しています。`;
    out.push(...listPaged(lang, `/kind/${k}/${p}/`, [{ href: '/kind/', label: K.crumb }, { href: `/kind/${k}/`, label: kn }, { label: pn }], h1, lead, cl,
      cal(cl, lang === 'en' ? `${kn} in ${pn} by date` : `${pn}の${kn}カレンダー`), nav(p), { title: h1, description: desc })
      .map((x) => ({ ...x, bannerArt: `/img/kind-banner/${k}.webp` })));
  }
  return out;
}

function kindPages(ctx, lang) {
  const K = P[lang].kind;
  const KC = {
    flea: { en: 'FLEA MARKET', ja: '掘り出しものとの出会いを楽しむ', enT: 'Enjoy finding a bargain', c: '#e8603c', d: '#2d2f2c' },
    nomi: { en: 'VINTAGE MARKET', ja: 'ヨーロッパのような雰囲気を楽しむ', enT: 'Enjoy a European-style atmosphere', c: '#2b6c99', d: '#1f3c5c' },
    kotto: { en: 'ANTIQUE MARKET', ja: '歴史ある品との出会い', enT: 'Meet objects with a history', c: '#d9a42a', d: '#e8603c' },
    handmade: { en: 'HANDMADE MARKET', ja: '作り手の想いにふれる', enT: 'Meet the makers behind the work', c: '#e9776a', d: '#1d4a3a' },
    engi: { en: 'FESTIVAL STALLS', ja: 'お祭りのにぎわいを楽しむ', enT: 'Enjoy the buzz of a festival', c: '#d9453a', d: '#1f3c5c' },
    marche: { en: 'LOCAL MARKET', ja: '地元の食と人に出会う', enT: 'Meet local food and people', c: '#d9a42a', d: '#1d4a3a' },
  };
  const kcount = (k) => ctx.occ.filter((o) => isActive(o) && o.series.kinds.includes(k)).length;
  const idx = Object.keys(KINDS).map((k) => {
    const v = KC[k];
    return `<li><a class="kc" href="/kind/${k}/" style="--kc:${v.c};--kd:${v.d}"><span class="kc-t"><b>${esc(kindName(k, lang))}</b><em>${esc(v.en)}</em><small>${esc(lang === 'ja' ? v.ja : v.enT)}</small><i>${esc(P[lang].cnt(kcount(k)))}<span class="kc-go">${icon('arrow', 16)}</span></i></span><span class="kc-art" aria-hidden="true"><img src="/img/kinds/${k}-400.webp" alt="${esc(lang === 'en' ? `${kindName(k, lang)}: a market scene` : `${kindName(k, lang)}の市の様子`)}" width="400" height="300" loading="lazy" decoding="async"></span></a></li>`;
  }).join('');
  return [
    pg(lang, '/kind/', { keywords: Object.keys(KINDS).map((k) => kindName(k, lang)), title: K.h1, description: lang === 'ja' ? 'フリーマーケット・蚤の市・骨董市・手作り市・マルシェの種類から探せます。' : 'Find flea markets, nomi-no-ichi, antique fairs, handmade markets and marchés by type.', body: `<div class="in page">${breadcrumb([{ label: K.h1 }], lang)}<h1>${esc(K.h1)}</h1><ul class="kc-grid">${idx}</ul></div>`, css: ['/kind-cards.css'] }),
    ...Object.keys(KINDS).flatMap((k) => kindSection(ctx, lang, k)),
  ];
}

// 入場料（offers）：公式に「無料」とあれば price 0、「○○円」とあれば、その金額。記載がなければ出さない（調べて補った料金も出さない）
function offerLd(s, lang) {
  const a = s.visitor?.admission;
  if (!a || s.searched?.admission) return {};
  const free = /無料|free/i.test(a) && !/円/.test(a);
  const m = /(\d[\d,]*)\s*円/.exec(a);
  if (!free && !m) return {};
  return { offers: { '@type': 'Offer', price: free ? 0 : Number(m[1].replace(/,/g, '')), priceCurrency: 'JPY', availability: 'https://schema.org/InStock', url: `${SITE.url}${langPath(`/e/${s.id}/`, lang)}` } };
}

function eventLd(s, list, lang = 'ja', description = '') {
  const kind = s.kinds.find((k) => existsSync(join(ROOT, 'static', 'img', 'kinds', `${k}.webp`)));
  const image = `${SITE.url}${kind ? `/img/kinds/${kind}.webp` : OG_DEFAULT}`;
  const map = { confirmed: 'EventScheduled', scheduled: 'EventScheduled', cancelled: 'EventCancelled', postponed: 'EventPostponed' };
  const items = list.filter((o) => map[o.status]).slice(0, 3).map((o) => ({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: nameL(s, lang),
    ...(description ? { description } : {}),
    image: [image],
    startDate: s.time?.start && !s.searched?.time ? `${o.date}T${s.time.start}:00+09:00` : o.date,
    endDate: s.time?.end && !s.searched?.time ? `${o.date}T${s.time.end}:00+09:00` : o.date,
    ...offerLd(s, lang),
    eventStatus: `https://schema.org/${map[o.status]}`,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: { '@type': 'Place', name: venueL(s, lang), address: { '@type': 'PostalAddress', ...(s.venue.address && s.venue.addressFrom !== 'search' ? { streetAddress: s.venue.address } : {}), ...(s.venue.city ? { addressLocality: s.venue.city } : {}), addressRegion: PREFS[s.venue.pref], addressCountry: 'JP' } },
    // organizer.label があるもの（主催者ではなく問い合わせ先など）は、主催者として出さない
    ...(s.organizer.label ? {} : { organizer: { '@type': 'Organization', name: s.organizer.name, ...(s.organizer.url ? { url: s.organizer.url } : {}) } }),
    url: `${SITE.url}${langPath(`/e/${s.id}/`, lang)}`,
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

// 公式ページに記載がなく、ネットで調べて補った項目（series.searched[項目] = 出典の URL）には、公式の記載ではないと添える
const srcNote = (s, key, p) => (s.searched?.[key] ? `<small class="addr-src">${esc(p.infoSearched)}</small>` : '');

// 開催日の行の「カレンダーに追加」（先の3回だけ。.ics はビルドが作る）
function calLink(s, o, list, lang) {
  if (!icsDates(list, isActive).some((x) => x.date === o.date)) return '';
  return `<a class="cal-add" href="${icsPath(s.id, o.date, lang)}" download aria-label="${esc(SV[lang].calAria(dlabel(o.date, lang, { year: true })))}">${icon('calplus', 16)}<span>${esc(SV[lang].cal)}</span></a>`;
}

// 詳細ページの操作：保存（マイリスト）・共有（端末の共有メニュー。なければリンクのコピー）
function evActions(s, lang) {
  const t = SV[lang];
  const url = `${SITE.url}${langPath(`/e/${s.id}/`, lang)}`;
  return `<p class="ev-actions"><button type="button" class="save-btn big" data-id="${esc(s.id)}" aria-pressed="false" aria-label="${esc(t.saveAria)}" data-on="${esc(t.removeAria)}" data-off="${esc(t.saveAria)}">${icon('heart', 18)}<span data-t-on="${esc(t.saved)}" data-t-off="${esc(t.save)}">${esc(t.save)}</span></button><button type="button" class="share-btn" data-title="${esc(nameL(s, lang))}" data-url="${esc(url)}" data-copied="${esc(t.copied)}">${icon('share', 18)}<span>${esc(t.share)}</span></button></p>`;
}

// 開催日ごとの行に添える、時間と会場（シリーズに書いてあるものだけ。日ごとに違うときは、各日の注記が別に出る）
function dateInfo(s, lang) {
  const time = lang === 'en' ? (timeEn(s) || s.time?.text) : s.time?.text;
  const place = lang === 'en' ? venueL(s, lang) : s.venue.name;
  const parts = [time, /開催日ごと|会場が複数|要確認/.test(s.venue.name) ? '' : place].filter(Boolean);
  return parts.length ? `<span class="dt-info">${parts.map(esc).join(lang === 'en' ? ' · ' : '　')}</span>` : '';
}

function seriesPage(s, ctx, lang) {
  const p = P[lang].series;
  const list = ctx.occ.filter((o) => o.series.id === s.id);
  const v = s.venue;
  const pn = prefLabel(v.pref, lang);
  const next = list.find(isActive);
  const dates = list.length
    ? `<ul class="sources">${list.slice(0, 12).map((o) => `<li>${esc(dlabel(o.date, lang, { year: true }))}　${statusTag(o, lang)}${o.note ? `　<span class="tbd">${esc(noteL(o, lang))}</span>` : ''}${dateInfo(s, lang)}${calLink(s, o, list, lang)}</li>`).join('')}</ul>`
    : `<p class="empty">${esc(p.noDates)}</p>`;
  const row = (k, x) => `<div><dt>${esc(k)}</dt><dd>${x}</dd></div>`;
  const mapInline = (mu, kind) => `<span class="map-inline"><a href="${esc(kind === 'open' ? mu.open : mu.route)}" target="_blank" rel="noopener nofollow">${esc(kind === 'open' ? p.mapOpenShort : p.mapRouteShort)} ↗</a></span>`;
  // 公式に記載がない項目の「目安」（会場の名前・市区町村・一般的な傾向だけから。札を付けて区別する。住所の番地・徒歩時間は作らない）
  const est = (text, pp) => `<span class="est" title="${esc(pp.estTitle)}">${esc(pp.est)}</span> ${esc(text)}`;
  const station = /^([^\s・（(駅]+駅)前/.exec(v.name)?.[1];
  const stationEn = /^(.+? Station)\b/.exec(venueEn(s))?.[1];
  const estAddress = lang === 'ja' && !v.address && GEO[s.id]?.estAddress ? p.estAddrGeo(GEO[s.id].estAddress) : p.estAddr(lang === 'ja' ? `${PREFS[v.pref]}${v.city || ''}` : [cityL(v.city, lang), pn].filter(Boolean).join(', '));
  const estAccess = station && (lang === 'ja' || stationEn) ? p.estStation(lang === 'ja' ? station : stationEn) : p.estRoute;
  const ex = s.exhibitor;
  const t = (x) => val(x, lang);
  const checked = lang === 'ja' ? '最終確認 ' : 'last checked ';
  const rule = lang === 'ja' ? esc(s.recurrence.text) : fieldEn(s, 'rule') ? esc(fieldEn(s, 'rule')) : esc(recurEn(s.recurrence) || 'Selected dates (see below)');
  const oen = lang === 'en' ? orgEn(s.organizer.name) : '';
  const oShown = oen ? orig(oen, s.organizer.name) : esc(s.organizer.name);
  const orgName = s.organizer.url ? `<a href="${esc(s.organizer.url)}" rel="noopener">${oShown}</a>` : oShown;
  const g = GEO[s.id];
  const officialUrl = s.organizer.url || s.sources.find((x) => x.type === 'official')?.url || '';
  const mu = mapUrls(s, lang, g);
  const wt = weatherTarget(s);
  const wxBox = next && wt ? `<section class="ev-card"><h2>${esc(p.secWx)}</h2><div class="wx" data-office="${wt.office}" data-area="${wt.area || ''}" data-date="${next.date}" data-lang="${lang}" data-region="${esc(prefLabel(v.pref, 'en'))}"><p class="wx-st">${esc(p.wxLoading)}</p></div><p class="note">${esc(p.wxNote)} ${esc(p.wxSrc)}<a href="https://www.jma.go.jp/bosai/forecast/" rel="noopener">${esc(p.wxJma)}</a>${lang === 'ja' ? '' : ' (気象庁)'}</p></section>` : '';
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(s).q)}&hl=${lang === 'ja' ? 'ja' : 'en'}&z=16&output=embed`;
  const side = `<aside class="ev-side" aria-label="${esc(p.secMap)}"><section class="ev-card"><h2>${esc(p.secMap)}</h2>${hasMapImg(s.id) ? `<a class="ev-mapimg" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow" title="${esc(p.mapOpen)}"><img src="/img/maps/${s.id}.webp" alt="${esc(p.mapImgAlt(lang === 'en' ? venueL(s, lang) : v.name))}" width="640" height="400" loading="lazy" decoding="async"></a><p class="note">${esc(mu.pin ? p.mapApproxName : mu.searched ? p.mapApproxSearch : p.mapApprox)}</p>` : `<div class="ev-map" data-src="${esc(mapSrc)}" data-title="${esc(p.secMap)}"><div class="ev-map-ph"><span aria-hidden="true">📍</span><b>${esc(lang === 'en' ? venueL(s, lang) : v.name)}</b><button type="button" class="map-show">${esc(p.mapShow)}</button><small>${esc(p.mapPrivacy)}</small></div></div>`}<p class="map-btns"><a class="map-btn" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow">${esc(p.mapOpen)} ↗</a><a class="map-btn s" href="${esc(mu.route)}" target="_blank" rel="noopener nofollow">${esc(p.mapRoute)} ↗</a></p><p class="note">${esc(mu.pin ? p.mapPin : mu.searched ? p.mapSearched : mu.exact ? p.mapExact : p.mapLoose)}</p></section>${wxBox}</aside>`;
  const body = `<div class="in page ev-page">${breadcrumb([{ href: `/area/${v.pref}/`, label: pn }, ...(v.cityCode ? [{ href: `/area/${v.pref}/${v.cityCode}/`, label: cityL(v.city, lang) }] : []), { label: nameL(s, lang) }], lang)}
<div class="ev-top">
<div class="ev-top-l">
<h1>${esc(nameL(s, lang))}</h1>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="orig-h" lang="ja">${esc(s.name)}</p>` : ''}
<div class="tags">${kindTags(s.kinds, lang)}<span class="tag chk">${lang === 'ja' ? '最終確認：' : 'Last checked: '}${esc(lastChecked(s))}</span></div>
${evActions(s, lang)}
${next ? `<p class="banner">${esc(p.next)}${lang === 'ja' ? '：' : ': '}<b>${esc(dlabel(next.date, lang, { year: true }))}</b>　${esc(S[lang].status[next.status])}${lang === 'ja' ? '（' : ' ('}${checked}${esc(next.checkedAt)}${lang === 'ja' ? '）' : ')'}</p>` : ''}
${p.quoted ? `<p class="note">${esc(p.quoted)}</p>` : ''}
<div class="ev-hero"><img src="${cardImg(s).replace('-400.webp', '.webp')}" alt="" width="800" height="600" loading="lazy" decoding="async"></div>
</div>
<aside class="ev-facts-card" aria-label="${esc(p.secInfo)}">
<h2 class="sec-h">${esc(p.secInfo)}</h2>
<dl class="facts">
${row(p.when, rule)}
${row(p.time, (lang === 'en' && timeEn(s) ? (s.time.text === timeEn(s).replace('–', '〜') ? esc(timeEn(s)) : esc(timeEn(s))) : t(s.time?.text)) + srcNote(s, 'time', p))}
${row(p.venue, (lang === 'en' && venueL(s, lang) !== v.name ? orig(venueL(s, lang), v.name) : esc(v.name)) + spotLink(s, ctx, lang))}
${row(p.address, (v.address ? tv(s, 'address', v.address, lang) + (v.addressFrom === 'search' ? `<small class="addr-src">${esc(p.addrSearched)}</small>` : '') : est(estAddress, p)) + mapInline(mu, 'open'))}
${row(p.access, (v.access ? tv(s, 'access', v.access, lang) + (v.accessFrom === 'search' ? `<small class="addr-src">${esc(p.accessSearched)}</small>` : '') : est(estAccess, p)) + mapInline(mu, 'route'))}
${row(p.admission, s.visitor?.admission ? tv(s, 'admission', s.visitor.admission, lang) + srcNote(s, 'admission', p) : est(p.estFree, p))}
${row(p.rain, tv(s, 'rain', s.visitor?.rain, lang) + srcNote(s, 'rain', p))}
${row(s.organizer.label ? (lang === 'en' ? labelEn(s.organizer.label) || p.orgLabel(s.organizer.label) : p.orgLabel(s.organizer.label)) : p.org, orgName)}
</dl>
<p class="ev-cta">${officialUrl ? `<a class="btn-acc" href="${esc(officialUrl)}" rel="noopener">${lang === 'ja' ? '公式サイト' : 'Official site'} →</a>` : ''}<a class="btn-line" href="${langPath(`/e/${s.id}/`, lang === 'ja' ? 'en' : 'ja')}" hreflang="${lang === 'ja' ? 'en' : 'ja'}">${lang === 'ja' ? 'English page' : '日本語ページを開く'} →</a></p>
</aside>
</div>
<div class="ev-split"><div class="ev-main">
<h2 class="sec-h">${esc(p.secDates)}</h2>
${dates}
${pastDatesBlock(ctx.past.filter((o) => o.series.id === s.id), lang)}
<h2 class="sec-h" id="shuten">${esc(p.secVendor)}</h2>
${ex ? `<dl class="facts">${row(p.fee, tv(s, 'fee', ex.fee, lang) + srcNote(s, 'fee', p))}${row(p.apply, tv(s, 'apply', ex.apply, lang) + srcNote(s, 'apply', p))}${row(p.applyAt, ex.applyUrl ? `<a href="${esc(ex.applyUrl)}" rel="noopener">${esc(p.applyLink)}</a>` : TBC(lang))}${ex.notes ? row(p.notes, tv(s, 'notes', ex.notes, lang) + srcNote(s, 'notes', p)) : ''}</dl>` : `<p class="empty">${esc(p.noVendor)}</p>`}
${pollBlock({ id: s.id }, lang, true)}
${reviewsSection(s.id, lang)}
<h2 class="sec-h">${esc(p.secSrc)}</h2>
<ul class="sources">${s.sources.map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.url)}</a>（${checked}${esc(x.checkedAt)}）</li>`).join('')}</ul>
<p class="note">${s.recurrence.type === 'dates' ? '' : esc(p.rule(lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence)))} ${esc(disclaimer(lang))}</p>
</div>${side}</div>
</div>`;
  return pg(lang, `/e/${s.id}/`, { title: p.title(nameL(s, lang), pn, cityL(v.city, lang)), description: p.desc(nameL(s, lang), lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence) || s.recurrence.text, lastChecked(s)), body, head: eventLd(s, list, lang, p.desc(nameL(s, lang), lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence) || s.recurrence.text, lastChecked(s))), scripts: ['/weather.js', '/map.js', '/vote.js', ...(REVIEWS_ON ? ['/review.js'] : [])], css: ['/review.css', '/poll.css'], keywords: [nameL(s, lang), prefLabel(s.venue.pref, lang), cityL(v.city, lang), ...s.kinds.map((k) => kindName(k, lang))].filter(Boolean) });
}

function shutenPage(ctx, lang) {
  const p = P[lang].shuten;
  const body = `<div class="in page">${breadcrumb([{ label: p.crumb }], lang)}<h1>${esc(p.h1)}</h1><p class="lead">${esc(p.lead)}</p>${exhibitorList(ctx.series, lang)}</div>`;
  return pg(lang, '/shuten/', { title: p.title, description: p.desc, body });
}

function savedPage(lang) {
  const t = SV[lang];
  const body = `<div class="in page">${breadcrumb([{ label: t.crumb }], lang)}<h1>${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p>
<p class="note" id="saved-shared-note" hidden>${esc(t.sharedNote)}</p>
<div id="saved-list" data-empty="${esc(t.empty)}" data-fail="${esc(t.loadFail)}" data-none="${esc(t.none)}" data-upcoming="${esc(t.upcoming)}" data-remove="${esc(t.remove)}" data-lang="${lang}"></div>
<p class="ev-actions"><button type="button" class="share-btn" id="saved-share" hidden data-title="${esc(t.h1)}" data-copied="${esc(t.copied)}">${icon('share', 18)}<span>${esc(t.shareList)}</span></button><button type="button" class="save-btn big" id="saved-saveall" hidden>${icon('heart', 18)}<span>${esc(t.saveAll)}</span></button></p>
<p><a href="/weekend/">${esc(t.browse)}</a></p></div>`;
  return pg(lang, '/saved/', { title: t.h1, description: t.desc, body, head: '<meta name="robots" content="noindex,follow">\n', css: ['/spot.css'] });
}

function searchPage(lang) {
  const p = P[lang].search;
  const body = `<div class="in page">${breadcrumb([{ label: p.h1 }], lang)}<h1>${esc(p.h1)}</h1>
<form class="search" action="/search/" role="search"><input name="q" type="search" placeholder="${esc(p.ph)}" aria-label="${esc(p.kw)}"><button>${esc(p.btn)}</button></form>
<p class="lead" id="search-status" aria-live="polite"></p><div id="search-results"></div></div>`;
  return pg(lang, '/search/', { title: p.h1, description: p.desc, body, head: '<meta name="robots" content="noindex,follow">\n', scripts: ['/search.js'], css: ['/spot.css'] });
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
let SERIES_IDS = [];
// TIPSの記事（/tips/<slug>/）
function columnPage(x, lang, base) {
  const c = x[lang];
  return pg(lang, `${base}${x.slug}/`, { title: c.title, description: c.lead, body: renderDoc({ title: c.title, lead: c.lead, secs: docSections(c.blocks, lang), lang }), css: ART_CSS });
}

function tipsPage(lang) {
  const title = lang === 'ja' ? 'TIPS：楽しく体験するためのコツ' : 'Tips for enjoying flea markets';
  return pg(lang, '/tips/', { title, description: lang === 'ja' ? '日本のフリーマーケット・骨董市で、気持ちよく過ごすためのコツ。' : 'Columns on how to enjoy a Japanese flea market or antique fair in a pleasant way.', bannerText: tipsBanner(lang), body: `<div class="in page">${tipsIndex(TIPS, lang)}</div>`, css: ART_CSS });
}

function guidePage(lang) {
  const g = GUIDE[lang];
  const body = renderDoc({ title: g.title, lead: g.lead, secs: docSections(g.blocks, lang), lang });
  return pg(lang, '/guide/', { title: g.title, description: g.lead, body, css: ART_CSS });
}

// メディア向けの紹介ページ（/press/）。本文は scripts/lib/press/<言語>.html、CSS は static/press.css（.pr の中だけ）。ヘッダー・フッターは他のページと共通
function pressPage(lang) {
  const raw = readFileSync(new URL(`./lib/press/${lang}.html`, import.meta.url), 'utf8');
  const [, title, description] = /^<!-- (.*?) \|\| (.*?) -->\n/.exec(raw);
  return pg(lang, '/press/', { title: title.replace(/\s*[|｜]\s*Flea Market JP$/, ''), description, body: `<div class="pr">${raw.replace(/^<!--.*?-->\n/, '')}</div>`, css: ['/press.css'] });
}

function contactPage(lang) {
  const title = lang === 'ja' ? 'お問い合わせ' : 'Contact';
  return pg(lang, '/contact/', { title, description: lang === 'ja' ? '掲載の修正・削除、情報提供、出店、取材などのお問い合わせ。' : 'Contact us about corrections or removals, information, vendor questions and press enquiries.', bannerText: contactBanner(lang), body: `<div class="in page">${contactBody(lang)}</div>`, css: ['/review.css'], scripts: CONTACT_ON ? ['/contact.js'] : [] });
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
  // スマホ幅では、折りたたむ（static/more.js が閉じる。JavaScript なしでは開いたまま）
  const card = (title, items, aria) => `<nav class="ev-card sn" aria-label="${esc(aria || title)}"><details class="sn-fold" open><summary><h2>${esc(title)}</h2></summary><ul class="sn-list">${items.join('')}</ul></details></nav>`;
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
    cards.unshift(`<section class="guide-cta"><h2>${lang === 'ja' ? 'はじめての方へ' : 'New to flea markets in Japan?'}</h2><p>${lang === 'ja' ? '雨天・行き方・ルールなど、公式の記載をまとめたガイドです。' : 'Our guides collect what the official pages say about rain, access and rules.'}</p><a href="/blog/guide-tokyo-flea-markets-visitors/">${lang === 'ja' ? 'ガイドを読む' : 'Read the guide'} →</a></section>`);
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
  const m = /^<div class="in page[^"]*">((?:<nav class="crumbs"[\s\S]*?<\/nav>(?:<script type="application\/ld\+json">[\s\S]*?<\/script>)?)?<h1[\s\S]*?<\/h1>(?:<p class="lead">[\s\S]*?<\/p>)?)([\s\S]*)<\/div>$/.exec(page.body);
  if (m) return { ...page, bannerText: m[1], body: `<div class="in page">${m[2]}</div>` };
  // 読み物（ガイド・よくある質問・ブログ記事）：パンくず・見出し・説明（art-head）を帯へ
  const a = /^<div class="art-wrap">\s*(<nav class="crumbs art-crumbs"[\s\S]*?<\/nav>)\s*<header class="art-head">(<h1[\s\S]*?<\/h1>(?:<p class="art-k">[\s\S]*?<\/p>)?(?:<p class="art-lead">[\s\S]*?<\/p>)?)([\s\S]*?)<\/header>([\s\S]*)$/.exec(page.body);
  if (a) return { ...page, bannerText: `${a[1].replace('art-crumbs', 'art-crumbs-x')}${a[2]}`, body: `<div class="art-wrap">${a[3].trim() ? `<header class="art-head">${a[3]}</header>` : ''}${a[4]}` };
  return page;
}

function withSide(page0, ctx, lang) {
  const page = splitBanner(page0);
  const base = splitPath(page.path).base;
  if (!/^\/(weekend|calendar|date|area|kind|spot|shuten|search|about)\//.test(base) || base === '/weekend/') return page;
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

export function buildPages({ series, occurrences, credits = [], translations = {}, autoPosts = [], geo = {}, archive = { items: [] }, venues = [], siteUpdates = [], tips = [], hub = {} }, today, days = 120) {
  setTranslations(translations);
  TIPS = tips;
  SERIES_IDS = series.map((x) => x.id);
  GEO = geo;
  // 終了した催し（日付を列挙したきまりで、最後の開催日から30日すぎたもの）は、ページを作らず、301 で会場・地域のページへ
  const ended = endedSeries(series, occurrences, today);
  const endedIds = new Set(ended.map((x) => x.id));
  const ids = new Set(series.filter((x) => !endedIds.has(x.id)).map((x) => x.id));
  const occ = buildOccurrences(series, occurrences, today, days);
  { const n = new Map(); for (const o of occ) if (isActive(o)) n.set(o.series.venue.pref, (n.get(o.series.venue.pref) || 0) + 1); setFooterAreas([...n].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([p]) => p)); }
  const past = pastOccurrences(archive, series).filter((o) => o.date < today);
  const spots = buildSpots(venues, series, occ, today);
  const spotMapImg = (id) => Boolean(GEO[`spot-${id}`]) && existsSync(join(ROOT, 'static', 'img', 'maps', `spot-${id}.webp`));
  const ctx = { hub, series, occ, past, spots, spotMapImg, spotGeo: (id) => GEO[`spot-${id}`], guideSlugs: new Set(BLOG.map((b) => b.slug)), siteUpdates: [...siteUpdates].sort((a, b) => b.date.localeCompare(a.date)), weekend: upcomingWeekend(today), today, days, credits };
  ALL_POSTS = [...BLOG.map((b) => cleanLinks(resolvePost(b, ctx), ids)), ...autoPosts.map((a) => cleanLinks(a, ids))];
  ctx.latestPosts = posts().slice(0, 3);
  // 英語が既定（/）。日本語は /ja/
  const pages = LANGS_ORDER.flatMap((lang) => [home(ctx, lang), weekendPage(ctx, lang), calendarPage(ctx, lang), ...datePages(ctx, lang), ...areaPages(ctx, lang), ...kindPages(ctx, lang), ...series.filter((s) => !endedIds.has(s.id)).map((s) => seriesPage(s, ctx, lang)), ...(spots.length ? [spotIndex(ctx, lang), ...spots.map((sp) => spotPage(sp, ctx, lang))] : []), shutenPage(ctx, lang), searchPage(lang), savedPage(lang), aboutPage(ctx, lang), guidePage(lang), tipsPage(lang), ...TIPS.map((x) => columnPage(x, lang, '/tips/')), contactPage(lang), pressPage(lang), faqPage(lang), blogIndex(lang), ...ALL_POSTS.map((b) => blogPost(b, lang)), notFound(lang)].map((pg_) => withSide(pg_, ctx, lang)));
  // ページではないファイル（RSS）
  const files = LANGS_ORDER.map((lang) => ({ path: langPath('/blog/feed.xml', lang), content: feedXml(lang) }));
  for (const lang of LANGS_ORDER) {
    for (const s of series) {
      if (endedIds.has(s.id)) continue;
      const list = occ.filter((o) => o.series.id === s.id);
      const v = s.venue;
      const url = `${SITE.url}${langPath(`/e/${s.id}/`, lang)}`;
      for (const o of icsDates(list, isActive)) {
        files.push({ path: icsPath(s.id, o.date, lang), content: icsFor(o, { name: nameL(s, lang), venue: venueL(s, lang), address: v.address && v.addressFrom !== 'search' ? v.address : '', url, note: lang === 'ja' ? '最新の情報は公式ページでご確認ください。' : 'Please check the official page for the latest details.', stamp: today }) });
      }
    }
  }
  const rules = redirectRules(ended, { spotIds: new Set(spots.map((sp) => sp.venue.id)), cities: new Set(series.map((x) => x.venue.cityCode).filter(Boolean)), prefs: new Set(series.map((x) => x.venue.pref)) });
  if (rules.length > MAX_RULES) throw new Error(`_redirects の規則が多すぎます（${rules.length}行）`);
  if (rules.length) files.push({ path: '/_redirects', content: `${rules.join('\n')}\n` });
  return { pages, occ, files, spots, ended };
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
  writeFileSync(join(out, 'series-ids.json'), JSON.stringify(SERIES_IDS));
  writeFileSync(join(out, 'spot-ids.json'), JSON.stringify(spots.map((sp) => sp.venue.id)));
  writeFileSync(join(out, 'events.json'), JSON.stringify({ today, events: searchIndex(occ), spots: spotIndexData(spots) }));
  writeFileSync(join(out, 'pages.json'), JSON.stringify(pages.filter((p) => !p.path.endsWith('.html') && !/\/saved\/$/.test(p.path) && !(p.head || '').includes('noindex')).map((p) => p.path)));
  console.log(`${today} 基準で ${pages.length} ページ、開催 ${occ.length} 件を ${out} に書き出しました`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
