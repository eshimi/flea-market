// 線のアイコン（自作の SVG。24×24 の枠、線の太さ 1.7）。色は currentColor。
const wrap = (inner, size = 22) =>
  `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

const PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.9-4.9"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1"/>',
  store: '<path d="M4 9.5 5.5 4h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8v.2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.6 2.6 3.6 5.4 3.6 8.5s-1 5.9-3.6 8.5c-2.6-2.6-3.6-5.4-3.6-8.5s1-5.9 3.6-8.5z"/>',
  chair: '<path d="M7 4h10v7H7zM6 11h12M8 11v9M16 11v9M8 16h8"/>',
  bowl: '<path d="M3.5 11h17a8.5 7 0 0 1-17 0zM8.5 21h7"/><path d="M7.5 7.5c0-1 1-1.2 1-2.2M12 7.5c0-1 1-1.2 1-2.2M16.5 7.5c0-1 1-1.2 1-2.2"/>',
  shirt: '<path d="M8.5 4 3.5 7.2l2 3.6 2.5-1.2V20h8V9.6l2.5 1.2 2-3.6L15.500 4c-.6 1.700-1.900 2.500-3.500 2.500S9.100 5.700 8.500 4z"/>',
  sprout: '<path d="M12 20v-9"/><path d="M12 11c0-3.800-2.500-5.800-6.500-5.800 0 3.800 2.200 5.800 6.500 5.800zM12 13.500c0-3 2-5 6-5 0 3.200-1.800 5-6 5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
};

export function icon(name, size) {
  if (!PATHS[name]) throw new Error(`アイコンがありません: ${name}`);
  return wrap(PATHS[name], size);
}

// ロゴ（自作：赤い屋根とストライプの日よけがある、市場の露店）
export function logoSvg() {
  const stripes = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${7 + i * 5.5}" y="14" width="5.5" height="8" fill="${i % 2 ? '#fff' : '#c73e2a'}"/>`).join('');
  return `<svg class="logo-svg" viewBox="0 0 48 40" width="44" height="36" aria-hidden="true" focusable="false"><path d="M3 14 24 2l21 12z" fill="#c73e2a"/><g>${stripes}</g><path d="M7 22h34" stroke="#c73e2a" stroke-width="1.5"/><path d="M9 22v14M39 22v14" stroke="#2a2a35" stroke-width="2"/><rect x="9" y="28" width="30" height="8" fill="#fff" stroke="#2a2a35" stroke-width="2"/></svg>`;
}

// 手描き風の、日本列島のシルエット（簡略。仮。地図の本格版は Step 4）
export function japanMark() {
  return '<path d="M61 7l9-3 9 5 4 9-8 3-6-4-6 2-4-6zM70 27l5 8-2 10-7 8-8 4-8 5-8 2-6 5-3-3 6-7 8-4 7-6 4-8 6-9zM36 72l10-2 3 6-8 4-6-3zM14 74l10-2 4 8-4 10-8 2-6-8z" fill="currentColor"/>';
}
