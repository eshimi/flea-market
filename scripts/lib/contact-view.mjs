// お問い合わせ（/contact/）：種類を選んで送る。送信先（CONTACT_EMAIL）が決まるまでは「準備中」。
import { esc } from './html.mjs';
import { CONTACT_EMAIL } from './nav.mjs';

export const CONTACT_ON = Boolean(CONTACT_EMAIL);

const CATS = {
  ja: { remove: '掲載の修正・削除（主催者の方）', info: '情報提供（開催の実際など）', vendor: '出店について', media: '取材・広報・掲載のご相談', other: 'その他・不具合のご報告' },
  en: { remove: 'Correction or removal (organizers)', info: 'Information (what happened at a market, etc.)', vendor: 'For vendors', media: 'Press, media & partnership', other: 'Other, or a problem to report' },
};

const TXT = {
  ja: { h1: 'お問い合わせ', crumb: 'トップ', lead: '掲載の修正・削除、情報提供、出店、取材など、サイトへのご連絡はこちらから。', kind: '種類', name: 'お名前（任意）', email: '返信先のメールアドレス（任意）', message: '内容（2000字まで）', send: '送信する', sent: '送信しました。内容を確かめて、必要な場合はご返信します。ありがとうございます。', err: '送信できませんでした。時間をおいて、もう一度お試しください。', rule: '返信が必要なときだけ、メールアドレスを書いてください。いただいた内容は、お問い合わせへの対応のためだけに使います。主催者の方は、掲載ページのURLと、直してほしい内容を書いてください。', notReady: 'お問い合わせフォームは準備中です（要確認）。', sign: '送信先：サイト運営' },
  en: { h1: 'Contact', crumb: 'Home', lead: 'Corrections or removals, information, vendor questions and press enquiries: please get in touch here.', kind: 'Topic', name: 'Your name (optional)', email: 'Reply email address (optional)', message: 'Message (up to 2000 characters)', send: 'Send', sent: 'Thank you. We will check your message and reply if needed.', err: 'Could not send. Please try again later.', rule: 'Please give an email address only if you want a reply. We use what you send only to respond to your enquiry. Organizers: please include the page URL and what should be changed. The English is an unofficial translation.', notReady: 'The contact form is coming soon (to be confirmed).', sign: 'Sent to the site team' },
};

export function contactBanner(lang) {
  const t = TXT[lang];
  const home = lang === 'ja' ? '/ja/' : '/';
  return `<nav class="crumbs art-crumbs"><a href="${home}">${esc(t.crumb)}</a> › <span>${esc(t.h1)}</span></nav><h1>${esc(t.h1)}</h1><p class="lp-s">${esc(t.lead)}</p>`;
}

export function contactBody(lang) {
  const t = TXT[lang];
  if (!CONTACT_ON) return `<p class="rv-rule">${esc(t.notReady)}</p>`;
  const opts = Object.entries(CATS[lang]).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  return `<form class="rv-form contact-form" data-lang="${lang}" novalidate>
<label class="rv-f"><span>${esc(t.kind)}</span><select name="category" required>${opts}</select></label>
<label class="rv-f"><span>${esc(t.name)}</span><input type="text" name="name" maxlength="100" autocomplete="name"></label>
<label class="rv-f"><span>${esc(t.email)}</span><input type="email" name="email" maxlength="200" autocomplete="email"></label>
<label class="rv-f"><span>${esc(t.message)}</span><textarea name="message" rows="7" maxlength="2000" required></textarea></label>
<div class="rv-hp" aria-hidden="true"><label>Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="rv-rule">${esc(t.rule)}</p>
<button type="submit">${esc(t.send)}</button>
<p class="rv-st-msg" role="status"></p>
</form>`;
}
