// ナビは、ここ1か所で定義する（補助金ネットと同じ考え方：探す → 出店する → 読む → サイトについて）
export const SITE = {
  name: 'Flea Market JP',
  tagline: '全国のフリマ・蚤の市・骨董市・手作り市',
  // ドメインは未定（要確認）。決まったら環境変数 SITE_URL か、ここを変える
  url: (process.env.SITE_URL || 'https://flea-market.example').replace(/\/$/, ''),
};

// 掲載の修正・削除の依頼を受ける、サイト専用のメールアドレス（環境変数 CONTACT_EMAIL。未設定なら「準備中」と表示）
export const CONTACT_EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(process.env.CONTACT_EMAIL || '') ? process.env.CONTACT_EMAIL : '';

// SITE_URL が未設定（仮のドメイン）、または依頼の窓口（CONTACT_EMAIL）が未設定の間は、検索エンジンに載せない（noindex・robots.txt で全体を拒否）
export const INDEXABLE = Boolean(process.env.SITE_URL) && !/\.example(\/|$)/.test(SITE.url) && Boolean(CONTACT_EMAIL);

// ヘッダーのナビ。ラベルは scripts/lib/i18n.mjs（日本語・英語）。行き先は、これまでと同じ
export const TOP_LINKS = [
  { key: 'weekend', href: '/weekend/', icon: 'calendar' },
  { key: 'area', href: '/area/', icon: 'pin' },
  { key: 'types', href: '/kind/', icon: 'grid' },
  { key: 'vendors', href: '/shuten/', icon: 'store' },
  { key: 'about', href: '/about/', icon: 'info' },
];

export const FOOTER_GROUPS = [
  { title: '探す', links: [
    { href: '/weekend/', label: '今週末の開催' },
    { href: '/calendar/', label: '開催カレンダー' },
    { href: '/area/', label: '地域から探す' },
    { href: '/kind/', label: '種類から探す' },
    { href: '/search/', label: 'キーワードで探す' },
  ] },
  { title: '出店する', links: [{ href: '/shuten/', label: '出店者向けの情報' }] },
  { title: 'サイトについて', links: [
    { href: '/about/', label: '掲載のきまり・出典' },
    { href: '/about/#remove', label: '掲載の修正・削除の依頼' },
  ] },
];
