// 記事ページ（ブログ・使い方・よくある質問）の見た目。参考にした補助金ネットのブログと同じ構成：
// パンくず → 見出し帯（一覧） / 見出し・種別・日付・読了時間（記事） → 本文カード＋右の目次・案内 → 前後の記事・タグ
import { esc } from './html.mjs';
import { S } from './i18n.mjs';
import { langPath } from './l10n.mjs';

export const ART_CSS = ['/article.css'];

const TXT = {
  ja: {
    blog: 'ブログ', kicker: 'ブログ', lead: 'マーケットの探し方・読み方・お出かけの前の確認について。公式ページの記載に基づいて書いています。',
    all: 'すべて', filter: 'カテゴリで絞り込む', list: '記事の一覧', read: (m) => `読了 約${m}分`, published: '公開',
    sameCat: '同じカテゴリの記事を見る', toc: 'このページの内容', points: 'この記事のポイント', intro: 'はじめに',
    cta: { t: '近くのマーケットを探す', d: '地名・会場名・種類から、公式情報の開催を探せます。', b: 'キーワードで探す', href: '/search/' },
    first: 'はじめての方へ', firstLinks: [['/guide/', '使い方'], ['/faq/', 'よくある質問'], ['/about/', '掲載のきまり・出典'], ['/shuten/', '出店したい方へ']],
    tags: 'タグ', tagsNav: 'タグ', popular: '人気のタグ', prev: '前の記事', next: '次の記事', backList: '記事の一覧に戻る', toList: 'ブログの一覧へ',
    related: '関連ページ', updated: '最終更新日', crumbs: 'パンくず', sideLabel: '関連ページ',
    btnFind: 'マーケットを探す', btnGuide: '使い方を見る', rss: 'RSS',
  },
  en: {
    blog: 'Blog', kicker: 'Blog', lead: 'How to find markets, read listings and check before you go, based on what official pages say.',
    all: 'All', filter: 'Filter by category', list: 'Articles', read: (m) => `${m} min read`, published: 'Published',
    sameCat: 'More in this category', toc: 'On this page', points: 'Key points', intro: 'Introduction',
    cta: { t: 'Find a market near you', d: 'Search official listings by place, venue or type.', b: 'Keyword Search', href: '/search/' },
    first: 'New here?', firstLinks: [['/guide/', 'How to Use'], ['/faq/', 'FAQ'], ['/about/', 'Listing Policy & Sources'], ['/shuten/', 'For Vendors']],
    tags: 'Tags', tagsNav: 'Tags', popular: 'Popular tags', prev: 'Previous', next: 'Next', backList: 'Back to all articles', toList: 'Blog',
    related: 'Related pages', updated: 'Last updated', crumbs: 'Breadcrumb', sideLabel: 'Related pages',
    btnFind: 'Explore Markets', btnGuide: 'How to Use', rss: 'RSS',
  },
};

export const CATS = {
  news: { ja: 'お知らせ', en: 'Site news' },
  howto: { ja: 'サイトの使い方', en: 'Using the site' },
  goer: { ja: 'お出かけ前に', en: 'Before you go' },
  weekly: { ja: '今週末の特集', en: 'Weekend picks' },
  monthly: { ja: '月のまとめ', en: 'Monthly overview' },
  new: { ja: '新着の掲載', en: 'New listings' },
};

const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>');
export const minutes = (blocks, lang) => {
  const text = blocks.map((b) => b.h2 || b.p || (b.ul || []).join(' ') || (b.facts || []).map((x) => x.join(' ')).join(' ')).join(' ');
  return Math.max(1, Math.round(lang === 'ja' ? text.length / 500 : text.split(/\s+/).length / 200));
};
const dateText = (iso, lang) => S[lang].dateLong(iso);

// ブロックを、h2 ごとの「節」に分ける（最初の h2 より前の段落は「はじめに」）
export function sections(blocks, lang) {
  const out = [];
  let cur = null;
  for (const b of blocks) {
    if (b.h2) { cur = { title: b.h2, body: [] }; out.push(cur); continue; }
    if (!cur) { cur = { title: TXT[lang].intro, body: [] }; out.push(cur); }
    cur.body.push(b);
  }
  return out.map((s, i) => ({ ...s, id: `s${i}` }));
}

const bodyHtml = (list) => list.map((b) => ('p' in b ? (b.p ? `<p>${inline(b.p)}</p>` : '') : b.facts ? `<dl class="bl-facts">${b.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${inline(v)}</dd></div>`).join('')}</dl>` : 'html' in b ? b.html : `<ul>${b.ul.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`)).join('\n');

export function articleBox(secs) {
  return `<div class="art-box">${secs.map((s) => `<section class="art-sec" aria-labelledby="${s.id}"><h2 id="${s.id}">${esc(s.title)}</h2><div class="art-body">${bodyHtml(s.body)}</div></section>`).join('\n')}</div>`;
}

export function sideToc(secs, lang) {
  if (secs.length < 2) return '';
  const t = TXT[lang];
  return `<nav class="side-card side-toc" aria-label="${esc(t.toc)}"><h2>${esc(t.toc)}</h2><ul>${secs.map((s) => `<li><a href="#${s.id}">${esc(s.title)}</a></li>`).join('')}</ul></nav>`;
}

export function sideCta(lang) {
  const c = TXT[lang].cta;
  return `<div class="side-cta"><h2>${esc(c.t)}</h2><p>${esc(c.d)}</p><a class="btn-w" href="${c.href}">${esc(c.b)} <span aria-hidden="true">→</span></a></div>`;
}

export function sideFirst(lang) {
  const t = TXT[lang];
  return `<nav class="side-card side-links" aria-label="${esc(t.first)}"><h2>${esc(t.first)}</h2><ul>${t.firstLinks.map(([h, x]) => `<li><a href="${h}"><span>${esc(x)}</span><i aria-hidden="true">→</i></a></li>`).join('')}</ul></nav>`;
}

const tagLinks = (tags) => tags.map((x) => `<li><a href="/search/?q=${encodeURIComponent(x)}" rel="tag">#${esc(x)}</a></li>`).join('');

// ---- 一覧 ----
export function renderBlogIndex(posts, lang) {
  const t = TXT[lang];
  const cats = Object.keys(CATS).filter((k) => posts.some((p) => p.cat === k));
  const chips = [['all', t.all, posts.length], ...cats.map((k) => [k, CATS[k][lang], posts.filter((p) => p.cat === k).length])]
    .map(([k, n, c], i) => `<button type="button" class="bl-chip" data-cat="${k}" aria-pressed="${i === 0}">${esc(n)}<sup>${c}</sup></button>`).join('');
  const rows = posts.map((p) => {
    const c = p[lang];
    return `<a class="bl-row" data-cat="${p.cat}" href="/blog/${p.slug}/"><span class="bl-d"><time datetime="${p.date}">${esc(dateText(p.date, lang))}</time><br>${esc(t.read(minutes(c.blocks, lang)))}</span><span class="bl-b"><span class="bl-cat bl-cat-${p.cat}">${esc(CATS[p.cat][lang])}</span><h3>${esc(c.title)}</h3><p>${esc(c.summary)}</p></span></a>`;
  }).join('\n');
  const tags = [...new Set(posts.flatMap((p) => p.tags[lang]))];
  return `<div class="art-wrap">
<nav class="crumbs art-crumbs" aria-label="${esc(t.crumbs)}"><a href="/">${lang === 'ja' ? 'トップ' : 'Home'}</a> › <span>${esc(t.blog)}</span></nav>
<section class="lp-hero" aria-labelledby="lp-title">
<div class="lp-in"><p class="lp-k">${esc(t.kicker)}</p><h1 id="lp-title">${esc(t.blog)}</h1><p class="lp-s">${esc(t.lead)}</p>
<div class="lp-btns"><a class="lp-btn p" href="/search/">${esc(t.btnFind)} <span aria-hidden="true">→</span></a><a class="lp-btn s" href="/guide/">${esc(t.btnGuide)}</a></div></div>
<img class="lp-pic" src="/img/about.webp" alt="" width="900" height="675" loading="lazy">
</section>
<nav class="bl-chips" aria-label="${esc(t.filter)}">${chips}</nav>
<div class="bl-layout"><section class="bl-list" aria-labelledby="list"><h2 id="list" class="visually-hidden">${esc(t.list)}</h2>${rows}</section>
<aside class="page-side" aria-label="${esc(t.sideLabel)}">${sideCta(lang)}${sideFirst(lang)}<nav class="side-card side-tags" aria-label="${esc(t.popular)}"><h2>${esc(t.popular)}</h2><ul class="tag-list">${tagLinks(tags)}</ul><p class="rss"><a href="${langPath('/blog/feed.xml', lang)}">${esc(t.rss)}</a></p></nav></aside></div>
</div>`;
}

// ---- 記事（ブログ） ----
export function renderPost(post, posts, lang) {
  const t = TXT[lang];
  const c = post[lang];
  const secs = sections(c.blocks, lang);
  const i = posts.findIndex((p) => p.slug === post.slug);
  const newer = posts[i - 1];
  const older = posts[i + 1];
  const card = (p, label) => (p ? `<a class="bl-pn-card" href="/blog/${p.slug}/"><small>${esc(label)}</small><b>${esc(p[lang].title)}</b></a>` : '');
  const points = (c.points || []).length ? `<div class="bl-points" role="region" aria-labelledby="bl-pt"><h2 id="bl-pt">${esc(t.points)}</h2><ol>${c.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div>` : '';
  return `<div class="art-wrap">
<nav class="crumbs art-crumbs" aria-label="${esc(t.crumbs)}"><a href="/">${lang === 'ja' ? 'トップ' : 'Home'}</a> › <a href="/blog/">${esc(t.blog)}</a> › <span>${esc(c.title)}</span></nav>
<header class="art-head"><h1>${esc(c.title)}</h1><p class="art-k">${esc(t.kicker)}</p><p class="art-lead">${esc(c.summary)}</p>
<p class="bl-meta"><span class="bl-cat bl-cat-${post.cat}">${esc(CATS[post.cat][lang])}</span><span>${esc(t.published)} <time datetime="${post.date}">${esc(dateText(post.date, lang))}</time></span><span>${esc(t.read(minutes(c.blocks, lang)))}</span><a href="/blog/">${esc(t.sameCat)} <span aria-hidden="true">→</span></a></p>${points}</header>
<div class="page-split"><div class="page-main">${articleBox(secs)}
<p class="art-note">${esc(t.updated)}：${esc(dateText(post.date, lang))}</p>
<nav class="bl-pn" aria-label="${esc(t.prev)} / ${esc(t.next)}">${card(older, `${t.prev} ←`)}<a class="bl-pn-card bl-pn-list" href="/blog/"><small>${esc(t.toList)}</small><b>${esc(t.backList)} <span aria-hidden="true">→</span></b></a>${card(newer, `${t.next} →`)}</nav>
<nav class="art-tags" aria-label="${esc(t.tagsNav)}"><span class="art-tags-label">${esc(t.tags)}</span><ul class="tag-list">${tagLinks(post.tags[lang])}</ul></nav></div>
<aside class="page-side" aria-label="${esc(t.sideLabel)}">${sideToc(secs, lang)}${sideCta(lang)}${sideFirst(lang)}</aside></div>
</div>`;
}

// ---- 使い方・よくある質問 ----
export function renderDoc({ title, lead, secs, lang, extra = '' }) {
  const t = TXT[lang];
  return `<div class="art-wrap">
<nav class="crumbs art-crumbs" aria-label="${esc(t.crumbs)}"><a href="/">${lang === 'ja' ? 'トップ' : 'Home'}</a> › <span>${esc(title)}</span></nav>
<header class="art-head"><h1>${esc(title)}</h1><p class="art-lead">${esc(lead)}</p></header>
<div class="page-split"><div class="page-main">${articleBox(secs)}${extra}</div>
<aside class="page-side" aria-label="${esc(t.sideLabel)}">${sideToc(secs, lang)}${sideCta(lang)}${sideFirst(lang)}</aside></div>
</div>`;
}

export const docSections = (blocks, lang) => sections(blocks, lang);
export const faqSections = (items, lang) => items.map(([q, a], i) => ({ id: `s${i}`, title: q, body: [{ p: a }] }));
