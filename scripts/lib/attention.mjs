// 注目度の目安：Google キーワードプランナーの月間検索ボリューム（キーワードは市の名称）から、高・中・低に分ける。規模（出店数）とは別のマーク
// 基準：1万以上＝高、1,000以上＝中、100以上＝低。100未満（ほぼ0）はマークを出さない
export const HIGH_MIN = 10000;
export const MEDIUM_MIN = 1000;
export const LOW_MIN = 100;

export function attentionTier(s) {
  const n = s?.attention?.volumeMin;
  if (!Number.isInteger(n) || n < LOW_MIN) return null;
  return n >= HIGH_MIN ? 'high' : n >= MEDIUM_MIN ? 'medium' : 'low';
}

const L = {
  ja: { high: '高', medium: '中', low: '低', label: '注目度', est: '目安', rule: 'Google の月間検索ボリューム（市の名称の検索）が、1万以上＝高、1,000以上＝中、100以上＝低（このサイトの目安。規模とは別）' },
  en: { high: 'High', medium: 'Medium', low: 'Low', label: 'Buzz', est: 'Estimate', rule: 'Based on Google monthly search volume for the market’s name: 10,000+ = high, 1,000+ = medium, 100+ = low (this site’s estimate; separate from scale)' },
};
export const attentionText = (lang) => L[lang];

// 3つの星（低=1・中=2・高=3つが塗られる）。文字（高・中・低）も添える
export function attentionMark(s, lang = 'ja', { withLabel = true } = {}) {
  const t = attentionTier(s);
  if (!t) return '';
  const x = L[lang];
  const n = { low: 1, medium: 2, high: 3 }[t];
  const stars = `<span class="attn-stars s${n}" aria-hidden="true"><i>★</i><i>★</i><i>★</i></span>`;
  return `<span class="attn attn-${t}" title="${x.label}: ${x[t]} (${x.rule})">${stars}<b>${withLabel ? `${x.label} ` : ''}${x[t]}</b></span>`;
}
