// 「保存（お気に入り）」「共有」「カレンダーに追加」の文言（英語・日本語）。サーバー側（カード・詳細）と saved.js が使う
export const SV = {
  en: {
    save: 'Save', saved: 'Saved', saveAria: 'Save to My list', removeAria: 'Remove from My list',
    share: 'Share', copied: 'Link copied', cal: 'Add to calendar', calAria: (d) => `Add ${d} to your calendar`,
    nav: 'My list', crumb: 'My list', h1: 'My list', desc: 'Markets you saved on this device. No account needed.',
    lead: 'Markets you saved on this device. No account is needed: your list is kept only in this browser (it is not sent to our server).',
    empty: 'Nothing saved yet. Tap the heart on any market to add it here.', browse: 'Find markets this weekend',
    shareList: 'Share this list', sharedH: 'A list shared with you', saveAll: 'Save all to My list', remove: 'Remove',
    upcoming: 'Next dates', none: 'No dates in the next 120 days', loadFail: 'Could not load the list. Please try again later.',
    sharedNote: 'This list was shared with you by link. Saving it adds these markets to your own list.',
  },
  ja: {
    save: '保存', saved: '保存済み', saveAria: 'マイリストに保存', removeAria: 'マイリストから外す',
    share: '共有', copied: 'リンクをコピーしました', cal: 'カレンダーに追加', calAria: (d) => `${d}をカレンダーに追加`,
    nav: 'マイリスト', crumb: 'マイリスト', h1: 'マイリスト', desc: 'この端末に保存したマーケット。登録は要りません。',
    lead: 'この端末に保存したマーケットです。登録は要りません。リストはこのブラウザの中だけに保存され、サーバーには送りません。',
    empty: 'まだ保存したものはありません。気になるマーケットのハートを押すと、ここに入ります。', browse: '今週末のマーケットを探す',
    shareList: 'このリストを共有', sharedH: '共有されたリスト', saveAll: 'すべてマイリストに保存', remove: '外す',
    upcoming: '次の開催日', none: '今後120日の開催はありません', loadFail: '読み込めませんでした。時間をおいて、もう一度お試しください。',
    sharedNote: 'リンクで共有されたリストです。保存すると、これらがあなたのマイリストに入ります。',
  },
};
