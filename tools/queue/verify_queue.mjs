import { readFileSync, readdirSync } from 'node:fs';
import { get, sleep } from '../../scripts/check-sources.mjs';
import { checkEvidence } from '../../scripts/lib/text.mjs';
import { htmlToText } from '../../scripts/lib/text.mjs';
const dir = (process.env.QUEUE_WORK || process.cwd()) + '/out/';
const jobs = [];
for (const f of readdirSync(dir).filter((f) => /^queue-\d\.json$/.test(f))) for (const x of JSON.parse(readFileSync(dir + f, 'utf8'))) {
  for (const a of x.addDates || []) jobs.push([x.id, a.url, a.evidence]);
  for (const n of x.newSeries || []) for (const s of n.sources) jobs.push([n.id, s.url, s.evidence]);
  for (const u of x.occurrenceUpdates || []) jobs.push([x.id + ':' + u.date, u.url, u.evidence]);
}
let last = 0;
for (const [id, url, ev] of jobs) { const w = 5200 - (Date.now() - last); if (w > 0) await sleep(w); const r = await get(url); last = Date.now(); const text = r.status === 200 ? r.text : ''; console.log(id, url, r.status, JSON.stringify(checkEvidence(text, ev))); }
