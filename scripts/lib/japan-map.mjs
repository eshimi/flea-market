// 日本地図（都道府県の形）。元データ：Natural Earth（パブリックドメイン）を簡略化した data/japan-prefs.json。
// 掲載のある都道府県だけ、色をつけて /area/<コード>/ へのリンクにする。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { esc } from './html.mjs';

const DATA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data', 'japan-prefs.json'), 'utf8'));
export const MAP_PREFS = DATA.prefs; // { '13': { name: '東京都', en: 'Tokyo', d, c } }

// counts: Map<都道府県コード, 件数>。label: 言語ごとの aria 説明。countText: (n) => '5件'
export function renderMap(counts, { aria, countText, lang = 'ja' }) {
  const entries = Object.entries(MAP_PREFS);
  const off = entries.filter(([c]) => !counts.has(c)).map(([c, v]) => `<path class="pm-off" d="${v.d}"/>`).join('');
  const on = entries.filter(([c]) => counts.has(c)).map(([c, v]) => {
    const name = lang === 'en' ? v.en : v.name;
    return `<a href="/area/${c}/" aria-label="${esc(name)}（${esc(countText(counts.get(c)))}）"><title>${esc(name)}　${esc(countText(counts.get(c)))}</title><path class="pm-on" d="${v.d}"/></a>`;
  }).join('');
  return `<svg class="jmap" viewBox="${DATA.viewBox}" role="group" aria-label="${esc(aria)}" focusable="false">${off}${on}</svg>`;
}
