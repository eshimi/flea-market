// 自作のイラスト（SVG）。写真とは別の、装飾用。権利の問題がないよう、図形だけで描いている。
export function skylineSvg() {
  const bld = [[8, 34, 58], [40, 28, 82], [70, 36, 46], [104, 24, 70]]
    .map(([x, w, h], i) => `<rect x="${x}" y="${118 - h}" width="${w}" height="${h}" fill="${i % 2 ? '#a9b9d0' : '#bac8db'}"/>`).join('');
  const tower = '<path d="M146 118 158 30 170 118z" fill="#d9573f"/><path d="M151 92h14M153.500 70h11M155.500 52h7" stroke="#fff" stroke-width="3"/><path d="M158 30V10" stroke="#d9573f" stroke-width="2.500"/>';
  const tiers = [0, 1, 2, 3, 4].map((i) => {
    const w = 62 - i * 9; const y = 118 - (i + 1) * 17; const x = 292 - w / 2;
    return `<rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="11" fill="#e2cfae"/><path d="M${x - 5} ${y + 8} ${x + 8} ${y} h${w - 16} l${13} 8z" fill="#9a3b2e"/>`;
  }).join('');
  const pagoda = `${tiers}<path d="M292 33V16" stroke="#9a3b2e" stroke-width="2.500"/>`;
  const torii = '<rect x="372" y="64" width="9" height="54" fill="#d4452f"/><rect x="408" y="64" width="9" height="54" fill="#d4452f"/><path d="M362 62h64l-4 8H366z" fill="#c23a27"/><rect x="371" y="80" width="48" height="6" fill="#d4452f"/>';
  const fuji = '<path d="M430 118 520 28 610 118z" fill="#9db3cf"/><path d="M500 52 520 28l20 24-9-4-11 8-11-8z" fill="#fff"/>';
  const trees = [[236, 104], [344, 108], [440, 110], [588, 108], [210, 110]].map(([x, y]) => `<circle cx="${x}" cy="${y - 8}" r="11" fill="#86b17c"/><rect x="${x - 1.500}" y="${y}" width="3" height="${118 - y}" fill="#7a6248"/>`).join('');
  return `<svg class="skyline" viewBox="0 0 640 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${fuji}${bld}${tower}${pagoda}${torii}${trees}<rect y="118" width="640" height="12" fill="#e6dcc6"/></svg>`;
}
