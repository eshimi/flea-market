// フリマのページの「評価・情報提供」：掲載済みの投稿（data/reviews.json。運営が確認したもの）と、送信フォーム。
// 平均の★は、掲載が5件以上になってから出す（少ない件数で数字を作らない）。構造化データには入れない。
import { esc } from './html.mjs';
import { CONTACT_EMAIL } from './nav.mjs';

// 送信フォームを出すのは、送信先（サイト専用メールの設定）が決まってから。未設定の間は「準備中」
export const REVIEWS_ON = Boolean(CONTACT_EMAIL);
export const AVG_MIN = 5;

const TXT = {
  ja: { h2: '評価・情報提供', lead: 'この市に行った方の評価と、情報の提供を受け付けています。', none: 'まだ掲載された評価はありません。', avg: (a, n) => `平均 ${a} / 5（${n} 件）`, few: (n) => `掲載は ${n} 件のため、平均はまだ出していません。`, by: '投稿者の感想（運営が確認して掲載）', visited: '訪れた日', stars: '評価', starsHint: '★1（よくなかった）〜★5（とても良かった）', comment: 'コメント・情報（600字まで）', date: '訪れた日（任意）', send: '送信する', sent: '送信しました。内容を確かめてから掲載します。ありがとうございます。', error: '送信できませんでした。時間をおいて、もう一度お試しください。', notReady: '情報提供フォームは準備中です（要確認）。', rule: '個人情報（氏名・連絡先）は書かないでください。送られた内容は運営が確認し、公式の情報と合わせて、問題がなければ掲載します。' },
  en: { h2: 'Reviews & information', lead: 'Reviews and information from people who have been to this market are welcome.', none: 'No reviews have been published yet.', avg: (a, n) => `Average ${a} / 5 (${n} reviews)`, few: (n) => `${n} review${n === 1 ? '' : 's'} so far; the average appears from ${AVG_MIN}.`, by: 'A visitor’s comment (checked by us before it is published)', visited: 'Visited on', stars: 'Rating', starsHint: '★1 (not good) to ★5 (very good)', comment: 'Comment or information (up to 600 characters)', date: 'Date visited (optional)', send: 'Send', sent: 'Thank you. We will check the content before publishing it.', error: 'Could not send. Please try again later.', notReady: 'The information form is coming soon (to be confirmed).', rule: 'Please do not include personal information (name or contact). We check what is sent, and publish it with the official information when it is appropriate. The English is an unofficial translation.' },
};

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

// 掲載の検査（data/reviews.json の形）。問題があれば例外
export function validateReviews(list, seriesIds) {
  const seen = new Set();
  for (const r of list) {
    if (!seriesIds.has(r.series)) throw new Error(`評価のシリーズ id が見つかりません：${r.series}`);
    if (!Number.isInteger(r.stars) || r.stars < 1 || r.stars > 5) throw new Error(`評価は1〜5の整数：${r.series}`);
    if (typeof r.comment !== 'string' || !r.comment.trim() || r.comment.length > 600) throw new Error(`コメントは1〜600字：${r.series}`);
    if (r.visitedOn && !/^\d{4}-\d{2}-\d{2}$/.test(r.visitedOn)) throw new Error(`訪れた日の形式：${r.series}`);
    if (/@|https?:\/\/|\d{2,4}-\d{2,4}-\d{3,4}/.test(r.comment)) throw new Error(`個人情報・リンクらしき文字が入っています（掲載前に削除）：${r.series}`);
    seen.add(r.series);
  }
  return true;
}

export function reviewsSection(seriesId, list, lang) {
  const t = TXT[lang];
  const mine = list.filter((r) => r.series === seriesId).sort((a, b) => (b.postedOn || '').localeCompare(a.postedOn || ''));
  const n = mine.length;
  const avg = n >= AVG_MIN ? (mine.reduce((s, r) => s + r.stars, 0) / n).toFixed(1) : null;
  const summary = avg ? `<p class="rv-sum"><span class="rv-st">${stars(Math.round(avg))}</span> ${esc(t.avg(avg, n))}</p>` : `<p class="rv-sum">${esc(n ? t.few(n) : t.none)}</p>`;
  const items = mine.map((r) => `<li class="rv-item"><span class="rv-st" aria-label="${r.stars} / 5">${stars(r.stars)}</span>${r.visitedOn ? ` <span class="rv-date">${esc(t.visited)}${lang === 'ja' ? '：' : ': '}${esc(r.visitedOn)}</span>` : ''}<p>${esc(r.comment)}</p></li>`).join('');
  const form = REVIEWS_ON
    ? `<form class="rv-form" data-series="${esc(seriesId)}" data-lang="${lang}" novalidate>
<fieldset class="rv-stars"><legend>${esc(t.stars)}<span class="rv-hint">${esc(t.starsHint)}</span></legend>
${STARS_IN.map((n) => `<label><input type="radio" name="stars" value="${n}" required><span class="rv-star" aria-hidden="true">★</span><span class="sr">${n}</span></label>`).join('')}
</fieldset>
<label class="rv-f"><span>${esc(t.comment)}</span><textarea name="comment" rows="4" maxlength="600" required></textarea></label>
<label class="rv-f"><span>${esc(t.date)}</span><input type="date" name="visitedOn"></label>
<div class="rv-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="rv-rule">${esc(t.rule)}</p>
<button type="submit">${esc(t.send)}</button>
<p class="rv-st-msg" role="status"></p>
</form>`
    : `<p class="rv-rule">${esc(t.notReady)}</p>`;
  return `<section class="rv" id="reviews" data-lang="${lang}"><h2 class="sec-h">${esc(t.h2)}</h2><p class="rv-lead">${esc(t.lead)}</p>${summary}${n ? `<p class="rv-by">${esc(t.by)}</p><ul class="rv-list">${items}</ul>` : ''}${form}</section>`;
}
const STARS_IN = [5, 4, 3, 2, 1];
