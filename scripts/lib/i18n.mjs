// 画面の文言（日本語・英語）。英語はトップページ（/en/）だけ。一覧・詳細などは日本語のまま。
// 英語の見出し・コピーは、ユーザーの指示書（2026-10-18）の文言。日本語の見出しは、その意味に合わせた訳。
export const LANGS = ['ja', 'en'];

export const T = {
  ja: {
    htmlLang: 'ja',
    nav: { weekend: '今週末', area: '地域から', types: '種類から', vendors: '出店したい方', about: 'サイトについて' },
    navLabel: 'メイン',
    menu: 'メニュー',
    search: '検索',
    langLabel: '言語',
    tagline: 'DISCOVER JAPAN’S LOCAL MARKETS',
    hero: {
      title: ['日本の、', '市場の宝物を', '見つけよう。'],
      sub: 'フリーマーケット・骨董市・手づくり市の、近くの開催情報。主催者・自治体の公式情報だけを掲載しています。',
      placeholder: '地名・駅名・マーケットの種類',
      button: 'マーケットを探す',
      searchLabel: 'キーワード',
      photoAlt: '日本の骨董市の露店。陶器や招き猫、ひょうたんが並ぶ',
      script: ['Good Things', 'New Encounters', 'in Japan!'],
      stamp: 'EXPLORE LOCAL MARKETS',
      cats: [
        { key: 'antiques', href: '/kind/kotto/', icon: 'chair', label: ['骨董・', 'ヴィンテージ'] },
        { key: 'crafts', href: '/kind/handmade/', icon: 'bowl', label: ['クラフト・', '手づくり'] },
        { key: 'secondhand', href: '/kind/flea/', icon: 'shirt', label: ['古着・日用品', '（フリマ）'] },
        { key: 'food', href: '/kind/marche/', icon: 'sprout', label: ['地元の食・', 'その他'] },
      ],
    },
    description: '全国のフリーマーケット・蚤の市・骨董市・手作り市の開催情報を、主催者と自治体の公式情報からまとめています。今週末の開催・地域・種類から探せます。毎朝更新。',
  },
  en: {
    htmlLang: 'en',
    nav: { weekend: 'This Weekend', area: 'Explore by Area', types: 'Market Types', vendors: 'For Vendors', about: 'About' },
    navLabel: 'Main',
    menu: 'Menu',
    search: 'Search',
    langLabel: 'Language',
    tagline: 'DISCOVER JAPAN’S LOCAL MARKETS',
    hero: {
      title: ['Find Japan’s', 'hidden market', 'treasures.'],
      sub: 'Flea markets, antique fairs & handmade markets — happening near you.',
      placeholder: 'City, station or market type',
      button: 'EXPLORE MARKETS',
      searchLabel: 'Keyword',
      photoAlt: 'A stall at a Japanese antique market, with ceramics, a maneki-neko and gourds under a canopy',
      script: ['Good Things', 'New Encounters', 'in Japan!'],
      stamp: 'EXPLORE LOCAL MARKETS',
      cats: [
        { key: 'antiques', href: '/kind/kotto/', icon: 'chair', label: ['Antiques', '& Vintage'] },
        { key: 'crafts', href: '/kind/handmade/', icon: 'bowl', label: ['Crafts', '& Handmade'] },
        { key: 'secondhand', href: '/kind/flea/', icon: 'shirt', label: ['Secondhand', '& Fashion'] },
        { key: 'food', href: '/kind/marche/', icon: 'sprout', label: ['Local Food', '& More'] },
      ],
    },
    description: 'Flea markets, antique fairs and handmade markets across Japan, from official organizer and municipal sources. Find what is on this weekend, by area or by type. Updated every morning.',
  },
};
