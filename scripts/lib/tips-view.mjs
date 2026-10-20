// TIPS（楽しく体験するためのコツ）：ブログ形式のコラム（オリジナルの文章。出典は付けない）。
// 一覧はカテゴリごとにまとめる。記事本体は build-site.mjs
import { esc } from './html.mjs';

export const TIPS_TXT = {
  ja: { h1: 'TIPS：楽しく体験するためのコツ', crumb: 'TIPS', lead: '日本のフリーマーケット・骨董市で、気持ちよく過ごすためのコラムです。', intro: '行く前の準備から、会場でのふるまい、買ったものの持ち帰りまで、5つの記事にまとめました。気になるものから読んでください。' },
  en: { h1: 'Tips for enjoying flea markets', crumb: 'Tips', lead: 'Columns on how to enjoy a Japanese flea market or antique fair in a pleasant way.', intro: 'From preparing before you go, to manners at the market, to getting your purchases home, these are five articles. Pick whichever one you need.' },
};

export const TIPS_CATS = {
  before: { ja: '出かける前', en: 'Before you go' },
  buy: { ja: '買い物', en: 'Shopping' },
  manners: { ja: '会場でのふるまい', en: 'At the market' },
  safety: { ja: '安全と持ち帰り', en: 'Safety and taking things home' },
  vendor: { ja: '出店したい方', en: 'For vendors' },
};

export function tipsBanner(lang) {
  const t = TIPS_TXT[lang];
  const home = lang === 'ja' ? 'トップ' : 'Home';
  return `<nav class="crumbs art-crumbs"><a href="${lang === 'ja' ? '/ja/' : '/'}">${home}</a> › <span>${esc(t.crumb)}</span></nav><h1>${esc(t.h1)}</h1><p class="lp-s">${esc(t.lead)}</p>`;
}

// 記事の一覧。1列の格子に並べ、各カードの上にカテゴリの札を付ける
export function tipsIndex(list, lang) {
  const t = TIPS_TXT[lang];
  const base = lang === 'ja' ? '/ja/tips/' : '/tips/';
  const cards = list.map((x, i) => `<li class="col-card"><a href="${base}${esc(x.slug)}/"><span class="col-n">${String(i + 1).padStart(2, '0')}</span><span class="tips-tag">${esc(TIPS_CATS[x.cat][lang])}</span><b>${esc(x[lang].title)}</b><span class="col-l">${esc(x[lang].lead)}</span></a></li>`).join('');
  return `<p class="col-intro">${esc(t.intro)}</p><ol class="col-list">${cards}</ol>`;
}
