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

// ---- トップページの下部セクション（Step 4） ----
export const WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
export const MON_EN = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export const S = {
  ja: {
    cal: { title: '今週末の開催情報', sub: 'This Weekend in Japan', view: 'カレンダーを見る', n: (n) => (n ? `${n}件` : 'なし'), aria: '日付ごとの開催件数' },
    featured: { title: '今週末の注目マーケット', sub: 'Featured Markets', all: 'すべての開催情報を見る', upcoming: 'これからの開催', upcomingSub: 'Upcoming Markets', empty: '今週末の掲載は、まだありません。', next: '次へ', official: '公式情報を確認', tbc: '要確認' },
    status: { confirmed: '公式で確認', scheduled: '予定（きまりから算出）', cancelled: '中止', postponed: '延期', unknown: '開催は要確認' },
    vendors: { title: '出店したい方へ', sub: 'For Vendors', desc: '出店料・申込み方法を、主催者・自治体の公式情報から掲載しています。', button: '出店情報を見る', fee: '出店料：', apply: '申込み方法：', script: ['Join', 'the Market!'], photoAlt: '日本の屋台で買い物をする人たち（後ろ姿）', empty: '出店者向けの情報は、準備中です。' },
    area: { title: '地域から探す', sub: 'Explore by Area', all: 'すべての都道府県から探す', map: '日本地図。掲載のある都道府県を押すと、その一覧へ移動します', count: (n) => `${n}件`, popular: '掲載のある都道府県' },
    types: { title: '種類から探す', sub: 'Explore by Type', all: 'すべて見る', count: (n) => `${n}件` },
    about: { title: '掲載情報について', sub: 'About This Site', events: '今後の開催予定', eventsNote: (d) => `今後${d}日`, markets: '掲載マーケット', organizers: '主催者・自治体', updated: (t) => `最終更新日：${t}`, policy: '主催者・自治体の公式ページと公開データだけを使います。', link: '掲載方針・免責事項について', script: ['Discover', 'Local Japan!'], photoAlt: '東京の寺の近くで開かれる市のにぎわい', source: '情報源は、すべて公式ページです（出典と最終確認日を、各ページに表示）。' },
    kinds: { flea: 'フリーマーケット', kotto: '骨董市', nomi: '蚤の市', handmade: '手作り市', engi: '縁日・露店市', marche: 'マルシェ・朝市' },
    kindAlt: { flea: '古着や雑貨が並ぶフリーマーケットの露店', kotto: '陶器や急須が並ぶ骨董市の露店', nomi: '骨董や雑貨が並ぶ店', handmade: '色とりどりの折り鶴が並ぶ手作り品の露店', engi: '神社の境内に並ぶ縁日の露店', marche: '青果が並ぶ、東京の街角の露店' },
    footer: {
      links: [['/weekend/', '今週末の開催'], ['/calendar/', 'イベントカレンダー'], ['/area/', '地域から探す'], ['/kind/', '種類から探す'], ['/search/', 'キーワード検索'], ['/shuten/', '出店したい方へ'], ['/about/', 'サイトについて'], ['/about/#remove', '掲載情報の修正・削除依頼']],
      nav: 'フッター',
      copy: '主催者・自治体の公式情報と公開データをもとに掲載しています。',
    },
    date: (iso) => { const [, m, d] = iso.split('-'); return `${+m}/${+d}`; },
    dateLong: (iso) => { const [y, m, d] = iso.split('-'); return `${+y}年${+m}月${+d}日`; },
  },
  en: {
    cal: { title: 'This Weekend in Japan', sub: '今週末の開催情報', view: 'View Calendar', n: (n) => `${n} event${n === 1 ? '' : 's'}`, aria: 'Number of markets by date' },
    featured: { title: 'Featured Markets', sub: '今週末の注目の開催情報', all: 'View all events', upcoming: 'Upcoming Markets', upcomingSub: 'これからの開催', empty: 'No markets listed for this weekend yet.', next: 'Next', official: 'Official info', tbc: 'TBC' },
    status: { confirmed: 'Confirmed (official)', scheduled: 'Scheduled (from recurring rule)', cancelled: 'Cancelled', postponed: 'Postponed', unknown: 'To be confirmed' },
    vendors: { title: 'For Vendors', sub: '出店したい方へ', desc: 'Stall fees and how to apply, taken from each organizer’s or municipality’s official information.', button: 'See vendor info', fee: 'Fee: ', apply: 'How to apply: ', script: ['Join', 'the Market!'], photoAlt: 'People shopping at a stall in Japan, seen from behind', empty: 'Vendor information is coming soon.' },
    area: { title: 'Explore by Area', sub: '地域から探す', all: 'Browse all prefectures', map: 'Map of Japan. Select a highlighted prefecture to see its markets', count: (n) => `${n} event${n === 1 ? '' : 's'}`, popular: 'Areas with listings' },
    types: { title: 'Explore by Type', sub: '種類から探す', all: 'View all', count: (n) => `${n}` },
    about: { title: 'About This Site', sub: '掲載情報について', events: 'Upcoming events', eventsNote: (d) => `next ${d} days`, markets: 'Markets listed', organizers: 'Organizers', updated: (t) => `Last updated: ${t}`, policy: 'Listings are based only on official pages from organizers and municipalities, plus open data.', link: 'Listing policy & disclaimer', script: ['Discover', 'Local Japan!'], photoAlt: 'A busy market near a temple in Tokyo', source: 'Every source is an official page; the source and the last-checked date are shown on each listing.' },
    kinds: { flea: 'Flea Markets', kotto: 'Antique Fairs', nomi: 'Nomi-no-Ichi (Flea)', handmade: 'Handmade Markets', engi: 'Temple & Shrine Fairs', marche: 'Marchés & Morning Markets' },
    kindAlt: { flea: 'A flea market stall with vintage clothes and goods', kotto: 'An antique fair stall with ceramics and a teapot', nomi: 'A shop with antiques and curios', handmade: 'Colorful origami cranes at a handmade goods stall', engi: 'Festival stalls in the grounds of a shrine', marche: 'A produce stall on a Tokyo street corner' },
    footer: {
      links: [['/weekend/', 'This Weekend'], ['/calendar/', 'Event Calendar'], ['/area/', 'Explore by Area'], ['/kind/', 'Market Types'], ['/search/', 'Keyword Search'], ['/shuten/', 'For Vendors'], ['/about/', 'About'], ['/about/#remove', 'Correction / Removal Requests']],
      nav: 'Footer',
      copy: 'Based on official information from organizers and municipalities, and open data.',
    },
    date: (iso) => { const [, m, d] = iso.split('-'); return `${+m}/${+d}`; },
    dateLong: (iso) => { const [y, m, d] = iso.split('-'); return `${MON_EN[+m - 1].charAt(0) + MON_EN[+m - 1].slice(1).toLowerCase()} ${+d}, ${y}`; },
  },
};

export const EN_DISCLAIMER = 'Events can change or be cancelled. Please check the organizer’s official information before you go or apply.';
