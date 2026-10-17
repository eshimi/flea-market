// ナビは、ここ1か所で定義する（補助金ネットと同じ考え方：探す → 出店する → 読む → サイトについて）
export const SITE = {
  name: 'Flea Market JP',
  tagline: '全国のフリマ・蚤の市・骨董市・手作り市',
  // ドメインは未定（要確認）。決まったら環境変数 SITE_URL か、ここを変える
  url: (process.env.SITE_URL || 'https://flea-market.example').replace(/\/$/, ''),
};

export const TOP_LINKS = [
  { href: '/weekend/', label: '今週末' },
  { href: '/area/', label: '地域から' },
  { href: '/kind/', label: '種類から' },
  { href: '/shuten/', label: '出店したい方' },
  { href: '/about/', label: 'サイトについて' },
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
