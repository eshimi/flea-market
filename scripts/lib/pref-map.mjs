// 記事用の小さな地図（ビルド時に作る固定の SVG）。その都道府県の形を強調し、記事に載せた市のピンだけを置く。路線は出さない。
// 位置は data/geo.json（公式の住所などから求めた目安）。位置のない市は、ピンを置かず、下の一覧にだけ載せる。
import { MAP_PREFS, MAP_VIEWBOX } from './japan-map.mjs';
import { esc } from './html.mjs';

const PIN = 'M0 0c-5.6-7.4-8.6-11.4-8.6-15.9a8.6 8.6 0 1 1 17.2 0c0 4.5-3 8.5-8.6 15.9z';
const PROJ = { ax: 17.6, bx: -2182, ay: -20, by: 936 };
export const project = (lat, lon) => [PROJ.ax * lon + PROJ.bx, PROJ.ay * lat + PROJ.by];

// path の d（絶対座標の M/L/Z）から、外枠を求める
function bbox(d) {
  const nums = d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i + 1 < nums.length; i += 2) { x0 = Math.min(x0, nums[i]); x1 = Math.max(x1, nums[i]); y0 = Math.min(y0, nums[i + 1]); y1 = Math.max(y1, nums[i + 1]); }
  return [x0, y0, x1, y1];
}

// items: [{ id, name, lat, lon, approx }]（位置のあるものだけ）。rest: 位置のない市の名前（リンクつき）
export function prefMapHtml({ pref, items, rest = [], lang, text }) {
  const p = MAP_PREFS[pref];
  if (!p || !items.length) return '';
  const [px0, py0, px1, py1] = bbox(p.d);
  const pts = items.map((it) => project(it.lat, it.lon));
  const x0 = Math.min(px0, ...pts.map((q) => q[0])), x1 = Math.max(px1, ...pts.map((q) => q[0]));
  const y0 = Math.min(py0, ...pts.map((q) => q[1])), y1 = Math.max(py1, ...pts.map((q) => q[1]));
  // 表示は 4:3。都道府県の外枠に余白をつける（北海道のように大きいものも、全体が入る）
  const asp = 4 / 3;
  let w = (x1 - x0) * 1.18 + 4, h = (y1 - y0) * 1.18 + 4;
  if (w / h < asp) w = h * asp; else h = w / asp;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const vb = `${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`;
  const k = 640 / w; // 画面の px / SVG の単位
  const others = Object.entries(MAP_PREFS).filter(([c]) => c !== pref).map(([, v]) => `<path d="${v.d}"/>`).join('');
  const name = lang === 'en' ? p.en.normalize('NFD').replace(/[̀-ͯ]/g, '') : p.name;
  const pins = items.map((it, i) => {
    const [x, y] = pts[i];
    return `<g class="pmm-g" style="transform:translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(calc(var(--b) * var(--m)))"><path class="pmm-pin" d="${PIN}"/><circle class="pmm-dot" cx="0" cy="-15.6" r="6.2"/><text class="pmm-n" y="-12.6" text-anchor="middle">${i + 1}</text></g>`;
  }).join('');
  const li = items.map((it, i) => `<li><span class="pmm-b">${i + 1}</span><a href="/e/${it.id}/">${esc(it.name)}</a>${it.approx ? `<small>${esc(text.approx)}</small>` : ''}</li>`).join('')
    + rest.map((it) => `<li><span class="pmm-b pmm-b0">–</span><a href="/e/${it.id}/">${esc(it.name)}</a><small>${esc(text.noPos)}</small></li>`).join('');
  return `<figure class="pmm" aria-label="${esc(text.aria(name))}">
<svg viewBox="${vb}" style="--b:${(1 / k).toFixed(5)}" role="img" aria-label="${esc(text.aria(name))}" focusable="false" preserveAspectRatio="xMidYMid meet">
<rect class="pmm-sea" x="-400" y="-400" width="1200" height="1200"/>
<g class="pmm-others">${others}</g>
<path class="pmm-pref" d="${p.d}"/>
${pins}
</svg>
<figcaption><ol class="pmm-list">${li}</ol><p class="pmm-links"><a href="/map/?pref=${pref}">${esc(text.full(name))} →</a></p><p class="pmm-note">${esc(text.note)}</p></figcaption>
</figure>`;
}
