// 今週末の予定を、Facebook ページに英語で投稿する（毎週水曜。.github/workflows/facebook-weekly.yml）。
// 本文は、掲載データの事実だけを型にはめて作る（AI が自由に書かない）。開催がない週は投稿しない。
// 使い方: node scripts/facebook-post.mjs [--today=YYYY-MM-DD] [--dry-run]
//   FB_PAGE_ID と FB_PAGE_TOKEN（GitHub の Secrets）が両方あり、--dry-run でなければ投稿する。なければ本文を表示するだけ。
import { fileURLToPath } from 'node:url';
import { todayJst, upcomingWeekend } from './lib/dates.mjs';
import { buildOccurrences, isActive } from './lib/events.mjs';
import { setTranslations, cityL, nameL, timeEn, venueL } from './lib/tr-en.mjs';
import { dlabel, prefLabel } from './lib/l10n.mjs';
import { SITE } from './lib/nav.mjs';
import { loadData } from './build-site.mjs';

const MAX_ITEMS = 6;
const short = (t) => String(t).replace(/\s*[（(].*$/, '');
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const range = (days) => {
  const [, m1, d1] = days[0].split('-').map(Number);
  const [, m2, d2] = days.at(-1).split('-').map(Number);
  return days.length === 1 ? `${MON[m1 - 1]} ${d1}` : m1 === m2 ? `${MON[m1 - 1]} ${d1}–${d2}` : `${MON[m1 - 1]} ${d1} – ${MON[m2 - 1]} ${d2}`;
};

export function buildPost(data, today) {
  setTranslations(data.translations);
  const days = upcomingWeekend(today);
  const occ = buildOccurrences(data.series, data.occurrences, today).filter((o) => days.includes(o.date) && o.series.venue.pref && isActive(o));
  if (!occ.length) return null;
  // 公式で確認した回・観光客の多い地域を先に。同じ都道府県が続かないよう、県ごとに順番に1件ずつ選ぶ
  const TOURIST = ['13', '27', '26']; // 訪日客の多い東京・大阪・京都を先に
  const rank = (o) => (o.status === 'confirmed' ? 0 : 2) + (TOURIST.includes(o.series.venue.pref) ? 0 : 1);
  const byPref = new Map();
  for (const o of [...occ].sort((a, b) => rank(a) - rank(b) || a.series.id.localeCompare(b.series.id))) {
    const k = o.series.venue.pref;
    byPref.set(k, [...(byPref.get(k) || []), o]);
  }
  const picked = [];
  for (let i = 0; picked.length < MAX_ITEMS; i++) {
    let any = false;
    for (const list of byPref.values()) if (list[i] && picked.length < MAX_ITEMS) { picked.push(list[i]); any = true; }
    if (!any) break;
  }
  picked.sort((a, b) => a.date.localeCompare(b.date) || a.series.venue.pref.localeCompare(b.series.venue.pref));
  const conf = occ.filter((o) => o.status === 'confirmed').length;
  const lines = picked.map((o) => {
    const s = o.series;
    const place = [cityL(s.venue.city, 'en') || prefLabel(s.venue.pref, 'en'), short(venueL(s, 'en'))].filter(Boolean).join(', ');
    const time = short(timeEn(s) || '');
    return `• ${dlabel(o.date, 'en')}: ${short(nameL(s, 'en'))} (${place}${time ? `, ${time}` : ''})`;
  });
  const n = occ.length;
  const text = [
    `This weekend in Japan (${range(days)}): ${n} flea market${n === 1 ? '' : 's'} & fair${n === 1 ? '' : 's'} listed 🎒`,
    '',
    ...lines,
    ...(n > picked.length ? [`…and ${n - picked.length} more.`] : []),
    '',
    `${conf} of ${n} confirmed from the organizers’ official pages; the rest follow their recurring schedules. Events can change or be cancelled, so please check before you go.`,
  ].join('\n');
  return { text, link: `${SITE.url}/weekend/`, days, count: n };
}

async function post({ text, link }) {
  const id = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  const res = await fetch(`https://graph.facebook.com/v21.0/${encodeURIComponent(id)}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message: text, link, access_token: token }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Facebook への投稿に失敗: HTTP ${res.status} ${body?.error?.message || ''}`);
  return body.id;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  const p = buildPost(loadData(), arg('today') || todayJst());
  if (!p) { console.log('今週末の開催がないので、投稿しません。'); process.exit(0); }
  console.log(`${p.text}\n\n(link: ${p.link})\n`);
  if (process.argv.includes('--dry-run') || !process.env.FB_PAGE_ID || !process.env.FB_PAGE_TOKEN) {
    console.log('投稿はしていません（試運転、または FB_PAGE_ID・FB_PAGE_TOKEN が未設定）。');
  } else {
    console.log('投稿しました：', await post(p));
  }
}
