// 今週末の予定を、Facebook ページに英語・日本語で投稿する（毎週金曜の朝 8:00 JST。.github/workflows/facebook-weekly.yml）。
// 本文は、掲載データの事実だけを型にはめて作る（AI が自由に書かない）。開催がない週は投稿しない。
// 使い方: node scripts/facebook-post.mjs [--lang=en|ja|both] [--today=YYYY-MM-DD] [--dry-run]
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

export function buildPost(data, today, lang = 'en') {
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
  // 東京の主要な催し（出店数・注目度の大きいもの）を、最大2件、先に必ず入れる
  const big = (o) => (o.series.scale?.stalls || 0) + (o.series.attention?.volumeMin || 0);
  for (const o of [...occ].filter((x) => x.series.venue.pref === '13').sort((a, b) => big(b) - big(a) || a.series.id.localeCompare(b.series.id)).slice(0, 2)) picked.push(o);
  for (const o of picked) byPref.set('13', (byPref.get('13') || []).filter((x) => x !== o));
  for (let i = 0; picked.length < MAX_ITEMS; i++) {
    let any = false;
    for (const list of byPref.values()) if (list[i] && picked.length < MAX_ITEMS) { picked.push(list[i]); any = true; }
    if (!any) break;
  }
  picked.sort((a, b) => a.date.localeCompare(b.date) || a.series.venue.pref.localeCompare(b.series.venue.pref));
  if (lang === 'ja') return buildPostJa({ occ, picked, days });
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

const WDJ = ['日', '月', '火', '水', '木', '金', '土'];
const dj = (d) => { const [, m, dd] = d.split('-').map(Number); return `${m}/${dd}(${WDJ[new Date(`${d}T00:00:00Z`).getUTCDay()]})`; };
const rangeJa = (days) => (days.length === 1 ? dj(days[0]) : `${dj(days[0])}〜${dj(days.at(-1))}`);
const shortJa = (t) => String(t || '').replace(/\s*[（(].*$/, '');
function buildPostJa({ occ, picked, days }) {
  const conf = occ.filter((o) => o.status === 'confirmed').length;
  const lines = picked.map((o) => {
    const s = o.series;
    const place = [s.venue.city || prefLabel(s.venue.pref, 'ja'), shortJa(s.venue.name)].filter(Boolean).join('・');
    const time = shortJa(s.time?.text);
    return `・${dj(o.date)} ${shortJa(s.name)}（${place}${time ? `、${time}` : ''}）`;
  });
  const n = occ.length;
  const text = [
    `今週末（${rangeJa(days)}）に開催のフリマ・蚤の市・骨董市：全国${n}件 🎒`,
    '',
    ...lines,
    ...(n > picked.length ? [`ほか${n - picked.length}件`] : []),
    '',
    `${n}件のうち${conf}件は、主催者・自治体の公式ページで確認した日程です。残りは開催のきまりから算出した予定です。中止・変更の場合があるので、お出かけ前に公式情報をご確認ください。`,
  ].join('\n');
  return { text, link: `${SITE.url}/ja/weekend/`, days, count: n };
}

async function post({ text, link }) {
  const id = process.env.FB_PAGE_ID;
  const token = process.env.FB_PAGE_TOKEN;
  const res = await fetch(`https://graph.facebook.com/v26.0/${encodeURIComponent(id)}/feed`, {
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
  const data = loadData();
  const langs = (arg('lang') || 'both') === 'both' ? ['en', 'ja'] : [arg('lang')];
  for (const lang of langs) {
    const p = buildPost(data, arg('today') || todayJst(), lang);
    if (!p) { console.log(`[${lang}] 今週末の開催がないので、投稿しません。`); continue; }
    console.log(`[${lang}]\n${p.text}\n\n(link: ${p.link})\n`);
    if (process.argv.includes('--dry-run') || !process.env.FB_PAGE_ID || !process.env.FB_PAGE_TOKEN) {
      console.log('投稿はしていません（試運転、または FB_PAGE_ID・FB_PAGE_TOKEN が未設定）。');
    } else {
      console.log(`[${lang}] 投稿しました：`, await post(p));
    }
  }
}
