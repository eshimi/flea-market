// スポット（会場）のページ：/spot/（区・市ごとの表）と /spot/<id>/
import { addDays, weekday } from './dates.mjs';
import { MON_EN, S, WD_EN, WD_JA } from './i18n.mjs';
import { dlabel, langPath, P, TBC, prefLabel } from './l10n.mjs';
import { breadcrumb, esc, statusTag } from './html.mjs';
import { SPOT_KINDS } from './spots.mjs';
import { cityL, nameL, noteL, orgEn, spotL, timeEn } from './tr-en.mjs';
import { PREFS } from './areas.mjs';
import { SITE } from './nav.mjs';
import { mapQuery, mapUrls, weatherTarget } from './weather.mjs';

const T = {
  ja: {
    crumb: 'スポット', h1: 'スポット（会場）', lead: 'フリマ・蚤の市が開かれる会場ごとに、直近の開催と主催をまとめています。会場の情報は、公式ページに書かれていることだけを載せます。',
    weekend: '今週末に開催', soon: '今後30日に開催', none: '該当なし', byArea: '区・市から', th: ['会場', '直近の開催', '主催', '今後の開催'],
    times: (n) => `${n}回`, tbc: '要確認', tbcNext: '開催予定は要確認', tbcSeries: 'この会場の開催は、公式で確認できた日だけ載せます。',
    photo: '写真', guide: '会場ガイドを読む →', next: '次の開催', kindLabel: '種類', open: '公式サイト', upcoming: '今後の開催予定', info: '会場の情報', address: '所在地', access: 'アクセス', place: '開催場所', rules: '会場の決まり', summary: '概要',
    sources: '出典', checked: '最終確認', series: 'この会場で開かれている市', others: '同じ区・市の他のスポット', noUpcoming: '今後の開催予定は要確認です（公式の案内が出たら載せます）。',
    desc: (n) => `${n}の会場情報と、開催予定のフリマ・蚤の市。`, listDesc: 'フリマ・蚤の市が開かれる会場の一覧。区・市ごとに、直近の開催と主催をまとめています。', note: '開催の有無・内容は変わることがあります。出かける前に、主催者・会場の公式情報でご確認ください。',
    organizerFrom: '', more: (n) => `ほか${n}回`, dates: (n) => `開催日（全${n}日）`, rest: (n) => `残り${n}日を見る`, detail: '詳細 →', mapHead: '地図・行き方', weekday: '曜日',
  },
  en: {
    crumb: 'Spots', h1: 'Spots (venues)', lead: 'Venues that host flea markets, by ward and city, with their next dates and organizers. Venue details are limited to what official pages state.',
    weekend: 'This weekend', soon: 'In the next 30 days', none: 'None', byArea: 'By ward / city', th: ['Venue', 'Next date', 'Organizer', 'Upcoming'],
    times: (n) => `${n}`, tbc: 'TBC', tbcNext: 'Dates TBC', tbcSeries: 'Only dates confirmed from official sources are listed for this venue.',
    photo: 'Photo', guide: 'Read the venue guide →', next: 'Next', kindLabel: 'Type', open: 'Official site', upcoming: 'Upcoming dates', info: 'Venue information', address: 'Address', access: 'Access', place: 'Where on site', rules: 'Venue rules', summary: 'Overview',
    sources: 'Sources', checked: 'last checked', series: 'Markets held here', others: 'Other spots in the same ward / city', noUpcoming: 'Upcoming dates are TBC (we list them once officially announced).',
    desc: (n) => `Venue information for ${n} and its upcoming flea markets.`, listDesc: 'Venues that host flea markets and antique fairs, by ward and city, with next dates and organizers.', note: 'Events can change or be cancelled. Please check official information from the organizer or venue before you go.',
    organizerFrom: '', more: (n) => `+${n} more`, dates: (n) => `Dates (${n} in all)`, rest: (n) => `Show ${n} more dates`, detail: 'Details →', mapHead: 'Map & directions', weekday: '',
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
      const thumb = v.image ? `<img class="sp-th" src="/img/spots/${esc(v.image.file.replace(/\.webp$/, '-t.webp'))}" alt="" width="64" height="43" loading="lazy" decoding="async">` : '<span class="sp-th ph" aria-hidden="true"></span>';
      return `<tr><td class="sp-name">${thumb}<span><a href="/spot/${v.id}/">${esc(spotL(v, 'name', lang))}</a><br><small>${sub}</small></span></td><td>${next}</td><td>${organizerOf(sp, lang)}</td><td>${sp.count ? esc(t.times(sp.count)) : '—'}</td></tr>`;
    }).join('');
    return `<section class="sp-area" id="${anchor(k)}"><h2>${esc(cityOf(groups.get(k)[0].venue, lang))}</h2><div class="sp-tbl"><table><thead><tr>${t.th.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }).join('');
  const body = `<div class="in page">${breadcrumb([{ label: t.crumb }], lang)}<h1>${esc(t.h1)}</h1><p class="lead">${esc(t.lead)}</p><div class="sp-chips" aria-label="${esc(t.byArea)}">${chips}</div>${tables}</div>`;
  return pg(lang, '/spot/', { title: t.h1, description: t.listDesc, body, css: ['/spot.css'] });
}

function placeLd(v, lang) {
  const a = v.area;
  const ld = { '@context': 'https://schema.org', '@type': 'Place', name: v.name, ...(v.address && v.addressFrom !== 'search' ? { address: v.address } : {}), ...(v.officialUrl ? { url: v.officialUrl } : {}) };
  return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`;
}

const POLL = {
  ja: { h: 'この会場、どうでしたか？', lead: '押すと回答、もう一度押すと取り消しです。匿名で、複数選べます。', choices: { want: '行ってみたい', been: '行ったことがある', again: 'また行きたい', crowded: '混んでいた', finds: '掘り出し物があった' }, note: 'ブラウザに保存した匿名の ID と、IP から作った識別できない値（回数の制限にだけ使用）で重複を防いでいます。個人情報は集めません。この結果は、利用者の感想で、公式の情報ではありません。' },
  en: { h: 'What do you think of this venue?', lead: 'Press to respond; press again to undo. Anonymous; you can pick several.', choices: { want: 'Want to go', been: 'Been here', again: 'Want to go again', crowded: 'It was crowded', finds: 'Found good stuff' }, note: 'Duplicates are prevented with an anonymous ID kept in your browser and a non-identifying value derived from your IP (used only to limit how often one can respond). We collect no personal information. Results are visitors’ impressions, not official information.' },
};


function photoBlock(v, lang) {
  const im = v.image;
  if (!im) return '';
  const t = T[lang];
  return `<figure class="sp-photo"><img src="/img/spots/${esc(im.file)}" alt="${esc(lang === 'ja' ? im.altJa : im.altEn)}" width="800" height="533" decoding="async"><figcaption>${esc(t.photo)}: ${esc(im.author)} / <a href="${esc(im.licenseUrl || im.sourceUrl)}" rel="noopener nofollow">${esc(im.license)}</a> / <a href="${esc(im.sourceUrl)}" rel="noopener nofollow">Wikimedia Commons</a>${lang === 'ja' ? '（トリミング・縮小）' : ' (cropped and resized)'}</figcaption></figure>`;
}

export function pollBlock(v, lang, market = false) {
  const q = { ...POLL[lang], ...(market ? { h: lang === 'ja' ? 'このマーケット、どうでしたか？' : 'What do you think of this market?' } : {}) };
  const site = process.env.TURNSTILE_SITE_KEY || '';
  const btns = Object.entries(q.choices).map(([k, label]) => `<button type="button" data-choice="${k}" aria-pressed="false"><span>${esc(label)}</span><b class="n"></b></button>`).join('');
  return `<section class="ev-card poll" data-spot="${esc(v.id)}" data-lang="${lang}" data-min="5"${site ? ` data-turnstile="${esc(site)}"` : ''}><h2>${esc(q.h)}</h2><p class="note">${esc(q.lead)}</p><div class="poll-btns">${btns}</div><input class="poll-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="poll-ts"></div><p class="poll-st" aria-live="polite"></p><p class="note">${esc(q.note)}</p></section>`;
}

export function spotPage(sp, ctx, lang) {
  const t = T[lang];
  const pp = P[lang].series;
  const v = sp.venue;
  const L = (k) => spotL(v, k, lang);
  const row = (k, x) => `<div><dt>${esc(k)}</dt><dd>${x}</dd></div>`;
  // 公式に住所がないときは、会場名から地図で調べた位置の目安（日本語は町・丁目まで、英語は市区町村まで）
  const g = ctx.spotGeo?.(v.id);
  const addr = v.address || !g?.estAddress ? null : `<span class="est" title="${esc(pp.estTitle)}">${esc(pp.est)}</span> ${esc(pp.estAddrGeo(lang === 'ja' ? g.estAddress : cityOf(v, lang)))}`;
  const val = (key) => (v[key] ? (lang === 'en' && L(key) !== v[key] ? `${esc(L(key))}<small class="orig" lang="ja">${esc(v[key])}</small>` : esc(v[key])) : TBC(lang));
  const srcs = v.sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.url)}</a>　${esc(t.checked)}: ${esc(s.checkedAt)}</li>`).join('');
  const others = ctx.spots.filter((x) => x.venue.id !== v.id && x.venue.area.pref === v.area.pref && (x.venue.area.cityCode || '') === (v.area.cityCode || ''));
  const cityName = cityOf(v, lang);
  // 地図・経路・天気（開催詳細と同じ。会場の住所があれば住所、なければ会場名＋区市で検索）
  const shim = { venue: { name: v.name, pref: v.area.pref, city: v.area.city, address: v.address, addressFrom: v.addressFrom } };
  const mu = mapUrls(shim, lang, ctx.spotGeo?.(v.id));
  const wt = weatherTarget(shim);
  const nm = lang === 'en' ? L('name') : v.name;
  const mapSrc = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery(shim).q)}&hl=${lang === 'ja' ? 'ja' : 'en'}&z=16&output=embed`;
  const mapImg = ctx.spotMapImg?.(v.id);
  const wxBox = sp.next && wt ? `<section class="ev-card"><h2>${esc(pp.secWx)}</h2><div class="wx" data-office="${wt.office}" data-area="${wt.area || ''}" data-date="${sp.next.date}" data-lang="${lang}" data-region="${esc(prefLabel(v.area.pref, 'en'))}"><p class="wx-st">${esc(pp.wxLoading)}</p></div><p class="note">${esc(pp.wxNote)} ${esc(pp.wxSrc)}<a href="https://www.jma.go.jp/bosai/forecast/" rel="noopener">${esc(pp.wxJma)}</a>${lang === 'ja' ? '' : ' (気象庁)'}</p></section>` : '';
  const mapCard = `<section class="ev-card"><h2>${esc(pp.secMap)}</h2>${mapImg ? `<a class="ev-mapimg" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow" title="${esc(pp.mapOpen)}"><img src="/img/maps/spot-${esc(v.id)}.webp" alt="${esc(pp.mapImgAlt(nm))}" width="640" height="400" loading="lazy" decoding="async"></a><p class="note">${esc(mu.pin ? pp.mapApproxName : mu.searched ? pp.mapApproxSearch : pp.mapApprox)}</p>` : `<div class="ev-map" data-src="${esc(mapSrc)}" data-title="${esc(pp.secMap)}"><div class="ev-map-ph"><span aria-hidden="true">📍</span><b>${esc(nm)}</b><button type="button" class="map-show">${esc(pp.mapShow)}</button><small>${esc(pp.mapPrivacy)}</small></div></div>`}<p class="map-btns"><a class="map-btn" href="${esc(mu.open)}" target="_blank" rel="noopener nofollow">${esc(pp.mapOpen)} ↗</a><a class="map-btn s" href="${esc(mu.route)}" target="_blank" rel="noopener nofollow">${esc(pp.mapRoute)} ↗</a></p><p class="note">${esc(mu.pin ? pp.mapPin : mu.searched ? pp.mapSearched : mu.exact ? pp.mapExact : pp.mapLoose)}</p></section>`;
  const nxt = sp.next;
  const shortT = (x) => String(x || '').split(/[（(。]|\.\s|\s\(/)[0].trim();
  const timeOf = (o) => shortT(lang === 'en' && timeEn(o.series) ? timeEn(o.series) : o.series.time?.text) || t.tbc;
  const multi = sp.series.length > 1;
  // 次の開催（大きな日付）
  const nextCard = nxt ? (() => {
    const [, nm, nd] = nxt.date.split('-');
    const wdn = (lang === 'ja' ? WD_JA : WD_EN)[weekday(nxt.date)];
    const org = nxt.series.organizer.label ? (nxt.note ? esc(nxt.note) : '') : esc((lang === 'en' && orgEn(nxt.series.organizer.name)) || nxt.series.organizer.name);
    return `<div class="ev-next"><div class="ev-next-d"><small>${lang === 'ja' ? `${+nm}月` : MON_EN[+nm - 1]}</small><b>${+nd}</b><span>${esc(wdn)}${lang === 'ja' ? '曜日' : ''}</span></div><div><small class="lab">${esc(t.next)}</small><div class="ev-next-t">${esc(timeOf(nxt))}</div><p><a href="/e/${nxt.series.id}/">${esc(nameL(nxt.series, lang))}</a>${org ? ` ／ ${org}` : ''} ／ ${esc(S[lang].status[nxt.status])}</p></div></div>`;
  })() : `<p class="empty">${esc(t.noUpcoming)}</p>`;
  // 開催日の表（最初の6件。残りは「残りN日を見る」で開く。HTML には全件が入る）
  const dateRow = (o) => `<tr><td class="sd-d"><a href="/e/${o.series.id}/">${esc(dlabel(o.date, lang))}</a></td><td class="sd-t">${esc(timeOf(o))}${multi ? `<small>${esc(nameL(o.series, lang))}</small>` : ''}${o.note ? `<small>${esc(noteL(o, lang))}</small>` : ''}</td><td>${statusTag(o, lang)}</td><td class="sd-m"><a href="/e/${o.series.id}/">${esc(t.detail)}</a></td></tr>`;
  const SHOW = 6;
  const tbl = (rows) => `<table class="sp-dates"><tbody>${rows.map(dateRow).join('')}</tbody></table>`;
  const datesBlock = sp.occ.length
    ? `<h2 class="sec-h">${esc(t.dates(sp.occ.length))}</h2><div class="ev-facts-card">${tbl(sp.occ.slice(0, SHOW))}${sp.occ.length > SHOW ? `<details class="sp-more"><summary>${esc(t.rest(sp.occ.length - SHOW))}</summary>${tbl(sp.occ.slice(SHOW))}</details>` : ''}</div><p class="note">${esc(t.tbcSeries)}</p>`
    : '';
  const cityNameShort = cityName;
  const checkedAll = v.sources.map((x) => x.checkedAt).filter(Boolean).sort().at(-1);
  const extraLinks = `${v.officialUrl ? `<a class="btn-line" href="${esc(v.officialUrl)}" rel="noopener">${esc(t.open)} ↗</a>` : ''}${ctx.guideSlugs?.has(`guide-${v.id}`) ? `<a class="btn-line" href="/blog/guide-${esc(v.id)}/">${esc(t.guide)}</a>` : ''}`;
  const side = `<aside class="ev-side" aria-label="${esc(pp.secMap)}">${photoBlock(v, lang)}${mapCard.replace('</section>', `${extraLinks ? `<p class="ev-cta">${extraLinks}</p>` : ''}</section>`)}${wxBox}</aside>`;
  const body = `<div class="in page sp-page">${breadcrumb([{ href: '/spot/', label: t.crumb }, { label: spotL(v, 'name', lang) }], lang)}
<div class="sp-title"><h1>${esc(L('name'))}</h1>${lang === 'en' && L('name') !== v.name ? `<p class="orig-h" lang="ja">${esc(v.name)}</p>` : ''}
<div class="tags"><span class="tag">${esc(kindL(v.kind, lang))}</span><span class="tag">${esc(cityNameShort)}</span>${checkedAll ? `<span class="tag chk">${lang === 'ja' ? '最終確認：' : 'Last checked: '}${esc(checkedAll)}</span>` : ''}</div></div>
<div class="ev-split"><div class="ev-main">
${nextCard}
${datesBlock}
<h2 class="sec-h">${esc(t.info)}</h2>
<div class="ev-facts-card"><dl class="facts">
${row(t.summary, val('summary'))}
${row(t.address, addr || val('address') + (v.address && v.addressFrom === 'search' ? `<small class="addr-src">${esc(pp.addrSearched)}</small>` : ''))}
${row(t.access, val('access') + (v.access && v.accessFrom === 'search' ? `<small class="addr-src">${esc(pp.accessSearched)}</small>` : ''))}
${v.place ? row(t.place, val('place')) : ''}
${v.rules ? row(t.rules, val('rules')) : ''}
</dl></div>
${pollBlock(v, lang)}
<h3>${esc(t.sources)}</h3><ul class="sources">${srcs}</ul>
${others.length ? `<h2 class="sec-h">${esc(t.others)}</h2><ul class="grid-links">${others.map((x) => `<li><a href="/spot/${x.venue.id}/">${esc(spotL(x.venue, 'name', lang))}<small>${esc(kindL(x.venue.kind, lang))}</small></a></li>`).join('')}</ul>` : ''}
<p class="note">${esc(t.note)}</p></div>${side}</div></div>`;
  return pg(lang, `/spot/${v.id}/`, { title: L('name'), ogImage: v.image ? `/img/spots/${v.image.file}` : "", description: t.desc(L('name')), body, css: ['/spot.css'], scripts: ['/weather.js', '/map.js', '/vote.js'], head: placeLd(v, lang), keywords: [L('name'), v.area?.city, v.area?.pref && prefLabel(v.area.pref, lang), kindL(v.kind, lang)].filter(Boolean) });
}
