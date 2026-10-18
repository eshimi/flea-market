// 英語の表示用の訳（data/translations-en.json）。公式の日本語の文を、このサイトが訳した非公式のもの。
// 訳がないものは、日本語のまま出す（推測で訳さない）。数字は原文と一致させる（test で確認）。
let TR = { series: {}, organizers: {}, labels: {}, cities: {}, notes: {} };
export function setTranslations(t) {
  TR = { series: {}, organizers: {}, labels: {}, cities: {}, notes: {}, ...(t || {}) };
}
const S = (s) => TR.series[s.id] || {};

export const nameEn = (s) => S(s).name || '';
export const venueEn = (s) => S(s).venue || '';
export const cityEn = (name) => TR.cities[name] || '';
export const orgEn = (name) => TR.organizers[name] || '';
export const labelEn = (l) => TR.labels[l] || '';
export const noteEn = (series, date) => TR.notes[`${series}|${date}`] || '';
export const fieldEn = (s, k) => S(s)[k] || '';
// 時間：訳がなければ、「9:00〜16:00」だけの形は英語の書き方にする
export function timeEn(s) {
  if (S(s).time) return S(s).time;
  const m = /^(\d{1,2}:\d{2})〜(\d{1,2}:\d{2})$/.exec(s.time?.text || '');
  return m ? `${m[1]}–${m[2]}` : '';
}

// 言語ごとの表示用（ja なら日本語）。訳がなければ日本語
export const nameL = (s, lang) => (lang === 'en' && nameEn(s)) || s.name;
export const venueL = (s, lang) => (lang === 'en' && venueEn(s)) || s.venue.name;
export const cityL = (name, lang) => (lang === 'en' && cityEn(name)) || name;
export const noteL = (o, lang) => (lang === 'en' && noteEn(o.series.id, o.date)) || o.note || '';
