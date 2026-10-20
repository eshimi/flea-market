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

// ヘッダー・フッターのナビ（カテゴリ構造）。ラベルは下の NAV_LABELS（日本語・英語）。行き先は、これまでと同じ
//  探す：今週末・地域・スポット・種類（ヘッダーに直接。カレンダー・検索はフッターと各ページ）
//  読む：ガイド（ブログ・使い方・よくある質問）
//  サイト：サイトについて・出店したい方へ・修正の依頼
export const HEADER_NAV = [
  { href: '/weekend/', key: 'weekend', icon: 'calendar' },
  { href: '/area/', key: 'area', icon: 'pin' },
  { href: '/spot/', key: 'spots', icon: 'store' },
  { href: '/kind/', key: 'types', icon: 'grid' },
  { group: 'guides', icon: 'book', items: [['/blog/', 'blog'], ['/guide/', 'howto'], ['/tips/', 'tips'], ['/faq/', 'faq']] },
  { group: 'site', icon: 'info', items: [['/about/', 'aboutPolicy'], ['/shuten/', 'vendors'], ['/about/#remove', 'remove']] },
];

// フッター：列ごと（探す／人気の地域／ガイド／サイト）。areas の都道府県は、今後の開催が多い順に8つ（ビルドで決める）
export const FOOTER_COLS = [
  { key: 'find', items: [['/weekend/', 'weekend'], ['/calendar/', 'calendar'], ['/area/', 'area'], ['/spot/', 'spots'], ['/kind/', 'types'], ['/search/', 'search']] },
  { key: 'areas', areas: true, more: ['/area/', 'allAreas'] },
  { key: 'guides', items: [['/blog/', 'blog'], ['/guide/', 'howto'], ['/tips/', 'tips'], ['/faq/', 'faq'], ['/blog/guide-tokyo-international-forum/', 'g1'], ['/blog/guide-tokyo-monthly-rule-markets/', 'g2']] },
  { key: 'site', items: [['/about/', 'aboutPolicy'], ['/shuten/', 'vendors'], ['/about/#remove', 'remove']] },
];

export const NAV_LABELS = {
  en: { tips: 'Tips', guides: 'Guides', site: 'About', blog: 'Blog & Guide Articles', howto: 'How to Use', faq: 'FAQ', aboutPolicy: 'About & Listing Policy', vendors: 'For Vendors', remove: 'Corrections & Removal Requests', calendar: 'Event Calendar', search: 'Keyword Search', allAreas: 'All prefectures', g1: 'Guide: Oedo Antique Market', g2: 'Guide: Tokyo’s monthly markets', colFind: 'Find markets', colAreas: 'Popular areas', colGuides: 'Guides', colSite: 'About this site' },
  ja: { tips: 'TIPS', guides: 'ガイド', site: 'サイト', blog: 'ブログ・ガイド記事', howto: '使い方', faq: 'よくある質問', aboutPolicy: '掲載のきまり・出典', vendors: '出店したい方へ', remove: '掲載の修正・削除の依頼', calendar: 'イベントカレンダー', search: 'キーワード検索', allAreas: 'すべての都道府県', g1: 'ガイド：大江戸骨董市', g2: 'ガイド：東京の毎月の市', colFind: 'マーケットを探す', colAreas: '人気の地域', colGuides: 'ガイド', colSite: 'このサイトについて' },
};

// アクセス解析（Google アナリティクス）。全ページの head に入れる。GA_ID=（空）で外せる
// フッターのQRコード（static/img/qr.svg）が指す URL。URL を変えたら tools/qr/make_qr.py で作り直す
export const QR_URL = 'https://streetbazaars.jp/';
export const ANALYTICS_ID = process.env.GA_ID ?? 'G-BS5Q6SMHCM';
