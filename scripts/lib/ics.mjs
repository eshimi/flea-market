// 「カレンダーに追加」の .ics（iCalendar）。開催日ごとに1ファイル。ビルドが /ics/<id>-<日付>.ics（日本語は /ja/ics/…）に作る
// 時間は、公式の記載（調べて補ったものは除く）があるときだけ。ないときは終日の予定にする（時間を推測しない）
import { addDays } from './dates.mjs';

export const ICS_PER_SERIES = 3;
export const icsPath = (id, date, lang) => `${lang === 'ja' ? '/ja' : ''}/ics/${id}-${date}.ics`;
// 追加できる開催回：今後の（中止・延期でない）開催の、先の3回
export const icsDates = (list, isActive) => list.filter((o) => isActive(o) && (o.status === 'confirmed' || o.status === 'scheduled')).slice(0, ICS_PER_SERIES);

const esc = (t) => String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const fold = (line) => {
  // 75 バイトを超える行は、折り返す（日本語は1文字3バイトなので、文字ごとに数える）
  const out = []; let cur = ''; let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > 73) { out.push(cur); cur = ' '; bytes = 1; }
    cur += ch; bytes += b;
  }
  out.push(cur);
  return out.join('\r\n');
};
const ymd = (d) => d.replace(/-/g, '');
const utc = (date, hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  let d = date; let hh = h - 9; // 日本時間 → UTC
  if (hh < 0) { hh += 24; d = addDays(date, -1); }
  return `${ymd(d)}T${String(hh).padStart(2, '0')}${String(m).padStart(2, '0')}00Z`;
};

export function icsFor({ series: s, date, status }, { name, venue, address, url, note, stamp }) {
  const timed = s.time?.start && !s.searched?.time;
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Flea Market JP//streetbazaars.jp//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${s.id}-${date}@streetbazaars.jp`, `DTSTAMP:${ymd(stamp)}T000000Z`,
    ...(timed
      ? [`DTSTART:${utc(date, s.time.start)}`, ...(s.time.end ? [`DTEND:${utc(date, s.time.end)}`] : [])]
      : [`DTSTART;VALUE=DATE:${ymd(date)}`, `DTEND;VALUE=DATE:${ymd(addDays(date, 1))}`]),
    `SUMMARY:${esc(name)}`,
    `LOCATION:${esc([venue, address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${esc(`${note}\n${url}`)}`,
    `URL:${url}`,
    `STATUS:${status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'}`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
