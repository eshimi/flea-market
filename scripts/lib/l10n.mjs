// 日本語・英語の両方で出すための、共通の部品（言語ごとの文言・日付・URL）。
// 英語が既定：英語は `/`、日本語は `/ja/` 以下。事実の項目（会場名・時間・料金など、公式に書かれた文）は訳さず、そのまま出す。
import { MON_EN, S, WD_EN } from './i18n.mjs';
import { PREFS } from './areas.mjs';
import { holidayName } from './dates.mjs';
import { parseYmd } from './dates.mjs';
import { MAP_PREFS } from './japan-map.mjs';

export const DEFAULT_LANG = 'en';
export const ja = (lang) => lang === 'ja';

// ---- URL ----
const PAGE_ROOTS = ['weekend', 'calendar', 'date', 'area', 'kind', 'e', 'shuten', 'search', 'about', 'guide', 'faq', 'blog'];
// 英語（既定）の URL → その言語の URL
export const langPath = (path, lang) => (lang === 'ja' ? (path === '/' ? '/ja/' : `/ja${path}`) : path);
// 出力先の URL → 言語と、英語側の URL
export function splitPath(path) {
  if (path === '/ja' || path.startsWith('/ja/')) return { lang: 'ja', base: path.slice(3) || '/' };
  return { lang: 'en', base: path };
}
// 本文の中の内部リンク（href・action）を、その言語の URL にする。静的ファイル（/style.css など）は、そのまま
export function localize(html, lang) {
  if (lang !== 'ja') return html;
  const re = new RegExp(`(href|action)="(/(?:(?:${PAGE_ROOTS.join('|')})/[^"]*)?)"`, 'g');
  return html.replace(re, (_, a, h) => `${a}="${langPath(h, 'ja')}"`);
}

// ---- 地名・種類 ----
const ascii = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
export const PREFS_EN = Object.fromEntries(Object.entries(MAP_PREFS).map(([c, v]) => [c, ascii(v.en)]));
export const prefLabel = (code, lang) => (ja(lang) ? PREFS[code] : PREFS_EN[code]);

export const KIND_SHORT_EN = { flea: 'Flea market', nomi: 'Nomi-no-ichi', kotto: 'Antique fair', handmade: 'Handmade', engi: 'Fair (ennichi)', marche: 'Marché' };
export const KIND_DESC_EN = {
  flea: 'Markets where individuals sell secondhand goods, in parks, plazas and event halls',
  nomi: 'Markets of old tools, vintage clothing and miscellaneous goods',
  kotto: 'Markets of antiques and fine art. Many are held regularly in shrine and temple grounds',
  handmade: 'Markets where makers sell their own work',
  engi: 'Stalls lining shrine and temple grounds and approaches on fair days (many are held on fixed days every month)',
  marche: 'Markets of farm produce and food',
};

// ---- 日付 ----
const HOLIDAY_EN = { 元日: "New Year's Day", 成人の日: 'Coming of Age Day', 建国記念の日: 'National Foundation Day', 天皇誕生日: "Emperor's Birthday", 春分の日: 'Vernal Equinox Day', 昭和の日: 'Showa Day', 憲法記念日: 'Constitution Memorial Day', みどりの日: 'Greenery Day', こどもの日: "Children's Day", 海の日: 'Marine Day', 山の日: 'Mountain Day', 敬老の日: 'Respect for the Aged Day', 秋分の日: 'Autumnal Equinox Day', スポーツの日: 'Sports Day', 文化の日: 'Culture Day', 勤労感謝の日: 'Labor Thanksgiving Day', 休日: 'Substitute / bridge holiday' };
export const holiday = (iso, lang) => { const h = holidayName(iso); return h ? (ja(lang) ? h : HOLIDAY_EN[h] || h) : null; };
const MON_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (m) => MON_LONG[m - 1];
// 英語：Sat, Oct 17 ／ Sat, Oct 17, 2026
export function dlabel(iso, lang, { year = false } = {}) {
  const d = parseYmd(iso);
  if (ja(lang)) return `${year ? d.getUTCFullYear() + '年' : ''}${d.getUTCMonth() + 1}月${d.getUTCDate()}日（${'日月火水木金土'[d.getUTCDay()]}）`;
  return `${WD_EN[d.getUTCDay()]}, ${MON_EN[d.getUTCMonth()].charAt(0)}${MON_EN[d.getUTCMonth()].slice(1).toLowerCase()} ${d.getUTCDate()}${year ? `, ${d.getUTCFullYear()}` : ''}`;
}
export const monthHead = (m, n, lang) => (ja(lang) ? `${+m.slice(0, 4)}年${+m.slice(5)}月（${n}件）` : `${monthName(+m.slice(5))} ${m.slice(0, 4)} (${n})`);
export const monthTitle = (m, lang) => (ja(lang) ? `${+m.slice(0, 4)}年${+m.slice(5)}月` : `${monthName(+m.slice(5))} ${m.slice(0, 4)}`);

// ---- 開催のきまり（英語）：構造化したきまりから作る。公式の書き方は、詳細ページに日本語のまま添える ----
const ORD = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', '-1': 'last' };
const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ordDay = (d) => `${d}${d % 100 >= 11 && d % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[d % 10] || 'th')}`;
const list = (a) => (a.length <= 1 ? a.join('') : `${a.slice(0, -1).join(', ')} & ${a.at(-1)}`);
export function recurEn(r) {
  let t;
  if (r.type === 'monthly-nth') {
    const byWd = new Map();
    for (const { n, wd } of r.byday) byWd.set(wd, [...(byWd.get(wd) || []), n]);
    t = [...byWd].map(([wd, ns]) => `${list(ns.map((n) => ORD[n]))} ${WD_LONG[wd]}`).join(' and ') + ' of every month';
  } else if (r.type === 'monthly-day') t = `${list(r.days.map(ordDay))} of every month`;
  else if (r.type === 'weekly') t = `Every ${list(r.weekdays.map((w) => WD_LONG[w]))}`;
  else return '';
  if (r.exceptMonths?.length) t += ` (except ${list(r.exceptMonths.map(monthName))})`;
  return t.charAt(0).toUpperCase() + t.slice(1);
}
// 一覧・検索の札に出すきまり。dates 型は、日付そのものが一覧にあるので出さない
export const recurTag = (r, lang) => (ja(lang) ? (r.type !== 'dates' ? r.text : '') : recurEn(r));

// ---- ページの文言 ----
export const DISCLAIMER_JA = '開催の有無・内容は、変わることがあります。お出かけ・お申込みの前に、必ず主催者の公式情報でご確認ください。';
export const DISCLAIMER_EN = 'Events can change or be cancelled. Please check the organizer’s official information before you go or apply.';
export const disclaimer = (lang) => (ja(lang) ? DISCLAIMER_JA : DISCLAIMER_EN);
export const TBC = (lang) => `<span class="tbd">${ja(lang) ? '要確認' : 'TBC'}</span>`;

export const P = {
  ja: {
    home: 'トップ', crumbsLabel: '現在地', titleSep: '｜',
    stripAria: '日付から探す', none: 'なし', cnt: (n) => `${n}件`,
    evEmpty: 'この条件の掲載は、まだありません。', soon: '掲載の準備中です。',
    weekend: { title: (a, b) => `今週末のフリマ・蚤の市（${a}${b ? `〜${b}` : ''}）`, crumb: '今週末', lead: '土日・祝日の開催です。', desc: (t) => `${t}。主催者・自治体の公式情報をもとに、毎朝更新しています。` },
    date: { h1: (d, h) => `${d}${h ? `・${h}` : ''}の開催`, h1Past: (d, h) => `${d}${h ? `・${h}` : ''}の開催（過去の記録）`, pastNote: '開催前に公式で確認していた回の記録です。開催後に実施を確認したものではありません。', crumb: 'カレンダー' },
    cal: { pastH: '過去の記録', pastLead: 'このサイトに記録した、過去の開催です（公式で確認していた回・中止・延期。きまりから算出しただけの回は載せていません）。', h1: '開催カレンダー', lead: (n) => `今日から${n}日間の開催を、日付の順に並べています。`, desc: 'フリマ・蚤の市・骨董市・手作り市の開催を、日付の順に。主催者・自治体の公式情報をもとに毎朝更新。' },
    area: { h1: '地域から探す', crumb: '地域', crumbPref: '地域', lead: '掲載のある都道府県です。東京都から掲載を始め、少しずつ広げています。', desc: '都道府県・市区町村から、フリマ・蚤の市・骨董市の開催を探せます。', n: (n, d) => `今後${d}日に ${n}件`, byCity: '市区町村から', list: '開催の一覧', prefH1: (p) => `${p}のフリマ・蚤の市・骨董市`, cityH1: (c, p) => `${c}（${p}）のフリマ・蚤の市・骨董市` },
    kind: { h1: '種類から探す', crumb: '種類', listH1: (n) => `${n}の開催` },
    listDesc: (h) => `${h}。主催者・自治体の公式情報をもとに、毎朝更新しています。`,
    series: {
      secInfo: '開催の情報', secDates: 'これからの開催日', secPast: '過去の開催（記録）', secVendor: '出店したい方へ', secSrc: '出典',
      when: '開催日', time: '時間', venue: '会場', address: '所在地', access: 'アクセス', admission: '入場料', rain: '雨天のとき', org: '主催',
      next: '次の開催', checked: '最終確認', noDates: '今後の開催日は、公式の情報で確認できていません（要確認）。',
      noVendor: '出店の募集について、公式の情報で確認できていません（要確認）。',
      fee: '出店料', apply: '申込み方法', applyAt: '申込み先', applyLink: '主催者の案内（公式）', notes: '注意',
      rule: (t) => `「予定（きまりから算出）」は、公式に書かれた開催のきまり（${t}）から計算した日です。`,
      title: (n, p, c) => `${n}（${p}${c || ''}）`,
      desc: (n, t, d) => `${n}の開催日（${t}）・時間・会場・出店の情報。主催者の公式情報をもとに掲載（最終確認 ${d}）。`,
      orgLabel: (l) => l, quoted: '',
      est: '目安', estTitle: '公式ページに記載がないため、このサイトの目安です（確認は公式ページで）', estFree: '多くのフリーマーケット・市は入場無料です（この催しについては公式に記載なし）', estAddr: (a) => `${a}（番地は要確認）`, estAddrGeo: (a) => `${a}付近（会場名から地図で調べた位置。番地は要確認）`, addrSearched: '会場名から調べた住所（公式ページの記載ではありません）', accessSearched: '会場名から調べたアクセス（公式ページの記載ではありません。出発前に要確認）', mapPin: '公式ページに住所がないため、会場名で地図（OpenStreetMap）を調べた位置（目安）で開きます。', estStation: (st) => `${st}の駅前（会場名から。徒歩時間などは要確認）`, estRoute: '右の「ここへの経路を調べる」で、現在地からの行き方を確認できます',
      mapImgAlt: (n) => `${n}の周辺の地図（OpenStreetMap）`, mapApproxName: '位置は、会場名から地図で調べた目安です（公式に住所の記載なし）。地図（© OpenStreetMap contributors）を押すと、Google マップで開きます。', mapApproxSearch: '位置は、会場名から調べた住所で求めた目安です（公式に住所の記載なし）。地図（© OpenStreetMap contributors）を押すと、Google マップで開きます。', mapSearched: '公式に住所の記載がないため、会場名から調べた住所で検索します。', mapApprox: '位置は、公式の所在地から求めた目安です。地図（© OpenStreetMap contributors）を押すと、Google マップで開きます。',
      mapShow: '地図を表示する', mapPrivacy: '押すと Google マップを読み込みます。', secMap: '地図・行き方', mapOpen: 'Google マップで開く', mapOpenShort: '地図で開く', mapRouteShort: '経路を調べる', mapRoute: 'ここへの経路を調べる（公共交通）', mapExact: '公式に書かれた所在地で検索します。', mapLoose: '公式に所在地の記載がないため、会場名と市区町村で検索します（位置は要確認）。',
      secWx: '当日の天気予報', wxLoading: '読み込み中…', wxSrc: '出典：', wxJma: '気象庁', wxNote: '予報区は気象庁の地域単位で、会場ごとの予報ではありません。開催するかどうかは、公式の情報でご確認ください。',
    },
    shuten: { h1: '出店したい方へ', crumb: '出店したい方', lead: '出店料・申込み方法を、主催者の公式情報から掲載しています。募集の状況は変わるため、必ず主催者の案内をご確認ください。', desc: 'フリマ・蚤の市・骨董市の出店料・申込み方法を、主催者の公式情報からまとめています。', title: '出店者向けの情報', fee: '出店料：', apply: '申込み：', empty: '出店者向けの情報は、準備中です。' },
    search: { h1: 'キーワードで探す', ph: '地名・会場名・種類（例：骨董市、千代田区）', kw: 'キーワード', btn: '探す', desc: '地名・会場名・種類から、フリマ・蚤の市・骨董市の開催を探せます。' },
    side: { browse: 'サイトを見る', browseAria: 'サイト内の主なページ', dates: '開催のある日', areas: '地域から', cities: '市区町村', types: '種類から', pref: '都道府県', removeReq: '掲載の修正・削除の依頼', n: (n) => `${n}件` },
    nf: { title: 'ページが見つかりません', lead: '開催が終わったか、ページが移動した可能性があります。', back: 'トップへ' },
  },
  en: {
    home: 'Home', crumbsLabel: 'Breadcrumb', titleSep: ' | ',
    stripAria: 'Browse by date', none: 'None', cnt: (n) => `${n}`,
    evEmpty: 'Nothing is listed for this yet.', soon: 'Listings are coming soon.',
    weekend: { title: (a, b) => `This weekend’s markets (${a}${b ? ` – ${b}` : ''})`, crumb: 'This Weekend', lead: 'Markets on Saturdays, Sundays and public holidays.', desc: (t) => `${t}. Flea markets, antique fairs and handmade markets from official sources, updated every morning.` },
    date: { h1: (d, h) => `Markets on ${d}${h ? ` (${h})` : ''}`, h1Past: (d, h) => `Markets on ${d}${h ? ` (${h})` : ''} (past record)`, pastNote: 'These were listed as confirmed on official sources before the event. We have not verified that they actually took place.', crumb: 'Calendar' },
    cal: { pastH: 'Past records', pastLead: 'Past dates recorded on this site (those confirmed on official sources, cancelled or postponed; dates derived only from a recurring rule are not kept).', h1: 'Event Calendar', lead: (n) => `Markets for the next ${n} days, in date order.`, desc: 'Flea markets, antique fairs and handmade markets in date order, from official organizer and municipal sources. Updated every morning.' },
    area: { h1: 'Explore by Area', crumb: 'Areas', crumbPref: 'Areas', lead: 'Prefectures with listings. We started with Tokyo and are expanding gradually.', desc: 'Find flea markets, antique fairs and handmade markets by prefecture and city.', n: (n, d) => `${n} in the next ${d} days`, byCity: 'By city / ward', list: 'Events', prefH1: (p) => `Flea markets & antique fairs in ${p}`, cityH1: (c, p) => `Flea markets & antique fairs in ${c} (${p})` },
    kind: { h1: 'Explore by Type', crumb: 'Types', listH1: (n) => `${n} events` },
    listDesc: (h) => `${h}. From official organizer and municipal sources, updated every morning.`,
    series: {
      secInfo: 'Event details', secDates: 'Upcoming dates', secPast: 'Past dates (record)', secVendor: 'For vendors', secSrc: 'Sources',
      when: 'Schedule', time: 'Time', venue: 'Venue', address: 'Address', access: 'Access', admission: 'Admission', rain: 'In rain', org: 'Organizer',
      next: 'Next', checked: 'last checked', noDates: 'No upcoming dates are confirmed from official sources (TBC).',
      noVendor: 'Stall recruitment is not confirmed from official sources (TBC).',
      fee: 'Stall fee', apply: 'How to apply', applyAt: 'Apply at', applyLink: 'Organizer’s page (official)', notes: 'Notes',
      rule: (t) => `“Scheduled” dates are calculated from the recurrence rule stated officially (${t}).`,
      title: (n, p, c) => `${n} (${p}${c ? `, ${c}` : ''})`,
      desc: (n, t, d) => `Dates (${t}), time, venue and vendor information for ${n}, from the organizer’s official information (last checked ${d}).`,
      orgLabel: (l) => (l === '問い合わせ先' ? 'Contact' : l),
      est: 'Estimate', estTitle: 'Not stated on the official page; this site’s estimate (please check the official page)', estFree: 'Most flea markets and fairs are free to enter (not stated officially for this event)', estAddr: (a) => `${a} (street address TBC)`, estAddrGeo: (a) => `Near ${a} (located from the venue name on a map; street address TBC)`, addrSearched: 'Looked up from the venue name (not stated on the official page)', accessSearched: 'Looked up from the venue name (not stated on the official page; please check before you go)', mapPin: 'The official page gives no address, so this opens a location found from the venue name on a map (OpenStreetMap), as an estimate.', estStation: (st) => `In front of ${st} (from the venue name; walking time TBC)`, estRoute: 'Use “Get directions here” on the right to see how to get there from your location',
      mapImgAlt: (n) => `Map around ${n} (OpenStreetMap)`, mapApproxName: 'The position is an estimate found from the venue name on a map (no address on the official page). Press the map (© OpenStreetMap contributors) to open it in Google Maps.', mapApproxSearch: 'The position is an estimate from an address looked up by the venue name (no address on the official page). Press the map (© OpenStreetMap contributors) to open it in Google Maps.', mapSearched: 'The official page gives no address, so this searches by an address looked up from the venue name.', mapApprox: 'The position is an estimate from the officially stated address. Press the map (© OpenStreetMap contributors) to open it in Google Maps.',
      mapShow: 'Show map', mapPrivacy: 'Loads Google Maps when you press the button.', secMap: 'Map & directions', mapOpen: 'Open in Google Maps', mapOpenShort: 'Open map', mapRouteShort: 'Directions', mapRoute: 'Get directions here (public transport)', mapExact: 'Searches by the address stated officially.', mapLoose: 'The official page gives no address, so this searches by venue name and city (location TBC).',
      secWx: 'Weather forecast for the day', wxLoading: 'Loading…', wxSrc: 'Source: ', wxJma: 'Japan Meteorological Agency', wxNote: 'The forecast area is a JMA regional unit, not a forecast for the venue. Whether the market goes ahead is decided by the official information.',
      quoted: 'English text on this page is this site’s unofficial translation. The official Japanese wording is shown in small type under each item. Where an official English name exists, we use it. If they differ, the official Japanese page applies.',
    },
    shuten: { h1: 'For Vendors', crumb: 'For Vendors', lead: 'Stall fees and how to apply, taken from organizers’ official information. Recruitment can change, so please check the organizer’s notice.', desc: 'Stall fees and how to apply for flea markets and antique fairs, from organizers’ official information.', title: 'For Vendors', fee: 'Fee: ', apply: 'How to apply: ', empty: 'Vendor information is coming soon.' },
    search: { h1: 'Keyword Search', ph: 'Place, venue or type (e.g. antique, Chiyoda)', kw: 'Keyword', btn: 'Search', desc: 'Find flea markets, antique fairs and handmade markets by place, venue or type.' },
    side: { browse: 'Browse the site', browseAria: 'Main pages', dates: 'Dates with markets', areas: 'By area', cities: 'Cities / wards', types: 'By type', pref: 'Prefectures', removeReq: 'Correction / removal requests', n: (n) => `${n}` },
    nf: { title: 'Page not found', lead: 'The event may have ended, or the page may have moved.', back: 'Back to the top' },
  },
};

export { S };
