// 使い方: node peek.mjs <URL> [出力名]  … robots.txt を確かめ、許可なら本文を pages/<名>.txt に保存
import { writeFileSync } from 'node:fs';
import { isAllowed } from '/home/user/flea-market/scripts/lib/robots.mjs';
import { decodeBody, htmlToText } from '/home/user/flea-market/scripts/lib/text.mjs';
import { USER_AGENT } from '/home/user/flea-market/scripts/check-sources.mjs';
const [url, name] = process.argv.slice(2);
const u = new URL(url);
const get = async (x) => { try { const r = await fetch(x, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(30000) }); return { s: r.status, t: decodeBody(await r.arrayBuffer(), r.headers.get('content-type') || ''), final: r.url }; } catch (e) { return { s: 0, t: '', e: e.cause?.code || e.message }; } };
const rb = await get(u.origin + '/robots.txt');
const robots = rb.s === 200 ? rb.t : rb.s >= 400 && rb.s < 500 ? '' : null;
if (robots === null) { console.log(`robots.txt に届かない (${rb.s} ${rb.e || ''}) → 取得しない`); process.exit(); }
const ok = isAllowed(robots, u.pathname + u.search);
console.log(`robots.txt: ${rb.s} → ${ok ? '許可' : '禁止'}`);
if (!ok) process.exit();
await new Promise((r) => setTimeout(r, 2000));
const p = await get(url);
const text = htmlToText(p.t).split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
console.log(`ページ: ${p.s} ${p.final || ''} ${p.e || ''} 本文 ${text.length} 字`);
if (name) {
  writeFileSync(new URL(`../pages/${name}.txt`, import.meta.url), text);
  const links = [...p.t.matchAll(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map((m) => { try { return `${new URL(m[1], p.final || url).href}\t${htmlToText(m[2]).replace(/\s+/g, ' ').trim()}`; } catch { return ''; } }).filter(Boolean);
  writeFileSync(new URL(`../pages/${name}.links`, import.meta.url), [...new Set(links)].join('\n'));
}
