// スポット（会場）のページ：/spot/（区・市ごとの表）と /spot/<id>/
import { addDays } from './dates.mjs';
import { dlabel, langPath, P, TBC, prefLabel } from './l10n.mjs';
import { breadcrumb, esc, eventListByMonth } from './html.mjs';
import { SPOT_KINDS } from './spots.mjs';
import { cityL, nameL, orgEn, spotL } from './tr-en.mjs';
import { PREFS } from './areas.mjs';
import { SITE } from './nav.mjs';

const T = {
  ja: {
    crumb: 'スポット', h1: 'スポット（会場）', lead: 'フリマ・蚤の市が開かれる会場ごとに、直近の開催と主催をまとめています。会場の情報は、公式ページに書かれていることだけを載せます。',
    weekend: '今週末に開催', soon: '今後30日に開催', none: '該当なし', byArea: '区・市から', th: ['会場', '直近の開催', '主催', '今後の開催'],
    times: (n) => `${n}回`, tbc: '要確認', tbcNext: '開催予定は要確認', tbcSeries: 'この会場の開催は、公式で確認できた日だけ載せます。',
    kindLabel: '種類', open: '公式サイト', upcoming: '今後の開催予定', info: '会場の情報', address: '所在地', access: 'アクセス', place: '開催場所', rules: '会場の決まり', summary: '概要',
    sources: '出典', checked: '最終確認', series: 'この会場で開かれている市', others: '同じ区・市の他のスポット', noUpcoming: '今後の開催予定は要確認です（公式の案内が出たら載せます）。',
    desc: (n) => `${n}の会場情報と、開催予定のフリマ・蚤の市。`, listDesc: 'フリマ・蚤の市が開かれる会場の一覧。区・市ごとに、直近の開催と主催をまとめています。', note: '開催の有無・内容は変わることがあります。出かける前に、主催者・会場の公式情報でご確認ください。',
    organizerFrom: '', more: (n) => `ほか${n}回`,
  },
  en: {
    crumb: 'Spots', h1: 'Spots (venues)', lead: 'Venues that host flea markets, by ward and city, with their next dates and organizers. Venue details are limited to what official pages state.',
    weekend: 'This weekend', soon: 'In the next 30 days', none: 'None', byArea: 'By ward / city', th: ['Venue', 'Next date', 'Organizer', 'Upcoming'],
    times: (n) => `${n}`, tbc: 'TBC', tbcNext: 'Dates TBC', tbcSeries: 'Only dates confirmed from official sources are listed for this venue.',
    kindLabel: 'Type', open: 'Official site', upcoming: 'Upcoming dates', info: 'Venue information', address: 'Address', access: 'Access', place: 'Where on site', rules: 'Venue rules', summary: 'Overview',
    sources: 'Sources', checked: 'last checked', series: 'Markets held here', others: 'Other spots in the same ward / city', noUpcoming: 'Upcoming dates are TBC (we list them once officially announced).',
    desc: (n) => `Venue information for ${n} and its upcoming flea markets.`, listDesc: 'Venues that host flea markets and antique fairs, by ward and city, with next dates and organizers.', note: 'Events can change or be cancelled. Please check official information from the organizer or venue before you go.',
    organizerFrom: '', more: (n) => `+${n} more`,
  },
};

const pg = (lang, base, x) => ({ path: langPath(base, lang), lang, ...x });
const kindL = (k, lang) => SPOT_KINDS[k][lang];
const cityOf = (v, lang) => (v.area.city ? cityL(v.area.city, lang) : prefLabel(v.area.pref, lang));
// 主催：シリーズの主催者。回ごとに主催が違うもの（organizer.label がある）は、その回の注記（主催団体名）を出す
function organizerOf(sp, lang) {
  const o = sp.next;
  if (!o) return '—';
  const s = o.series;
  if (s.organizer.label) return o.note ? esc(o.note) : TBC(lang);
  return esc((lang === 'en' && orgEn(s.organizer.name)) || s.organizer.name);
}
const md = (d, lang) => dlabel(d, lang).replace(/^[A-Za-z]{3}, /, '');

export function spotIndex(ctx, lang) {
  const t = T[lang];
  const weekendDays = ctx.weekend || [];
  const wk = ctx.spots.filter((sp) => sp.active.some((o) => weekendDays.includes(o.date)));
  const soon = ctx.spots.filter((sp) => sp.soon && !wk.includes(sp));
  const chip = (sp) => `<a href="/spot/${sp.venue.id}/">${esc(spotL(sp.venue, 'name', lang))}</a>`;
  const hl = (title, list) => (list.length ? `<div class="sp-hl"><b>${esc(title)}</b>${list.map(chip).join('')}</div>` : '');
  const groups = new Map();
  for (const sp of ctx.spots) {
    const key = sp.venue.area.cityCode || sp.venue.area.pref;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(sp);
  }
  const keys = [...groups.keys()].sort();
  const anchor = (k) => `w-${k}`;
  const chips = keys.map((k) => `<a href="#${anchor(k)}">${esc(cityOf(groups.get(k)[0].venue, lang))}</a>`).join('');
  const tables = keys.map((k) => {
    const rows = groups.get(k).map((sp) => {
      const v = sp.venue;
      const next = sp.next ? `<b>${esc(md(sp.next.date, lang))}</b>` : `<span class="tbd">${esc(t.tbcNext)}</span>`;
      const sub = [kindL(v.kind, lang), spotL(v, 'place', lang)].filter(Boolean).map(esc).join(' · ');
      return `<tr><td><a href="/spot/${v.id}/">${esc(spotL(v, 'name', lang))}</a><br><small>${sub}</small></td><td>${next}</td><td>${organizerOf(sp, lang)}</td><td>${sp.count ? esc(t.times(sp.count)) : '—'}</td></tr>`;
    }).join('');
    return `<section class="sp-area" id="${anchor(k)}"><h2>${esc(cityOf(groups.get(k)[0].venue, lang))}</h2><div class="sp-tbl"><table><thead><tr>${t.th.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }).join('');
  const body = `<div class="in page">${breadcrumb([{ label: t.crumb }], lang)}<h1>${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p>${hl(t.weekend, wk)}${hl(t.soon, soon)}<div class="sp-chips" aria-label="${esc(t.byArea)}">${chips}</div>${tables}</div>`;
  return pg(lang, '/spot/', { title: t.h1, description: t.listDesc, body, css: ['/spot.css'] });
}

function placeLd(v, lang) {
  const a = v.area;
  const ld = { '@context': 'https://schema.org', '@type': 'Place', name: v.name, ...(v.address ? { address: v.address } : {}), ...(v.officialUrl ? { url: v.officialUrl } : {}) };
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
}

export function spotPage(sp, ctx, lang) {
  const t = T[lang];
  const v = sp.venue;
  const L = (k) => spotL(v, k, lang);
  const row = (k, x) => `<div><dt>${esc(k)}</dt><dd>${x}</dd></div>`;
  const val = (key) => (v[key] ? (lang === 'en' && L(key) !== v[key] ? `${esc(L(key))}<small class="orig" lang="ja">${esc(v[key])}</small>` : esc(v[key])) : TBC(lang));
  const srcs = v.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.url)}</a>　${esc(t.checked)}: ${esc(s.checkedAt)}</li>`).join('');
  const seriesList = sp.series.map((s) => `<li><a href="/e/${s.id}/">${esc(nameL(s, lang))}</a></li>`).join('');
  const others = ctx.spots.filter((x) => x.venue.id !== v.id && x.venue.area.pref === v.area.pref && (x.venue.area.cityCode || '') === (v.area.cityCode || ''));
  const cityName = cityOf(v, lang);
  const body = `<div class="in page">${breadcrumb([{ href: '/spot/', label: t.crumb }, { label: spotL(v, 'name', lang) }], lang)}
<h1>${esc(L('name'))}</h1>${lang === 'en' && L('name') !== v.name ? `<p class="orig-h" lang="ja">${esc(v.name)}</p>` : ''}
<div class="tags"><span class="tag">${esc(kindL(v.kind, lang))}</span><span class="tag">${esc(cityName)}</span>${v.officialUrl ? `<a class="tag" href="${esc(v.officialUrl)}" rel="noopener">${esc(t.open)}</a>` : ''}</div>
<h2 class="sec-h">${esc(t.upcoming)}</h2>
${sp.occ.length ? eventListByMonth(sp.occ, lang) : `<p class="empty">${esc(t.noUpcoming)}</p>`}
<p class="note">${esc(t.tbcSeries)}</p>
<h2 class="sec-h">${esc(t.info)}</h2>
<dl class="facts">
${row(t.summary, val('summary'))}
${row(t.address, val('address'))}
${row(t.access, val('access'))}
${row(t.place, val('place'))}
${row(t.rules, val('rules'))}
</dl>
<h3>${esc(t.sources)}</h3><ul class="sources">${srcs}</ul>
${sp.series.length ? `<h2 class="sec-h">${esc(t.series)}</h2><ul class="sp-series">${seriesList}</ul>` : ''}
${others.length ? `<h2 class="sec-h">${esc(t.others)}</h2><ul class="grid-links">${others.map((x) => `<li><a href="/spot/${x.venue.id}/">${esc(spotL(x.venue, 'name', lang))}<small>${esc(kindL(x.venue.kind, lang))}</small></a></li>`).join('')}</ul>` : ''}
<p class="note">${esc(t.note)}</p></div>`;
  return pg(lang, `/spot/${v.id}/`, { title: L('name'), description: t.desc(L('name')), body, css: ['/spot.css'], head: placeLd(v, lang) });
}
