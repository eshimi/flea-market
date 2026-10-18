// data/ から、dist/ に静的サイトを作る（毎日、日本時間の今日を基準に作り直す）。
// 使い方: node scripts/build-site.mjs [--today=YYYY-MM-DD] [--out=dist]
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { addDays, holidayName, isDayOff, label, parseYmd, todayJst, upcomingWeekend, weekday, WEEKDAYS } from './lib/dates.mjs';
import { buildOccurrences, isActive, lastChecked } from './lib/events.mjs';
import { KINDS } from './lib/kinds.mjs';
import { PREFS } from './lib/areas.mjs';
import { SITE } from './lib/nav.mjs';
import { breadcrumb, DISCLAIMER, esc, eventList, kindTags, layout, md, STATUS_LABEL, statusTag } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];

export function loadData(dir = join(ROOT, 'data')) {
  const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
  return { series: read('series.json'), occurrences: read('occurrences.json') };
}

const TBD = '<span class="tbd">要確認</span>';
const val = (v) => (v ? esc(v) : TBD);

// ---- 各ページ ----

function dayStrip(occ, today, current) {
  const counts = new Map();
  for (const o of occ) if (isActive(o)) counts.set(o.date, (counts.get(o.date) || 0) + 1);
  const cells = [];
  for (let i = 0; i < 14; i++) {
    const s = addDays(today, i);
    const n = counts.get(s) || 0;
    const wd = weekday(s);
    const cls = ['day', wd === 6 && !holidayName(s) ? 'sat' : isDayOff(s) ? 'off' : '', n ? '' : 'none'].filter(Boolean).join(' ');
    const inner = `<small>${WEEKDAYS[wd]}</small><b>${+s.slice(8)}</b><i>${n ? `${n}件` : 'なし'}</i>`;
    cells.push(n ? `<a class="${cls}" href="/date/${s}/"${s === current ? ' aria-current="date"' : ''}>${inner}</a>` : `<span class="${cls}">${inner}</span>`);
  }
  return `<nav class="days" aria-label="日付から探す">${cells.join('')}</nav>`;
}

function prefChips(occ) {
  const counts = new Map();
  for (const o of occ) if (isActive(o)) counts.set(o.series.venue.pref, (counts.get(o.series.venue.pref) || 0) + 1);
  if (!counts.size) return '<p class="note">掲載の準備中です。</p>';
  return `<ul class="chips">${[...counts].sort((a, b) => a[0].localeCompare(b[0])).map(([p, n]) => `<li><a href="/area/${p}/">${esc(PREFS[p])} ${n}</a></li>`).join('')}<li><a href="/area/">すべて</a></li></ul>`;
}

function exhibitorList(seriesList) {
  const rows = seriesList.filter((s) => s.exhibitor);
  if (!rows.length) return '<p class="empty">出店者向けの情報は、準備中です。</p>';
  return `<ul class="grid-links">${rows.map((s) => `<li><a href="/e/${s.id}/#shuten">${esc(s.name)}<small>出店料：${esc(s.exhibitor.fee || '要確認')}／申込み：${esc(s.exhibitor.apply || '要確認')}</small></a></li>`).join('')}</ul>`;
}

function home(ctx) {
  const { occ, today, series } = ctx;
  const weekend = upcomingWeekend(today);
  const first = weekend[0];
  const wkList = occ.filter((o) => weekend.includes(o.date));
  const upcoming = occ.filter((o) => isActive(o)).slice(0, 10);
  const active = occ.filter(isActive);
  const body = `<div class="in">
<section class="hero">
<h1>今週末、近くでやっている<br>フリマ・蚤の市を探す</h1>
<p class="lead">主催者・自治体の公式情報だけを掲載。毎朝更新、最終確認日つき。</p>
<div class="seg" role="group" aria-label="目的"><button type="button" data-aud="visit" aria-pressed="true">行きたい</button><button type="button" data-aud="shop" aria-pressed="false">出店したい</button></div>
<form class="search" action="/search/" role="search"><input name="q" type="search" placeholder="地名・会場名・種類（例：骨董市、千代田区）" aria-label="キーワード"><button>探す</button></form>
${dayStrip(occ, today)}
</section>
<div class="cols"><div>
<section data-for="visit">
<h2 class="sec-h">${weekend.length > 1 ? `今週末（${label(first)}〜${label(weekend.at(-1))}）` : `今週末（${label(first)}）`}の開催 <a href="/weekend/">すべて見る →</a></h2>
${eventList(wkList, '今週末の掲載は、まだありません。')}
${wkList.length ? '' : `<h2 class="sec-h">これからの開催 <a href="/calendar/">カレンダー →</a></h2>${eventList(upcoming, '掲載の準備中です。')}`}
</section>
<section data-for="shop" hidden>
<h2 class="sec-h">出店者向けの情報 <a href="/shuten/">すべて見る →</a></h2>
${exhibitorList(series)}
</section>
</div>
<aside>
<div class="box"><h2>都道府県から</h2>${prefChips(occ)}</div>
<div class="box"><h2>種類から</h2><ul class="chips">${Object.entries(KINDS).map(([k, v]) => `<li><a href="/kind/${k}/">${esc(v.short)}</a></li>`).join('')}</ul></div>
<div class="box"><h2>掲載の数</h2><div class="nums"><div><b>${active.length}</b>今後${ctx.days}日の開催</div><div><b>${series.length}</b>市・主催</div></div><p class="note" style="margin-top:8px">${esc(today.replace(/-/g, '/'))} 更新</p></div>
<div class="box"><h2>掲載のきまり</h2><p class="note">主催者・自治体の公式ページと公開データだけを使います。${esc(DISCLAIMER)} <a href="/about/">くわしく</a></p></div>
</aside></div></div>`;
  return { path: '/', title: SITE.name, description: '全国のフリーマーケット・蚤の市・骨董市・手作り市の開催情報を、主催者と自治体の公式情報からまとめています。今週末の開催・地域・種類から探せます。毎朝更新。', body, scripts: ['/home.js'] };
}

function listPage(path, crumbs, h1, lead, list, ctx, extra = '') {
  const body = `<div class="in page">${breadcrumb(crumbs)}<h1>${esc(h1)}</h1>${lead ? `<p class="lead">${esc(lead)}</p>` : ''}${extra}${eventList(list)}</div>`;
  return { path, title: h1, description: `${h1}。主催者・自治体の公式情報をもとに、毎朝更新しています。`, body };
}

function weekendPage(ctx) {
  const days = upcomingWeekend(ctx.today);
  const title = `今週末のフリマ・蚤の市（${label(days[0])}${days.length > 1 ? `〜${label(days.at(-1))}` : ''}）`;
  return listPage('/weekend/', [{ label: '今週末' }], title, '土日・祝日の開催です。', ctx.occ.filter((o) => days.includes(o.date)), ctx, dayStrip(ctx.occ, ctx.today));
}

function datePages(ctx) {
  const dates = [...new Set(ctx.occ.map((o) => o.date))];
  return dates.map((d) => {
    const hol = holidayName(d);
    return listPage(`/date/${d}/`, [{ href: '/calendar/', label: 'カレンダー' }, { label: label(d) }], `${label(d, { year: true })}${hol ? `・${hol}` : ''}の開催`, '', ctx.occ.filter((o) => o.date === d), ctx, dayStrip(ctx.occ, ctx.today, d));
  });
}

function calendarPage(ctx) {
  const byMonth = new Map();
  for (const o of ctx.occ) {
    const m = o.date.slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m).push(o);
  }
  const months = [...byMonth].map(([m, list]) => `<section class="month"><h2>${+m.slice(0, 4)}年${+m.slice(5)}月</h2>${eventList(list)}</section>`).join('');
  const body = `<div class="in page">${breadcrumb([{ label: 'カレンダー' }])}<h1>開催カレンダー</h1><p class="lead">今日から${ctx.days}日間の開催を、日付の順に並べています。</p>${dayStrip(ctx.occ, ctx.today)}${months || '<p class="empty">掲載の準備中です。</p>'}</div>`;
  return { path: '/calendar/', title: '開催カレンダー', description: 'フリマ・蚤の市・骨董市・手作り市の開催を、日付の順に。主催者・自治体の公式情報をもとに毎朝更新。', body };
}

function areaPages(ctx) {
  const pages = [];
  const prefs = new Map();
  for (const s of ctx.series) {
    const p = s.venue.pref;
    if (!prefs.has(p)) prefs.set(p, new Map());
    if (s.venue.cityCode) prefs.get(p).set(s.venue.cityCode, s.venue.city);
  }
  const count = (f) => ctx.occ.filter((o) => isActive(o) && f(o.series)).length;
  const idx = [...prefs.keys()].sort().map((p) => `<li><a href="/area/${p}/">${esc(PREFS[p])}<small>今後${ctx.days}日に ${count((s) => s.venue.pref === p)}件</small></a></li>`).join('');
  pages.push({ path: '/area/', title: '地域から探す', description: '都道府県・市区町村から、フリマ・蚤の市・骨董市の開催を探せます。', body: `<div class="in page">${breadcrumb([{ label: '地域から探す' }])}<h1>地域から探す</h1><p class="lead">掲載のある都道府県です。いまは東京都から掲載を始めています。</p>${idx ? `<ul class="grid-links">${idx}</ul>` : '<p class="empty">掲載の準備中です。</p>'}</div>` });
  for (const [p, cities] of prefs) {
    const cityLinks = [...cities].sort().map(([c, name]) => `<li><a href="/area/${p}/${c}/">${esc(name)}<small>${count((s) => s.venue.cityCode === c)}件</small></a></li>`).join('');
    const extra = cityLinks ? `<h2 class="sec-h">市区町村から</h2><ul class="grid-links">${cityLinks}</ul><h2 class="sec-h">開催の一覧</h2>` : '';
    pages.push(listPage(`/area/${p}/`, [{ href: '/area/', label: '地域' }, { label: PREFS[p] }], `${PREFS[p]}のフリマ・蚤の市・骨董市`, '', ctx.occ.filter((o) => o.series.venue.pref === p), ctx, extra));
    for (const [c, name] of cities) {
      pages.push(listPage(`/area/${p}/${c}/`, [{ href: '/area/', label: '地域' }, { href: `/area/${p}/`, label: PREFS[p] }, { label: name }], `${name}（${PREFS[p]}）のフリマ・蚤の市・骨董市`, '', ctx.occ.filter((o) => o.series.venue.cityCode === c), ctx));
    }
  }
  return pages;
}

function kindPages(ctx) {
  const idx = Object.entries(KINDS).map(([k, v]) => `<li><a href="/kind/${k}/">${esc(v.name)}<small>${esc(v.desc)}</small></a></li>`).join('');
  return [
    { path: '/kind/', title: '種類から探す', description: 'フリーマーケット・蚤の市・骨董市・手作り市・マルシェの種類から探せます。', body: `<div class="in page">${breadcrumb([{ label: '種類から探す' }])}<h1>種類から探す</h1><ul class="grid-links">${idx}</ul></div>` },
    ...Object.entries(KINDS).map(([k, v]) => listPage(`/kind/${k}/`, [{ href: '/kind/', label: '種類' }, { label: v.name }], `${v.name}の開催`, v.desc, ctx.occ.filter((o) => o.series.kinds.includes(k)), ctx)),
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
    organizer: { '@type': 'Organization', name: s.organizer.name, ...(s.organizer.url ? { url: s.organizer.url } : {}) },
    url: `${SITE.url}/e/${s.id}/`,
  }));
  return items.length ? `<script type="application/ld+json">${JSON.stringify(items).replace(/</g, '\\u003c')}</script>\n` : '';
}

function seriesPage(s, ctx) {
  const list = ctx.occ.filter((o) => o.series.id === s.id);
  const v = s.venue;
  const next = list.find(isActive);
  const dates = list.length
    ? `<ul class="sources">${list.slice(0, 12).map((o) => `<li>${esc(label(o.date, { year: true }))}　${statusTag(o)}${o.note ? `　<span class="tbd">${esc(o.note)}</span>` : ''}</li>`).join('')}</ul>`
    : '<p class="empty">今後の開催日は、公式の情報で確認できていません（要確認）。</p>';
  const row = (k, x) => `<div><dt>${esc(k)}</dt><dd>${x}</dd></div>`;
  const ex = s.exhibitor;
  const body = `<div class="in page">${breadcrumb([{ href: `/area/${v.pref}/`, label: PREFS[v.pref] }, ...(v.cityCode ? [{ href: `/area/${v.pref}/${v.cityCode}/`, label: v.city }] : []), { label: s.name }])}
<h1>${esc(s.name)}</h1>
<div class="tags">${kindTags(s.kinds)}</div>
${next ? `<p class="banner">次の開催：<b>${esc(label(next.date, { year: true }))}</b>　${esc(STATUS_LABEL[next.status])}（最終確認 ${esc(next.checkedAt)}）</p>` : ''}
<h2 class="sec-h">開催の情報</h2>
<dl class="facts">
${row('開催日', esc(s.recurrence.text))}
${row('時間', val(s.time?.text))}
${row('会場', esc(v.name))}
${row('所在地', val(v.address))}
${row('アクセス', val(v.access))}
${row('入場料', val(s.visitor?.admission))}
${row('雨天のとき', val(s.visitor?.rain))}
${row('主催', s.organizer.url ? `<a href="${esc(s.organizer.url)}" rel="noopener">${esc(s.organizer.name)}</a>` : esc(s.organizer.name))}
</dl>
<h2 class="sec-h">これからの開催日</h2>
${dates}
<h2 class="sec-h" id="shuten">出店したい方へ</h2>
${ex ? `<dl class="facts">${row('出店料', val(ex.fee))}${row('申込み方法', val(ex.apply))}${row('申込み先', ex.applyUrl ? `<a href="${esc(ex.applyUrl)}" rel="noopener">主催者の案内（公式）</a>` : TBD)}${ex.notes ? row('注意', esc(ex.notes)) : ''}</dl>` : '<p class="empty">出店の募集について、公式の情報で確認できていません（要確認）。</p>'}
<h2 class="sec-h">出典</h2>
<ul class="sources">${s.sources.map((x) => `<li><a href="${esc(x.url)}" rel="noopener">${esc(x.url)}</a>（最終確認 ${esc(x.checkedAt)}）</li>`).join('')}</ul>
<p class="note">${s.recurrence.type === 'dates' ? '' : `「予定（きまりから算出）」は、公式に書かれた開催のきまり（${esc(s.recurrence.text)}）から計算した日です。`}${esc(DISCLAIMER)}</p>
</div>`;
  return { path: `/e/${s.id}/`, title: `${s.name}（${PREFS[v.pref]}${v.city || ''}）`, description: `${s.name}の開催日（${s.recurrence.text}）・時間・会場・出店の情報。主催者の公式情報をもとに掲載（最終確認 ${lastChecked(s)}）。`, body, head: eventLd(s, list) };
}

function shutenPage(ctx) {
  const body = `<div class="in page">${breadcrumb([{ label: '出店したい方' }])}<h1>出店したい方へ</h1><p class="lead">出店料・申込み方法を、主催者の公式情報から掲載しています。募集の状況は変わるため、必ず主催者の案内をご確認ください。</p>${exhibitorList(ctx.series)}</div>`;
  return { path: '/shuten/', title: '出店者向けの情報', description: 'フリマ・蚤の市・骨董市の出店料・申込み方法を、主催者の公式情報からまとめています。', body };
}

function searchPage() {
  const body = `<div class="in page">${breadcrumb([{ label: 'キーワードで探す' }])}<h1>キーワードで探す</h1>
<form class="search" action="/search/" role="search"><input name="q" type="search" placeholder="地名・会場名・種類（例：骨董市、千代田区）" aria-label="キーワード"><button>探す</button></form>
<p class="lead" id="search-status" aria-live="polite"></p><div id="search-results"></div></div>`;
  return { path: '/search/', title: 'キーワードで探す', description: '地名・会場名・種類から、フリマ・蚤の市・骨董市の開催を探せます。', body, scripts: ['/search.js'] };
}

function aboutPage(ctx) {
  const body = `<div class="in page prose">${breadcrumb([{ label: 'サイトについて' }])}<h1>掲載のきまり・出典</h1>
<h2>集めている情報</h2>
<p>主催者の公式ページ、自治体の公式ページ、自治体などが公開しているオープンデータだけを使います。ほかのイベント情報サイト・まとめサイト・SNS の掲載内容は、使いません。</p>
<p>掲載するのは、開催日・時間・会場・入場料・出店料・申込み方法などの事実だけです。公式ページの文章や写真は転載しません。すべての掲載に、出典（公式ページへのリンク）と最終確認日を付けています。</p>
<h2>開催日の表示</h2>
<ul>
<li><b>${esc(STATUS_LABEL.confirmed)}</b>：その回の開催を、公式の情報で確認しました。</li>
<li><b>${esc(STATUS_LABEL.scheduled)}</b>：公式に書かれた開催のきまり（例：毎月第1日曜）から計算した日です。その回について、個別の確認はしていません。</li>
<li><b>${esc(STATUS_LABEL.cancelled)}・${esc(STATUS_LABEL.postponed)}</b>：公式の情報で、中止・延期を確認しました。</li>
<li><b>${esc(STATUS_LABEL.unknown)}</b>：公式の情報で確認できない、または最終確認から日数がたっています。</li>
</ul>
<p>${esc(DISCLAIMER)}</p>
<h2>情報の取得</h2>
<p>公式ページの取得は、robots.txt と各サイトの利用規約に従い、同じサイトへは1日1回までに抑えています。取得が認められていないページは、リンクだけを掲載します。</p>
<h2 id="remove">掲載の修正・削除の依頼</h2>
<p>主催者の方からの、掲載内容の修正・削除のご依頼を受け付けています。窓口は準備中です（要確認）。</p>
<h2>更新</h2>
<p>毎朝、自動で更新しています。最終更新：${esc(ctx.today)}</p>
</div>`;
  return { path: '/about/', title: '掲載のきまり・出典', description: 'Flea Market JP の情報の集め方・表示のきまり・出典・削除依頼について。', body };
}

function notFound() {
  return { path: '/404.html', title: 'ページが見つかりません', description: 'ページが見つかりません。', body: `<div class="in page"><h1>ページが見つかりません</h1><p class="lead">開催が終わったか、ページが移動した可能性があります。<a href="/">トップへ</a></p></div>` };
}

// ---- 全体 ----

export function buildPages({ series, occurrences }, today, days = 120) {
  const occ = buildOccurrences(series, occurrences, today, days);
  const ctx = { series, occ, today, days };
  return {
    pages: [home(ctx), weekendPage(ctx), calendarPage(ctx), ...datePages(ctx), ...areaPages(ctx), ...kindPages(ctx), ...series.map((s) => seriesPage(s, ctx)), shutenPage(ctx), searchPage(), aboutPage(ctx), notFound()],
    occ,
  };
}

export function searchIndex(occ) {
  // 検索用：開催回ごとの小さな JSON（/events.json）
  return occ.map((o) => ({
    d: o.date, st: o.status, c: o.checkedAt, id: o.series.id, n: o.series.name, k: o.series.kinds,
    p: PREFS[o.series.venue.pref], ci: o.series.venue.city || '', v: o.series.venue.name, t: o.series.time?.text || '', r: o.series.recurrence.text,
  }));
}

function main() {
  const today = arg('today') || todayJst();
  parseYmd(today);
  const out = resolve(ROOT, arg('out') || 'dist');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(ROOT, 'static'), out, { recursive: true });
  const { pages, occ } = buildPages(loadData(arg('data') ? resolve(ROOT, arg('data')) : undefined), today);
  for (const p of pages) {
    const file = p.path.endsWith('.html') ? join(out, p.path) : join(out, p.path, 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, layout(p));
  }
  writeFileSync(join(out, 'events.json'), JSON.stringify({ today, events: searchIndex(occ) }));
  writeFileSync(join(out, 'pages.json'), JSON.stringify(pages.filter((p) => !p.path.endsWith('.html')).map((p) => p.path)));
  console.log(`${today} 基準で ${pages.length} ページ、開催 ${occ.length} 件を ${out} に書き出しました`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
