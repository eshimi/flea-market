// フリマのページの「評価・情報提供」：書き込みはすぐ公開（/api/reviews/<id> をブラウザで読む。static/review.js）。
// 利用者が「不適切」と通報すると、1回で非公開になり、管理者が判断する（/admin/reviews）。
// 平均の★は、公開中の書き込みが5件以上になってから出す（少ない件数で数字を作らない）。構造化データには入れない。
import { esc } from './html.mjs';

export const REVIEWS_ON = true;
export const AVG_MIN = 5;

const TXT = {
  ja: { h2: '評価・情報提供', lead: 'この市に行った方の評価と、情報の提供を受け付けています。書き込みはすぐに表示されます。', by: '投稿者の感想です（このサイトの確認した事実ではありません）。不適切な書き込みは「通報」を押すと、すぐに非表示になり、管理者が判断します。', stars: '評価', starsHint: '★1（よくなかった）〜★5（とても良かった）', comment: 'コメント・情報（600字まで）', date: '訪れた日（任意）', send: '投稿する', rule: '個人情報（氏名・連絡先）、URL、電話番号は書けません。誹謗中傷・宣伝は、通報や管理者の判断で削除します。', noscript: '書き込みの表示と投稿には、JavaScript が必要です。' },
  en: { h2: 'Reviews & information', lead: 'Reviews and information from people who have been to this market are welcome. Posts appear right away.', by: 'These are visitors’ own comments, not facts checked by this site. Press “Report” on an inappropriate post to hide it at once; we then review it.', stars: 'Rating', starsHint: '★1 (not good) to ★5 (very good)', comment: 'Comment or information (up to 600 characters)', date: 'Date visited (optional)', send: 'Post', rule: 'Personal information (names, contact details), URLs and phone numbers are not allowed. Abuse and advertising are removed after a report or our review. The English is an unofficial translation.', noscript: 'JavaScript is needed to show and post reviews.' },
};

const STARS_IN = [5, 4, 3, 2, 1];

export function reviewsSection(seriesId, lang) {
  const t = TXT[lang];
  return `<section class="rv" id="reviews" data-series="${esc(seriesId)}" data-lang="${lang}" data-min="${AVG_MIN}"><h2 class="sec-h">${esc(t.h2)}</h2><p class="rv-lead">${esc(t.lead)}</p>
<p class="rv-sum" aria-live="polite"></p>
<p class="rv-by">${esc(t.by)}</p>
<ul class="rv-list"></ul>
<noscript><p class="rv-rule">${esc(t.noscript)}</p></noscript>
<form class="rv-form" data-series="${esc(seriesId)}" data-lang="${lang}" novalidate>
<fieldset class="rv-stars"><legend>${esc(t.stars)}<span class="rv-hint">${esc(t.starsHint)}</span></legend>
${STARS_IN.map((n) => `<label><input type="radio" name="stars" value="${n}" required><span class="rv-star" aria-hidden="true">★</span><span class="sr">${n}</span></label>`).join('')}
</fieldset>
<label class="rv-f"><span>${esc(t.comment)}</span><textarea name="comment" rows="4" maxlength="600" required></textarea></label>
<label class="rv-f"><span>${esc(t.date)}</span><input type="date" name="visitedOn"></label>
<div class="rv-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="rv-rule">${esc(t.rule)}</p>
<button type="submit">${esc(t.send)}</button>
<p class="rv-st-msg" role="status"></p>
</form></section>`;
}
