// TIPSコーナー：ブログ形式のコラム（オリジナルの文章。出典は付けない）。
// /tips/（10のコツ）と /tips/manners/（日本でのふるまい・5本）の一覧と、その見出し。記事本体は build-site.mjs
import { esc } from './html.mjs';

export const TIPS_TXT = {
  ja: { h1: 'TIPS：楽しく体験するためのコツ', crumb: 'TIPS', lead: '日本のフリーマーケット・骨董市で、気持ちよく過ごすための10のコツです。', intro: 'はじめての方にも役立つ、会場に行く前と当日の小さなコツを、10のコラムにまとめました。気になるものから読んでください。', back: '日本でのふるまい（コラム5本）へ', backHref: '/tips/manners/' },
  en: { h1: 'Tips for enjoying flea markets', crumb: 'Tips', lead: 'Ten tips for a pleasant visit to a flea market or antique fair in Japan.', intro: 'Small tips for before you go and for the day itself, written as ten short columns. Pick whichever one you need.', back: 'To how to behave at Japanese flea markets (5 columns)', backHref: '/tips/manners/' },
};

export const MANNERS_TXT = {
  ja: { h1: '日本でのふるまい（TIPS）', crumb: 'TIPS', lead: '日本のフリーマーケットや骨董市で、気持ちよく過ごすためのコラムです。', intro: '買い物の気持ちよさは、ちょっとした心配りで変わります。コラムを順に読むか、気になるものから選んでください。', back: '10のコツへ', backHref: '/tips/' },
  en: { h1: 'How to behave at Japanese flea markets', crumb: 'Tips', lead: 'Columns on how to enjoy a Japanese flea market or antique fair in a pleasant way.', intro: 'A little thoughtfulness makes a shopping trip much more pleasant. Read the columns in order, or pick the one you need.', back: 'To the 10 tips', backHref: '/tips/' },
};

function heading(t, lang, crumbHref) {
  const home = lang === 'ja' ? 'トップ' : 'Home';
  const tips = crumbHref ? `<a href="${lang === 'ja' ? '/ja' : ''}${crumbHref}">${esc(t.crumb)}</a> › ` : '';
  return `<nav class="crumbs art-crumbs"><a href="${lang === 'ja' ? '/ja/' : '/'}">${home}</a> › ${tips}<span>${esc(t.h1)}</span></nav><h1>${esc(t.h1)}</h1><p class="lp-s">${esc(t.lead)}</p>`;
}

export function tipsBanner(lang) {
  return heading(TIPS_TXT[lang], lang, null);
}

export function mannersBanner(lang) {
  return heading(MANNERS_TXT[lang], lang, '/tips/');
}

// 記事の一覧（カード）。base は /tips/ または /tips/manners/
function columnsIndex(list, lang, base, t) {
  const cards = list.map((x, i) => `<li class="col-card"><a href="${lang === 'ja' ? '/ja' : ''}${base}${esc(x.slug)}/"><span class="col-n">${String(i + 1).padStart(2, '0')}</span><b>${esc(x[lang].title)}</b><span class="col-l">${esc(x[lang].lead)}</span></a></li>`).join('');
  return `<p class="col-intro">${esc(t.intro)}</p><ol class="col-list">${cards}</ol><p class="tips-note"><a href="${lang === 'ja' ? '/ja' : ''}${t.backHref}">${esc(t.back)} →</a></p>`;
}

export function tipsIndex(list, lang) {
  return columnsIndex(list, lang, '/tips/', TIPS_TXT[lang]);
}

export function mannersIndex(list, lang) {
  return columnsIndex(list, lang, '/tips/manners/', MANNERS_TXT[lang]);
}
