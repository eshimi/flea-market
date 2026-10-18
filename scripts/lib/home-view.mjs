// トップページの各セクション。文言は scripts/lib/i18n.mjs、データは build-site.mjs の ctx（occ・series・today・days）から渡す。
// 数字・日付・件数は、すべて実データから計算する（見本の値は使わない）。
import { esc } from './html.mjs';
import { icon, japanMark } from './icons.mjs';
import { S, T, WD_EN, WD_JA, MON_EN } from './i18n.mjs';
import { addDays, holidayName, isDayOff, upcomingWeekend, weekday } from './dates.mjs';
import { isActive } from './events.mjs';
import { KINDS } from './kinds.mjs';
import { prefLabel } from './l10n.mjs';
import { MAP_PREFS, renderMap } from './japan-map.mjs';
import { skylineSvg } from './illustrations.mjs';

export const FEATURED_MAX = 12;
export const VENDOR_ROWS = 3;
const KIND_ICON = { flea: 'shirt', kotto: 'vase', nomi: 'chair', handmade: 'bag', engi: 'torii', marche: 'sprout' };
// フリマは写真が3種類。シリーズの id から決めるので、同じ市はいつも同じ写真になる
const kindImg = (k, id = '') => {
  if (k !== 'flea') return `/img/kinds/${k}.webp`;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ['/img/kinds/flea.webp', '/img/kinds/flea-2.webp', '/img/kinds/flea-3.webp'][h % 3];
};
const heading = (t, id) => `<h2 class="hm-h"${id ? ` id="${id}"` : ''}><span>${esc(t.title)}</span><small>${esc(t.sub)}</small></h2>`;

// ---- HERO ----
// 日本語・英語どちらのトップでも、同じ検索（/search/?q=）へ送る。既存の検索の動きは変えない
export function renderHero(lang = 'ja', photo = '/img/hero.webp') {
  const t = T[lang].hero;
  const [l1, l2, accent] = t.title;
  const cats = t.cats
    .map((c) => `<li><a href="${c.href}">${icon(c.icon, 30)}<span>${esc(c.label[0])}<br>${esc(c.label[1])}</span></a></li>`)
    .join('');
  const stampText = `${t.stamp} • ${t.stamp} •`;
  return `<section class="hero2 is-${lang}" aria-labelledby="hero-h">
<div class="hero2-photo"><img src="${photo}" alt="${esc(t.photoAlt)}" width="1800" height="900" fetchpriority="high" decoding="async"></div>
<div class="hero2-in">
<div class="hero2-copy">
<h1 id="hero-h"><span>${esc(l1)}</span><span>${esc(l2)}</span><em>${esc(accent)}</em></h1>
<p class="hero2-sub">${esc(t.sub)}</p>
<form class="hsearch" action="/search/" role="search"><span class="hs-ic">${icon('search', 21)}</span><input name="q" type="search" placeholder="${esc(t.placeholder)}" aria-label="${esc(t.searchLabel)}" autocomplete="off"><button type="submit">${esc(t.button)}${icon('arrow', 18)}</button></form>
<ul class="hcats">${cats}</ul>
</div>
</div>
<div class="hero2-deco" aria-hidden="true">
<p class="hd-script">${t.script.map(esc).join('<br>')}</p>
<svg class="hd-stamp" viewBox="0 0 120 120" focusable="false"><defs><path id="stamp-arc" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="57" fill="rgba(20,20,30,.3)" stroke="currentColor" stroke-width="1.6"/><circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width=".8" opacity=".55"/><text font-size="8.6" font-weight="700" fill="currentColor" font-family="Noto Sans JP,sans-serif"><textPath href="#stamp-arc" textLength="278" lengthAdjust="spacing">${esc(stampText)}</textPath></text><g transform="translate(34 33) scale(.52)" color="#fff">${japanMark()}</g></svg>
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

export function renderCalendar(ctx, lang = 'ja') {
  const t = S[lang].cal;
  const wdName = lang === 'en' ? WD_EN : WD_JA;
  const chips = calendarDays(ctx.occ, ctx.today).map((d) => {
    const cls = ['cd', d.sat ? 'sat' : '', d.off ? 'off' : '', d.n ? '' : 'none', d.current ? 'cur' : ''].filter(Boolean).join(' ');
    const wd = lang === 'en' ? `(${wdName[d.wd]})` : `（${wdName[d.wd]}）`;
    const inner = `<b>${esc(S[lang].date(d.iso))}</b><em>${esc(wd)}</em><i>${esc(t.n(d.n))}</i>`;
    return `<li>${d.n ? `<a class="${cls}" href="/date/${d.iso}/"${d.current ? ' aria-current="date"' : ''}>${inner}</a>` : `<span class="${cls}"${d.current ? ' aria-current="date"' : ''}>${inner}</span>`}</li>`;
  }).join('');
  return `<section class="hm-cal" aria-label="${esc(t.aria)}"><div class="hm-in hm-cal-in">
<div class="cal-label">${icon('calendar', 34)}<div><strong>${esc(t.title)}</strong><small>${esc(t.sub)}</small></div></div>
<ol class="cal-days" tabindex="0" aria-label="${esc(t.aria)}">${chips}</ol>
<a class="cal-view" href="/calendar/">${icon('calendar', 26)}<span>${esc(t.view)}</span>${icon('arrow', 16)}</a>
</div></section>`;
}

// ---- 今週末の注目マーケット（写真つきカード）----
function tagFor(o, lang) {
  const cls = { confirmed: 'ok', scheduled: 'plan', cancelled: 'stop', postponed: 'stop', unknown: 'warn' }[o.status];
  const [, m, d] = o.checkedAt.split('-');
  const when = o.status === 'confirmed' ? `${+m}/${+d} ` : '';
  return `<span class="mtag ${cls}" title="${esc(o.checkedAt)}">${esc(when + S[lang].status[o.status])}</span>`;
}

export function renderCard(o, lang = 'ja') {
  const s = o.series;
  const k = s.kinds[0];
  const [, m, d] = o.date.split('-');
  const wd = weekday(o.date);
  const badge = lang === 'en'
    ? `<span class="mc-m">${MON_EN[+m - 1]}</span><b>${+d}</b><span class="mc-w">${WD_EN[wd].toUpperCase()}</span>`
    : `<span class="mc-m">${+m}月</span><b>${+d}</b><span class="mc-w">${WD_JA[wd]}</span>`;
  const place = [s.venue.city || prefLabel(s.venue.pref, lang), s.venue.name].filter(Boolean).join('・');
  const time = s.time?.text || S[lang].featured.tbc;
  const official = o.source || s.sources[0].url;
  const kinds = s.kinds.map((x) => `<a class="mkind" href="/kind/${x}/">${esc(S[lang].kinds[x])}</a>`).join('');
  const off = o.status === 'cancelled' || o.status === 'postponed' ? ' is-off' : '';
  return `<article class="mcard${off}">
<a class="mc-img" href="/e/${s.id}/" tabindex="-1" aria-hidden="true"><img src="${kindImg(k, s.id)}" alt="" width="800" height="600" loading="lazy" decoding="async"><span class="mc-date">${badge}</span></a>
<div class="mc-body">
<h3><a href="/e/${s.id}/">${esc(s.name)}</a></h3>
<p class="mc-line">${icon('pin', 16)}<span>${esc(place)}</span></p>
<p class="mc-line">${icon('clock', 16)}<span>${esc(time)}</span></p>
<div class="mc-tags">${kinds}${tagFor(o, lang)}</div>
${o.note ? `<p class="mc-note">${esc(o.note)}</p>` : ''}
<a class="mc-off" href="${esc(official)}" target="_blank" rel="noopener">${esc(S[lang].featured.official)}${icon('ext', 15)}</a>
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
    ? `<div class="mc-wrap"><div class="mc-row" tabindex="0">${f.list.map((o) => renderCard(o, lang)).join('\n')}</div><button type="button" class="mc-next" aria-label="${esc(t.next)}" hidden>${icon('chev', 22)}</button></div>`
    : `<p class="hm-empty">${esc(t.empty)}</p>`;
  return `<section class="hm-sec hm-featured" aria-labelledby="featured-h"><div class="hm-in">
<div class="hm-head">${heading(head, 'featured-h')}<a class="hm-more" href="${f.fallback ? '/calendar/' : '/weekend/'}">${esc(t.all)}${icon('arrow', 16)}</a></div>
${body}
</div></section>`;
}

// ---- 出店者向け ----
const first = (x) => String(x || '').split(/[（(。]/)[0].trim();

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
  const rows = vendorRows(ctx).map((s) => `<li><a href="/e/${s.id}/#shuten"><img src="${kindImg(s.kinds[0], s.id)}" alt="" width="96" height="72" loading="lazy" decoding="async"><span><b>${esc(s.name)}</b><em>${esc(t.fee)}${esc(first(s.exhibitor.fee))}</em><em>${esc(t.apply)}${esc(first(s.exhibitor.apply) || S[lang].featured.tbc)}</em></span></a></li>`).join('');
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

export function renderArea(ctx, lang = 'ja') {
  const t = S[lang].area;
  const counts = areaCounts(ctx.occ);
  const chips = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([c, n]) => `<li><a class="achip" href="/area/${c}/">${esc(prefLabel(c, lang))}<small>${esc(t.count(n))}</small></a></li>`).join('');
  return `<section class="hm-area" aria-labelledby="area-h">
<div class="hm-head">${heading(t, 'area-h')}<a class="hm-more" href="/area/">${esc(t.all)}${icon('arrow', 16)}</a></div>
<div class="area-box"><div class="area-map">${renderMap(counts, { aria: t.map, countText: t.count, lang })}</div>
<div class="area-side"><p class="area-lead">${esc(t.popular)}</p><ul class="achips">${chips}</ul></div>
<div class="area-sky" aria-hidden="true">${skylineSvg()}</div></div>
</section>`;
}

export function renderTypes(ctx, lang = 'ja') {
  const t = S[lang].types;
  const counts = kindCounts(ctx.occ);
  // 掲載のある種類だけ（いま 0 件の種類は、出さない）
  const cards = Object.keys(KINDS).filter((k) => counts.get(k)).map((k) => `<li><a class="tcard" href="/kind/${k}/"><span class="tc-img"><img src="${kindImg(k)}" alt="${esc(S[lang].kindAlt[k])}" width="800" height="600" loading="lazy" decoding="async"></span><span class="tc-ic">${icon(KIND_ICON[k], 24)}</span><b>${esc(S[lang].kinds[k])}</b><small>(${esc(t.count(counts.get(k)))})</small></a></li>`).join('');
  return `<section class="hm-types" aria-labelledby="types-h">
<div class="hm-head">${heading(t, 'types-h')}<a class="hm-more" href="/kind/">${esc(t.all)}${icon('arrow', 16)}</a></div>
<ul class="tcards">${cards}</ul>
</section>`;
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
<div class="about-photo"><img src="/img/about.webp" alt="${esc(t.photoAlt)}" width="900" height="675" loading="lazy" decoding="async"><p class="vend-script" aria-hidden="true">${t.script.map(esc).join('<br>')}</p></div>
</div></div></section>`;
}

// トップ全体。HERO の下は、カレンダー → 注目マーケット → 出店者 → 地域・種類 → サイト情報の順
export function renderHomeBody(ctx, lang = 'ja', disclaimer = '') {
  return [
    renderHero(lang),
    renderCalendar(ctx, lang),
    renderFeatured(ctx, lang),
    renderVendors(ctx, lang),
    `<div class="hm-sec hm-explore"><div class="hm-in hm-two">${renderArea(ctx, lang)}${renderTypes(ctx, lang)}</div></div>`,
    renderAbout(ctx, lang, disclaimer),
  ].join('\n');
}
