// トップページの各セクション（HERO など）。文言は scripts/lib/i18n.mjs、データは build-site.mjs の ctx から渡す
import { esc } from './html.mjs';
import { icon, japanMark } from './icons.mjs';
import { T } from './i18n.mjs';

// 日本語・英語どちらのトップでも、同じ検索（/search/?q=）へ送る。既存の検索の動きは変えない
export function renderHero(lang = 'ja', photo = '/img/hero.webp') {
  const t = T[lang].hero;
  const [l1, l2, accent] = t.title;
  const cats = t.cats
    .map((c) => `<li><a href="${c.href}">${icon(c.icon, 30)}<span>${esc(c.label[0])}<br>${esc(c.label[1])}</span></a></li>`)
    .join('');
  const stampText = `${t.stamp} • ${t.stamp} •`;
  return `<section class="hero2 is-${lang}" aria-labelledby="hero-h">
<div class="hero2-photo"><img src="${photo}" alt="${esc(t.photoAlt)}" width="1800" height="900" fetchpriority="high" decoding="async"></div>
<div class="hero2-in">
<div class="hero2-copy">
<h1 id="hero-h"><span>${esc(l1)}</span><span>${esc(l2)}</span><em>${esc(accent)}</em></h1>
<p class="hero2-sub">${esc(t.sub)}</p>
<form class="hsearch" action="/search/" role="search"><span class="hs-ic">${icon('search', 21)}</span><input name="q" type="search" placeholder="${esc(t.placeholder)}" aria-label="${esc(t.searchLabel)}" autocomplete="off"><button type="submit">${esc(t.button)}${icon('arrow', 18)}</button></form>
<ul class="hcats">${cats}</ul>
</div>
</div>
<div class="hero2-deco" aria-hidden="true">
<p class="hd-script">${t.script.map(esc).join('<br>')}</p>
<svg class="hd-stamp" viewBox="0 0 120 120" focusable="false"><defs><path id="stamp-arc" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="57" fill="rgba(20,20,30,.3)" stroke="currentColor" stroke-width="1.6"/><circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" stroke-width=".8" opacity=".55"/><text font-size="8.6" font-weight="700" fill="currentColor" font-family="Noto Sans JP,sans-serif"><textPath href="#stamp-arc" textLength="278" lengthAdjust="spacing">${esc(stampText)}</textPath></text><g transform="translate(34 33) scale(.52)" color="#fff">${japanMark()}</g></svg>
</div>
</section>`;
}
