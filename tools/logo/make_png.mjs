// static/favicon.svg から、PNG（32・180・192・512）と favicon.ico を作る（Chromium で描画。作業用、1回だけ実行）
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'static');
const svg = readFileSync(join(ROOT, 'favicon.svg'), 'utf8');
const b = await chromium.launch();
for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['favicon-192.png', 192], ['favicon-512.png', 512]]) {
  const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: join(ROOT, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await p.close();
}
await b.close();
console.log('png ok');
