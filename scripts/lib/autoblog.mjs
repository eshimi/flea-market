// 自動で作るブログ記事（掲載データの事実だけを、型にはめて書く。AI が自由に書くのではない）
//   weekend … その週末の開催の一覧（週末の4日前から、まだ作っていなければ作る）
//   month   … 来月の開催のまとめ（毎月25日以降、まだ作っていなければ作る）
//   new     … 新しく掲載したシリーズ（前回の実行から増えた分）
// 作った記事は data/blog-auto/<slug>.json に保存し（毎朝の自動更新がコミット）、以後は保存した本文のまま出す（公開した時点の記録）。
import { addDays, diffDays, upcomingWeekend } from './dates.mjs';
import { isActive } from './events.mjs';
import { S } from './i18n.mjs';
import { dlabel, monthName, prefLabel, recurEn } from './l10n.mjs';
import { cityL, fieldEn, nameL, timeEn, venueL } from './tr-en.mjs';

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const rangeText = (days, lang) => {
  const a = days[0].split('-').map(Number);
  const b = days.at(-1).split('-').map(Number);
  if (days.length === 1) return lang === 'ja' ? `${a[1]}月${a[2]}日` : `${MON_SHORT[a[1] - 1]} ${a[2]}`;
  if (lang === 'ja') return a[1] === b[1] ? `${a[1]}月${a[2]}日〜${b[2]}日` : `${a[1]}月${a[2]}日〜${b[1]}月${b[2]}日`;
  return a[1] === b[1] ? `${MON_SHORT[a[1] - 1]} ${a[2]}–${b[2]}` : `${MON_SHORT[a[1] - 1]} ${a[2]} – ${MON_SHORT[b[1] - 1]} ${b[2]}`;
};
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const short = (t) => String(t).replace(/\s*[（(].*$/, '');
const placeOf = (s, lang) => [cityL(s.venue.city, lang) || prefLabel(s.venue.pref, lang), short(venueL(s, lang))].filter(Boolean).join(lang === 'ja' ? '・' : ', ');
const timeOf = (s, lang) => (lang === 'en' ? timeEn(s) || s.time?.text : s.time?.text) || '';
// 1件：[名前](リンク): 市区・会場 / 時間 (状態)
const item = (o, lang) => {
  const s = o.series;
  const sep = lang === 'ja' ? '：' : ': ';
  const parts = [placeOf(s, lang), short(timeOf(s, lang))].filter(Boolean).join(lang === 'ja' ? '／' : ' / ');
  const st = S[lang].status[o.status];
  return `[${nameL(s, lang)}](/e/${s.id}/)${sep}${parts}${lang === 'ja' ? `（${st}）` : ` — ${st}`}`;
};
const bySort = (a, b) => a.series.venue.pref.localeCompare(b.series.venue.pref) || a.series.name.localeCompare(b.series.name, 'ja');
const topPref = (list) => {
  const m = new Map();
  for (const o of list) m.set(o.series.venue.pref, (m.get(o.series.venue.pref) || 0) + 1);
  return [...m].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]));
};
const closing = {
  en: [{ h2: 'Before you go' }, { p: 'Each listing links to its page with the official source. Rules for rain and cancellations differ from market to market: see [Rain and cancellations](/blog/rain-and-cancellations/) and the [guide](/guide/). “Scheduled” dates are calculated from an official recurring rule and have not been confirmed individually.' }],
  ja: [{ h2: 'お出かけの前に' }, { p: '各開催のページに、公式の出典があります。雨天・中止の扱いはマーケットごとに違います。[雨天・中止：公式ページの書き方](/blog/rain-and-cancellations/)と[使い方](/guide/)をご覧ください。「予定」の日は、公式のきまりから計算した日で、その回の個別の確認はありません。' }],
};

export function weekendArticle(occ, today) {
  const days = upcomingWeekend(today);
  // 週末の4日前から、週末が始まる前まで（週末の最中は作らない）
  if (days[0] <= today || diffDays(today, days[0]) > 4) return null;
  const list = occ.filter((o) => days.includes(o.date) && o.series.venue.pref);
  const active = list.filter(isActive);
  if (!active.length) return null;
  const per = days.map((d) => [d, active.filter((o) => o.date === d).length]);
  const pref = topPref(active)[0];
  const conf = active.filter((o) => o.status === 'confirmed').length;
  const sched = active.filter((o) => o.status === 'scheduled').length;
  const mk = (lang) => ({
    title: lang === 'ja' ? `今週末（${rangeText(days, 'ja')}）のフリマ・蚤の市：${active.length}件` : `This weekend’s markets in Japan (${rangeText(days, 'en')}): ${plural(active.length, 'event', 'events')}`,
    summary: lang === 'ja' ? `${rangeText(days, 'ja')}の開催を、日付ごとにまとめました。掲載データの事実だけで作っています。` : `Markets on ${rangeText(days, 'en')}, day by day, built only from the listing data and its official sources.`,
    points: lang === 'ja'
      ? [`${days.length}日間で${active.length}件（${per.map(([d, n]) => `${+d.slice(8)}日 ${n}件`).join('、')}）`, `いちばん多いのは${prefLabel(pref[0], 'ja')}の${pref[1]}件`, `公式で確認した回が${conf}件、きまりから算出した回が${sched}件`]
      : [`${plural(active.length, 'event', 'events')} over ${plural(days.length, 'day', 'days')} (${per.map(([d, n]) => `${dlabel(d, 'en')}: ${n}`).join('; ')})`, `Most are in ${prefLabel(pref[0], 'en')} (${pref[1]})`, `${conf} confirmed from official information; ${sched} calculated from recurring rules`],
    blocks: [
      ...days.flatMap((d) => {
        const l = list.filter((o) => o.date === d).sort(bySort);
        return l.length ? [{ h2: lang === 'ja' ? `${dlabel(d, 'ja')}（${l.filter(isActive).length}件）` : `${dlabel(d, 'en')} (${l.filter(isActive).length})` }, { ul: l.map((o) => item(o, lang)) }] : [];
      }),
      ...closing[lang],
    ],
  });
  return { slug: `weekend-${days[0]}`, date: today, cat: 'weekly', tags: { en: ['Tokyo', 'flea market'], ja: ['東京', 'フリマ'] }, en: mk('en'), ja: mk('ja') };
}

export function monthArticle(occ, today) {
  const [y, m, d] = today.split('-').map(Number);
  if (d < 25) return null;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const key = `${ny}-${String(nm).padStart(2, '0')}`;
  const list = occ.filter((o) => o.date.startsWith(key) && isActive(o));
  if (!list.length) return null;
  const byKind = Object.keys(S.en.kinds).map((k) => [k, list.filter((o) => o.series.kinds.includes(k)).length]).filter(([, n]) => n);
  const byPref = topPref(list).slice(0, 5);
  const days = new Map();
  for (const o of list) days.set(o.date, (days.get(o.date) || 0) + 1);
  const busiest = [...days].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).sort((a, b) => a[0].localeCompare(b[0]));
  const regular = new Map();
  for (const o of list) if (o.series.recurrence.type !== 'dates') regular.set(o.series.id, [...(regular.get(o.series.id) || []), o]);
  const reg = [...regular.values()].sort((a, b) => a[0].series.name.localeCompare(b[0].series.name, 'ja')).slice(0, 20);
  const mk = (lang) => ({
    title: lang === 'ja' ? `${ny}年${nm}月のフリマ・蚤の市：${list.length}件` : `Markets in Japan in ${monthName(nm)} ${ny}: ${plural(list.length, 'event', 'events')}`,
    summary: lang === 'ja' ? `${ny}年${nm}月の開催を、種類・地域・日付・定期市でまとめました。` : `${monthName(nm)} ${ny} at a glance: by type, area and day, plus the regular markets.`,
    points: lang === 'ja' ? [`掲載は${list.length}件`, `種類別：${byKind.map(([k, n]) => `${S.ja.kinds[k]} ${n}件`).join('、')}`, `地域別（上位）：${byPref.map(([p, n]) => `${prefLabel(p, 'ja')} ${n}件`).join('、')}`] : [`${plural(list.length, 'event', 'events')} listed`, `By type: ${byKind.map(([k, n]) => `${S.en.kinds[k]} ${n}`).join('; ')}`, `By area (top): ${byPref.map(([p, n]) => `${prefLabel(p, 'en')} ${n}`).join('; ')}`],
    blocks: [
      { h2: lang === 'ja' ? '種類・地域ごとの件数' : 'By type and area' },
      { ul: [...byKind.map(([k, n]) => (lang === 'ja' ? `[${S.ja.kinds[k]}](/kind/${k}/)：${n}件` : `[${S.en.kinds[k]}](/kind/${k}/): ${n}`)), ...byPref.map(([p, n]) => (lang === 'ja' ? `[${prefLabel(p, 'ja')}](/area/${p}/)：${n}件` : `[${prefLabel(p, 'en')}](/area/${p}/): ${n}`))] },
      { h2: lang === 'ja' ? '開催が多い日' : 'Busiest days' },
      { ul: busiest.map(([dd, n]) => (lang === 'ja' ? `[${dlabel(dd, 'ja')}](/date/${dd}/)：${n}件` : `[${dlabel(dd, 'en')}](/date/${dd}/): ${n}`)) },
      ...(reg.length ? [{ h2: lang === 'ja' ? '定期市（きまりのある市）' : 'Regular markets' }, { ul: reg.map((os) => {
        const s = os[0].series;
        const rule = lang === 'ja' ? s.recurrence.text : recurEn(s.recurrence) || fieldEn(s, 'rule') || '';
        const ds = os.map((o) => (lang === 'ja' ? `${+o.date.slice(8)}日` : String(+o.date.slice(8)))).join(lang === 'ja' ? '・' : ', ');
        const sep = lang === 'ja' ? '：' : ': ';
        return `[${nameL(s, lang)}](/e/${s.id}/)${sep}${rule}${rule ? (lang === 'ja' ? '。' : '. ') : ''}${lang === 'ja' ? `${nm}月は${ds}` : `${MON_SHORT[nm - 1]}: ${ds}`}`;
      }) }] : []),
      ...closing[lang],
    ],
  });
  return { slug: `month-${key}`, date: today, cat: 'monthly', tags: { en: ['Tokyo', 'antique'], ja: ['東京', '骨董市'] }, en: mk('en'), ja: mk('ja') };
}

export function newListingsArticle(added, today) {
  if (!added.length) return null;
  const [, m, d] = today.split('-').map(Number);
  const mk = (lang) => ({
    title: lang === 'ja' ? `新しく載せた開催（${m}月${d}日）：${added.length}件` : `New on Flea Market JP (${MON_SHORT[m - 1]} ${d}): ${plural(added.length, 'new listing', 'new listings')}`,
    summary: lang === 'ja' ? '新しく掲載したマーケットです。公式ページのきまりと出典は、各ページにあります。' : 'Markets added to the site. Each page shows the official rule and its source.',
    points: lang === 'ja' ? [`新しい掲載は${added.length}件`, '開催日・時間・会場は、各ページに公式の記載のまま載せています'] : [`${plural(added.length, 'new listing', 'new listings')}`, 'Dates, times and venues are shown on each page as stated officially'],
    blocks: [
      { h2: lang === 'ja' ? '新しく載せたマーケット' : 'Newly listed markets' },
      { ul: added.slice(0, 30).map((s) => {
        const rule = lang === 'ja' ? s.recurrence.text : fieldEn(s, 'rule') || recurEn(s.recurrence);
        const sep = lang === 'ja' ? '：' : ': ';
        return `[${nameL(s, lang)}](/e/${s.id}/)${sep}${placeOf(s, lang)}${rule ? (lang === 'ja' ? `（${rule}）` : ` (${rule})`) : ''}`;
      }) },
      ...closing[lang],
    ],
  });
  return { slug: `new-${today}`, date: today, cat: 'new', tags: { en: ['Tokyo', 'flea market'], ja: ['東京', 'フリマ'] }, en: mk('en'), ja: mk('ja') };
}

// 今日の分を作る。existing＝すでにある記事の slug、state.seen＝前回までに見たシリーズの id

// 地域ガイド（都道府県ごと・毎月）：今後120日の開催を、種類と近い日程でまとめる。掲載データの事実だけ
export function areaGuideArticle(pref, { occ, venues = [], today }) {
  const list = occ.filter((o) => o.series.venue.pref === pref && isActive(o)).sort((a, b) => a.date.localeCompare(b.date) || a.series.id.localeCompare(b.series.id));
  if (list.length < 3) return null; // 件数が少ない県は、記事が薄くなるので作らない
  const count = (f) => list.filter(f).length;
  const conf = count((o) => o.status === 'confirmed');
  const sched = count((o) => o.status === 'scheduled');
  const kindCount = new Map();
  for (const o of list) for (const k of o.series.kinds) kindCount.set(k, (kindCount.get(k) || 0) + 1);
  const spots = venues.filter((v) => v.area?.pref === pref);
  const ym = today.slice(0, 7);
  const mk = (lang) => {
    const pl = prefLabel(pref, lang);
    const kinds = [...kindCount].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${S[lang].kinds[k]}${lang === 'ja' ? ` ${n}件` : ` ${n}`}`);
    const spotNames = spots.map((v) => (lang === 'en' ? (v.name_en || v.name) : v.name));
    const title = lang === 'ja' ? `${pl}のフリマ・骨董市・マルシェ（今後120日：${list.length}件）` : `Flea markets and antique fairs in ${pl} (next 120 days: ${plural(list.length, 'event', 'events')})`;
    return {
      title,
      summary: lang === 'ja' ? `${pl}の今後120日の開催を、近い日程から並べました。掲載データの事実だけで作っています。` : `Markets in ${pl} over the next 120 days, in date order, built only from the listing data and its official sources.`,
      points: lang === 'ja'
        ? [`今後120日に${list.length}件（公式で確認した回 ${conf}件、きまりから算出した回 ${sched}件）`, `種類：${kinds.join('、')}`, spots.length ? `会場の案内（スポット）：${spotNames.join('、')}` : '会場の案内（スポット）：まだありません']
        : [`${plural(list.length, 'event', 'events')} in the next 120 days (confirmed on official sources: ${conf}; from the regular schedule: ${sched})`, `Types: ${kinds.join(', ')}`, spots.length ? `Venue pages: ${spotNames.join(', ')}` : 'Venue pages: none yet'],
      blocks: [
        { h2: lang === 'ja' ? '近い日程' : 'Coming up' },
        { ul: list.slice(0, 12).map((o) => item(o, lang)) },
        ...(spots.length ? [{ h2: lang === 'ja' ? '会場（スポット）' : 'Venues' }, { ul: spots.map((v) => `[${lang === 'en' ? (v.name_en || v.name) : v.name}](/spot/${v.id}/)`) }] : []),
        ...closing[lang],
      ],
    };
  };
  return { slug: `area-${pref}-${ym}`, date: today, cat: 'area', tags: { ja: [pref, 'フリマ'], en: [prefLabel(pref, 'en'), 'flea market'] }, en: mk('en'), ja: mk('ja') };
}

export function generate({ series, occ, today, existing, state, venues = [] }) {
  const out = [];
  const seen = new Set(state?.seen || []);
  const first = !state;
  const added = first ? [] : series.filter((s) => !seen.has(s.id));
  const prefs = [...new Set(occ.filter(isActive).map((o) => o.series.venue.pref).filter(Boolean))].sort();
  const areas = prefs.map((p) => areaGuideArticle(p, { occ, venues, today }));
  for (const a of [weekendArticle(occ, today), monthArticle(occ, today), newListingsArticle(added, today), ...areas]) if (a && !existing.has(a.slug)) out.push(a);
  return { posts: out, state: { seen: series.map((s) => s.id).sort(), updated: today } };
}
export { addDays };
