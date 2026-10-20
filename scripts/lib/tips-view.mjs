// TIPS（楽しく体験するためのコツ・10項目）。data/tips.json の文章と出典から、/tips/ のページを作る。
// 文章は公式の事実を言い換えたもの（英語は非公式の訳）。出典の確認日は、ページの各項目に出す。
import { esc } from './html.mjs';
import { icon } from './icons.mjs';

const TXT = {
  ja: { h1: 'TIPS：楽しく体験するためのコツ', crumb: 'TIPS', lead: '日本のフリーマーケット・骨董市で、気持ちよく過ごすための10のコツです。各項目の出典は、主催者・会場の公式ページです。', source: '出典', checked: '確認日', note: '文章は公式の内容を言い換えたものです。開催の状況は変わることがあるので、お出かけ前に各会場の公式ページで確かめてください。' },
  en: { h1: 'Tips for enjoying flea markets', crumb: 'Tips', lead: 'Ten tips for a good visit to a flea market or antique fair in Japan. Each item cites the organizer’s or venue’s official page.', source: 'Source', checked: 'Checked', note: 'These paraphrase the official pages. Event details can change, so please check each organizer’s official page before you go. The English is an unofficial translation.' },
};

const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export function tipsBody(tips, lang) {
  const t = TXT[lang];
  const items = tips.map((x, i) => {
    const c = x[lang];
    const src = x.sources.map((s) => `<a href="${esc(s.url)}" rel="nofollow noopener">${esc(host(s.url))}</a>（${esc(t.checked)} ${esc(s.checkedAt)}）`).join('、 ');
    return `<li class="tip"><span class="tip-n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div class="tip-b"><h2>${esc(c.title)}</h2><p>${esc(c.body)}</p><p class="tip-src">${icon('doc', 15)}<span>${esc(t.source)}：${src}</span></p></div></li>`;
  }).join('\n');
  const link = lang === 'ja' ? '<p class="tips-note"><a href="/tips/manners/">日本でのふるまい（コラム5本）→</a></p>' : '<p class="tips-note"><a href="/tips/manners/">How to behave at Japanese flea markets (5 columns) →</a></p>';
  return `<ol class="tips">${items}</ol><p class="tips-note">${esc(t.note)}</p>${link}`;
}

export function tipsBanner(lang) {
  const t = TXT[lang];
  return `<nav class="crumbs art-crumbs"><a href="/">${lang === 'ja' ? 'トップ' : 'Home'}</a> › <span>${esc(t.crumb)}</span></nav><h1>${esc(t.h1)}</h1><p class="lp-s">${esc(t.lead)}</p>`;
}

// TIPSコーナー「日本でのふるまい」：ブログ形式のコラム（オリジナルの文章。出典は付けない）
export const MANNERS_TXT = {
  ja: { h1: '日本でのふるまい（TIPS）', crumb: 'TIPS', lead: '日本のフリーマーケットや骨董市で、気持ちよく過ごすためのコラムです。', back: '10項目（出典つき）へ', intro: '買い物の気持ちよさは、ちょっとした心配りで変わります。コラムを順に読むか、気になるものから選んでください。' },
  en: { h1: 'How to behave at Japanese flea markets', crumb: 'Tips', lead: 'Columns on how to enjoy a Japanese flea market or antique fair in a pleasant way.', back: 'To the 10 tips (with official sources)', intro: 'A little thoughtfulness makes a shopping trip much more pleasant. Read the columns in order, or pick the one you need.' },
};
export function mannersBanner(lang) {
  const t = MANNERS_TXT[lang];
  return `<nav class="crumbs art-crumbs"><a href="/">${lang === 'ja' ? 'トップ' : 'Home'}</a> › <a href="/tips/">${esc(t.crumb)}</a> › <span>${esc(t.h1)}</span></nav><h1>${esc(t.h1)}</h1><p class="lp-s">${esc(t.lead)}</p>`;
}
export function mannersIndex(list, lang) {
  const t = MANNERS_TXT[lang];
  const cards = list.map((x, i) => `<li class="col-card"><a href="${lang === 'ja' ? '/ja' : ''}/tips/manners/${esc(x.slug)}/"><span class="col-n">${String(i + 1).padStart(2, '0')}</span><b>${esc(x[lang].title)}</b><span class="col-l">${esc(x[lang].lead)}</span></a></li>`).join('');
  return `<p class="col-intro">${esc(t.intro)}</p><ol class="col-list">${cards}</ol><p class="tips-note"><a href="${lang === 'ja' ? '/ja/tips/' : '/tips/'}">${esc(t.back)} →</a></p>`;
}
