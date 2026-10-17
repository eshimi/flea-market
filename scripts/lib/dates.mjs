// 日付は、日本時間の暦日を 'YYYY-MM-DD' の文字列で持つ。計算は UTC の 0 時として行う（時差・夏時間の影響を受けない）。

export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`日付の形式が違います: ${s}`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (fmt(d) !== s) throw new Error(`存在しない日付です: ${s}`);
  return d;
}

export function fmt(d) {
  return d.toISOString().slice(0, 10);
}

export function addDays(s, n) {
  const d = parseYmd(s);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

export function weekday(s) {
  return parseYmd(s).getUTCDay();
}

export function diffDays(a, b) {
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
}

// 日本時間の今日
export function todayJst(now = new Date()) {
  return fmt(new Date(now.getTime() + 9 * 3600000));
}

export function ymd(y, m, d) {
  return fmt(new Date(Date.UTC(y, m - 1, d)));
}

export function daysInMonth(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 第 n 週の曜日（n = -1 は最終）。その月にないときは null
export function nthWeekday(y, m, n, wd) {
  if (n > 0) {
    const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
    const day = 1 + ((wd - first + 7) % 7) + (n - 1) * 7;
    return day <= daysInMonth(y, m) ? ymd(y, m, day) : null;
  }
  const last = daysInMonth(y, m);
  const lastWd = new Date(Date.UTC(y, m - 1, last)).getUTCDay();
  return ymd(y, m, last - ((lastWd - wd + 7) % 7));
}

export function label(s, { year = false } = {}) {
  const d = parseYmd(s);
  const md = `${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
  return `${year ? d.getUTCFullYear() + '年' : ''}${md}（${WEEKDAYS[d.getUTCDay()]}）`;
}

// ---- 国民の祝日（「国民の祝日に関する法律」の現行の定め。春分・秋分は 1980〜2099 年の近似式） ----
const cache = new Map();

function equinox(y, base) {
  return Math.floor(base + 0.242194 * (y - 1980) - Math.floor((y - 1980) / 4));
}

export function holidays(y) {
  if (cache.has(y)) return cache.get(y);
  const h = new Map();
  const add = (s, name) => s && h.set(s, name);
  add(ymd(y, 1, 1), '元日');
  add(nthWeekday(y, 1, 2, 1), '成人の日');
  add(ymd(y, 2, 11), '建国記念の日');
  add(ymd(y, 2, 23), '天皇誕生日');
  add(ymd(y, 3, equinox(y, 20.8431)), '春分の日');
  add(ymd(y, 4, 29), '昭和の日');
  add(ymd(y, 5, 3), '憲法記念日');
  add(ymd(y, 5, 4), 'みどりの日');
  add(ymd(y, 5, 5), 'こどもの日');
  add(nthWeekday(y, 7, 3, 1), '海の日');
  add(ymd(y, 8, 11), '山の日');
  add(nthWeekday(y, 9, 3, 1), '敬老の日');
  add(ymd(y, 9, equinox(y, 23.2488)), '秋分の日');
  add(nthWeekday(y, 10, 2, 1), 'スポーツの日');
  add(ymd(y, 11, 3), '文化の日');
  add(ymd(y, 11, 23), '勤労感謝の日');
  const base = [...h.keys()].sort();
  // 振替休日：祝日が日曜なら、その後の最初の平日（祝日でない日）
  for (const s of base) {
    if (weekday(s) !== 0) continue;
    let t = addDays(s, 1);
    while (h.has(t)) t = addDays(t, 1);
    h.set(t, '休日');
  }
  // 国民の休日：前後が祝日の平日
  for (const s of base) {
    const mid = addDays(s, 1);
    if (!h.has(mid) && h.has(addDays(s, 2)) && weekday(mid) !== 0) h.set(mid, '休日');
  }
  cache.set(y, h);
  return h;
}

export function holidayName(s) {
  return holidays(parseYmd(s).getUTCFullYear()).get(s) || null;
}

// 土日・祝日
export function isDayOff(s) {
  const wd = weekday(s);
  return wd === 0 || wd === 6 || holidayName(s) !== null;
}

// 「今週末」：今日以降で最初に来る、連続した休みの日（土日・祝日）の並び。今日が休みなら、今日から
export function upcomingWeekend(today) {
  let s = today;
  while (!isDayOff(s)) s = addDays(s, 1);
  const out = [];
  while (isDayOff(s)) {
    out.push(s);
    s = addDays(s, 1);
  }
  return out;
}
