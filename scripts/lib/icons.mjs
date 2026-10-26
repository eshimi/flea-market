// 線のアイコン（自作の SVG。24×24 の枠、線の太さ 1.7）。色は currentColor。
const wrap = (inner, size = 22) =>
  `<svg class="ic" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;

const PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.9-4.9"/>',
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  heart: '<path d="M12 20.2s-7.7-4.7-7.7-10.4A4.5 4.5 0 0 1 12 6.9a4.5 4.5 0 0 1 7.7 2.9c0 5.7-7.7 10.4-7.7 10.4z"/>',
  share: '<circle cx="6" cy="12" r="2.4"/><circle cx="17.5" cy="6" r="2.4"/><circle cx="17.5" cy="18" r="2.4"/><path d="m8.2 10.8 7.1-3.6M8.2 13.2l7.1 3.6"/>',
  calplus: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4M12 12.5v5M9.5 15h5"/>',
  facebook: '<path d="M14 21v-7.5h2.6l.5-3H14V8.7c0-.9.4-1.5 1.6-1.5h1.6V4.5c-.4 0-1.4-.2-2.5-.2-2.4 0-4 1.5-4 4.1v2.1H8v3h2.7V21z"/>',
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
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V8a1.5 1.5 0 0 1 1.5-1.5H10"/>',
  doc: '<path d="M7 3.5h7l4 4V20.5H7z"/><path d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  chevdown: '<path d="m6 9 6 6 6-6"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.500z"/><path d="M4 20.500A2.5 2.5 0 0 1 6.500 18H20v3H6.500A2.500 2.500 0 0 1 4 20.500z"/>',
  vase: '<path d="M9 3h6M10 3v3c0 1.5-3 3-3 7a5 5 0 0 0 10 0c0-4-3-5.5-3-7V3"/><path d="M8.500 20.500h7"/>',
  bag: '<path d="M5 8h14l1 12H4z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  torii: '<path d="M3 6h18M5 9.500h14M7 6v14M17 6v14M12 9.500V6"/>',
};

// Facebook のロゴ（公式の青い丸。Meta のブランド素材 static/img/facebook-logo.webp）。形・色は変えない。単独で置き、「Facebook」などの文字を隣に付けない
export const fbLogo = (size = 24) => `<img class="fb-logo" src="/img/facebook-logo.webp" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;

export function icon(name, size) {
  if (!PATHS[name]) throw new Error(`アイコンがありません: ${name}`);
  return wrap(PATHS[name], size);
}

// ロゴのマーク（自作：赤いピンの中に、白い買い物袋。足元は緑の地面）。favicon も同じ形（static/favicon.svg）
export const MARK_INNER = '<ellipse cx="32" cy="76" rx="22" ry="5" fill="#3f9a5a"/><path d="M32 74C32 74 8 50 8 28a24 24 0 0 1 48 0c0 22-24 46-24 46z" fill="#c73e2a"/><path d="M19 27h26l2.5 19H16.5z" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M25.5 27v-4.5c0-3.6 2.7-6.2 6.5-6.2s6.5 2.6 6.5 6.2V27" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>';
export function logoSvg() {
  return `<svg class="logo-svg" viewBox="0 0 64 82" width="34" height="44" aria-hidden="true" focusable="false">${MARK_INNER}</svg>`;
}

// 手描き風の、日本列島のシルエット（簡略。仮。地図の本格版は Step 4）
export function japanMark() {
  return '<path d="M61 7l9-3 9 5 4 9-8 3-6-4-6 2-4-6zM70 27l5 8-2 10-7 8-8 4-8 5-8 2-6 5-3-3 6-7 8-4 7-6 4-8 6-9zM36 72l10-2 3 6-8 4-6-3zM14 74l10-2 4 8-4 10-8 2-6-8z" fill="currentColor"/>';
}
