// JavaScript で本文を組み立てるページ（Peatix の開催ページなど）を、ブラウザで開いて本文を取る。
// 使うのは、台帳（data/sources.json）で terms.ok:true にしたものだけ。robots.txt・間隔・1日1回は check-sources.mjs 側で守る。
// Playwright が入っていない環境では、取得しない（status 0・error 'no-browser'）。
import { createRequire } from 'node:module';

export const RENDER_HOSTS = [/(^|\.)peatix\.com$/];
export const needsRender = (url) => { try { const h = new URL(url).hostname; return RENDER_HOSTS.some((re) => re.test(h)); } catch { return false; } };

let browserP = null;
async function loadChromium() {
  const req = createRequire(import.meta.url);
  for (const id of ['playwright', '/opt/node-tools/node_modules/playwright']) {
    try { return req(id).chromium; } catch { /* 次の候補へ */ }
  }
  return null;
}
async function browser() {
  if (!browserP) browserP = (async () => { const c = await loadChromium(); return c ? c.launch() : null; })();
  return browserP;
}
export async function closeBrowser() { if (browserP) { const b = await browserP; browserP = null; if (b) await b.close(); } }

export async function renderGet(url, userAgent) {
  try {
    const b = await browser();
    if (!b) return { status: 0, error: 'no-browser' };
    const ctx = await b.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo', extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9' } });
    // 名乗り（USER_AGENT）は、ブラウザ標準の UA の末尾に足す（標準の UA を丸ごと置き換えると、Peatix は英語の画面を返すため）
    const base = await (await ctx.newPage()).evaluate(() => navigator.userAgent);
    await ctx.close();
    const ctx2 = await b.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo', userAgent: `${base} ${userAgent}`, extraHTTPHeaders: { 'Accept-Language': 'ja-JP,ja;q=0.9' } });
    try {
      const pg = await ctx2.newPage();
      const res = await pg.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
      await pg.waitForTimeout(1500);
      const status = res ? res.status() : 0;
      const text = status === 200 ? await pg.evaluate(() => document.body.innerText) : '';
      return { status, text, pdf: false, rendered: true };
    } finally { await ctx2.close(); }
  } catch (e) {
    return { status: 0, error: e.message?.split('\n')[0] || e.name };
  }
}
