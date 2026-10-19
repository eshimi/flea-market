// 使い方・よくある質問・ブログの本文（英語・日本語）。事実は、このサイトのきまりと、公式ページから取ってデータに入れたものだけ。
// ブロック：{ h2 } / { p } / { ul: [...] }。文中のリンクは [表示](/path/)（内部リンクは英語の URL で書く。日本語のページでは /ja/ 付きになる）。
// 数字・日付は書かない（変わるため）。書くときは「2026-10-18 時点」と明記し、出典（開催詳細ページ）へ links する。

export const GUIDE = {
  en: {
    title: 'How to Use Flea Market JP',
    lead: 'A quick guide to finding a market, reading a listing, and checking before you go.',
    blocks: [
      { h2: '1. Find a market' },
      { ul: [
        '[This Weekend](/weekend/): markets on the coming Saturday, Sunday and public holidays.',
        '[Event Calendar](/calendar/): markets for the next 120 days, in date order, with the number of markets on each day.',
        '[Explore by Area](/area/): by prefecture, and by city or ward where the data has it.',
        '[Market Types](/kind/): flea markets, antique fairs, nomi-no-ichi, handmade markets, temple and shrine fairs, marchés.',
        '[Keyword Search](/search/): a place, a venue or a type, for example “antique” or “Chiyoda”.',
      ] },
      { h2: '2. Read a listing' },
      { p: 'Every date carries a label that says how we know it:' },
      { ul: [
        '**Confirmed (official)**: this occurrence was confirmed from the organizer’s or municipality’s official information. The date next to it is when we last checked.',
        '**Scheduled (from recurring rule)**: calculated from the rule stated officially, for example “every 1st Sunday”. This specific day has not been individually confirmed.',
        '**Cancelled / Postponed**: confirmed from official information. We keep these on the page instead of deleting them.',
        '**To be confirmed**: we could not confirm it from official information, or it has been a while since the last check.',
      ] },
      { p: 'Anything we could not confirm is shown as “TBC”. We never fill a gap with a guess.' },
      { h2: '3. Check before you go' },
      { ul: [
        'Open the official page linked under “Sources” on the listing. It is the one that decides whether the market is on.',
        'Rain rules differ from market to market. See [Rain and cancellations: what official pages say](/blog/rain-and-cancellations/).',
        'Some city-run events ask visitors not to come by car. See [Getting there](/blog/getting-there-by-car/).',
        'Names, venues, times and fees are our unofficial English translations; the official Japanese wording is shown beside each item, and the official page applies if they differ.',
      ] },
      { h2: '4. If you want to sell' },
      { p: 'Open [For Vendors](/shuten/) for the stall fee and how to apply, taken from each organizer’s official information. We do not take applications: you apply to the organizer. Recruitment can change, so check the organizer’s notice.' },
      { h2: '5. Corrections' },
      { p: 'If something is wrong, or you are an organizer and want a listing corrected or removed, see [Listing Policy & Sources](/about/#remove).' },
    ],
  },
  ja: {
    title: 'Flea Market JP の使い方',
    lead: 'マーケットの探し方、掲載の読み方、お出かけ前の確認のしかたを、まとめました。',
    blocks: [
      { h2: '1. マーケットを探す' },
      { ul: [
        '[今週末の開催](/weekend/)：これから来る土日・祝日の開催です。',
        '[イベントカレンダー](/calendar/)：今日から120日間の開催を、日付の順に。日ごとの件数つきです。',
        '[地域から探す](/area/)：都道府県から。データがあるところは、市区町村からも探せます。',
        '[種類から探す](/kind/)：フリーマーケット・骨董市・蚤の市・手作り市・縁日・露店市・マルシェ。',
        '[キーワード検索](/search/)：地名・会場名・種類（例：骨董市、千代田区）。',
      ] },
      { h2: '2. 掲載の読み方' },
      { p: 'すべての開催日に、「どうやって分かったか」を示す札が付いています。' },
      { ul: [
        '**公式で確認**：その回の開催を、主催者・自治体の公式情報で確認しました。横の日付は、最後に確認した日です。',
        '**予定（きまりから算出）**：公式に書かれた開催のきまり（例：毎月第1日曜）から計算した日です。その回について、個別の確認はしていません。',
        '**中止・延期**：公式の情報で確認しました。消さずに表示します。',
        '**開催は要確認**：公式の情報で確認できない、または最終確認から日数がたっています。',
      ] },
      { p: '確認できなかった項目は「要確認」と表示します。推測で埋めることはしません。' },
      { h2: '3. お出かけの前に' },
      { ul: [
        '各ページの「出典」にある公式ページを開いてください。開催の有無は、公式が決めます。',
        '雨天の扱いは、マーケットごとに違います。[雨天・中止：公式ページの書き方](/blog/rain-and-cancellations/)をご覧ください。',
        '自治体の催しには、車での来場を控えるよう求めているものがあります。[会場への行き方](/blog/getting-there-by-car/)をご覧ください。',
        'イベント名・会場・時間・料金は、公式ページの文を、そのまま日本語で載せています。',
      ] },
      { h2: '4. 出店したい方へ' },
      { p: '[出店したい方へ](/shuten/)に、出店料と申込み方法を、主催者の公式情報から載せています。申込みは、このサイトでは受け付けません。主催者へお申し込みください。募集の状況は変わるため、主催者の案内をご確認ください。' },
      { h2: '5. 修正・削除の依頼' },
      { p: '内容が違うとき、また主催者の方が掲載の修正・削除を希望するときは、[掲載のきまり・出典](/about/#remove)をご覧ください。' },
    ],
  },
};

export const FAQ = {
  en: {
    title: 'FAQ',
    lead: 'Common questions about where the information comes from and how to read it.',
    items: [
      ['Where does the information come from?', 'Only official pages of organizers, official pages of local governments, and open data published by local governments. We do not use other event-information sites, aggregator sites or social media.'],
      ['Do you copy text or photos from the official pages?', 'No. We list only facts such as dates, times, venues, admission, stall fees and how to apply, and link to the official page as the source. The photos on this site are not taken from official pages.'],
      ['What does “Scheduled (from recurring rule)” mean?', 'The date is calculated from the recurrence rule stated officially (for example, every 1st Sunday). That specific day has not been individually confirmed, so please check the official page.'],
      ['How often is the site updated?', 'Automatically every morning. We check each official page at most once a day, following robots.txt and each site’s terms of use. Pages for events within the next 7 days are checked daily; others about once a week.'],
      ['Why do I see “TBC”?', 'It means the item is not confirmed from official sources. We leave it as TBC rather than guess.'],
      ['Is the English official?', 'No. The facts are taken from the official Japanese pages. In English, we show an unofficial translation with the official Japanese wording in small type next to it, and use the official English name where the official site has one. If the two differ, the official Japanese page applies.'],
      ['Which areas are covered?', 'We started with regular markets in Tokyo and have begun adding other prefectures. See [Explore by Area](/area/) for what is listed now.'],
      ['Can I book a stall or buy tickets here?', 'No. This site only links to the official information. Stall applications go to the organizer.'],
      ['How do I ask for a correction or removal?', 'See [Listing Policy & Sources](/about/#remove). Organizers can ask us to correct or remove a listing.'],
    ],
  },
  ja: {
    title: 'よくある質問',
    lead: '情報の出どころと、掲載の読み方についての、よくある質問です。',
    items: [
      ['情報は、どこから集めていますか？', '主催者の公式ページ、自治体の公式ページ、自治体が公開しているオープンデータだけです。ほかのイベント情報サイト・まとめサイト・SNS の掲載内容は使いません。'],
      ['公式ページの文章や写真を転載していますか？', 'していません。開催日・時間・会場・入場料・出店料・申込み方法などの事実だけを載せ、出典として公式ページへリンクします。このサイトの写真は、公式ページのものではありません。'],
      ['「予定（きまりから算出）」とは？', '公式に書かれた開催のきまり（例：毎月第1日曜）から計算した日です。その回について個別の確認はしていないので、公式ページでご確認ください。'],
      ['更新の頻度は？', '毎朝、自動で更新しています。公式ページの取得は、robots.txt と各サイトの利用規約に従い、同じページへは1日1回までです。7日以内に開催があるページは毎日、それ以外は7日ごとに確認します。'],
      ['「要確認」とは？', '公式の情報で確認できていない項目です。推測で埋めず、「要確認」と表示しています。'],
      ['掲載している地域は？', '東京都の定期市から始め、ほかの道府県を少しずつ足しています。いま載っている地域は、[地域から探す](/area/)をご覧ください。'],
      ['出店の申込みやチケットの購入は、ここでできますか？', 'できません。公式情報へのリンクだけを載せています。出店の申込みは、主催者へお願いします。'],
      ['修正・削除を頼むには？', '[掲載のきまり・出典](/about/#remove)をご覧ください。主催者の方は、掲載の修正・削除を依頼できます。'],
    ],
  },
};

import { GUIDES } from './content-guides.mjs';

export const BLOG = [
  {
    slug: 'welcome',
    date: '2026-10-18',
    cat: 'news',
    tags: {"en": ["Tokyo", "flea market", "antique"], "ja": ["東京", "フリマ", "骨董市"]},
    en: {
      title: 'Welcome to Flea Market JP',
      summary: 'What this site is, where its information comes from, and what it does not do.',
      points: ["A guide to flea markets, antique fairs and handmade markets in Japan, built only from official information", "We list facts and link to the official page; we do not copy text or photos", "We do not take stall applications or sell tickets"],
      blocks: [
        { p: 'Flea Market JP lists flea markets, antique fairs, nomi-no-ichi and handmade markets in Japan. Everything comes from the official pages of organizers and municipalities, and from open data.' },
        { h2: 'What we do' },
        { ul: [
          'List dates, times, venues, admission, stall fees and how to apply, as stated officially.',
          'Show how each date is known: [confirmed from official information, or calculated from a recurring rule](/blog/reading-the-labels/).',
          'Keep cancelled and postponed events on the page, and mark anything unconfirmed as “TBC”.',
        ] },
        { h2: 'What we do not do' },
        { ul: [
          'We do not copy text or photos from official pages, and we do not use other listing sites.',
          'We do not take stall applications or sell tickets. Those go to the organizer.',
        ] },
        { h2: 'Where we are' },
        { p: 'We started with regular markets in Tokyo and have begun adding other prefectures. The pages are in English and Japanese. Names, addresses and fees are quoted from the official pages in Japanese. See the [guide](/guide/) and the [FAQ](/faq/) to get started.' },
      ],
    },
    ja: {
      title: 'Flea Market JP へようこそ',
      summary: 'このサイトは何か、情報の出どころ、やらないこと。',
      points: ["日本のフリマ・骨董市・手作り市を、公式情報だけから載せるサイト", "事実を載せて公式ページへリンクし、文章や写真は転載しない", "出店の申込みやチケットの販売は、このサイトではしない"],
      blocks: [
        { p: 'Flea Market JP は、日本のフリーマーケット・骨董市・蚤の市・手作り市の開催情報を載せるサイトです。主催者・自治体の公式ページと、公開データだけから集めています。' },
        { h2: 'やること' },
        { ul: [
          '開催日・時間・会場・入場料・出店料・申込み方法を、公式に書かれたとおりに載せます。',
          '各開催日が「どうやって分かったか」を示します（[公式で確認、またはきまりから算出](/blog/reading-the-labels/)）。',
          '中止・延期は消さずに載せ、確認できない項目は「要確認」と表示します。',
        ] },
        { h2: 'やらないこと' },
        { ul: [
          '公式ページの文章・写真は転載しません。ほかの一覧サイトも使いません。',
          '出店の申込み・チケットの販売は、このサイトではしません。主催者へお願いします。',
        ] },
        { h2: '今の範囲' },
        { p: '東京都の定期市から始め、ほかの道府県を少しずつ足しています。ページは日本語と英語の両方です。はじめての方は、[使い方](/guide/)と[よくある質問](/faq/)をご覧ください。' },
      ],
    },
  },
  {
    slug: 'reading-the-labels',
    date: '2026-10-18',
    cat: 'howto',
    tags: {"en": ["flea market", "Tokyo"], "ja": ["フリマ", "東京"]},
    en: {
      title: 'How to read a listing: “Confirmed” vs. “Scheduled”',
      summary: 'Two labels look similar but mean different things. Here is the difference.',
      points: ["“Confirmed” means this occurrence was found in official information", "“Scheduled” is calculated from the official rule and is not individually confirmed", "Check the official page before you go"],
      blocks: [
        { p: 'Many markets are held on a rule, such as “every 1st and 3rd Sunday”. The organizer states the rule officially, but does not always confirm each single day. We show the two cases differently.' },
        { h2: 'Confirmed (official)' },
        { p: 'We found this specific occurrence in the organizer’s or municipality’s official information. The date beside the label is the day we last checked.' },
        { h2: 'Scheduled (from recurring rule)' },
        { p: 'We calculated the date from the official rule. The market is very likely to be on, but nobody has confirmed that day yet. Please check the official page, linked under “Sources”, before you go.' },
        { h2: 'Cancelled, postponed, and to be confirmed' },
        { ul: [
          'Cancelled and postponed events stay on the page, marked as such.',
          '“To be confirmed” means we could not confirm it, or it has been more than 14 days since the last check.',
        ] },
        { p: 'The same labels are explained in the [guide](/guide/) and in [Listing Policy & Sources](/about/).' },
      ],
    },
    ja: {
      title: '掲載の読み方：「公式で確認」と「予定」のちがい',
      summary: 'よく似た2つの札が、何を意味しているのかを説明します。',
      points: ["「公式で確認」は、その回を公式情報で見つけたもの", "「予定」は、公式のきまりから計算した日で、その回の個別の確認はない", "お出かけの前に、公式ページをご確認ください"],
      blocks: [
        { p: '多くのマーケットは、「毎月第1・第3日曜」のようなきまりで開かれます。きまりは公式に書かれていても、1回ごとの確認までは書かれていないことがあります。このサイトでは、2つの場合を分けて表示しています。' },
        { h2: '公式で確認' },
        { p: 'その回の開催を、主催者・自治体の公式情報で見つけました。札の横の日付は、最後に確認した日です。' },
        { h2: '予定（きまりから算出）' },
        { p: '公式に書かれたきまりから計算した日です。開く可能性は高いのですが、その日について確認した人はまだいません。お出かけの前に、「出典」のリンクから公式ページをご確認ください。' },
        { h2: '中止・延期・要確認' },
        { ul: [
          '中止・延期は、消さずにそのまま表示します。',
          '「開催は要確認」は、公式の情報で確認できない、または最終確認から14日を超えたものです。',
        ] },
        { p: '同じ札の説明は、[使い方](/guide/)と[掲載のきまり・出典](/about/)にもあります。' },
      ],
    },
  },
  {
    slug: 'rain-and-cancellations',
    date: '2026-10-18',
    cat: 'goer',
    tags: {"en": ["antique", "Tokyo"], "ja": ["骨董市", "東京"]},
    en: {
      title: 'Rain and cancellations: what official pages say',
      summary: 'Rain rules differ from market to market. Four examples, quoted from the official pages (as of 2026-10-18).',
      points: ["Rain rules differ from market to market", "Some decide on the morning of the event and announce on the official site or social media", "The examples are as of 2026-10-18; check the current official page"],
      blocks: [
        { p: 'There is no single rule. Some markets are cancelled in rain, some go ahead except in severe weather, and some decide on the morning. These four examples are quoted from official pages as of 2026-10-18 (in Japanese on the listing). Always check the current official page.' },
        { ul: [
          '[Oedo Antique Market (Tokyo International Forum)](/e/oedo-antique-market-tokyo-international-forum/): cancelled in rain. Cancelled if the forecast issued at 17:00 the day before gives 80% or more precipitation probability for the Tokyo area between 6:00 and 12:00. In other cases the office decides.',
          '[Tokyo Nomi-no-Ichi ’26 AUTUMN](/e/tokyo-nominoichi-2026-autumn/): held in rain, except in severe weather. If cancelled, it is announced on the official site and social media by 7:00 on the day.',
          '[Zoshigaya Tezukuri-ichi](/e/zoshigaya-tezukuriichi/): cancelled in rain. Whether it is held or cancelled is announced on X and the blog by 7:00 on the day.',
          '[Edogawa Recycle World IN Tobu](/e/edogawa-recycle-world-in-tobu-2026/): the decision to cancel because of weather such as rain is planned for 8:00 on the day.',
        ] },
        { p: 'Other listings show “In rain” on their own page. When it says “TBC”, the official page did not state it, and we do not guess. See the [guide](/guide/) for how to check.' },
      ],
    },
    ja: {
      title: '雨天・中止：公式ページの書き方',
      summary: '雨のときの扱いは、マーケットごとに違います。公式ページの記載から4つの例（2026-10-18 時点）。',
      points: ["雨天の扱いは、マーケットごとに違う", "当日の朝に決めて、公式サイトや SNS で知らせるものがある", "例は 2026-10-18 時点。最新の公式ページをご確認ください"],
      blocks: [
        { p: '決まったきまりはありません。雨なら中止のもの、荒天以外は開催するもの、当日の朝に決めるものがあります。次の4つは、2026-10-18 時点の公式ページの記載です。お出かけの前に、必ず最新の公式ページをご確認ください。' },
        { ul: [
          '[大江戸骨董市（東京国際フォーラム）](/e/oedo-antique-market-tokyo-international-forum/)：雨天中止。前日17時の天気予報で、東京地方の6時〜12時の降水確率が80%以上なら中止。ほかは事務局が判断します。',
          '[東京蚤の市’26 AUTUMN](/e/tokyo-nominoichi-2026-autumn/)：荒天の場合をのぞき、雨天決行。中止の場合は、当日の午前7時までに公式サイト・SNS で告知します。',
          '[雑司ヶ谷 手創り市](/e/zoshigaya-tezukuriichi/)：雨天の場合は中止。開催・中止は、開催日の朝7時までに X・ブログで告知します。',
          '[第36回 リサイクルワールド・IN・東部](/e/edogawa-recycle-world-in-tobu-2026/)：気象条件（雨天など）による中止の判断は、当日午前8時の予定です。',
        ] },
        { p: 'ほかの開催は、各ページの「雨天のとき」をご覧ください。「要確認」とあるのは、公式ページに書かれていないもので、推測では書いていません。確認の方法は[使い方](/guide/)にあります。' },
      ],
    },
  },
  {
    slug: 'getting-there-by-car',
    date: '2026-10-18',
    cat: 'goer',
    tags: {"en": ["Tokyo", "flea market"], "ja": ["東京", "フリマ"]},
    en: {
      title: 'Getting there: some city-run events ask you not to drive',
      summary: 'Several municipal events ask visitors not to come by car. Examples from the official pages (as of 2026-10-18).',
      points: ["Several city-run events ask visitors not to come by car", "Some are indoors or have no parking", "Public transport is the safer choice"],
      blocks: [
        { p: 'Events held by wards and cities in Tokyo often take place at community facilities or parks with little parking. These listings carry a note on parking or car access in the official page, as of 2026-10-18 (in Japanese on the listing):' },
        { ul: [
          '[Flea Market in Takaido (Suginami)](/e/suginami-furima-in-takaido-2026-11/): held indoors, in a lecture room on the 3rd floor of the center. Visitors cannot come by car.',
          '[Edogawa Recycle World IN Tobu](/e/edogawa-recycle-world-in-tobu-2026/): please refrain from coming by car.',
          '[Tamagawa Cleaning Plant Environment Fair 2026 (Ota)](/e/ota-tamagawa-eco-fair-2026/): please refrain from coming by car.',
          '[Kinshi Park Flea Market (Sumida)](/e/sumida-kinshi-park-flea/): please refrain from parking on the street near the venue.',
        ] },
        { p: 'Public transport is the safer choice. For the access information of each event, see its listing. “TBC” means the official page did not give it.' },
      ],
    },
    ja: {
      title: '会場への行き方：車での来場を控えるよう求める催し',
      summary: '区・市の催しには、車での来場を控えるよう求めるものがあります。公式ページの記載から（2026-10-18 時点）。',
      points: ["区・市の催しには、車での来場を控えるよう求めるものがある", "屋内開催や、駐車場がないものがある", "公共交通機関でのお出かけが安心です"],
      blocks: [
        { p: '東京都の区・市が開く催しは、駐車場の少ない公共施設や公園で行われることが多く、公式ページに駐車・車での来場についての記載があるものがあります（2026-10-18 時点）。' },
        { ul: [
          '[フリーマーケット in 高井戸（杉並区）](/e/suginami-furima-in-takaido-2026-11/)：屋内（センター3階の講座室）。車での来場はできません。',
          '[第36回 リサイクルワールド・IN・東部（江戸川区）](/e/edogawa-recycle-world-in-tobu-2026/)：車での来場はご遠慮ください。',
          '[多摩川清掃工場環境フェア2026（大田区）](/e/ota-tamagawa-eco-fair-2026/)：自動車での来場はご遠慮ください。',
          '[錦糸公園フリーマーケット（墨田区）](/e/sumida-kinshi-park-flea/)：会場付近での路上駐車はご遠慮ください。',
        ] },
        { p: '公共交通機関でのお出かけが安心です。各催しのアクセスは、それぞれのページをご覧ください。「要確認」とあるのは、公式ページに書かれていないものです。' },
      ],
    },
  },
  ...GUIDES,
];
