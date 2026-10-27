// トップページの各セクション。文言は scripts/lib/i18n.mjs、データは build-site.mjs の ctx（occ・series・today・days）から渡す。
// 数字・日付・件数は、すべて実データから計算する（見本の値は使わない）。
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from './html.mjs';
import { FACEBOOK_GROUP, FACEBOOK_PAGE } from './nav.mjs';

const STATIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'static');
import { fbLogo, icon } from './icons.mjs';
import { S, T, WD_EN, WD_JA, MON_EN } from './i18n.mjs';
import { addDays, holidayName, isDayOff, upcomingWeekend, weekday } from './dates.mjs';
import { isActive } from './events.mjs';
import { prefLabel } from './l10n.mjs';
import { cityL, fieldEn, nameL, noteL, timeEn, venueL } from './tr-en.mjs';

export const FEATURED_MAX = 12;
export const VENDOR_ROWS = 3;
// フリマは写真が3種類。シリーズの id から決めるので、同じ市はいつも同じ写真になる
// 並びの番号（n）があるときは、番号順に3種を回す（並んだカードが同じ写真にならない）
const FLEA_IMGS = ['/img/kinds/flea.webp', '/img/kinds/flea-2.webp', '/img/kinds/flea-3.webp'];
const kindImg = (k, id = '', n = null) => {
  if (k !== 'flea') return `/img/kinds/${k}.webp`;
  if (n !== null) return FLEA_IMGS[n % 3];
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FLEA_IMGS[h % 3];
};
// 種類の写真は、表示の大きさに合う小さい版（-400）も添える
const kindSrcset = (p) => `src="${p}" srcset="${p.replace(/\.webp$/, '-400.webp')} 400w, ${p} 800w" sizes="(max-width: 700px) 46vw, 280px"`;
const heading = (t, id) => `<h2 class="hm-h"${id ? ` id="${id}"` : ''}><span>${esc(t.title)}</span>${t.sub ? `<small>${esc(t.sub)}</small>` : ''}</h2>`;

// ---- HERO ----
// 日本語・英語どちらのトップでも、同じ検索（/search/?q=）へ送る。既存の検索の動きは変えない
// HERO の写真。static/img/hero-2.webp があれば、トップの写真を切り替えて見られる（点を押すと入れ替わる）
const HERO_FILES = ['/img/hero.webp', '/img/hero-2.webp', '/img/hero-3.webp'];
const heroPhotos = () => HERO_FILES.filter((p) => existsSync(join(STATIC_DIR, p)));
// 写真は、画面の幅に合う大きさだけを読む（srcset。-800・-1400 は tools/img/make_variants.py で作る）。どの1枚を出すかは、ページを開いたときに決め、その1枚だけを読む
const HERO_W = { '/img/hero-3.webp': 1659 };
const heroSrcset = (src) => {
  const b = src.replace(/\.webp$/, '');
  const v = [[800, `${b}-800.webp`], [1400, `${b}-1400.webp`]].filter(([, p]) => existsSync(join(STATIC_DIR, p)));
  return [...v.map(([w, p]) => `${p} ${w}w`), `${src} ${HERO_W[src] || 1800}w`].join(', ');
};
// 開いたときに、1枚をランダムに選んで読む（前回と同じ写真は続けない）。JavaScript がないときは、noscript の1枚目
export const HERO_PICK_JS = "(function(){var im=document.querySelectorAll('.hero2-photo img.hp');if(!im.length)return;var last=-1;try{var l=sessionStorage.getItem('fm-hero-last');if(l!==null)last=Number(l)}catch(e){}var p=[];for(var k=0;k<im.length;k++)if(k!==last)p.push(k);if(!p.length)p=[0];var i=p[Math.floor(Math.random()*p.length)];try{sessionStorage.setItem('fm-hero-last',String(i))}catch(e){}for(k=0;k<im.length;k++)im[k].hidden=k!==i;var a=im[i];a.setAttribute('fetchpriority','high');a.srcset=a.getAttribute('data-srcset');a.sizes='100vw';a.src=a.getAttribute('data-src')})();";
export function renderHero(lang = 'ja', photo = '/img/hero.webp') {
  const t = T[lang].hero;
  const [l1, l2, accent] = t.title;
  return `<section class="hero2 is-${lang}" aria-labelledby="hero-h">
<div class="hero2-photo">${heroPhotos().map((src, i) => `<img class="hp${i ? ' hp-alt' : ''}"${i ? ' hidden' : ''} data-src="${src}" data-srcset="${heroSrcset(src)}" alt="${esc(t.photoAlt)}" width="1800" height="900" decoding="async">`).join('')}<noscript><img class="hp" src="${HERO_FILES[0]}" alt="${esc(t.photoAlt)}" width="1800" height="900"></noscript></div>
<script>${HERO_PICK_JS}</script>
${heroPhotos().length > 1 ? `<div class="hero2-dots" role="group" aria-label="${esc(t.photoSwitch)}">${heroPhotos().map((_, i) => `<button type="button" aria-label="${i + 1}" aria-pressed="${i === 0}" data-hp="${i}"></button>`).join('')}</div>` : ''}
<a class="hero2-new" href="/press/#story">${esc(t.newHere)}${icon('arrow', 15)}</a>
<div class="hero2-in">
<div class="hero2-copy">
<h1 class="hero2-kicker" id="hero-h">${esc(t.h1)}</h1>
<p class="hero2-title"><span>${esc(l1)}</span><span>${esc(l2)}</span><em>${esc(accent)}</em></p>
<p class="hero2-sub">${esc(t.sub)}</p>
<form class="hsearch" action="/search/" role="search"><span class="hs-ic">${icon('search', 21)}</span><input name="q" type="search" placeholder="${esc(t.placeholder)}" aria-label="${esc(t.searchLabel)}" autocomplete="off"><button type="submit">${esc(t.button)}${icon('arrow', 18)}</button></form>
</div>
</div>
</section>`;
}

// ---- 開催カレンダー（日付と開催件数。既存の /date/<日付>/ と /calendar/ へのリンク）----
export function calendarDays(occ, today, n = 14) {
  const counts = new Map();
  for (const o of occ) if (isActive(o)) counts.set(o.date, (counts.get(o.date) || 0) + 1);
  return Array.from({ length: n }, (_, i) => {
    const iso = addDays(today, i);
    const wd = weekday(iso);
    return { iso, wd, n: counts.get(iso) || 0, sat: wd === 6 && !holidayName(iso), off: isDayOff(iso) && !(wd === 6 && !holidayName(iso)), current: i === 0 };
  });
}

export function renderCalendar(ctx, lang = 'ja', opt = {}) {
  const t = { ...S[lang].cal, ...(opt.title ? { title: opt.title, sub: '' } : {}) };
  const wdName = lang === 'en' ? WD_EN : WD_JA;
  const chips = calendarDays(opt.occ || ctx.occ, ctx.today).map((d) => {
    const cls = ['cd', d.sat ? 'sat' : '', d.off ? 'off' : '', d.n ? '' : 'none', d.current ? 'cur' : ''].filter(Boolean).join(' ');
    const wd = lang === 'en' ? `(${wdName[d.wd]})` : `（${wdName[d.wd]}）`;
    const inner = `<b>${esc(S[lang].date(d.iso))}</b><em>${esc(wd)}</em><i>${esc(t.n(d.n))}</i>`;
    return `<li>${d.n ? `<a class="${cls}" href="/date/${d.iso}/${opt.hash || ''}"${d.current ? ' aria-current="date"' : ''}>${inner}</a>` : `<span class="${cls}"${d.current ? ' aria-current="date"' : ''}>${inner}</span>`}</li>`;
  }).join('');
  return `<section class="hm-cal${opt.area ? ' hm-cal-area' : ''}" aria-label="${esc(t.aria)}"><div class="${opt.area ? '' : 'hm-in '}hm-cal-in">
<div class="cal-label">${icon('calendar', 34)}<div><strong>${esc(t.title)}</strong>${t.sub ? `<small>${esc(t.sub)}</small>` : ''}</div></div>
<ol class="cal-days" tabindex="0" aria-label="${esc(t.aria)}">${chips}</ol>
<a class="cal-view" href="/calendar/">${icon('calendar', 26)}<span>${esc(t.view)}</span>${icon('arrow', 16)}</a>
</div></section>`;
}

// ---- 今週末の注目マーケット（写真つきカード）----
function tagFor(o, lang) {
  // 公式で確認・予定の札は出さない（ユーザー指示 2026-10-26）。中止・延期・要確認は、誤解を招くので出す
  if (o.status === 'confirmed' || o.status === 'scheduled') return '';
  const cls = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' }[o.status];
  const [, m, d] = o.checkedAt.split('-');
  const when = o.status === 'confirmed' ? `${+m}/${+d} ` : '';
  return `<span class="mtag ${cls}" title="${esc(o.checkedAt)}">${esc(when + S[lang].status[o.status])}</span>`;
}

export function renderCard(o, lang = 'ja', n = null) {
  const s = o.series;
  const k = s.kinds[0];
  const [, m, d] = o.date.split('-');
  const wd = weekday(o.date);
  const badge = lang === 'en'
    ? `<span class="mc-m">${MON_EN[+m - 1]}</span><b>${+d}</b><span class="mc-w">${WD_EN[wd].toUpperCase()}</span>`
    : `<span class="mc-m">${+m}月</span><b>${+d}</b><span class="mc-w">${WD_JA[wd]}</span>`;
  const place = [cityL(s.venue.city, lang) || prefLabel(s.venue.pref, lang), venueL(s, lang)].filter(Boolean).join(lang === 'en' ? ', ' : '・');
  const time = (lang === 'en' && timeEn(s)) || s.time?.text || S[lang].featured.tbc;
  const kinds = s.kinds.map((x) => `<a class="mkind" href="/kind/${x}/">${esc(S[lang].kinds[x])}</a>`).join('');
  const off = o.status === 'cancelled' || o.status === 'postponed' ? ' is-off' : '';
  return `<article class="mcard${off}">
<a class="mc-img" href="/e/${s.id}/" tabindex="-1" aria-hidden="true"><img ${kindSrcset(kindImg(k, s.id, n))} alt="" width="800" height="600" loading="lazy" decoding="async"><span class="mc-date">${badge}</span></a>
<div class="mc-body">
<h3><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a></h3>${lang === 'en' && nameL(s, lang) !== s.name ? `<p class="mc-orig" lang="ja">${esc(s.name)}</p>` : ''}
<p class="mc-line">${icon('pin', 16)}<span>${esc(place)}</span></p>
<p class="mc-line">${icon('clock', 16)}<span>${esc(time)}</span></p>
<div class="mc-tags">${kinds}${tagFor(o, lang)}</div>
${o.note ? `<p class="mc-note">${esc(noteL(o, lang))}</p>` : ''}
</div>
</article>`;
}

export function featuredList(ctx) {
  const weekend = upcomingWeekend(ctx.today);
  const wk = ctx.occ.filter((o) => weekend.includes(o.date));
  if (wk.length) return { list: wk.slice(0, FEATURED_MAX), total: wk.length, weekend, fallback: false };
  const up = ctx.occ.filter(isActive).slice(0, 10);
  return { list: up, total: up.length, weekend, fallback: true };
}

export function renderFeatured(ctx, lang = 'ja') {
  const t = S[lang].featured;
  const f = featuredList(ctx);
  const head = f.fallback ? { title: t.upcoming, sub: t.upcomingSub } : t;
  const body = f.list.length
    ? `<div class="mc-wrap"><div class="mc-row" tabindex="0">${f.list.map((o, i) => renderCard(o, lang, i)).join('\n')}</div><button type="button" class="mc-next" aria-label="${esc(t.next)}" hidden>${icon('chev', 22)}</button></div>`
    : `<p class="hm-empty">${esc(t.empty)}</p>`;
  return `<section class="hm-sec hm-featured" aria-labelledby="featured-h"><div class="hm-in">
<div class="hm-head">${heading(head, 'featured-h')}<a class="hm-more" href="${f.fallback ? '/calendar/' : '/weekend/'}">${esc(t.all)}${icon('arrow', 16)}</a></div>
${body}
</div></section>`;
}

// ---- 出店者向け ----
const first = (x) => String(x || '').split(/[（(。]|\.\s|\s\(/)[0].trim();

export function vendorRows(ctx) {
  const next = new Map();
  for (const o of ctx.occ) if (isActive(o) && !next.has(o.series.id)) next.set(o.series.id, o.date);
  return ctx.series
    .filter((s) => s.exhibitor?.fee && next.has(s.id))
    .sort((a, b) => (next.get(a.id) < next.get(b.id) ? -1 : next.get(a.id) > next.get(b.id) ? 1 : a.id.localeCompare(b.id)))
    .slice(0, VENDOR_ROWS);
}

export function renderVendors(ctx, lang = 'ja') {
  const t = S[lang].vendors;
  const rows = vendorRows(ctx).map((s) => `<li><a href="/e/${s.id}/#shuten"><img src="${kindImg(s.kinds[0], s.id).replace(/\.webp$/, '-400.webp')}" alt="" width="96" height="72" loading="lazy" decoding="async"><span><b>${esc(nameL(s, lang))}</b><em>${esc(t.fee)}${esc(first((lang === 'en' && fieldEn(s, 'fee')) || s.exhibitor.fee))}</em><em>${esc(t.apply)}${esc(first((lang === 'en' && fieldEn(s, 'apply')) || s.exhibitor.apply) || S[lang].featured.tbc)}</em></span></a></li>`).join('');
  return `<section class="hm-sec hm-vendors" aria-labelledby="vendors-h"><div class="hm-in"><div class="vend-box">
<div class="vend-copy"><div class="vend-ic">${icon('store', 34)}</div>${heading(t, 'vendors-h')}<p>${esc(t.desc)}</p><a class="vend-btn" href="/shuten/">${esc(t.button)}${icon('arrow', 18)}</a></div>
<ul class="vend-list">${rows || `<li class="hm-empty">${esc(t.empty)}</li>`}</ul>
<div class="vend-photo"><img src="/img/vendors.webp" alt="${esc(t.photoAlt)}" width="900" height="675" loading="lazy" decoding="async"><p class="vend-script" aria-hidden="true">${t.script.map(esc).join('<br>')}</p></div>
</div></div></section>`;
}

// ---- 地域から探す（日本地図）／種類から探す ----
export function areaCounts(occ) {
  const m = new Map();
  for (const o of occ) if (isActive(o)) m.set(o.series.venue.pref, (m.get(o.series.venue.pref) || 0) + 1);
  return m;
}

export function kindCounts(occ) {
  const m = new Map();
  for (const o of occ) if (isActive(o)) for (const k of o.series.kinds) m.set(k, (m.get(k) || 0) + 1);
  return m;
}


// ---- サイト情報・掲載方針 ----
export function organizerCount(series) {
  // 「主催団体は開催日ごとに異なります」のように、団体名ではない表示（label つき）は数えない
  return new Set(series.filter((s) => !s.organizer.label).map((s) => s.organizer.name)).size;
}

export function renderAbout(ctx, lang = 'ja', disclaimer) {
  const t = S[lang].about;
  const events = ctx.occ.filter(isActive).length;
  return `<section class="hm-sec hm-about" aria-labelledby="about-h"><div class="hm-in"><div class="about-box">
<div class="about-left"><div class="about-title">${icon('doc', 36)}${heading(t, 'about-h')}</div>
<dl class="about-nums"><div><dd>${events}</dd><dt>${esc(t.events)}<small>${esc(t.eventsNote(ctx.days))}</small></dt></div><div><dd>${ctx.series.length}</dd><dt>${esc(t.markets)}</dt></div><div><dd>${organizerCount(ctx.series)}</dd><dt>${esc(t.organizers)}</dt></div></dl></div>
<div class="about-text"><p class="about-up">${esc(t.updated(S[lang].dateLong(ctx.today)))}</p><p>${esc(t.policy)}${lang === "en" ? " " : ""}${esc(t.source)}</p><p>${esc(disclaimer)}</p><a href="/about/">${esc(t.link)}${icon('arrow', 15)}</a></div>
<div class="about-photo"><img src="/img/about.webp" srcset="/img/about-450.webp 450w, /img/about.webp 900w" sizes="(max-width: 900px) 90vw, 320px" alt="${esc(t.photoAlt)}" width="900" height="675" loading="lazy" decoding="async"><p class="vend-script" aria-hidden="true">${t.script.map(esc).join('<br>')}</p></div>
</div></div></section>`;
}

// ---- ブログの最新3本・サイトの更新情報3本 ----
const NEWS = {
  ja: { blog: 'ブログの最新', blogSub: 'Latest articles', all: 'すべての記事', upd: 'サイトの更新情報', updSub: 'Site updates', empty: 'まだありません。' },
  en: { blog: 'Latest from the blog', blogSub: '', all: 'All articles', upd: 'Site updates', updSub: '', empty: 'Nothing yet.' },
};
export function renderNews(ctx, lang = 'ja') {
  const t = NEWS[lang];
  const posts = (ctx.latestPosts || []).slice(0, 3);
  const ups = (ctx.siteUpdates || []).slice(0, 3);
  if (!posts.length && !ups.length) return '';
  const dt = (iso) => S[lang].dateLong(iso);
  const blog = posts.map((p) => `<li><a href="/blog/${p.slug}/"><time datetime="${p.date}">${esc(dt(p.date))}</time><b>${esc(p[lang].title)}</b><span>${esc(p[lang].summary)}</span></a></li>`).join('');
  const upd = ups.map((u) => `<li>${u.link ? `<a href="${esc(u.link)}">` : '<div>'}<time datetime="${u.date}">${esc(dt(u.date))}</time><b>${esc(u[lang])}</b>${u.link ? '</a>' : '</div>'}</li>`).join('');
  return `<section class="hm-sec hm-news" aria-labelledby="news-h"><div class="hm-in hm-news-grid">
<div><div class="hm-head">${heading({ title: t.blog, sub: t.blogSub }, 'news-h')}<a class="hm-more" href="/blog/">${esc(t.all)}${icon('arrow', 16)}</a></div><ul class="news-list">${blog || `<li><span>${esc(t.empty)}</span></li>`}</ul></div>
<div><div class="hm-head">${heading({ title: t.upd, sub: t.updSub }, 'upd-h')}</div><ul class="news-list upd">${upd || `<li><span>${esc(t.empty)}</span></li>`}</ul></div>
</div></section>`;
}

// 英語のトップでは、出店者向けは下に細いバナーだけ（訪日外国人にはあまり要らない情報のため）
// Facebook ページへの小さな CTA（「このサイトについて」の下）
export function renderFbCta(lang = 'en') {
  const t = S[lang].fb;
  return `<section class="hm-sec hm-fbcta" aria-label="Facebook"><div class="hm-in"><div class="fbc"><a class="fbc-logo" href="${FACEBOOK_PAGE}" target="_blank" rel="noopener" aria-label="${esc(t.btn)}">${fbLogo(52)}</a><div class="fbc-text"><b>${esc(t.title)}</b><a class="fbc-group" href="${FACEBOOK_GROUP}" target="_blank" rel="noopener">${esc(S[lang].footer.fbJoin)} →</a></div><a class="fbc-btn" href="${FACEBOOK_PAGE}" target="_blank" rel="noopener">${esc(t.btn)}</a></div></div></section>`;
}

export function renderVendorBanner(lang = 'en') {
  const t = S[lang].vendors;
  return `<section class="hm-sec hm-vbanner" aria-label="${esc(t.title)}"><div class="hm-in"><a class="vb" href="/shuten/">${icon('store', 22)}<b>${esc(t.title)}</b><span>${esc(t.bannerDesc || t.desc)}</span>${icon('arrow', 18)}</a></div></section>`;
}

// ---- 新しいトップ（写真のカテゴリー・地域の文字タイル・ガイド帯）----
const CATS = [
  { img: 'cat-antiques', href: '/kind/kotto/', en: 'Antiques & Vintage', ja: '骨董・ヴィンテージ' },
  { img: 'cat-secondhand', href: '/kind/flea/', en: 'Secondhand & Fashion', ja: '古着・ファッション' },
  { img: 'cat-handmade', href: '/kind/handmade/', en: 'Crafts & Handmade', ja: '手作り・クラフト' },
  { img: 'cat-food', href: '/kind/marche/', en: 'Local Food', ja: 'ご当地グルメ' },
  { img: 'cat-traditional', href: '/kind/engi/', en: 'Traditional & Cultural', ja: '縁日・伝統' },
  { img: 'cat-markets', href: '/kind/', en: 'All Markets', ja: 'すべての市' },
];
export function renderCategories(lang = 'ja') {
  const en = lang === 'en';
  const items = CATS.map((c) => `<li><a class="ctile" href="${c.href}"><span class="ct-img"><img src="/img/home/${c.img}.webp" alt="" width="276" height="228" loading="lazy" decoding="async"></span><b>${esc(en ? c.en : c.ja)}</b></a></li>`).join('');
  return `<section class="hm-sec hm-cats" aria-label="${en ? 'Categories' : 'カテゴリー'}"><div class="hm-in"><ul class="ctiles">${items}</ul></div></section>`;
}

// 地域の文字タイル。都道府県のページ（/area/<コード>/）へ。関西・その他は地域の一覧へ
// 都道府県のページは、掲載がある県だけ作られるので、無い県は地域の一覧へ送る
const AREA_TILES = [
  { pref: '13', name: 'TOKYO', ja: '東京', cls: 't1' },
  { pref: '26', name: 'KYOTO', ja: '京都', cls: 't2' },
  { pref: '27', name: 'OSAKA', ja: '大阪', cls: 't3' },
  { name: 'KANSAI', ja: '関西', cls: 't4' },
  { name: 'OTHER AREAS', ja: 'その他の地域', cls: 't5' },
];
export function renderAreaTiles(ctx, lang = 'ja') {
  const t = S[lang].area;
  const en = lang === 'en';
  const counts = areaCounts(ctx.occ);
  const tiles = AREA_TILES.map((a) => `<li><a class="ar ${a.cls}" href="${a.pref && counts.get(a.pref) ? `/area/${a.pref}/` : '/area/'}"><small>${esc(a.ja)}</small><b>${esc(a.name)}</b><em>${esc(en ? 'View markets' : '掲載を見る')} ${icon('arrow', 14)}</em></a></li>`).join('');
  return `<section class="hm-sec hm-explore" aria-labelledby="area-h"><div class="hm-in">
<div class="hm-head">${heading(t, 'area-h')}<a class="hm-more" href="/area/">${esc(t.all)}${icon('arrow', 16)}</a></div>
<ul class="areas">${tiles}</ul>
</div></section>`;
}

// ガイド帯：写真（左）と見出し・本文・ボタン（右）。写真は AI 生成（data/image-credits.json）
const GUIDE_BAND = {
  en: { h: ['More Than Shopping.', 'A Deeper Japan.'], p: 'Flea markets are a great way to meet local people, discover unique culture, and find one-of-a-kind items you won’t see anywhere else.', btn: 'Read the Tips' },
  ja: { h: ['ショッピングだけじゃない。', 'もう一つの日本へ。'], p: 'フリーマーケットは、地元の人と出会い、その土地の文化や、ここでしか出会えない品に触れられる場所です。', btn: 'TIPSを読む' },
};
export function renderGuideBand(lang = 'ja') {
  const t = GUIDE_BAND[lang];
  return `<section class="hm-sec hm-gband" aria-label="${esc(t.h.join(' '))}"><div class="hm-in"><div class="gband">
<div class="gband-ph" aria-hidden="true" style="background-image:url(/img/home/guide-band.webp)"></div>
<div class="gband-t"><span class="sun" aria-hidden="true"></span><h2><span>${esc(t.h[0])}</span><span>${esc(t.h[1])}</span></h2><p>${esc(t.p)}</p><a class="btn" href="${lang === 'ja' ? '/ja/tips/' : '/tips/'}">${esc(t.btn)} ${icon('arrow', 16)}</a></div>
</div></div></section>`;
}

// トップ全体。カレンダー → カテゴリー → 今週末 → 地域 → ガイド帯 → 新着 → 出店者（日）・サイト情報
export function renderHomeBody(ctx, lang = 'ja', disclaimer = '') {
  const en = lang === 'en';
  return [
    renderHero(lang),
    renderCalendar(ctx, lang),
    renderCategories(lang),
    renderFeatured(ctx, lang),
    renderAreaTiles(ctx, lang),
    renderGuideBand(lang),
    renderNews(ctx, lang),
    en ? '' : renderVendors(ctx, lang),
    renderAbout(ctx, lang, disclaimer),
    renderFbCta(lang),
    en ? renderVendorBanner(lang) : '',
  ].join('\n');
}
