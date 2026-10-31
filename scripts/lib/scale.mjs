// 規模の目安：公式に書かれた出店数（series.scale.stalls）から、小・中・大に分ける。出店数の記載がないものは出さない（要確認）
// 基準（ユーザー指定）：30店以下＝小、31〜99店＝中、100店以上＝大
export const SMALL_MAX = 30;
export const MEDIUM_MAX = 99;

export function scaleTier(s) {
  const n = s?.scale?.stalls;
  if (!Number.isInteger(n) || n < 1) return null;
  return n <= SMALL_MAX ? 'small' : n <= MEDIUM_MAX ? 'medium' : 'large';
}

const L = {
  ja: { small: '小', medium: '中', large: '大', label: '規模', est: '目安', rule: '出店数が30店以下＝小、31〜99店＝中、100店以上＝大（公式に書かれた出店数から、このサイトが分けた目安）', stalls: (n) => `${n}店`, from: '公式の記載' },
  en: { small: 'Small', medium: 'Medium', large: 'Large', label: 'Scale', est: 'Estimate', rule: 'Stalls: 30 or fewer = small, 31–99 = medium, 100 or more = large (this site’s estimate, from the number of stalls stated officially)', stalls: (n) => `${n} stalls`, from: 'official wording' },
};
export const scaleText = (lang) => L[lang];

// 3本の棒（小=1・中=2・大=3本が塗られる）。色だけに頼らず、文字（小・中・大）も添える
export function scaleMark(s, lang = 'ja', { withLabel = true } = {}) {
  const t = scaleTier(s);
  if (!t) return '';
  const x = L[lang];
  const n = { small: 1, medium: 2, large: 3 }[t];
  const bars = `<span class="scale-bars s${n}" aria-hidden="true"><i></i><i></i><i></i></span>`;
  return `<span class="scale scale-${t}" title="${x.label}: ${x[t]} (${x.rule})">${bars}<b>${withLabel ? `${x.label} ` : ''}${x[t]}</b></span>`;
}
